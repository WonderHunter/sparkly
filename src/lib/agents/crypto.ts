import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Jeton opaque : 256 bits aléatoires, préfixés pour être reconnaissables (ex. `spk_…` pour une clé). */
export function randomToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

/** Empreinte stockée en base à la place du jeton. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** PKCE S256 (RFC 7636) : BASE64URL(SHA256(verifier)) doit valoir le défi envoyé à l'autorisation. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const computed = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const expected = Buffer.from(challenge);
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}
