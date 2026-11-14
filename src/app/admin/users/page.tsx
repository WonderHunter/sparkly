import Link from "next/link";
import { ActionForm } from "@/components/editor/action-form";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";
import { Avatar, Badge } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { deleteUser, setUserRole, setUserSuspended } from "../actions";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const { q, deleted } = await searchParams;
  const search = typeof q === "string" ? q.trim().slice(0, 60) : "";
  const viewer = await getViewer();
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, promo, suspended_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (search) {
    const pattern = `%${search.replace(/[%_,()]/g, "")}%`;
    query = query.or(`display_name.ilike.${pattern},username.ilike.${pattern}`);
  }
  const { data: users } = await query;

  return (
    <div className="space-y-6">
      <form className="flex gap-3" role="search">
        <label htmlFor="user-search" className="sr-only">
          Rechercher un compte
        </label>
        <Input id="user-search" name="q" type="search" defaultValue={search} placeholder="Nom ou pseudo…" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {deleted && <FormMessage tone="success">Compte supprimé.</FormMessage>}

      {!viewer?.isAdmin && (
        <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
          Tu peux supprimer des comptes étudiants. Changer un rôle, suspendre un compte ou supprimer celui d&apos;un·e enseignant·e reste
          réservé aux administrateurs.
        </p>
      )}

      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {(users ?? []).map((u) => (
          <li key={u.id} className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={u.display_name} src={u.avatar_url} />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${u.username}`} className="font-semibold hover:text-spark-strong">
                  {u.display_name}
                </Link>
                <p className="text-xs text-muted">
                  @{u.username} {u.promo && `· ${u.promo}`} · inscrit·e le {formatDate(u.created_at)}
                </p>
              </div>
              <Badge tone={u.role === "student" ? "neutral" : "spark"}>{ROLE_LABEL[u.role]}</Badge>
              {u.suspended_at && <Badge tone="danger">Suspendu</Badge>}
            </div>

            {viewer && u.id !== viewer.id && (viewer.isAdmin || u.role === "student") && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">Gérer</summary>
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  {viewer.isAdmin && (
                    <>
                      {(["student", "teacher", "admin"] as UserRole[])
                        .filter((r) => r !== u.role)
                        .map((r) => (
                          <form key={r} action={setUserRole.bind(null, u.id, r)}>
                            <Button type="submit" size="sm" variant="outline">
                              Passer {ROLE_LABEL[r].toLowerCase()}
                            </Button>
                          </form>
                        ))}
                      <form action={setUserSuspended.bind(null, u.id, !u.suspended_at)}>
                        <Button type="submit" size="sm" variant="outline">
                          {u.suspended_at ? "Réactiver" : "Suspendre"}
                        </Button>
                      </form>
                    </>
                  )}
                  <ActionForm
                    action={deleteUser.bind(null, u.id)}
                    className="flex flex-wrap items-center gap-2 space-y-0"
                    submitLabel="Supprimer le compte"
                    pendingLabel="Suppression…"
                  >
                    <label htmlFor={`confirm-${u.id}`} className="sr-only">
                      Écris SUPPRIMER pour confirmer
                    </label>
                    <Input id={`confirm-${u.id}`} name="confirm" placeholder="Écris SUPPRIMER" className="h-8 w-40 text-sm" autoComplete="off" />
                  </ActionForm>
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
