"use server";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { callbackUrl, parseAuthorizeRequest } from "@/lib/agents/authorize";
import { db } from "@/lib/agents/db";
import { grantableScopes, isAgentScope } from "@/lib/agents/scopes";
import { createAuthorizationCode } from "@/lib/agents/tokens";

const DURATIONS = new Set(["7", "30", "90"]);

function paramsOf(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]) {
    const value = formData.get(key);
    if (typeof value === "string" && value) params[key] = value;
  }
  return params;
}

/** « Autoriser » : tout est revérifié côté serveur avant d'émettre le code. */
export async function approveAuthorization(formData: FormData) {
  const viewer = await getViewer();
  const params = paramsOf(formData);
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${new URLSearchParams(params)}`)}`);
  const parsed = await parseAuthorizeRequest(params);
  if (!parsed.ok) redirect(parsed.fatal ? "/oauth/authorize" : parsed.redirect);
  const { request } = parsed;

  const [{ disabled }] = await db()<{ disabled: string[] }[]>`select agent_disabled_scopes as disabled from public.app_settings where id`;
  const grantable = grantableScopes(viewer.profile.role, disabled);
  const scopes = formData.getAll("scopes").filter((s): s is string => typeof s === "string").filter(isAgentScope).filter((s) => grantable.includes(s));
  if (viewer.isSuspended || scopes.length === 0) redirect(await callbackUrl(request, { error: "access_denied", error_description: "Aucune permission accordée." }));

  const days = String(formData.get("duration") ?? "30");
  const sql = db();
  const [{ enabled, cap }] = await sql<{ enabled: boolean; cap: Date }[]>`
    select (select agents_enabled from public.app_settings where id) as enabled, public.agent_expiry_cap(${scopes}) as cap`;
  if (!enabled) redirect(await callbackUrl(request, { error: "access_denied", error_description: "Agents IA désactivés." }));
  const wanted = new Date(Date.now() + Number(DURATIONS.has(days) ? days : "30") * 24 * 3600 * 1000);
  const expiresOn = wanted < cap ? wanted : cap;

  const code = await createAuthorizationCode({
    client: request.client,
    userId: viewer.id,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    scopes,
    resource: request.resource,
    expiresOn,
  });
  redirect(await callbackUrl(request, { code }));
}

/** « Refuser » : on rend la main à l'application avec access_denied. */
export async function denyAuthorization(formData: FormData) {
  const parsed = await parseAuthorizeRequest(paramsOf(formData));
  if (!parsed.ok) redirect(parsed.fatal ? "/" : parsed.redirect);
  redirect(await callbackUrl(parsed.request, { error: "access_denied", error_description: "La personne a refusé l'accès." }));
}
