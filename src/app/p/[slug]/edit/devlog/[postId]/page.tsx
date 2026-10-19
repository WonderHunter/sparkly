import { notFound } from "next/navigation";
import { z } from "zod";
import { EditorSection } from "@/components/editor/editor-section";
import { PostForm } from "@/components/editor/post-form";
import { getEditContext } from "@/lib/data/editor";
import { createClient } from "@/lib/supabase/server";
import { savePost } from "../../actions";

export default async function EditPostPage({ params }: PageProps<"/p/[slug]/edit/devlog/[postId]">) {
  const { slug, postId } = await params;
  if (!z.uuid().safeParse(postId).success) notFound();
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  const [{ data: post }, { data: milestones }] = await Promise.all([
    supabase.from("posts").select("*").eq("id", postId).eq("project_id", project.id).maybeSingle(),
    supabase.from("milestones").select("id, title").eq("project_id", project.id).order("position"),
  ]);
  if (!post) notFound();

  return (
    <EditorSection title={post.status === "published" ? `Mise à jour n°${post.number}` : "Brouillon de mise à jour"}>
      <PostForm action={savePost.bind(null, project.slug, post.id)} projectId={project.id} milestones={milestones ?? []} post={post} />
    </EditorSection>
  );
}
