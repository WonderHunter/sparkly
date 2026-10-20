import { z } from "zod";
import { isAllowedEmail, normalizeEmail } from "@/lib/domain/email";

export const emailSchema = (allowedDomains: readonly string[]) =>
  z
    .string()
    .trim()
    .min(1, "Indique ton adresse e-mail universitaire.")
    .transform(normalizeEmail)
    .refine((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), "Cette adresse e-mail n'est pas valide.")
    .refine(
      (email) => isAllowedEmail(email, allowedDomains),
      `Sparkly est réservé aux adresses ${allowedDomains.map((d) => `@${d}`).join(" et ")}.`,
    );

// Supabase autorise des codes de 6 à 10 chiffres selon le réglage « Email OTP Length ».
export const otpSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/, "Recopie le code reçu par e-mail (6 à 10 chiffres)."));

const SAFE_ORIGIN = "http://sparkly.invalid";

/**
 * N'accepte qu'un chemin interne pour éviter les redirections ouvertes.
 * Refuse l'antislash et les caractères de contrôle (« /\t/evil » devient
 * « //evil » une fois les tabulations supprimées par le navigateur), puis
 * vérifie qu'une fois résolue l'URL reste sur la même origine.
 */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
