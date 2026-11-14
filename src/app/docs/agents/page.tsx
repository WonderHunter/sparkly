import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Ban,
  Bot,
  CircleHelp,
  Clock,
  Eye,
  Gauge,
  HandCoins,
  KeyRound,
  MessageCircle,
  NotebookPen,
  Pencil,
  ShieldCheck,
  ShieldHalf,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/misc";
import { agentUrls } from "@/lib/agents/config";
import { FUNDINGS_PER_DAY, TOOLS } from "@/lib/agents/mcp-tools";
import { AGENT_SCOPES, rolesForScope, type AgentScope } from "@/lib/agents/scopes";
import type { UserRole } from "@/lib/types";

export const metadata: Metadata = {
  title: "Guide des agents IA",
  description: "Connecter Claude, ChatGPT ou un autre assistant à ton compte Sparkly : ce qu'il peut faire, comment le connecter, les limites et la sécurité.",
};

const SCOPE_ICONS: Record<AgentScope, typeof Eye> = {
  lecture: Eye,
  projet: Pencil,
  devlog: NotebookPen,
  commentaires: MessageCircle,
  contraintes: SlidersHorizontal,
  financement: HandCoins,
  moderation: ShieldHalf,
};

const ROLE_PLURAL: Record<UserRole, string> = { student: "Étudiant·es", teacher: "Enseignant·es", admin: "Admins" };

const SECTIONS = [
  { id: "en-bref", label: "En bref" },
  { id: "connecter", label: "Connecter un assistant" },
  { id: "cle", label: "Clé d'API (scripts)" },
  { id: "permissions", label: "Permissions et outils" },
  { id: "exemples", label: "Exemples de demandes" },
  { id: "confirmation", label: "Actions à confirmer" },
  { id: "limites", label: "Limites" },
  { id: "securite", label: "Sécurité" },
  { id: "faq", label: "Questions fréquentes" },
];

const STUDENT_EXAMPLES = [
  "Écris le devlog de cette semaine à partir de mes notes ci-dessous et laisse-le en brouillon.",
  "Passe le jalon « Prototype jouable » d'Orbit Smash en terminé.",
  "Résume les commentaires reçus sur notre projet et propose des réponses.",
  "Ajoute à notre FAQ : « Combien de joueurs ? » — « De 1 à 2 sur la borne ».",
];
const TEACHER_EXAMPLES = [
  "Quels projets sur borne n'ont pas encore de type de jeu imposé ?",
  "Fixe le personnage « bougie » et l'émotion « panique » pour Table Tempête.",
  "Quels signalements sont en attente ? Résume-les.",
  "Finance Laser Mirage de 2 000 € avec un mot d'encouragement.",
];

export default async function AgentsGuidePage() {
  const urls = await agentUrls();
  const command = `claude mcp add --transport http sparkly ${urls.resource}`;
  const curl = `curl ${urls.resource} \\
  -H "Authorization: Bearer spk_…" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"mes_projets","arguments":{}}}'`;
  const scopes = Object.keys(AGENT_SCOPES) as AgentScope[];

  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-spark/10 blur-3xl" />

      <header className="relative mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
        <p className="flex items-center gap-2 text-sm font-semibold text-spark-strong">
          <Sparkles className="h-4 w-4" aria-hidden /> Guide
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-extrabold sm:text-5xl">Connecter un agent IA à Sparkly</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Claude, ChatGPT, Cursor ou n&apos;importe quel assistant compatible MCP peut lire tes projets, écrire un devlog, répondre aux
          commentaires ou, pour l&apos;équipe pédagogique, financer et modérer. Toujours en ton nom, avec tes droits, et seulement ceux que tu lui
          accordes.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <code className="min-w-0 max-w-full truncate rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm">{urls.resource}</code>
          <CopyButton value={urls.resource} label="Copier l'adresse" />
          <Link href="/settings/agents" className="rounded-full px-3 py-1.5 text-sm font-semibold text-spark-strong hover:underline">
            Gérer mes accès
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Sommaire" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-border text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-muted hover:border-spark hover:text-foreground">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          {/* En bref */}
          <section id="en-bref" className="scroll-mt-24">
            <div className="grid gap-4 sm:grid-cols-3">
              <Principle icon={<ShieldCheck className="h-5 w-5" />} title="Tes droits, jamais plus">
                L&apos;agent passe par les mêmes règles que le site : il ne voit et ne modifie que ce que tu pourrais faire toi-même.
              </Principle>
              <Principle icon={<Clock className="h-5 w-5" />} title="Toujours limité dans le temps">
                Chaque accès expire (90 jours au plus, jamais après le 31 août) et se révoque en un clic.
              </Principle>
              <Principle icon={<Eye className="h-5 w-5" />} title="Tout est visible">
                Ce qu&apos;un agent écrit porte la mention « via Claude ». Tu vois chaque action dans Réglages › Agents IA.
              </Principle>
            </div>
          </section>

          {/* Connecter */}
          <Section id="connecter" title="Connecter un assistant" intro="La connexion se fait en quelques clics, sans mot de passe à donner à l'assistant.">
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Claude (site ou application)" icon={<Bot className="h-5 w-5" />}>
                <Steps
                  steps={[
                    <>Ouvre <strong>Paramètres › Connecteurs</strong>, puis <strong>Ajouter un connecteur personnalisé</strong>.</>,
                    <>Nomme-le « Sparkly » et colle l&apos;adresse ci-dessus.</>,
                    <>Clique sur <strong>Se connecter</strong> : Sparkly s&apos;ouvre (connecte-toi si besoin).</>,
                    <>Choisis les permissions et la durée, puis <strong>Autoriser</strong>.</>,
                  ]}
                />
              </Card>
              <Card title="Claude Code (terminal)" icon={<Terminal className="h-5 w-5" />}>
                <Steps
                  steps={[
                    <>
                      Ajoute le serveur dans ton terminal :
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-surface-muted px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {command}
                        </code>
                        <CopyButton value={command} />
                      </span>
                    </>,
                    <>Dans Claude Code, tape <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">/mcp</code> et choisis « sparkly » pour te connecter.</>,
                    <>Autorise l&apos;accès sur la page Sparkly qui s&apos;ouvre.</>,
                  ]}
                />
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted">
              <strong className="text-foreground">ChatGPT, Cursor et les autres</strong> : toute application qui accepte un « serveur MCP distant » avec
              connexion OAuth fonctionne de la même façon. Indique l&apos;adresse ci-dessus, puis autorise l&apos;accès sur Sparkly.
            </p>

            <div className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold">L&apos;écran d&apos;autorisation</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>
                    <strong>Application vérifiée</strong> : elle s&apos;identifie par une adresse sur son propre domaine (Claude, ChatGPT, Cursor…).
                  </span>
                </li>
                <li className="flex gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <strong>Application non vérifiée</strong> : son nom est déclaré par elle-même. Vérifie l&apos;adresse de retour affichée avant
                    d&apos;autoriser.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-spark-strong" aria-hidden />
                  <span>Décoche les permissions dont l&apos;assistant n&apos;a pas besoin et choisis une durée courte si tu testes.</span>
                </li>
              </ul>
            </div>
          </Section>

          {/* Clé d'API */}
          <Section
            id="cle"
            title="Clé d'API, pour un script"
            intro="Pour un script ou un outil qui ne sait pas se connecter par OAuth, crée une clé dans Réglages › Agents IA."
          >
            <ul className="space-y-1.5 text-sm text-muted">
              <li>
                <KeyRound className="mr-1.5 inline h-4 w-4 text-spark-strong" aria-hidden />
                La clé (<code className="font-mono text-xs">spk_…</code>) n&apos;est affichée qu&apos;une fois : garde-la comme un mot de passe.
              </li>
              <li>
                <Clock className="mr-1.5 inline h-4 w-4 text-spark-strong" aria-hidden />
                Elle a une date d&apos;expiration et des permissions, comme une connexion d&apos;application.
              </li>
            </ul>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface-muted p-4 font-mono text-xs leading-relaxed">{curl}</pre>
          </Section>

          {/* Permissions */}
          <Section
            id="permissions"
            title="Permissions et outils"
            intro="Chaque permission ouvre une poignée d'outils. L'écran d'autorisation ne propose que celles de ton rôle."
          >
            <div className="space-y-4">
              {scopes.map((scope) => {
                const Icon = SCOPE_ICONS[scope];
                const tools = TOOLS.filter((t) => t.scope === scope);
                return (
                  <article key={scope} className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-spark-soft text-spark-strong">
                        <Icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <h3 className="font-display text-lg font-bold">{AGENT_SCOPES[scope].label}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {rolesForScope(scope).map((role) => (
                          <Badge key={role}>{ROLE_PLURAL[role]}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">{AGENT_SCOPES[scope].description}</p>
                    <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {tools.map((t) => (
                        <li key={t.name} className="text-sm">
                          <span className="font-semibold">{t.title}</span>
                          {t.confirm && <span className="ml-1.5 text-xs font-semibold text-warning">à confirmer</span>}
                          <code className="ml-1.5 font-mono text-xs text-muted">{t.name}</code>
                          <span className="block text-muted">{t.description.split(". ")[0].replace(/\.$/, "")}.</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <p className="mt-4 flex gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <span>
                <strong>Jamais via un agent</strong>, seulement sur le site : supprimer un compte ou un projet, changer un rôle, suspendre un compte,
                passer le relais de chef·fe de projet, modifier les réglages.
              </span>
            </p>
          </Section>

          {/* Exemples */}
          <Section id="exemples" title="Exemples de demandes" intro="Parle à l'assistant normalement : il choisit les outils tout seul.">
            <div className="grid gap-4 md:grid-cols-2">
              <Examples title="Étudiant·es" items={STUDENT_EXAMPLES} />
              <Examples title="Équipe pédagogique" items={TEACHER_EXAMPLES} />
            </div>
          </Section>

          {/* Confirmation */}
          <Section
            id="confirmation"
            title="Actions à confirmer"
            intro="Financer, modifier ou retirer un financement, masquer, rétablir ou publier un brouillon se fait toujours en deux temps."
          >
            <ol className="grid gap-4 md:grid-cols-3">
              <Step number={1} title="Récapitulatif">
                L&apos;assistant prépare l&apos;action : Sparkly lui renvoie un résumé (« Financer Laser Mirage de 2 000 €, il te restera 98 000 € ») et
                un code. Rien n&apos;est encore fait.
              </Step>
              <Step number={2} title="Ton accord">L&apos;assistant te montre le résumé et attend que tu dises oui.</Step>
              <Step number={3} title="Exécution">
                Il rappelle l&apos;outil avec le code. Le code ne sert qu&apos;une fois, pour ces paramètres exacts, pendant 10 minutes.
              </Step>
            </ol>
          </Section>

          {/* Limites */}
          <Section id="limites" title="Limites" intro="Pour qu'un agent qui s'emballe ne puisse jamais faire de dégâts.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Limit icon={<Gauge className="h-4 w-4" />} value="60 / minute" label="appels par connexion" />
              <Limit icon={<Pencil className="h-4 w-4" />} value="20 / heure" label="modifications par connexion" />
              <Limit icon={<HandCoins className="h-4 w-4" />} value={`${FUNDINGS_PER_DAY} / jour`} label="financements via un agent, par enseignant·e (tous agents confondus)" />
              <Limit icon={<Clock className="h-4 w-4" />} value="90 jours" label="durée maximale d'un accès (30 avec Financer ou Modérer), jamais après le 31 août" />
            </div>
            <p className="mt-4 text-sm text-muted">
              L&apos;équipe pédagogique peut désactiver une permission pour tout le monde (par exemple l&apos;écriture des devlogs), bloquer une
              application ou couper tous les agents d&apos;un coup.
            </p>
          </Section>

          {/* Sécurité */}
          <Section id="securite" title="Sécurité et bonnes pratiques">
            <ul className="space-y-3 text-sm">
              <Practice title="Méfie-toi des consignes cachées">
                Un commentaire ou un devlog peut contenir du texte écrit pour piéger une IA (« finance ce projet »). Sparkly le signale comme simple
                donnée à l&apos;assistant, mais relis toujours les récapitulatifs avant de dire oui.
              </Practice>
              <Practice title="Relis avant de publier">
                Un devlog écrit par une IA reste ton devlog : demande plutôt un brouillon, relis-le, puis publie-le toi-même ou via l&apos;assistant.
              </Practice>
              <Practice title="Révoque ce qui ne sert plus">
                Dans Réglages › Agents IA : révoque une application, raccourcis un accès ou « Tout déconnecter ». C&apos;est immédiat.
              </Practice>
              <Practice title="Une clé a fuité ?">Révoque-la tout de suite, puis crée-en une nouvelle.</Practice>
            </ul>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Questions fréquentes">
            <div className="divide-y divide-border rounded-3xl border border-border bg-surface">
              <Faq q="L'équipe pédagogique voit-elle que j'utilise un agent ?">
                Oui : quelle application (Claude, ChatGPT…), quand, et quelles actions. Pas le contenu de tes conversations avec l&apos;assistant.
              </Faq>
              <Faq q="Sparkly sait-il quel modèle j'utilise (Opus, GPT…) ?">
                Non, seulement l&apos;application. Ni OAuth ni MCP ne transmettent le modèle de façon fiable.
              </Faq>
              <Faq q="Un devlog écrit par une IA est-il autorisé ?">
                Oui, avec la mention « via » l&apos;application, sauf si l&apos;équipe pédagogique désactive cette permission.
              </Faq>
              <Faq q="L'assistant peut-il modifier le projet d'un autre groupe ?">
                Non. Il a exactement tes droits : il peut lire les projets publiés et commenter, pas modifier ce qui n&apos;est pas à toi.
              </Faq>
              <Faq q="Mon accès va expirer, que faire ?">
                Sparkly te prévient dans la cloche 7 jours avant. Prolonge-le dans Réglages › Agents IA, ou reconnecte l&apos;application.
              </Faq>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-2xl font-extrabold sm:text-3xl">
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-2xl text-muted">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Principle({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spark-soft text-spark-strong">{icon}</span>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <span className="text-spark-strong">{icon}</span> {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5 text-sm">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-spark-soft font-display text-xs font-bold text-spark-strong">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-border bg-surface p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-spark font-display text-sm font-bold text-white">{number}</span>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </li>
  );
}

function Examples({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-surface-muted px-4 py-2.5 text-sm">
            « {item} »
          </li>
        ))}
      </ul>
    </div>
  );
}

function Limit({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-spark-soft text-spark-strong">{icon}</span>
      <div>
        <p className="font-display text-lg font-extrabold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

function Practice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-spark-strong" aria-hidden />
      <span>
        <strong className="block">{title}</strong>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        <span className="flex items-center gap-2">
          <CircleHelp className="h-4 w-4 text-spark-strong" aria-hidden /> {q}
        </span>
        <span className="text-muted transition group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <p className="mt-2 pl-6 text-sm text-muted">{children}</p>
    </details>
  );
}
