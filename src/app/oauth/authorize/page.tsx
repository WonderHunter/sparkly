import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeftRight, BadgeCheck, Ban, Bot, Clock, Eye, HandCoins, MessageCircle, NotebookPen, Pencil, ShieldAlert, ShieldHalf, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SparkMark } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { parseAuthorizeRequest } from "@/lib/agents/authorize";
import { db } from "@/lib/agents/db";
import { AGENT_SCOPES, parseScopeParam } from "@/lib/agents/scopes";
import { approveAuthorization, denyAuthorization } from "./actions";

const SCOPE_ICONS = {
  lecture: Eye,
  projet: Pencil,
  devlog: NotebookPen,
  commentaires: MessageCircle,
  contraintes: SlidersHorizontal,
  financement: HandCoins,
  moderation: ShieldHalf,
} as const;

export const metadata: Metadata = { title: "Autoriser une application", robots: { index: false } };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export default async function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  const params = await searchParams;
  const parsed = await parseAuthorizeRequest(params);
  if (!parsed.ok && !parsed.fatal) redirect(parsed.redirect);
  if (!parsed.ok) return <AuthorizeError message={parsed.message} />;

  const viewer = await getViewer();
  if (!viewer) {
    const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`);
  }
  if (viewer.isSuspended) return <AuthorizeError message="Ton compte est suspendu : impossible de connecter une application." />;

  const { request } = parsed;
  const [{ disabled }] = await db()<{ disabled: string[] }[]>`select agent_disabled_scopes as disabled from public.app_settings where id`;
  const scopes = parseScopeParam(request.scope, viewer.profile.role, disabled);
  const [{ enabled, cap }] = await db()<{ enabled: boolean; cap: Date }[]>`
    select (select agents_enabled from public.app_settings where id) as enabled, public.agent_expiry_cap(${scopes}) as cap`;
  if (!enabled) return <AuthorizeError message="Les agents IA sont désactivés par l'équipe pédagogique." />;

  const now = new Date().getTime();
  const durations = [7, 30, 90]
    .map((days) => ({ days, until: new Date(Math.min(now + days * 24 * 3600 * 1000, cap.getTime())) }))
    .filter((d, i, all) => i === 0 || d.until.getTime() > all[i - 1].until.getTime());
  const redirectHost = new URL(request.redirectUri).host;
  const { client } = request;
  const hidden = Object.entries({
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    response_type: "code",
    code_challenge: request.codeChallenge,
    code_challenge_method: "S256",
    state: request.state ?? "",
    scope: request.scope ?? "",
    resource: request.resource,
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-4 py-12">
      <form className="w-full rounded-3xl border border-border bg-surface p-7 shadow-sm sm:p-8">
        {hidden.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex items-center justify-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spark-soft">
            <SparkMark className="h-8 w-8 text-spark" />
          </span>
          <ArrowLeftRight className="h-5 w-5 text-muted" aria-hidden />
          {client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo fourni par l'application (hôte quelconque)
            <img src={client.logoUrl} alt="" className="h-14 w-14 rounded-2xl border border-border object-contain" />
          ) : (
            <span role="img" aria-label={client.name} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spark-soft font-display text-2xl font-extrabold text-spark-strong">
              {client.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-center font-display text-2xl leading-tight font-extrabold">
          <span className="text-spark-strong">{client.name}</span> veut accéder à ton compte Sparkly
        </h1>
        <div className="mt-3 flex justify-center">
          {client.verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Application vérifiée
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Application non vérifiée · retour vers {redirectHost}
            </span>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-muted">
          Connecté·e en tant que <strong className="text-foreground">{viewer.profile.display_name}</strong> ({viewer.email})
        </p>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">Ce que {client.name} pourra faire en ton nom</legend>
          <ul className="mt-3 space-y-2">
            {scopes.map((scope) => {
              const Icon = SCOPE_ICONS[scope];
              return (
                <li key={scope}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:border-foreground/30">
                    <input type="checkbox" name="scopes" value={scope} defaultChecked className="mt-0.5 h-4 w-4 accent-spark" />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <Icon className="h-3.5 w-3.5 text-spark-strong" aria-hidden /> {AGENT_SCOPES[scope].label}
                      </span>
                      <span className="text-sm text-muted">{AGENT_SCOPES[scope].description}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {scopes.some((s) => s !== "lecture") && (
            <p className="mt-3 flex gap-2 text-xs text-muted">
              <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Ce que {client.name} écrira en ton nom (actualités, commentaires) portera la mention « via {client.name} ».
            </p>
          )}
          <p className="mt-2 flex gap-2 text-xs text-muted">
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Jamais via une application : supprimer un compte ou un projet, changer un rôle, passer le relais, modifier les réglages.
          </p>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5 text-spark-strong" aria-hidden /> Durée de l&apos;accès
          </legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {durations.map((d, i) => (
              <label key={d.days} className="cursor-pointer">
                <input type="radio" name="duration" value={d.days} defaultChecked={i === Math.min(1, durations.length - 1)} className="peer sr-only" />
                <span className="block rounded-xl border border-border px-3 py-2 text-center text-sm peer-checked:border-spark peer-checked:bg-spark-soft peer-checked:font-semibold peer-checked:text-spark-strong peer-focus-visible:ring-2 peer-focus-visible:ring-spark/40">
                  {d.days} jours
                  <span className="block text-xs font-normal text-muted">jusqu&apos;au {DATE.format(d.until)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-6 flex gap-2 rounded-xl bg-surface-muted px-4 py-3 text-xs text-muted">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          L&apos;équipe pédagogique peut voir que tu utilises cette application et les actions qu&apos;elle fait en ton nom. Tu pourras
          révoquer cet accès à tout moment dans Réglages › Agents IA.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="submit" variant="outline" formAction={denyAuthorization}>
            Refuser
          </Button>
          <Button type="submit" formAction={approveAuthorization}>
            Autoriser {client.name}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AuthorizeError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-4 py-12">
      <div role="alert" className="w-full rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Connexion impossible</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
