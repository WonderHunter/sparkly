import { beforeAll } from "vitest";

/**
 * Les tests d'intégration tournent contre le Supabase local (`pnpm db:start`).
 * Valeurs par défaut de la CLI Supabase : aucune donnée sensible.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.MAILPIT_URL ??= "http://127.0.0.1:54324";

beforeAll(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "Variables Supabase manquantes : lance `pnpm db:start` puis exporte NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY (voir .env.example).",
    );
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
  }).catch(() => null);
  if (!res?.ok) throw new Error("Supabase local injoignable : lance `pnpm db:start`.");
});
