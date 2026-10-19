export const DEFAULT_ALLOWED_DOMAINS = ["etudiant.univ-reims.fr", "univ-reims.fr"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : normalizeEmail(email.slice(at + 1));
}

/**
 * Vérifie le domaine exact (pas les sous-domaines arbitraires) : « univ-reims.fr »
 * n'autorise pas « faux.univ-reims.fr ». Le contrôle définitif est fait en base (hook Auth).
 */
export function isAllowedEmail(email: string, allowed: readonly string[] = DEFAULT_ALLOWED_DOMAINS): boolean {
  const normalized = normalizeEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return false;
  return allowed.includes(emailDomain(normalized));
}
