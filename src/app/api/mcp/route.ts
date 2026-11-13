import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { runTool, TOOLS } from "@/lib/agents/mcp-tools";
import type { AgentIdentity } from "@/lib/agents/tokens";
import { verifyBearer } from "@/lib/agents/tokens";

/** Serveur MCP de Sparkly : chaque outil agit « en tant que » la personne qui a connecté l'agent. */
const handler = createMcpHandler(
  (server) => {
    for (const tool of TOOLS) {
      server.registerTool(
        tool.name,
        { title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: { readOnlyHint: !tool.write, destructiveHint: false } },
        async (input, ctx) => {
          const identity = ctx.http?.authInfo?.extra?.identity as AgentIdentity | undefined;
          if (!identity) return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
          const clientVersion = (ctx.http?.authInfo?.extra?.userAgent as string | undefined) ?? null;
          const outcome = await runTool(tool, identity, input as Record<string, unknown>, clientVersion);
          if ("error" in outcome) return { content: [{ type: "text", text: outcome.error as string }], isError: true };
          return { content: [{ type: "text", text: JSON.stringify(outcome.result, null, 2) }] };
        },
      );
    }
  },
  { serverInfo: { name: "sparkly", version: process.env.npm_package_version ?? "1.0.0" } },
);

const authHandler = withMcpAuth(
  handler,
  async (req, bearer) => {
    if (!bearer) return undefined;
    const identity = await verifyBearer(bearer);
    if (!identity) return undefined;
    return {
      token: bearer,
      scopes: identity.scopes,
      clientId: identity.connectionId,
      extra: { identity, userAgent: req.headers.get("user-agent")?.slice(0, 120) ?? null },
    };
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp" },
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
