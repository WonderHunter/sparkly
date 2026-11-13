"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { randomToken, sha256Hex } from "@/lib/agents/crypto";
import { grantableScopes, isAgentScope } from "@/lib/agents/scopes";
import { createClient } from "@/lib/supabase/server";

export type CreateKeyState = { error?: string; secret?: string; name?: string };

/** Fin de journée (23 h 59, heure de Paris) d'une date AAAA-MM-JJ. */
function endOfDayParis(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const probe = new Date(`${date}T23:59:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value.replace("GMT", "");
  const hours = offset ? Number(offset) : 0;
  return new Date(probe.getTime() - hours * 3600 * 1000);
}

const nameSchema = z.string().trim().min(1, "Donne un nom à la clé.").max(80, "80 caractères maximum.");

/** Crée une clé d'API : le secret n'est montré qu'une fois, seule son empreinte est enregistrée. */
export async function createApiKey(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const viewer = await requireViewer("/settings/agents");
  const name = nameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("agent_disabled_scopes").single();
  const grantable = grantableScopes(viewer.profile.role, settings?.agent_disabled_scopes ?? []);
  const scopes = formData.getAll("scopes").filter((s): s is string => typeof s === "string").filter(isAgentScope).filter((s) => grantable.includes(s));
  if (scopes.length === 0) return { error: "Choisis au moins une permission." };
  const expiresAt = endOfDayParis(String(formData.get("expires") ?? ""));
  if (!expiresAt) return { error: "Choisis une date d'expiration." };

  const secret = randomToken("spk");
  const { error } = await supabase.rpc("create_agent_api_key", {
    p_name: name.data,
    p_scopes: scopes,
    p_expires_at: expiresAt.toISOString(),
    p_key_hash: sha256Hex(secret),
    p_key_prefix: secret.slice(0, 12),
  });
  if (error) return { error: error.message };
  revalidatePath("/settings/agents");
  return { secret, name: name.data };
}

export type ExpiryState = { ok?: boolean; error?: string };

/** Raccourcit ou prolonge une connexion, dans la limite du plafond (vérifié en base). */
export async function setConnectionExpiry(connectionId: string, _prev: ExpiryState, formData: FormData): Promise<ExpiryState> {
  await requireViewer("/settings/agents");
  const expiresAt = endOfDayParis(String(formData.get("expires") ?? ""));
  if (!expiresAt) return { error: "Date invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_agent_connection_expiry", { p_connection: connectionId, p_expires_at: expiresAt.toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/settings/agents");
  return { ok: true };
}

export async function revokeConnection(connectionId: string) {
  await requireViewer("/settings/agents");
  const supabase = await createClient();
  await supabase.rpc("revoke_agent_connection", { p_connection: connectionId });
  revalidatePath("/settings/agents");
}

export async function revokeAllConnections() {
  await requireViewer("/settings/agents");
  const supabase = await createClient();
  await supabase.rpc("revoke_all_agent_connections");
  revalidatePath("/settings/agents");
}
