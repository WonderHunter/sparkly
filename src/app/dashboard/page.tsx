import type { Metadata } from "next";
import Link from "next/link";
import { Eye, HandCoins, Megaphone, Pencil, Plus, Shield } from "lucide-react";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Badge, Card, EmptyState, ProgressBar, SparkMark } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { getTeacherBudget, type TeacherBudget } from "@/lib/data/funding";
import { listMyProjects, type MyProject } from "@/lib/data/projects";
import { formatEuros } from "@/lib/domain/funding";
import { missingForPublish } from "@/lib/domain/publish";
import { computeTimeline, daysLeft } from "@/lib/domain/timeline";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ROLE_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { acceptInvitation, createProject, declineInvitation } from "./actions";

export const metadata: Metadata = { title: "Mes projets" };

const INVITATION_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  accepted: { tone: "success", text: "Bienvenue dans l'équipe !" },
  error: { tone: "error", text: "Cette invitation n'est plus valable." },
  limit: { tone: "error", text: "Tu as atteint le nombre maximum de projets pour cette année universitaire." },
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  const { invitation, deleted } = await searchParams;
  const supabase = await createClient();

  const [mine, { data: invitations }, { data: follows }] = await Promise.all([
    listMyProjects(viewer.id),
    supabase
      .from("project_invitations")
      .select("id, role, team_title, project:projects(title, slug, pitch)")
      .eq("email", viewer.email.toLowerCase()),
    supabase.from("follows").select("project_id").eq("user_id", viewer.id),
  ]);

  const budget = viewer.profile.role === "teacher" ? await getTeacherBudget(viewer.id) : null;
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
      <p className="mt-1 text-muted">Ton espace pour faire avancer les projets de tes groupes.</p>

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

      {budget && <TeacherBudgetCard budget={budget} />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-10">
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
                        <Button type="submit" size="sm">
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
            </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-2xl font-extrabold">
              {mine.length > 1 ? `Mes projets (${mine.length})` : "Mon projet"}
            </h2>
            {mine.length > 0 ? (
              <div className="space-y-4">
                {mine.map((item) => (
                  <MyProjectCard key={item.project.id} data={item} />
                ))}
              </div>
            ) : (
              <CreateProjectCard disabled={viewer.isSuspended} />
            )}
          </section>

          {mine.length > 0 && !viewer.isSuspended && (
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-foreground/40 [&::-webkit-details-marker]:hidden">
                <Plus className="h-4 w-4" /> Créer un autre projet
              </summary>
              <div className="mt-4">
                <CreateProjectCard disabled={false} />
              </div>
            </details>
          )}
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

function MyProjectCard({ data }: { data: MyProject }) {
  const { project, role, team_title } = data;
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
          <Badge tone="spark">{team_title || MEMBER_ROLE_LABEL[role]}</Badge>
        </div>
        <h3 className="mt-3 font-display text-2xl font-extrabold">{project.title}</h3>
        {project.pitch && <p className="mt-1 text-muted">{project.pitch}</p>}
        {project.status === "draft" && <DraftHint project={project} base={base} />}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <ProgressBar value={project.progress} label={`Avancée de ${project.title}`} />
            <p className="mt-2 text-sm">
              <strong className="text-spark-strong">{project.progress} %</strong> d&apos;avancée
            </p>
          </div>
          <div>
            <ProgressBar value={timeline} label={`Timeline de ${project.title}`} tone="ink" />
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

function DraftHint({ project, base }: { project: MyProject["project"]; base: string }) {
  const missing = missingForPublish(project);
  return (
    <p className="mt-4 rounded-xl bg-warning-soft px-4 py-2.5 text-sm text-warning">
      <strong>Brouillon, invisible dans Découvrir.</strong>{" "}
      {missing.length > 0 ? `À compléter avant publication : ${missing.map((m) => m.label.toLowerCase()).join(", ")}. ` : "Prêt à être publié. "}
      <Link href={`${base}/edit/publish`} className="font-semibold underline underline-offset-2 hover:no-underline">
        Publication
      </Link>
    </p>
  );
}

function CreateProjectCard({ disabled }: { disabled: boolean }) {
  if (disabled) return <EmptyState title="Création désactivée">Ton compte est suspendu.</EmptyState>;
  return (
    <Card className="p-6 sm:p-8">
      <SparkMark className="h-8 w-8 text-spark" />
      <h3 className="mt-3 font-display text-xl font-extrabold">Lance le projet d&apos;un groupe</h3>
      <p className="mt-1 mb-6 text-sm text-muted">
        Un membre crée le projet, puis invite les autres. Le planning de la SAÉ est prérempli : vous pourrez
        l&apos;ajuster ensuite. Tu peux faire partie de plusieurs projets.
      </p>
      <ActionForm action={createProject} submitLabel="Créer le projet" pendingLabel="Création…">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Nom du jeu (provisoire, c'est ok)" htmlFor="title">
            <Input id="title" name="title" maxLength={80} required placeholder="Ex. Neon Pusher" />
            <FieldError name="title" />
          </Field>
          <Field label="Plateforme" htmlFor="platform">
            <Select
              id="platform"
              name="platform"
              defaultValue="borne"
              options={Object.entries(PLATFORM_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <FieldError name="platform" />
          </Field>
        </div>
      </ActionForm>
    </Card>
  );
}

function TeacherBudgetCard({ budget }: { budget: TeacherBudget }) {
  const spentPercent = budget.budget > 0 ? Math.round((budget.spent / budget.budget) * 100) : 0;
  return (
    <Card className="mt-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            <HandCoins className="h-4 w-4 text-success" /> Mon budget de financement {budget.schoolYear}
          </p>
          <p className="mt-1 font-display text-4xl font-extrabold text-success">{formatEuros(budget.remaining)}</p>
          <p className="text-sm text-muted">
            restants sur {formatEuros(budget.budget)} · argent fictif, remis à zéro chaque 1er septembre
          </p>
        </div>
        <ButtonLink href="/discover?sort=progress" variant="outline" size="sm">
          Trouver des projets à financer
        </ButtonLink>
      </div>
      <div className="mt-4">
        <ProgressBar value={spentPercent} label="Part du budget investie" tone="success" />
      </div>
      {budget.investments.length > 0 ? (
        <ul className="mt-5 divide-y divide-border">
          {budget.investments.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              {inv.project ? (
                <Link href={`/p/${inv.project.slug}`} className="font-semibold hover:text-spark-strong">
                  {inv.project.title}
                </Link>
              ) : (
                <span className="text-muted">Projet supprimé</span>
              )}
              <span className="font-bold text-success">{formatEuros(inv.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Tu n&apos;as encore financé aucun projet cette année.</p>
      )}
    </Card>
  );
}
