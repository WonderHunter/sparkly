// Variables d'environnement publiques (exposées au navigateur).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * URL publique du site, par ordre de priorité :
 * 1. NEXT_PUBLIC_SITE_URL (à définir une fois le nom de domaine choisi) ;
 * 2. sur Vercel, l'URL de production du projet, ou celle du déploiement de preview ;
 * 3. en local, http://localhost:3000.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example).",
    );
  }
}
