import "server-only";
import { getSiteUrl } from "@/lib/site-url";
import { AGENT_SCOPES } from "./scopes";

/** Émetteur OAuth = le site lui-même ; ressource protégée = le serveur MCP. */
export async function agentUrls() {
  const issuer = await getSiteUrl();
  return {
    issuer,
    resource: `${issuer}/api/mcp`,
    authorize: `${issuer}/oauth/authorize`,
    token: `${issuer}/oauth/token`,
    register: `${issuer}/oauth/register`,
    revoke: `${issuer}/oauth/revoke`,
    resourceMetadata: `${issuer}/.well-known/oauth-protected-resource/api/mcp`,
  };
}

export const SUPPORTED_SCOPES = Object.keys(AGENT_SCOPES);

/** En-têtes CORS des routes publiques (les clients appellent parfois depuis un navigateur). */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};
