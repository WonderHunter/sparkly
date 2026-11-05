import Image from "next/image";
import { notFound } from "next/navigation";
import { FolderGit2, Gamepad2, Heart, Pencil, Users } from "lucide-react";
import { DraftBanner } from "@/components/project/draft-notice";
import { FundForm } from "@/components/project/fund-form";
import { FundingPanel } from "@/components/project/funding-panel";
import { ProgressPanel } from "@/components/project/progress-panel";
import { ProjectTabs } from "@/components/project/project-tabs";
import { SiteCard } from "@/components/project/site-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, SparkMark } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { getFundingSettings, getTeacherBudget, listInvestments } from "@/lib/data/funding";
import { findRenamedSlug, getProjectPage, isFollowing } from "@/lib/data/projects";
import { parseVideoUrl } from "@/lib/domain/video";
import { PLATFORM_LABEL } from "@/lib/types";
import { pluralize } from "@/lib/utils";
import { toggleFollow } from "../actions";

export async function generateMetadata({ params }: LayoutProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) return { title: "Projet introuvable" };
  return {
    title: page.project.title,
    description: page.project.pitch || undefined,
    openGraph: page.project.cover_url ? { images: [page.project.cover_url] } : undefined,
  };
}

export default async function ProjectLayout({ params, children }: LayoutProps<"/p/[slug]">) {
  const { slug } = await params;
  const [page, viewer] = await Promise.all([getProjectPage(slug), getViewer()]);
  if (!page) {
    // Ancienne adresse d'un projet renommé : la page redirige vers la nouvelle URL.
    if (await findRenamedSlug(slug)) return <>{children}</>;
    notFound();
  }

  const { project, members, stats } = page;
  const isMember = Boolean(viewer && members.some((m) => m.user_id === viewer.id));
  const isTeacher = viewer?.profile.role === "teacher" && !viewer.isSuspended;
  const [following, investments, { goal, commentsEnabled }, budget] = await Promise.all([
    isFollowing(project.id, viewer?.id),
    listInvestments(project.id),
    getFundingSettings(),
    isTeacher ? getTeacherBudget(viewer.id) : Promise.resolve(null),
  ]);
  const funded = investments.reduce((sum, i) => sum + i.amount, 0);
  const backers = new Set(investments.map((i) => i.investor?.id)).size;
  const mine = viewer
    ? investments
        .filter((i) => i.investor?.id === viewer.id && i.school_year === budget?.schoolYear)
        .map((i) => ({ id: i.id, amount: i.amount, created_at: i.created_at, message: i.message?.body ?? null }))
    : [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const fundable = project.status === "published" && project.ends_on >= today;
  const video = parseVideoUrl(project.video_url);
  const base = `/p/${project.slug}`;

  return (
    <div>
      <DraftBanner project={project} isMember={isMember} isStaff={Boolean(viewer?.isStaff && !viewer.isSuspended)} />

      <header className="mx-auto max-w-7xl px-4 pt-10 text-center sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          {project.logo_url ? (
            <span className="relative mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-border bg-surface">
              <Image src={project.logo_url} alt={`Logo de ${project.title}`} fill sizes="64px" className="object-contain" />
            </span>
          ) : (
            <SparkMark className="mb-4 h-10 w-10 text-spark" />
          )}
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{project.title}</h1>
          {project.pitch && <p className="mt-3 text-lg text-muted sm:text-xl">{project.pitch}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge>{PLATFORM_LABEL[project.platform]}</Badge>
            {project.category && <Badge>{project.category.name}</Badge>}
          </div>
        </div>
      </header>

      <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-stone-950">
          {video ? (
            <iframe
              src={video.embedUrl}
              title={`Vidéo de présentation de ${project.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          ) : project.cover_url ? (
            <Image src={project.cover_url} alt="" fill preload sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-spark-soft via-surface-muted to-glow">
              <SparkMark className="h-20 w-20 text-spark/60" />
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <FundingPanel amount={funded} goal={goal} backers={backers} />
          {isTeacher && budget && (
            <FundForm
              slug={project.slug}
              projectId={project.id}
              mine={mine}
              remaining={budget.remaining}
              budget={budget.budget}
              schoolYear={budget.schoolYear}
              fundable={fundable}
              allowMessage={commentsEnabled}
            />
          )}
          <hr className="border-border" />
          <ProgressPanel progress={project.progress} startsOn={project.starts_on} endsOn={project.ends_on} />

          <dl className="grid grid-cols-3 gap-2 border-y border-border py-4 text-center">
            <div>
              <dd className="font-display text-xl font-extrabold">{stats.followers}</dd>
              <dt className="text-xs text-muted">{stats.followers > 1 ? "abonnés" : "abonné"}</dt>
            </div>
            <div>
              <dd className="font-display text-xl font-extrabold">{stats.posts}</dd>
              <dt className="text-xs text-muted">devlogs</dt>
            </div>
            <div>
              <dd className="font-display text-xl font-extrabold">{members.length}</dd>
              <dt className="text-xs text-muted">membres</dt>
            </div>
          </dl>

          <div className="flex flex-col gap-2.5">
            {project.game_url && (
              <ButtonLink href={project.game_url} size="lg" target="_blank" rel="noopener noreferrer">
                <Gamepad2 className="h-5 w-5" /> Jouer au jeu
              </ButtonLink>
            )}
            {isMember && (
              <ButtonLink href={`${base}/edit`} size="lg" variant="secondary">
                <Pencil className="h-4 w-4" /> Modifier le projet
              </ButtonLink>
            )}
            {viewer && !isMember && project.status === "published" && (
              <form action={toggleFollow.bind(null, project.id, project.slug)}>
                <Button type="submit" size="lg" variant={following ? "outline" : "secondary"} className="w-full">
                  <Heart className={following ? "h-4 w-4 fill-spark text-spark" : "h-4 w-4"} />
                  {following ? "Suivi" : "Suivre le projet"}
                </Button>
              </form>
            )}
            {!viewer && (
              <ButtonLink href={`/login?next=${encodeURIComponent(base)}`} size="lg" variant="outline">
                <Heart className="h-4 w-4" /> Se connecter pour suivre
              </ButtonLink>
            )}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-foreground"
              >
                <FolderGit2 className="h-4 w-4" /> Voir le dépôt du projet
              </a>
            )}
          </div>
          {project.site_url && <SiteCard url={project.site_url} />}
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="h-3.5 w-3.5" /> Projet de groupe · {pluralize(members.length, "membre")}
          </p>
        </aside>
      </section>

      <ProjectTabs
        base={base}
        counts={{ posts: stats.posts, comments: stats.comments }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
