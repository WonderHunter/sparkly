import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, BookOpen, Bot, History, KeyRound, PlugZap, TriangleAlert } from "lucide-react";
import { EditorSection } from "@/components/editor/editor-section";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Badge } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { agentUrls } from "@/lib/agents/config";
import { AGENT_SCOPES, grantableScopes, isAgentScope } from "@/lib/agents/scopes";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { revokeAllConnections, revokeConnection } from "./actions";
import { CopyButton } from "@/components/ui/copy-button";
import { ExpiryForm, NewKeyDialog } from "./agents-ui";

export const metadata: Metadata = { title: "Agents IA" };

type Connection = {
  id: string;
  kind: string;
  name: string;
  scopes: string[];
  key_prefix: string | null;
  client_name: string | null;
  client_logo: string | null;
  client_verified: boolean;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  max_expires_at: string;
  actions_count: number;
};

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const dayInput = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(d));
const TOOL_LABEL: Record<string, string> = {
  moi: "a lu ton profil",
  mes_projets: "a lu tes projets",
  chercher_projets: "a cherché des projets",
  voir_projet: "a consulté un projet",
  voir_actualites: "a lu des actualités",
  voir_commentaires: "a lu des commentaires",
  mes_notifications: "a lu tes notifications",
  marquer_notifications_lues: "a marqué tes notifications comme lues",
  mes_devlogs: "a listé les mises à jour d'un projet",
  modifier_bases: "a modifié les bases d'un projet",
  modifier_description: "a modifié la description d'un projet",
  ajouter_jalon: "a ajouté un jalon",
  modifier_jalon: "a modifié un jalon",
  ajouter_faq: "a ajouté une question à la FAQ",
  creer_devlog: "a écrit une mise à jour",
  modifier_devlog: "a modifié une mise à jour",
  publier_devlog: "a publié une mise à jour",
  commenter: "a commenté",
  repondre: "a répondu à un commentaire",
  signaler: "a signalé un contenu",
  lister_contraintes: "a consulté les contraintes possibles",
  fixer_contraintes: "a fixé les contraintes d'un projet",
  mon_budget: "a consulté ton budget",
  financer: "a financé un projet",
  modifier_financement: "a modifié un financement",
  retirer_financement: "a retiré un financement",
  voir_signalements: "a lu les signalements",
  resoudre_signalement: "a classé un signalement",
  masquer: "a masqué un contenu",
  retablir: "a rétabli un contenu",
  publier_brouillon: "a publié un brouillon",
};

/** Premier temps des actions sensibles : récapitulatif préparé, à confirmer. */
const RECAP_LABEL: Record<string, string> = {
  financer: "a préparé un financement",
  modifier_financement: "a préparé la modification d'un financement",
  retirer_financement: "a préparé le retrait d'un financement",
  masquer: "a préparé le masquage d'un contenu",
  retablir: "a préparé le rétablissement d'un contenu",
  publier_brouillon: "a préparé la publication d'un brouillon",
};

function toolLabel(tool: string) {
  const [name, step] = tool.split(":");
  if (step === "recap") return `${RECAP_LABEL[name] ?? name} (récapitulatif, rien n'est encore fait)`;
  return TOOL_LABEL[name] ?? name;
}

export default async function AgentsPage() {
  const viewer = await requireViewer("/settings/agents");
  const supabase = await createClient();
  const [{ data }, { data: settings }, { data: cap }, urls] = await Promise.all([
    supabase.rpc("my_agent_connections"),
    supabase.from("app_settings").select("agents_enabled, agent_disabled_scopes").single(),
    supabase.rpc("agent_expiry_cap", { p_scopes: ["lecture"] }),
    agentUrls(),
  ]);
  const connections = (data ?? []) as Connection[];
  const active = connections.filter((c) => !c.revoked_at && new Date(c.expires_at).getTime() > new Date().getTime());
  const audits = new Map(
    await Promise.all(
      active.slice(0, 20).map(async (c) => {
        const { data: rows } = await supabase.rpc("my_agent_audit", { p_connection: c.id });
        return [c.id, rows ?? []] as const;
      }),
    ),
  );
  const scopes = grantableScopes(viewer.profile.role, settings?.agent_disabled_scopes ?? []).map((s) => ({ value: s, ...AGENT_SCOPES[s] }));
  const now = new Date().getTime();
  const maxDate = cap ? dayInput(cap as string) : dayInput(new Date(now));
  const minDate = dayInput(new Date(now + 24 * 3600 * 1000));
  const defaultDate = dayInput(new Date(Math.min(now + 30 * 24 * 3600 * 1000, cap ? new Date(cap as string).getTime() : now)));
  const oauth = connections.filter((c) => c.kind === "oauth");
  const keys = connections.filter((c) => c.kind === "api_key");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/settings" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Réglages
      </Link>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Agents IA</h1>
      <p className="mt-2 mb-8 text-muted">
        Connecte un assistant (Claude, ChatGPT, Cursor…) à ton compte : il agira en ton nom, avec tes droits et seulement ceux que tu lui
        accordes. Chaque accès expire et se révoque à tout moment.
      </p>

      {!settings?.agents_enabled && (
        <p role="status" className="mb-6 flex gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Les agents IA sont désactivés par l&apos;équipe pédagogique : les
          connexions existantes ne fonctionnent plus pour l&apos;instant.
        </p>
      )}

      <EditorSection title="Connecter une application" description="Ajoute Sparkly comme connecteur (serveur MCP) dans ton assistant, puis connecte-toi et autorise l'accès.">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface-muted px-3 py-2.5 font-mono text-sm">{urls.resource}</code>
          <CopyButton value={urls.resource} label="Copier l'adresse" />
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>
            <strong className="text-foreground">Claude</strong> : Paramètres › Connecteurs › Ajouter un connecteur personnalisé.
          </li>
          <li>
            <strong className="text-foreground">Claude Code</strong> :{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">claude mcp add --transport http sparkly {urls.resource}</code>
          </li>
          <li>
            <strong className="text-foreground">Script ou autre outil</strong> : crée une clé d&apos;API ci-dessous.
          </li>
        </ul>
        <Link href="/docs/agents" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-spark-strong hover:underline">
          <BookOpen className="h-4 w-4" aria-hidden /> Lire le guide complet : permissions, exemples, limites et sécurité
        </Link>
      </EditorSection>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="apps-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="apps-title" className="flex items-center gap-2 font-display text-xl font-extrabold">
            <PlugZap className="h-5 w-5 text-spark-strong" aria-hidden /> Applications connectées
          </h2>
          {active.length > 0 && (
            <ConfirmDelete
              action={revokeAllConnections}
              title="Tout déconnecter ?"
              description="Toutes tes applications connectées et toutes tes clés d'API cesseront de fonctionner immédiatement."
              confirmLabel="Tout déconnecter"
              triggerClassName="text-sm font-semibold text-muted hover:text-danger"
            >
              Tout déconnecter
            </ConfirmDelete>
          )}
        </div>
        <ConnectionList connections={oauth} audits={audits} now={now} minDate={minDate} empty="Aucune application connectée pour l'instant." />
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="keys-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="keys-title" className="flex items-center gap-2 font-display text-xl font-extrabold">
            <KeyRound className="h-5 w-5 text-spark-strong" aria-hidden /> Clés d&apos;API
          </h2>
          {settings?.agents_enabled && <NewKeyDialog scopes={scopes} minDate={minDate} defaultDate={defaultDate} maxDate={maxDate} />}
        </div>
        <ConnectionList connections={keys} audits={audits} now={now} minDate={minDate} empty="Aucune clé : pratique pour un script ou un outil en ligne de commande." />
      </section>
    </div>
  );
}

function ConnectionList({
  connections,
  audits,
  now,
  minDate,
  empty,
}: {
  connections: Connection[];
  audits: Map<string, { tool: string; ok: boolean; created_at: string }[]>;
  now: number;
  minDate: string;
  empty: string;
}) {
  if (connections.length === 0) return <p className="mt-4 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-4 space-y-3">
      {connections.map((c) => (
        <ConnectionRow key={c.id} connection={c} audit={audits.get(c.id) ?? []} now={now} minDate={minDate} />
      ))}
    </ul>
  );
}

function ConnectionRow({
  connection: c,
  audit,
  now,
  minDate,
}: {
  connection: Connection;
  audit: { tool: string; ok: boolean; created_at: string }[];
  now: number;
  minDate: string;
}) {
  const expiresInDays = Math.ceil((new Date(c.expires_at).getTime() - now) / (24 * 3600 * 1000));
  const revoked = Boolean(c.revoked_at);
  const expired = !revoked && expiresInDays <= 0;
  const live = !revoked && !expired;
  const displayName = c.kind === "oauth" ? (c.client_name ?? c.name) : c.name;

  return (
    <li className={revoked || expired ? "rounded-2xl border border-border p-4 opacity-60" : "rounded-2xl border border-border p-4"}>
      <div className="flex flex-wrap items-start gap-3">
        {c.kind === "oauth" ? (
          c.client_logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo fourni par l'application
            <img src={c.client_logo} alt="" className="h-10 w-10 rounded-xl border border-border object-contain" />
          ) : (
            <span role="img" aria-label={displayName} className="flex h-10 w-10 items-center justify-center rounded-xl bg-spark-soft font-display text-lg font-extrabold text-spark-strong">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-muted">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {displayName}
            {c.kind === "oauth" && c.client_verified && <BadgeCheck className="h-4 w-4 text-success" aria-label="Application vérifiée" />}
            {c.kind === "api_key" && <code className="font-mono text-xs font-normal text-muted">{c.key_prefix}…</code>}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.scopes.filter(isAgentScope).map((s) => (
              <Badge key={s}>{AGENT_SCOPES[s].label}</Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Créée {formatRelative(c.created_at)} · {c.last_used_at ? `utilisée ${formatRelative(c.last_used_at)}` : "jamais utilisée"} ·{" "}
            {revoked ? (
              <strong className="text-danger">révoquée</strong>
            ) : expired ? (
              <strong>expirée</strong>
            ) : (
              <strong className={expiresInDays <= 7 ? "text-warning" : undefined}>
                expire dans {expiresInDays} {expiresInDays > 1 ? "jours" : "jour"} ({DAY.format(new Date(c.expires_at))})
              </strong>
            )}
          </p>
        </div>
        {live && (
          <ConfirmDelete
            action={revokeConnection.bind(null, c.id)}
            title={`Révoquer « ${displayName} » ?`}
            description={c.kind === "oauth" ? "L'application perd immédiatement l'accès à ton compte." : "La clé cesse immédiatement de fonctionner."}
            confirmLabel="Révoquer"
            triggerLabel={`Révoquer ${displayName}`}
            triggerClassName="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-danger hover:text-danger"
          >
            Révoquer
          </ConfirmDelete>
        )}
      </div>
      {live && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-foreground">Durée et historique</summary>
          <ExpiryForm connectionId={c.id} current={dayInput(c.expires_at)} minDate={minDate} maxDate={dayInput(c.max_expires_at)} />
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <History className="h-3.5 w-3.5" aria-hidden /> Dernières actions ({c.actions_count})
            </p>
            {audit.length === 0 ? (
              <p className="mt-1 text-xs text-muted">Aucune action pour l&apos;instant.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {audit.slice(0, 10).map((a, i) => (
                  <li key={i}>
                    {formatRelative(a.created_at)} — {displayName} {toolLabel(a.tool)}
                    {!a.ok && <span className="text-danger"> (refusé)</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
    </li>
  );
}
