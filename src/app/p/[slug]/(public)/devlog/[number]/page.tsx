import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CommentSection } from "@/components/project/comment-section";
import { PostCard } from "@/components/project/post-card";
import { getViewer } from "@/lib/auth";
import { getPostByNumber, getProjectPage, listComments } from "@/lib/data/projects";

export default async function PostPage({ params }: PageProps<"/p/[slug]/devlog/[number]">) {
  const { slug, number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) notFound();

  const page = await getProjectPage(slug);
  if (!page) notFound();
  const post = await getPostByNumber(page.project.id, n);
  if (!post) notFound();
  const [comments, viewer] = await Promise.all([listComments(page.project.id, post.id), getViewer()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/p/${page.project.slug}/devlog`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Toutes les actualités
      </Link>
      <PostCard post={post} slug={page.project.slug} full />
      <div className="mt-12">
        <CommentSection
          slug={page.project.slug}
          projectId={page.project.id}
          postId={post.id}
          threads={comments}
          viewer={viewer}
          canComment={page.project.status === "published"}
        />
      </div>
    </div>
  );
}
