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

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Le code contient 6 chiffres.");

/** N'accepte qu'un chemin interne pour éviter les redirections ouvertes. */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
