import { ActionForm } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { getEditContext } from "@/lib/data/editor";
import { updateStory } from "../actions";

export default async function StoryTab({ params }: PageProps<"/p/[slug]/edit/story">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);

  return (
    <EditorSection
      title="Description du jeu"
      description="Présente le concept, le gameplay, l'univers et la technologie web utilisée. Titres, listes, liens et images sont possibles."
    >
      <ActionForm action={updateStory.bind(null, project.slug)}>
        <RichTextEditor
          name="story"
          label="Description du jeu"
          defaultValue={project.story}
          uploadFolder={project.id}
          placeholder="Notre jeu est un… On joue en… La partie dure…"
        />
      </ActionForm>
    </EditorSection>
  );
}
