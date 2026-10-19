import { notFound } from "next/navigation";
import { PostCard } from "@/components/project/post-card";
import { EmptyState } from "@/components/ui/misc";
import { getProjectPage, listPosts } from "@/lib/data/projects";

export default async function DevlogPage({ params }: PageProps<"/p/[slug]/devlog">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();
  const posts = await listPosts(page.project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-8 font-display text-3xl font-extrabold">Actualités</h2>
      {posts.length ? (
        posts.map((post) => <PostCard key={post.id} post={post} slug={page.project.slug} />)
      ) : (
        <EmptyState title="Pas encore de mise à jour">
          Le groupe publiera ici son devlog au fil du projet.
        </EmptyState>
      )}
    </div>
  );
}
