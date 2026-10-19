import { notFound } from "next/navigation";
import { CommentSection } from "@/components/project/comment-section";
import { getViewer } from "@/lib/auth";
import { getProjectPage, listComments } from "@/lib/data/projects";

export default async function CommentsPage({ params }: PageProps<"/p/[slug]/comments">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();
  const [threads, viewer] = await Promise.all([listComments(page.project.id), getViewer()]);

  return (
    <div className="mx-auto max-w-3xl">
      <CommentSection
        slug={page.project.slug}
        projectId={page.project.id}
        threads={threads}
        viewer={viewer}
        canComment={page.project.status === "published"}
      />
    </div>
  );
}
