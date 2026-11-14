import { NextResponse } from "next/server";
import { agentUrls, CORS_HEADERS, SUPPORTED_SCOPES } from "@/lib/agents/config";

/** Métadonnées du serveur d'autorisation Sparkly (RFC 8414). */
export async function GET() {
  const urls = await agentUrls();
  return NextResponse.json(
    {
      issuer: urls.issuer,
      authorization_endpoint: urls.authorize,
      token_endpoint: urls.token,
      registration_endpoint: urls.register,
      revocation_endpoint: urls.revoke,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      // Public (PKCE seul) en priorité ; secret accepté pour les applications qui s'enregistrent ainsi.
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      revocation_endpoint_auth_methods_supported: ["none"],
      // Documents de métadonnées de client (voie recommandée par la spec MCP).
      client_id_metadata_document_supported: true,
      // RFC 9207 : `iss` dans la réponse d'autorisation.
      authorization_response_iss_parameter_supported: true,
      scopes_supported: SUPPORTED_SCOPES,
    },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
