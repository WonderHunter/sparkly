import Link from "next/link";
import { EyeOff, Rocket } from "lucide-react";
import { forcePublishProject } from "@/app/admin/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { missingForPublish, type PublishInput } from "@/lib/domain/publish";
import type { Project } from "@/lib/types";

type DraftProject = PublishInput & Pick<Project, "id" | "slug" | "status">;

function MissingList({ project }: { project: DraftProject }) {
  const missing = missingForPublish(project);
  if (missing.length === 0) return <>Tout est prêt : il ne reste plus qu&apos;à le publier.</>;
  return (
    <>
      Pour le rendre public, il manque :{" "}
      {missing.map((item, i) => (
        <span key={item.key}>
          {i > 0 && " et "}
          <Link href={`/p/${project.slug}/edit/${item.tab}`} className="underline underline-offset-2 hover:no-underline">
            {item.label.toLowerCase()}
          </Link>
        </span>
      ))}
      .
    </>
  );
}

/** Bandeau en haut de la page d'un projet non publié (visible des membres et des profs). */
export function DraftBanner({ project, isMember, isStaff }: { project: DraftProject; isMember: boolean; isStaff: boolean }) {
  if (project.status === "published") return null;

  if (project.status === "hidden") {
    return (
      <div className="bg-danger-soft text-danger">
        <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-sm font-semibold sm:px-6">
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          Ce projet a été masqué par l&apos;équipe pédagogique.
        </p>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Projet en brouillon" className="border-b border-warning/20 bg-warning-soft text-warning">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 text-sm sm:px-6">
        <div className="min-w-60 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
            Brouillon : seuls les membres du groupe et l&apos;équipe pédagogique voient cette page.
          </p>
          {(isMember || isStaff) && (
            <p className="mt-0.5 pl-6">
              <MissingList project={project} />
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isMember && (
            <ButtonLink href={`/p/${project.slug}/edit/publish`} size="sm">
              <Rocket className="h-3.5 w-3.5" /> Publier le projet
            </ButtonLink>
          )}
          {isStaff && (
            <form action={forcePublishProject.bind(null, project.id)}>
              <Button type="submit" size="sm" variant={isMember ? "outline" : "primary"} title="Publication par l'équipe pédagogique, même si le projet est incomplet">
                <Rocket className="h-3.5 w-3.5" /> Publier maintenant (prof)
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** Encadré dans l'éditeur : ce qu'il reste à faire avant de publier. */
export function DraftCallout({ project }: { project: DraftProject }) {
  if (project.status !== "draft") return null;
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-warning/20 bg-warning-soft px-5 py-4 text-sm text-warning">
      <div className="min-w-60 flex-1">
        <p className="font-semibold">Ce projet est encore un brouillon, invisible dans Découvrir.</p>
        <p className="mt-0.5">
          <MissingList project={project} />
        </p>
      </div>
      <ButtonLink href={`/p/${project.slug}/edit/publish`} size="sm" variant="outline">
        <Rocket className="h-3.5 w-3.5" /> Voir la publication
      </ButtonLink>
    </div>
  );
}
