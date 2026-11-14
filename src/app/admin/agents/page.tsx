import type { Metadata } from "next";
import { BadgeCheck, Ban, Bot, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { ActionForm } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { requireStaff } from "@/lib/auth";
import { AGENT_SCOPES, DISABLEABLE_SCOPES, isAgentScope } from "@/lib/agents/scopes";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { adminRevokeAgentConnection, adminSetAgentClient, updateAgentSettings } from "../actions";

export const metadata: Metadata = { title: "Agents IA · Administration" };

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export default async function AdminAgentsPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: settings }, { data: connections }, { data: clients }, { data: audit }] = await Promise.all([
    supabase.from("app_settings").select("agents_enabled, agent_max_days, agent_disabled_scopes").single(),
    supabase.rpc("admin_agent_connections"),
    supabase.rpc("admin_agent_clients"),
    supabase.rpc("admin_agent_recent_audit"),
  ]);
  const now = new Date().getTime();
  const active = (connections ?? []).filter((c) => !c.revoked_at && new Date(c.expires_at).getTime() > now);
  const people = new Set(active.map((c) => c.user_id)).size;
  const byApp = Object.entries(
    active.reduce<Record<string, Set<string>>>((acc, c) => {
      const key = c.kind === "oauth" ? (c.client_name ?? c.name) : "Clés d'API";
      (acc[key] ??= new Set()).add(c.user_id);
      return acc;
    }, {}),
  )
    .map(([app, users]) => ({ app, users: users.size }))
    .sort((a, b) => b.users - a.users);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Bot className="h-5 w-5" />} label="Connexions actives" value={active.length} />
        <Stat icon={<Users className="h-5 w-5" />} label="Personnes qui utilisent un agent" value={people} />
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-semibold">Par application</p>
          {byApp.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucune pour l&apos;instant.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {byApp.slice(0, 5).map((a) => (
                <li key={a.app} className="flex justify-between gap-2">
                  <span className="truncate">{a.app}</span>
                  <span className="text-muted">
                    {a.users} {a.users > 1 ? "personnes" : "personne"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EditorSection title="Réglages des agents" description="S'applique immédiatement à toutes les connexions et clés.">
        <ActionForm action={updateAgentSettings}>
          <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
            <input type="checkbox" name="agentsEnabled" defaultChecked={settings?.agents_enabled ?? true} className="mt-0.5 h-4 w-4 accent-spark" />
            <span>
              <span className="block font-semibold">Agents IA activés</span>
              <span className="text-muted">Désactivés, plus aucune application ni clé ne peut agir sur Sparkly (rien n&apos;est supprimé).</span>
            </span>
          </label>
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">Permissions ouvertes aux agents</legend>
            <p className="text-sm text-muted">
              Décoche une permission pour la retirer à toutes les connexions, tout de suite. La lecture reste toujours possible.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {DISABLEABLE_SCOPES.filter((s) => AGENT_SCOPES[s].available).map((s) => (
                <label key={s} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="enabledScopes"
                    value={s}
                    defaultChecked={!(settings?.agent_disabled_scopes ?? []).includes(s)}
                    className="mt-0.5 h-4 w-4 accent-spark"
                  />
                  <span>
                    <span className="block font-semibold">{AGENT_SCOPES[s].label}</span>
                    <span className="text-muted">{AGENT_SCOPES[s].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Durée maximale d'un accès (jours)" htmlFor="maxDays" hint="Jamais au-delà du 31 août ; 30 jours au plus avec financement ou modération.">
            <Input id="maxDays" name="maxDays" type="number" min={1} max={366} defaultValue={settings?.agent_max_days ?? 90} className="w-32" />
          </Field>
        </ActionForm>
      </EditorSection>

      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="connections-title">
        <h2 id="connections-title" className="font-display text-xl font-extrabold">
          Connexions
        </h2>
        {(connections ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Personne n&apos;a encore connecté d&apos;agent.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3">Personne</th>
                  <th className="py-2 pr-3">Application</th>
                  <th className="hidden py-2 pr-3 md:table-cell">Permissions</th>
                  <th className="py-2 pr-3">État</th>
                  <th className="hidden py-2 pr-3 lg:table-cell">Actions</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(connections ?? []).map((c) => {
                  const live = !c.revoked_at && new Date(c.expires_at).getTime() > now;
                  const app = c.kind === "oauth" ? (c.client_name ?? c.name) : `Clé « ${c.name} »`;
                  return (
                    <tr key={c.id} className={live ? undefined : "opacity-60"}>
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold">{c.user_name}</span>
                        <span className="block text-xs text-muted">{ROLE_LABEL[c.user_role]}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1">
                          {app}
                          {c.client_verified && <BadgeCheck className="h-3.5 w-3.5 text-success" aria-label="Application vérifiée" />}
                        </span>
                      </td>
                      <td className="hidden py-2.5 pr-3 md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {c.scopes.filter(isAgentScope).map((s) => (
                            <Badge key={s}>{AGENT_SCOPES[s].label}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {c.revoked_at ? "révoquée" : live ? `jusqu'au ${DAY.format(new Date(c.expires_at))}` : "expirée"}
                        <span className="block text-muted">{c.last_used_at ? `utilisée ${formatRelative(c.last_used_at)}` : "jamais utilisée"}</span>
                      </td>
                      <td className="hidden py-2.5 pr-3 lg:table-cell">{c.actions_count}</td>
                      <td className="py-2.5 text-right">
                        {live && (
                          <ConfirmDelete
                            action={adminRevokeAgentConnection.bind(null, c.id)}
                            title={`Révoquer l'accès de ${app} pour ${c.user_name} ?`}
                            description="L'application ou la clé perd immédiatement l'accès au compte."
                            confirmLabel="Révoquer"
                            triggerLabel={`Révoquer ${app} de ${c.user_name}`}
                            triggerClassName="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-danger hover:text-danger"
                          >
                            Révoquer
                          </ConfirmDelete>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="clients-title">
        <h2 id="clients-title" className="font-display text-xl font-extrabold">
          Applications
        </h2>
        <p className="mt-1 text-sm text-muted">
          Une application « vérifiée » s&apos;identifie par une adresse sur son propre domaine. Les autres déclarent leur nom elles-mêmes :
          bloque celles qui te semblent suspectes.
        </p>
        {(clients ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune application enregistrée.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(clients ?? []).map((cl) => (
              <li key={cl.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {cl.name}
                    {cl.verified ? (
                      <BadgeCheck className="h-4 w-4 text-success" aria-label="Vérifiée" />
                    ) : (
                      <TriangleAlert className="h-4 w-4 text-warning" aria-label="Non vérifiée" />
                    )}
                    {cl.blocked_at && <Badge tone="danger">Bloquée</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {cl.kind === "metadata" ? "Document de métadonnées" : "Enregistrement dynamique"} · {cl.client_id} · {cl.users_count}{" "}
                    {cl.users_count > 1 ? "personnes" : "personne"}
                  </p>
                </div>
                <form action={adminSetAgentClient.bind(null, cl.id, !cl.verified, Boolean(cl.blocked_at))}>
                  <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-foreground/40">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {cl.verified ? "Retirer la vérification" : "Marquer vérifiée"}
                  </button>
                </form>
                <form action={adminSetAgentClient.bind(null, cl.id, cl.verified, !cl.blocked_at)}>
                  <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-danger hover:text-danger">
                    <Ban className="h-3.5 w-3.5" aria-hidden /> {cl.blocked_at ? "Débloquer" : "Bloquer"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="audit-title">
        <h2 id="audit-title" className="font-display text-xl font-extrabold">
          Dernières actions
        </h2>
        {(audit ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune action pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {(audit ?? []).map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="text-muted">{formatRelative(a.created_at)}</span>
                <span className="font-semibold">{a.user_name}</span>
                <span>via {a.client_name ?? "un agent"}</span>
                <code className="rounded bg-surface-muted px-1.5 font-mono text-xs">{a.tool}</code>
                {!a.ok && <span className="text-danger">refusé{a.error ? ` (${a.error})` : ""}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-spark-soft text-spark-strong">{icon}</span>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
