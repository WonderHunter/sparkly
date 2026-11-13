import "server-only";
import type postgres from "postgres";
import type { AgentClient } from "./clients";
import { randomToken, sha256Hex, verifyPkceS256 } from "./crypto";
import { db } from "./db";
import type { AgentScope } from "./scopes";

export const ACCESS_TOKEN_SECONDS = 3600;
const CODE_SECONDS = 600;

export class OAuthError extends Error {
  constructor(
    readonly code: "invalid_request" | "invalid_grant" | "invalid_client" | "unsupported_grant_type" | "invalid_target" | "access_denied",
    message: string,
  ) {
    super(message);
  }
}

/** Code d'autorisation, émis quand la personne clique « Autoriser » sur la page de consentement. */
export async function createAuthorizationCode(input: {
  client: AgentClient;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: AgentScope[];
  resource: string;
  expiresOn: Date;
}): Promise<string> {
  const code = randomToken("spa");
  await db()`
    insert into public.agent_codes (hash, client_id, user_id, redirect_uri, code_challenge, scopes, resource, expires_on, expires_at)
    values (${sha256Hex(code)}, ${input.client.id}, ${input.userId}, ${input.redirectUri}, ${input.codeChallenge},
            ${input.scopes}, ${input.resource}, ${input.expiresOn}, now() + make_interval(secs => ${CODE_SECONDS}))`;
  return code;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function issueTokens(sql: postgres.TransactionSql, connectionId: string, refreshExpiresAt: Date, scopes: string[]): Promise<TokenResponse> {
  const access = randomToken("spt");
  const refresh = randomToken("spr");
  await sql`
    insert into public.agent_tokens (hash, connection_id, kind, expires_at) values
      (${sha256Hex(access)}, ${connectionId}, 'access', least(now() + make_interval(secs => ${ACCESS_TOKEN_SECONDS}), ${refreshExpiresAt})),
      (${sha256Hex(refresh)}, ${connectionId}, 'refresh', ${refreshExpiresAt})`;
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TOKEN_SECONDS, refresh_token: refresh, scope: scopes.join(" ") };
}

/** Échange d'un code (grant_type=authorization_code) : vérifie client, redirection, PKCE et audience. */
export async function exchangeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string | null;
  expectedResource: string;
}): Promise<TokenResponse> {
  return db().begin(async (sql) => {
    const [row] = await sql<
      { hash: string; client_id: string; client_ref: string; client_name: string; client_blocked: Date | null; user_id: string; redirect_uri: string;
        code_challenge: string; scopes: string[]; resource: string; expires_on: Date; expires_at: Date; used_at: Date | null; connection_id: string | null }[]
    >`
      select c.*, cl.client_id as client_ref, cl.name as client_name, cl.blocked_at as client_blocked
      from public.agent_codes c join public.agent_clients cl on cl.id = c.client_id
      where c.hash = ${sha256Hex(input.code)}
      for update of c`;
    if (!row) throw new OAuthError("invalid_grant", "Code inconnu.");
    if (row.used_at) {
      // Code rejoué : on coupe la connexion qu'il avait ouverte (RFC 6749 § 4.1.2).
      if (row.connection_id) await sql`update public.agent_connections set revoked_at = now() where id = ${row.connection_id} and revoked_at is null`;
      throw new OAuthError("invalid_grant", "Code déjà utilisé.");
    }
    if (row.expires_at.getTime() < Date.now()) throw new OAuthError("invalid_grant", "Code expiré.");
    if (row.client_ref !== input.clientId) throw new OAuthError("invalid_grant", "Ce code n'a pas été émis pour cette application.");
    if (row.client_blocked) throw new OAuthError("invalid_client", "Application bloquée par l'équipe pédagogique.");
    if (row.redirect_uri !== input.redirectUri) throw new OAuthError("invalid_grant", "Adresse de redirection différente.");
    if (!verifyPkceS256(input.codeVerifier, row.code_challenge)) throw new OAuthError("invalid_grant", "Vérification PKCE échouée.");
    if ((input.resource ?? input.expectedResource) !== row.resource || row.resource !== input.expectedResource) {
      throw new OAuthError("invalid_target", "Ressource inattendue.");
    }

    const [conn] = await sql<{ id: string }[]>`
      insert into public.agent_connections (user_id, kind, client_id, name, scopes, expires_at)
      values (${row.user_id}, 'oauth', ${row.client_id}, ${row.client_name}, ${row.scopes}, ${row.expires_on})
      returning id`;
    await sql`update public.agent_codes set used_at = now(), connection_id = ${conn.id} where hash = ${row.hash}`;
    return issueTokens(sql, conn.id, row.expires_on, row.scopes);
  });
}

/** Rafraîchissement avec rotation : l'ancien jeton ne sert plus ; réutilisé, il révoque la connexion. */
export async function refreshTokens(input: { refreshToken: string; clientId: string }): Promise<TokenResponse> {
  const result = await db().begin(async (sql) => {
    const [row] = await sql<
      { hash: string; used_at: Date | null; expires_at: Date; connection_id: string; revoked_at: Date | null; conn_expires_at: Date;
        scopes: string[]; client_ref: string | null; client_blocked: Date | null }[]
    >`
      select t.hash, t.used_at, t.expires_at, t.connection_id, c.revoked_at, c.expires_at as conn_expires_at, c.scopes,
             cl.client_id as client_ref, cl.blocked_at as client_blocked
      from public.agent_tokens t
      join public.agent_connections c on c.id = t.connection_id
      left join public.agent_clients cl on cl.id = c.client_id
      where t.hash = ${sha256Hex(input.refreshToken)} and t.kind = 'refresh'
      for update of t`;
    if (!row) throw new OAuthError("invalid_grant", "Jeton inconnu.");
    if (row.client_ref !== input.clientId) throw new OAuthError("invalid_grant", "Ce jeton n'a pas été émis pour cette application.");
    if (row.used_at) {
      await sql`update public.agent_connections set revoked_at = now() where id = ${row.connection_id} and revoked_at is null`;
      return { reused: true as const };
    }
    if (row.revoked_at || row.conn_expires_at.getTime() < Date.now() || row.expires_at.getTime() < Date.now()) {
      throw new OAuthError("invalid_grant", "Connexion expirée ou révoquée.");
    }
    if (row.client_blocked) throw new OAuthError("invalid_client", "Application bloquée par l'équipe pédagogique.");
    await sql`update public.agent_tokens set used_at = now() where hash = ${row.hash}`;
    return issueTokens(sql, row.connection_id, row.conn_expires_at, row.scopes);
  });
  // La révocation pour réutilisation doit être enregistrée : on lève l'erreur hors de la transaction.
  if ("reused" in result) throw new OAuthError("invalid_grant", "Jeton déjà utilisé : la connexion a été révoquée.");
  return result;
}

/** Révocation par l'application (RFC 7009) : toute la connexion est coupée. Toujours un succès. */
export async function revokeToken(token: string): Promise<void> {
  await db()`
    update public.agent_connections set revoked_at = now()
    where revoked_at is null and id = (select connection_id from public.agent_tokens where hash = ${sha256Hex(token)})`;
}

export interface AgentIdentity {
  connectionId: string;
  userId: string;
  scopes: AgentScope[];
  clientName: string;
}

/**
 * Vérifie un jeton d'accès ou une clé d'API à chaque appel MCP (pas de cache : la révocation
 * est immédiate). Refuse si : expiré, révoqué, application bloquée, compte suspendu, agents désactivés.
 */
export async function verifyBearer(token: string): Promise<AgentIdentity | null> {
  const kind = token.startsWith("spk_") ? "api_key" : "access";
  const sql = db();
  // Les permissions désactivées par l'admin sont retirées à chaque appel.
  const [row] = await sql<{ connection_id: string; user_id: string; scopes: AgentScope[]; name: string; client_name: string | null; last_used_at: Date | null }[]>`
    select c.id as connection_id, c.user_id, c.name, cl.name as client_name, c.last_used_at,
           array(select unnest(c.scopes) except select unnest(s.agent_disabled_scopes)) as scopes
    from public.agent_tokens t
    join public.agent_connections c on c.id = t.connection_id
    join public.profiles p on p.id = c.user_id
    left join public.agent_clients cl on cl.id = c.client_id
    cross join public.app_settings s
    where s.id and t.hash = ${sha256Hex(token)} and t.kind = ${kind}
      and t.expires_at > now() and c.expires_at > now() and c.revoked_at is null
      and p.suspended_at is null
      and (cl.id is null or cl.blocked_at is null)
      and s.agents_enabled`;
  if (!row) return null;
  if (!row.last_used_at || Date.now() - row.last_used_at.getTime() > 60_000) {
    await sql`update public.agent_connections set last_used_at = now() where id = ${row.connection_id}`;
  }
  return { connectionId: row.connection_id, userId: row.user_id, scopes: row.scopes, clientName: row.client_name ?? row.name };
}
