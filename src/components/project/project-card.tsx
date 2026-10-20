import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { Badge, ProgressBar, SparkMark } from "@/components/ui/misc";
import { FundingLine } from "./funding-panel";
import { computeTimeline, daysLeft } from "@/lib/domain/timeline";
import { PLATFORM_LABEL, type ProjectCard as ProjectCardData } from "@/lib/types";

/** Carte projet inspirée de Kickstarter : visuel, titre, accroche, jauge et statistiques. */
export function ProjectCard({
  project,
  goal,
  preload = false,
}: {
  project: ProjectCardData;
  /** Objectif de financement commun à tous les projets (réglage admin). */
  goal: number;
  preload?: boolean;
}) {
  const timeline = computeTimeline(project.starts_on!, project.ends_on!);
  const remaining = daysLeft(project.ends_on!);

  return (
    <article className="group flex flex-col">
      <Link href={`/p/${project.slug}`} className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-surface-muted">
        {project.cover_url ? (
          <Image
            src={project.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            preload={preload}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-spark-soft via-surface-muted to-[#ffe7c2]">
            <SparkMark className="h-14 w-14 text-spark/60" />
          </div>
        )}
        <span className="sr-only">Voir {project.title}</span>
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {project.platform && <Badge>{PLATFORM_LABEL[project.platform]}</Badge>}
          {project.category_name && <Badge>{project.category_name}</Badge>}
        </div>
        <h3 className="font-display text-lg leading-snug font-bold">
          <Link href={`/p/${project.slug}`} className="hover:text-spark-strong">
            {project.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{project.pitch || "Pas encore d'accroche."}</p>

        <div className="mt-auto space-y-3 pt-4">
          <FundingLine amount={project.funded_amount ?? 0} goal={goal} title={project.title ?? ""} />
          <ProgressBar value={project.progress ?? 0} label={`Avancée de ${project.title}`} size="sm" />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="sr-only">Avancée</dt>
              <dd className="font-bold text-spark-strong">{project.progress ?? 0} %</dd>
              <dd className="text-xs text-muted">d&apos;avancée</dd>
            </div>
            <div>
              <dt className="sr-only">Temps écoulé</dt>
              <dd className="font-bold">{timeline} %</dd>
              <dd className="text-xs text-muted">du temps</dd>
            </div>
            <div>
              <dt className="sr-only">Jours restants</dt>
              <dd className="font-bold">{remaining}</dd>
              <dd className="text-xs text-muted">jours restants</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden /> {project.members_count ?? 0} membres
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {project.comments_count ?? 0}
            </span>
            {(project.posts_count ?? 0) > 0 && <span>{project.posts_count} devlogs</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectGrid({ projects, goal }: { projects: ProjectCardData[]; goal: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, i) => (
        <ProjectCard key={project.id} project={project} goal={goal} preload={i < 3} />
      ))}
    </div>
  );
}
