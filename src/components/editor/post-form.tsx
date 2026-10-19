import { ActionForm, FieldError } from "@/components/editor/action-form";
import { GalleryField } from "@/components/editor/image-upload";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { FormState } from "@/app/p/[slug]/edit/actions";
import type { Milestone, Post } from "@/lib/types";

interface PostFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  projectId: string;
  milestones: Pick<Milestone, "id" | "title">[];
  post?: Post;
}

/** Formulaire de mise à jour (devlog) : brouillon ou publication immédiate. */
export function PostForm({ action, projectId, milestones, post }: PostFormProps) {
  const published = post?.status === "published";
  return (
    <ActionForm
      action={action}
      hideSubmit
      extraActions={
        <>
          <Button type="submit" name="intent" value="publish">
            {published ? "Enregistrer" : "Publier la mise à jour"}
          </Button>
          {!published && (
            <Button type="submit" name="intent" value="draft" variant="outline">
              Enregistrer en brouillon
            </Button>
          )}
        </>
      }
    >
      <Field label="Titre de ce qui a été fait" htmlFor="title">
        <Input id="title" name="title" defaultValue={post?.title} maxLength={140} required placeholder="Ex. Premier prototype jouable" />
        <FieldError name="title" />
      </Field>
      <div className="space-y-1.5">
        <span className="block text-sm font-semibold">Texte</span>
        <RichTextEditor name="body" label="Texte de la mise à jour" defaultValue={post?.body} uploadFolder={projectId} placeholder="Ce qu'on a fait, ce qu'on a appris, la suite…" />
        <FieldError name="body" />
      </div>
      <GalleryField name="images" bucket="project-media" folder={projectId} defaultValue={post?.images ?? []} />
      <Field label="Jalon concerné" htmlFor="milestoneId" hint="Optionnel : relie la mise à jour à une étape du planning.">
        <Select id="milestoneId" name="milestoneId" defaultValue={post?.milestone_id ?? ""}>
          <option value="">Aucun</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
