import { notFound } from "next/navigation";
import { PlanningTimeline } from "@/components/project/planning-timeline";
import { ProgressBar } from "@/components/ui/misc";
import { getProjectPage } from "@/lib/data/projects";

export default async function RoadmapPage({ params }: PageProps<"/p/[slug]/roadmap">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();
  const { project, milestones } = page;
  const done = milestones.filter((m) => m.status === "done").length;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-3xl font-extrabold">Planning</h2>
      <p className="mt-2 text-muted">
        {done} jalon{done > 1 ? "s" : ""} terminé{done > 1 ? "s" : ""} sur {milestones.length}. Chaque jalon pèse un
        pourcentage de l&apos;avancée totale ; un jalon en cours compte pour moitié.
      </p>
      <div className="mt-6 max-w-md">
        <ProgressBar value={project.progress} label="Avancée du projet" />
        <p className="mt-2 text-sm font-semibold text-spark-strong">{project.progress} % d&apos;avancée</p>
      </div>
      <div className="mt-10">
        <PlanningTimeline milestones={milestones} />
      </div>
    </div>
  );
}
