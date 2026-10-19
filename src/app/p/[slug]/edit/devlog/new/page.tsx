import { EditorSection } from "@/components/editor/editor-section";
import { PostForm } from "@/components/editor/post-form";
import { getEditContext } from "@/lib/data/editor";
import { createClient } from "@/lib/supabase/server";
import { savePost } from "../../actions";

export default async function NewPostPage({ params }: PageProps<"/p/[slug]/edit/devlog/new">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  const { data: milestones } = await supabase.from("milestones").select("id, title").eq("project_id", project.id).order("position");

  return (
    <EditorSection title="Nouvelle mise à jour">
      <PostForm action={savePost.bind(null, project.slug, null)} projectId={project.id} milestones={milestones ?? []} />
    </EditorSection>
  );
}
