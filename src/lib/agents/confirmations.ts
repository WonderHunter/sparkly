import "server-only";
import { randomInt } from "node:crypto";
import { sha256Hex } from "./crypto";
import { db } from "./db";

/** Durée de validité d'un récapitulatif : au-delà, l'agent doit en redemander un. */
const CONFIRMATION_MINUTES = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I

/** Code court, lisible à voix haute ou à recopier (ex. « K7P2QX »). */
export function confirmationCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Empreinte des paramètres exacts d'une action (hors code de confirmation), indépendante de l'ordre des clés. */
export function payloadHash(tool: string, input: Record<string, unknown>): string {
  const entries = Object.entries(input)
    .filter(([key, value]) => key !== "confirmation" && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return sha256Hex(`${tool}:${JSON.stringify(entries)}`);
}

const codeHash = (connectionId: string, code: string) => sha256Hex(`${connectionId}:${code.trim().toUpperCase()}`);

export async function createConfirmation(connectionId: string, tool: string, input: Record<string, unknown>, summary: string) {
  const code = confirmationCode();
  await db()`
    insert into public.agent_confirmations (hash, connection_id, tool, payload_hash, summary, expires_at)
    values (${codeHash(connectionId, code)}, ${connectionId}, ${tool}, ${payloadHash(tool, input)}, ${summary},
            now() + make_interval(mins => ${CONFIRMATION_MINUTES}))`;
  return { code, minutes: CONFIRMATION_MINUTES };
}

/** Vrai si le code correspond à cette connexion, à cet outil et à ces paramètres exacts ; il ne resservira pas. */
export async function consumeConfirmation(connectionId: string, tool: string, input: Record<string, unknown>, code: string) {
  const rows = await db()`
    update public.agent_confirmations set used_at = now()
    where hash = ${codeHash(connectionId, code)} and connection_id = ${connectionId} and tool = ${tool}
      and payload_hash = ${payloadHash(tool, input)} and used_at is null and expires_at > now()
    returning hash`;
  return rows.length === 1;
}
