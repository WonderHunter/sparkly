import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function anonClient(): Client {
  return createClient<Database>(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): Client {
  return createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Lit le dernier code OTP envoyé à `email` dans Mailpit (boîte e-mail locale). */
export async function readOtp(email: string): Promise<string> {
  const base = process.env.MAILPIT_URL!;
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages?.[0]) {
      const msg = await fetch(`${base}/api/v1/message/${messages[0].ID}`);
      const { Text } = (await msg.json()) as { Text: string };
      const code = Text.match(/\b\d{6}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun code reçu pour ${email}`);
}

export async function clearMailbox(email: string) {
  await fetch(`${process.env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`, {
    method: "DELETE",
  });
}

/** Ouvre une vraie session par OTP, comme dans l'application. */
export async function signInWithOtp(email: string): Promise<Client> {
  await clearMailbox(email);
  const client = anonClient();
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  const token = await readOtp(email);
  const { error: verifyError } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (verifyError) throw verifyError;
  return client;
}

export function uniqueEmail(prefix = "test", domain = "etudiant.univ-reims.fr") {
  return `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@${domain}`;
}

/** Supprime les comptes créés par un test (cascade sur profils, projets…). */
export async function deleteUsersByEmail(emails: string[]) {
  const admin = serviceClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (!user.email || !emails.includes(user.email)) continue;
    // Les projets survivent à leur créateur (created_by passe à null) : on les retire d'abord.
    await admin.from("projects").delete().eq("created_by", user.id);
    await admin.auth.admin.deleteUser(user.id);
  }
}
