import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PlanningTimeline } from "@/components/project/planning-timeline";
import { PostCard } from "@/components/project/post-card";
import { TeamGrid } from "@/components/project/team-grid";
import { getProjectPage, listPosts } from "@/lib/data/projects";
import { isEmptyRichText, sanitizeRichText } from "@/lib/domain/sanitize";

/**
 * Onglet « Campagne » : reprend tous les blocs minimaux du gabarit
 * (description, équipe, planning, dernières actualités).
 */
export default async function CampaignPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();
  const { project, members, milestones } = page;
  const posts = await listPosts(project.id, { limit: 2 });
  const base = `/p/${project.slug}`;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="space-y-14">
        <Section title="Description du jeu">
          {isEmptyRichText(project.story) ? (
            <p className="text-muted">Le groupe n&apos;a pas encore décrit son jeu.</p>
          ) : (
            <div className="prose-sparkly" dangerouslySetInnerHTML={{ __html: sanitizeRichText(project.story) }} />
          )}
        </Section>

        <Section title="Présentation de l'équipe" more={{ href: `${base}/team`, label: "Toute l'équipe" }}>
          <TeamGrid members={members} />
        </Section>

        <Section title="Dernières actualités" more={posts.length ? { href: `${base}/devlog`, label: "Toutes les mises à jour" } : undefined}>
          {posts.length ? (
            posts.map((post) => <PostCard key={post.id} post={post} slug={project.slug} />)
          ) : (
            <p className="text-muted">Aucune mise à jour publiée pour l&apos;instant.</p>
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <Section title="Planning" more={{ href: `${base}/roadmap`, label: "Détails" }}>
          <PlanningTimeline milestones={milestones} compact />
        </Section>
      </aside>
    </div>
  );
}

function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        {more && (
          <Link href={more.href} className="inline-flex items-center gap-1 text-sm font-semibold text-spark-strong hover:underline">
            {more.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
