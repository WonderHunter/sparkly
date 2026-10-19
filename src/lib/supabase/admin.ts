import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client « service role » : contourne la RLS. À n'utiliser que dans des actions
 * serveur qui ont déjà vérifié que l'appelant est administrateur.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secret) {
    throw new Error("SUPABASE_SECRET_KEY est requise pour les actions d'administration.");
  }
  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
