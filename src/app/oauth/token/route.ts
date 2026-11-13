import { NextResponse, type NextRequest } from "next/server";
import { authenticateClient } from "@/lib/agents/clients";
import { agentUrls, CORS_HEADERS } from "@/lib/agents/config";
import { exchangeCode, OAuthError, refreshTokens } from "@/lib/agents/tokens";

const NO_STORE = { ...CORS_HEADERS, "Cache-Control": "no-store", Pragma: "no-cache" };

function oauthError(code: string, description: string, status = 400) {
  return NextResponse.json({ error: code, error_description: description }, { status, headers: NO_STORE });
}

/** Point de jeton : code d'autorisation + PKCE, ou rafraîchissement avec rotation. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return oauthError("invalid_request", "Corps attendu en application/x-www-form-urlencoded.");
  const get = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  // Identifiants de l'application : en-tête Basic (client_secret_basic) ou corps (client_secret_post / public).
  let clientId = get("client_id");
  let clientSecret = get("client_secret");
  const basic = request.headers.get("authorization");
  if (basic?.toLowerCase().startsWith("basic ")) {
    const decoded = Buffer.from(basic.slice(6).trim(), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep > 0) {
      clientId = decodeURIComponent(decoded.slice(0, sep));
      clientSecret = decodeURIComponent(decoded.slice(sep + 1)) || null;
    }
  }
  if (!clientId) return oauthError("invalid_client", "client_id manquant.", 401);

  try {
    if (!(await authenticateClient(clientId, clientSecret))) return oauthError("invalid_client", "Secret de l'application invalide.", 401);
    const grant = get("grant_type");
    if (grant === "authorization_code") {
      const code = get("code");
      const redirectUri = get("redirect_uri");
      const codeVerifier = get("code_verifier");
      if (!code || !redirectUri || !codeVerifier) return oauthError("invalid_request", "code, redirect_uri et code_verifier sont obligatoires.");
      const { resource } = await agentUrls();
      const tokens = await exchangeCode({ code, clientId, redirectUri, codeVerifier, resource: get("resource"), expectedResource: resource });
      return NextResponse.json(tokens, { headers: NO_STORE });
    }
    if (grant === "refresh_token") {
      const refreshToken = get("refresh_token");
      if (!refreshToken) return oauthError("invalid_request", "refresh_token manquant.");
      const tokens = await refreshTokens({ refreshToken, clientId });
      return NextResponse.json(tokens, { headers: NO_STORE });
    }
    return oauthError("unsupported_grant_type", "Seuls authorization_code et refresh_token sont acceptés.");
  } catch (error) {
    if (error instanceof OAuthError) return oauthError(error.code, error.message, error.code === "invalid_client" ? 401 : 400);
    console.error("Point de jeton :", error);
    return oauthError("server_error", "Erreur technique côté Sparkly, réessaie dans quelques minutes.", 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
