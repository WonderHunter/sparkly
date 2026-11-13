import "server-only";
import { NextResponse } from "next/server";
import { agentUrls, CORS_HEADERS, SUPPORTED_SCOPES } from "./config";

/** Métadonnées de ressource protégée (RFC 9728) du serveur MCP. */
export async function protectedResourceMetadata() {
  const urls = await agentUrls();
  return NextResponse.json(
    {
      resource: urls.resource,
      authorization_servers: [urls.issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: SUPPORTED_SCOPES,
      resource_name: "Sparkly",
    },
    { headers: CORS_HEADERS },
  );
}
