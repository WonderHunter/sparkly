import "server-only";
import postgres from "postgres";

/**
 * Connexion Postgres directe, réservée au serveur (routes OAuth et MCP).
 * En production : pooler Supabase en mode transaction, d'où `prepare: false`.
 */
let client: postgres.Sql | null = null;

export function db(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL doit être définie (voir .env.example).");
    client = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
  }
  return client;
}

/**
 * Exécute des requêtes « en tant que » la personne, exactement comme le fait l'API Supabase :
 * rôle `authenticated` et identité dans `request.jwt.claims`. La RLS, auth.uid() et les gardes
 * s'appliquent sans changement. Tout est annulé à la fin de la transaction.
 * `agent` (nom de l'application) déclenche la mention « via <application> » sur ce qui est écrit.
 */
export async function asUser<T>(userId: string, fn: (sql: postgres.TransactionSql) => Promise<T>, agent?: string): Promise<T> {
  return db().begin(async (sql) => {
    await sql`select set_config('role', 'authenticated', true)`;
    await sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    if (agent) await sql`select set_config('sparkly.agent', ${agent.slice(0, 80)}, true)`;
    return fn(sql);
  }) as Promise<T>;
}
