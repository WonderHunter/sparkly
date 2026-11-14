import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { runTool, TOOLS } from "@/lib/agents/mcp-tools";
import type { AgentIdentity } from "@/lib/agents/tokens";
import { verifyBearer } from "@/lib/agents/tokens";
import { CORS_HEADERS } from "@/lib/agents/config";

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

/** Requêtes dont la vérification du jeton a échoué pour une raison technique (base injoignable…). */
const outages = new WeakSet<Request>();

const authHandler = withMcpAuth(
  handler,
  async (req, bearer) => {
    if (!bearer) return undefined;
    let identity: AgentIdentity | null;
    try {
      identity = await verifyBearer(bearer);
    } catch (error) {
      // Sans ça, mcp-handler répondrait « jeton invalide » (401) et masquerait la panne.
      console.error("MCP : vérification du jeton impossible :", error);
      outages.add(req);
      return undefined;
    }
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

/** CORS sur toutes les réponses (clients MCP dans un navigateur) et 503 explicite en cas de panne. */
async function route(req: Request) {
  const response = await authHandler(req);
  if (outages.has(req)) {
    return Response.json(
      { error: "temporarily_unavailable", error_description: "Sparkly ne peut pas vérifier les accès pour l'instant. Réessaie dans quelques minutes." },
      { status: 503, headers: { ...CORS_HEADERS, "Retry-After": "60" } },
    );
  }
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export { route as GET, route as POST, route as DELETE };
