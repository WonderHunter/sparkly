import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Megaphone, Pencil, Shield } from "lucide-react";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge, Card, EmptyState, ProgressBar, SparkMark } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { getMyProject } from "@/lib/data/projects";
import { computeTimeline, daysLeft } from "@/lib/domain/timeline";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ROLE_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { acceptInvitation, createProject, declineInvitation } from "./actions";

export const metadata: Metadata = { title: "Mon projet" };

const INVITATION_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  accepted: { tone: "success", text: "Bienvenue dans l'équipe !" },
  "already-member": { tone: "error", text: "Tu fais déjà partie d'un projet : quitte-le avant d'en rejoindre un autre." },
  error: { tone: "error", text: "Cette invitation n'est plus valable." },
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  const { invitation, deleted } = await searchParams;
  const supabase = await createClient();

  const [mine, { data: invitations }, { data: follows }] = await Promise.all([
    getMyProject(viewer.id),
    supabase
      .from("project_invitations")
      .select("id, role, team_title, project:projects(title, slug, pitch)")
      .eq("email", viewer.email.toLowerCase()),
    supabase.from("follows").select("project_id").eq("user_id", viewer.id),
  ]);

  const followedIds = (follows ?? []).map((f) => f.project_id);
  const { data: feed } = followedIds.length
    ? await supabase
        .from("posts")
        .select("id, number, title, published_at, project:projects(title, slug)")
        .in("project_id", followedIds)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const notice = typeof invitation === "string" ? INVITATION_MESSAGES[invitation] : undefined;
  const firstName = viewer.profile.display_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Salut {firstName} ✦</h1>
      <p className="mt-1 text-muted">Ton espace pour faire avancer le projet de ton groupe.</p>

      <div className="mt-6 space-y-3">
        {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
        {deleted && <FormMessage tone="success">Le projet a été supprimé.</FormMessage>}
        {viewer.isSuspended && <FormMessage>Ton compte est suspendu : tu peux consulter Sparkly mais plus publier.</FormMessage>}
      </div>

      {viewer.isStaff && (
        <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-spark" />
            <div>
              <p className="font-semibold">Espace enseignant·e</p>
              <p className="text-sm text-muted">Suivi de tous les projets, modération et gestion des comptes.</p>
            </div>
          </div>
          <ButtonLink href="/admin" variant="secondary">
            Ouvrir l&apos;administration
          </ButtonLink>
        </Card>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-8">
          {invitations && invitations.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-2xl font-extrabold">Invitations</h2>
              <ul className="space-y-3">
                {invitations.map((inv) => (
                  <li key={inv.id}>
                    <Card className="flex flex-wrap items-center gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{inv.project?.title}</p>
                        <p className="text-sm text-muted">
                          On t&apos;invite comme <strong>{inv.team_title || MEMBER_ROLE_LABEL[inv.role]}</strong>
                        </p>
                      </div>
                      <form action={acceptInvitation.bind(null, inv.id)}>
                        <Button type="submit" size="sm" disabled={Boolean(mine)}>
                          Rejoindre
                        </Button>
                      </form>
                      <form action={declineInvitation.bind(null, inv.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Refuser
                        </Button>
                      </form>
                    </Card>
                  </li>
                ))}
              </ul>
              {mine && <p className="mt-2 text-sm text-muted">Tu fais déjà partie d&apos;un projet : un seul projet par étudiant·e.</p>}
            </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-2xl font-extrabold">Le projet de mon groupe</h2>
            {mine ? <MyProjectCard data={mine} /> : <CreateProjectCard disabled={viewer.isSuspended} />}
          </section>
        </div>

        <aside>
          <h2 className="mb-4 font-display text-xl font-extrabold">Projets suivis</h2>
          {feed && feed.length > 0 ? (
            <ul className="space-y-4">
              {feed.map((post) => (
                <li key={post.id} className="border-b border-border pb-4 last:border-0">
                  <Link href={`/p/${post.project?.slug}/devlog/${post.number}`} className="group block">
                    <p className="text-xs font-semibold text-spark-strong">{post.project?.title}</p>
                    <p className="font-semibold group-hover:underline">{post.title}</p>
                    {post.published_at && <p className="text-xs text-muted">{formatRelative(post.published_at)}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Suis des projets depuis <Link href="/discover" className="font-semibold text-spark-strong hover:underline">Découvrir</Link> pour
              voir leurs nouvelles actualités ici.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function MyProjectCard({ data }: { data: NonNullable<Awaited<ReturnType<typeof getMyProject>>> }) {
  const { project, role } = data;
  const timeline = computeTimeline(project.starts_on, project.ends_on);
  const base = `/p/${project.slug}`;
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={project.status === "published" ? "success" : project.status === "hidden" ? "danger" : "warning"}>
            {STATUS_LABEL[project.status]}
          </Badge>
          <Badge>{PLATFORM_LABEL[project.platform]}</Badge>
          <Badge tone="spark">{MEMBER_ROLE_LABEL[role]}</Badge>
        </div>
        <h3 className="mt-3 font-display text-2xl font-extrabold">{project.title}</h3>
        {project.pitch && <p className="mt-1 text-muted">{project.pitch}</p>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <ProgressBar value={project.progress} label="Avancée du projet" />
            <p className="mt-2 text-sm">
              <strong className="text-spark-strong">{project.progress} %</strong> d&apos;avancée
            </p>
          </div>
          <div>
            <ProgressBar value={timeline} label="Timeline du projet" tone="ink" />
            <p className="mt-2 text-sm">
              <strong>{timeline} %</strong> du temps · {daysLeft(project.ends_on)} jours restants
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border bg-surface-muted/50 px-6 py-4">
        <ButtonLink href={`${base}/edit`} size="sm">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </ButtonLink>
        <ButtonLink href={`${base}/edit/devlog/new`} size="sm" variant="outline">
          <Megaphone className="h-3.5 w-3.5" /> Nouvelle mise à jour
        </ButtonLink>
        <ButtonLink href={`${base}/edit/planning`} size="sm" variant="outline">
          Cocher un jalon
        </ButtonLink>
        <ButtonLink href={base} size="sm" variant="ghost">
          <Eye className="h-3.5 w-3.5" /> Page publique
        </ButtonLink>
      </div>
    </Card>
  );
}

function CreateProjectCard({ disabled }: { disabled: boolean }) {
  if (disabled) return <EmptyState title="Création désactivée">Ton compte est suspendu.</EmptyState>;
  return (
    <Card className="p-6 sm:p-8">
      <SparkMark className="h-8 w-8 text-spark" />
      <h3 className="mt-3 font-display text-xl font-extrabold">Lance le projet de ton groupe</h3>
      <p className="mt-1 mb-6 text-sm text-muted">
        Un seul membre crée le projet, puis invite les autres. Le planning de la SAÉ est prérempli : vous pourrez
        l&apos;ajuster ensuite.
      </p>
      <ActionForm action={createProject} submitLabel="Créer le projet" pendingLabel="Création…">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Nom du jeu (provisoire, c'est ok)" htmlFor="title">
            <Input id="title" name="title" maxLength={80} required placeholder="Ex. Neon Pusher" />
            <FieldError name="title" />
          </Field>
          <Field label="Plateforme" htmlFor="platform">
            <Select id="platform" name="platform" defaultValue="borne">
              {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError name="platform" />
          </Field>
        </div>
      </ActionForm>
    </Card>
  );
}
