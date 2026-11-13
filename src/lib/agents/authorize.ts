import "server-only";
import { type AgentClient, redirectUriMatches, resolveClient } from "./clients";
import { agentUrls } from "./config";

export interface AuthorizeRequest {
  client: AgentClient;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scope: string | null;
  resource: string;
}

/**
 * Valide une demande d'autorisation. Tant que l'application et l'adresse de redirection ne sont pas
 * établies, on n'y redirige jamais (`fatal`) : on affiche l'erreur sur Sparkly.
 */
export async function parseAuthorizeRequest(
  params: Record<string, string | string[] | undefined>,
): Promise<{ ok: true; request: AuthorizeRequest } | { ok: false; fatal: true; message: string } | { ok: false; fatal: false; redirect: string }> {
  const get = (key: string) => (typeof params[key] === "string" && params[key] ? (params[key] as string) : null);
  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  if (!clientId || !redirectUri) return { ok: false, fatal: true, message: "Demande incomplète : application ou adresse de retour manquante." };

  let client: AgentClient;
  try {
    client = await resolveClient(clientId);
  } catch (error) {
    return { ok: false, fatal: true, message: `Application non reconnue : ${(error as Error).message}` };
  }
  if (!redirectUriMatches(client.redirectUris, redirectUri)) {
    return { ok: false, fatal: true, message: "L'adresse de retour ne correspond pas à cette application." };
  }
  if (client.blocked) return { ok: false, fatal: true, message: "Cette application a été bloquée par l'équipe pédagogique." };

  const { issuer, resource } = await agentUrls();
  const state = get("state");
  const fail = (error: string, description: string) => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state) url.searchParams.set("state", state);
    url.searchParams.set("iss", issuer);
    return { ok: false as const, fatal: false as const, redirect: url.toString() };
  };

  if (get("response_type") !== "code") return fail("unsupported_response_type", "Seul response_type=code est accepté.");
  const codeChallenge = get("code_challenge");
  if (!codeChallenge || get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9\-_]{43}$/.test(codeChallenge)) {
    return fail("invalid_request", "PKCE S256 obligatoire.");
  }
  const requestedResource = get("resource");
  if (requestedResource && requestedResource !== resource) return fail("invalid_target", "Ressource inconnue.");

  return { ok: true, request: { client, clientId, redirectUri, codeChallenge, state, scope: get("scope"), resource } };
}

/** Adresse de retour vers l'application, avec le code (ou l'erreur), l'état et l'émetteur (RFC 9207). */
export async function callbackUrl(request: AuthorizeRequest, values: Record<string, string>): Promise<string> {
  const { issuer } = await agentUrls();
  const url = new URL(request.redirectUri);
  for (const [k, v] of Object.entries(values)) url.searchParams.set(k, v);
  if (request.state) url.searchParams.set("state", request.state);
  url.searchParams.set("iss", issuer);
  return url.toString();
}
