import "server-only";
import { lookup } from "node:dns/promises";
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { randomToken, sha256Hex } from "./crypto";
import { db } from "./db";

/** Refus attendu (application invalide, adresse refusée…) : son message peut être montré tel quel. */
export class ClientError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_client_metadata" | "invalid_redirect_uri" | "temporarily_unavailable" = "invalid_client_metadata",
  ) {
    super(message);
  }
}

/** Méthodes d'authentification au point de jeton acceptées à l'enregistrement. */
export const CLIENT_AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"] as const;
export type ClientAuthMethod = (typeof CLIENT_AUTH_METHODS)[number];

export interface AgentClient {
  id: string;
  clientId: string;
  kind: "metadata" | "registered";
  name: string;
  logoUrl: string | null;
  redirectUris: string[];
  verified: boolean;
  blocked: boolean;
  authMethod: ClientAuthMethod;
}

/** Domaines des applications connues : leurs documents de métadonnées valent badge « vérifiée ». */
const KNOWN_DOMAINS = ["claude.ai", "claude.com", "anthropic.com", "chatgpt.com", "openai.com", "cursor.com", "cursor.sh"];

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** URI de redirection acceptable : https, ou http sur la boucle locale (applications installées, RFC 8252). */
export function isAcceptableRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && LOOPBACK.has(url.hostname);
  } catch {
    return false;
  }
}

/** Comparaison exacte, sauf le port pour la boucle locale (RFC 8252 § 7.3). */
export function redirectUriMatches(registered: string[], candidate: string): boolean {
  if (registered.includes(candidate)) return true;
  try {
    const c = new URL(candidate);
    if (c.protocol !== "http:" || !LOOPBACK.has(c.hostname)) return false;
    return registered.some((r) => {
      const u = new URL(r);
      return u.protocol === c.protocol && u.hostname === c.hostname && u.pathname === c.pathname && u.search === c.search;
    });
  } catch {
    return false;
  }
}

function isKnownHost(host: string): boolean {
  return KNOWN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const a = address.toLowerCase();
    return a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80") || a.startsWith("::ffff:");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

const metadataSchema = z.object({
  client_id: z.string(),
  client_name: z.string().trim().min(1).max(100),
  redirect_uris: z.array(z.string()).min(1).max(10),
  logo_uri: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
});

/**
 * Document de métadonnées de client (spec MCP) : l'identifiant de l'application est l'URL HTTPS
 * de ce document. Récupération protégée : HTTPS uniquement, pas d'adresse privée, pas de redirection,
 * 3 s et 10 Ko au plus. Mis en cache 24 h dans agent_clients.
 */
async function fetchClientMetadata(clientId: string): Promise<z.infer<typeof metadataSchema>> {
  const url = new URL(clientId);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.pathname === "/") {
    throw new ClientError("Identifiant d'application invalide.");
  }
  if (isIP(url.hostname) || url.hostname === "localhost" || !url.hostname.includes(".")) {
    throw new ClientError("Hôte d'application refusé.");
  }
  const addresses = await lookup(url.hostname, { all: true }).catch(() => {
    throw new ClientError("Hôte d'application introuvable.");
  });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new ClientError("Hôte d'application refusé.");

  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(3000), headers: { accept: "application/json" } }).catch(() => {
    throw new ClientError("Document de l'application injoignable (délai dépassé ou redirection).");
  });
  if (!res.ok) throw new ClientError("Document de l'application introuvable.");
  const text = await res.text();
  if (text.length > 10_000) throw new ClientError("Document de l'application trop volumineux.");
  let parsed: z.infer<typeof metadataSchema>;
  try {
    parsed = metadataSchema.parse(JSON.parse(text));
  } catch {
    throw new ClientError("Document de l'application illisible.");
  }
  if (parsed.client_id !== clientId) throw new ClientError("Le document ne correspond pas à l'application.");
  if (parsed.token_endpoint_auth_method && parsed.token_endpoint_auth_method !== "none") {
    throw new ClientError("Seules les applications publiques (PKCE) sont acceptées.");
  }
  if (!parsed.redirect_uris.every(isAcceptableRedirectUri)) throw new ClientError("Adresse de redirection refusée.");
  return parsed;
}

type ClientRow = {
  id: string;
  client_id: string;
  kind: "metadata" | "registered";
  name: string;
  logo_url: string | null;
  redirect_uris: string[];
  verified: boolean;
  blocked_at: Date | null;
  metadata_fetched_at: Date | null;
  token_endpoint_auth_method: ClientAuthMethod;
  secret_hash: string | null;
};

function toClient(row: ClientRow): AgentClient {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    name: row.name,
    logoUrl: row.logo_url,
    redirectUris: row.redirect_uris,
    verified: row.verified,
    blocked: row.blocked_at !== null,
    authMethod: row.token_endpoint_auth_method,
  };
}

/** Retrouve l'application : document de métadonnées (URL HTTPS) ou application enregistrée. */
export async function resolveClient(clientId: string): Promise<AgentClient> {
  const sql = db();
  const [row] = await sql<ClientRow[]>`select * from public.agent_clients where client_id = ${clientId}`;
  const isUrl = clientId.startsWith("https://");
  const fresh = row?.metadata_fetched_at && Date.now() - row.metadata_fetched_at.getTime() < 24 * 3600 * 1000;
  if (!isUrl || (row && fresh)) {
    if (!row) throw new ClientError("Application inconnue.");
    return toClient(row);
  }

  const meta = await fetchClientMetadata(clientId);
  const logo = meta.logo_uri?.startsWith("https://") ? meta.logo_uri : null;
  const verified = row?.verified || isKnownHost(new URL(clientId).hostname);
  const [saved] = await sql<ClientRow[]>`
    insert into public.agent_clients (client_id, kind, name, logo_url, redirect_uris, verified, metadata_fetched_at)
    values (${clientId}, 'metadata', ${meta.client_name}, ${logo}, ${meta.redirect_uris}, ${verified}, now())
    on conflict (client_id) do update set
      name = excluded.name, logo_url = excluded.logo_url, redirect_uris = excluded.redirect_uris,
      verified = public.agent_clients.verified or excluded.verified, metadata_fetched_at = now()
    returning *`;
  return toClient(saved);
}

export const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(100).optional(),
  redirect_uris: z.array(z.string()).min(1).max(10),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  logo_uri: z.string().optional(),
});

/**
 * Enregistrement dynamique (RFC 7591), gardé pour les applications qui ne publient pas encore de document
 * de métadonnées. Le nom est auto-déclaré : l'application n'est jamais « vérifiée » par ce biais.
 */
export async function registerClient(input: z.infer<typeof registrationSchema>): Promise<{ client: AgentClient; secret: string | null }> {
  const method = (input.token_endpoint_auth_method ?? "none") as ClientAuthMethod;
  if (!CLIENT_AUTH_METHODS.includes(method)) {
    throw new ClientError("Méthode d'authentification non prise en charge (none, client_secret_post ou client_secret_basic).");
  }
  if (!input.redirect_uris.every(isAcceptableRedirectUri)) {
    throw new ClientError("Adresse de redirection refusée (https, ou http://localhost).", "invalid_redirect_uri");
  }
  const sql = db();
  const [{ recent }] = await sql<{ recent: number }[]>`
    select count(*)::int as recent from public.agent_clients where kind = 'registered' and created_at > now() - interval '1 hour'`;
  if (recent >= 100) throw new ClientError("Trop d'enregistrements, réessaie plus tard.", "temporarily_unavailable");

  const logo = input.logo_uri?.startsWith("https://") ? input.logo_uri : null;
  // Application « confidentielle » : un secret remis une seule fois, dont on ne garde que l'empreinte.
  const secret = method === "none" ? null : randomToken("scs");
  const [row] = await sql<ClientRow[]>`
    insert into public.agent_clients (client_id, kind, name, logo_url, redirect_uris, token_endpoint_auth_method, secret_hash)
    values (${randomToken("spc")}, 'registered', ${input.client_name ?? "Application"}, ${logo}, ${input.redirect_uris},
            ${method}, ${secret ? sha256Hex(secret) : null})
    returning *`;
  return { client: toClient(row), secret };
}

/**
 * Authentifie l'application au point de jeton : rien à vérifier pour une application publique
 * (PKCE suffit) ; pour une application enregistrée avec un secret, il doit correspondre.
 */
export async function authenticateClient(clientId: string, secret: string | null): Promise<boolean> {
  const [row] = await db()<{ secret_hash: string | null }[]>`select secret_hash from public.agent_clients where client_id = ${clientId}`;
  if (!row?.secret_hash) return true;
  if (!secret) return false;
  const given = Buffer.from(sha256Hex(secret), "hex");
  const expected = Buffer.from(row.secret_hash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
