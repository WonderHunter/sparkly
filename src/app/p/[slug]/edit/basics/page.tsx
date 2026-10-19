import { ActionForm, FieldError } from "@/components/editor/action-form";
import { ImageField } from "@/components/editor/image-upload";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { listCategories } from "@/lib/data/projects";
import { getEditContext } from "@/lib/data/editor";
import { PLATFORM_LABEL } from "@/lib/types";
import { EditorSection } from "@/components/editor/editor-section";
import { updateBasics } from "../actions";

export default async function BasicsTab({ params }: PageProps<"/p/[slug]/edit/basics">) {
  const { slug } = await params;
  const [{ project }, categories] = await Promise.all([getEditContext(slug), listCategories()]);

  return (
    <EditorSection title="Les bases" description="Ce qu'on voit en premier : le nom du jeu, son accroche, ses visuels et ses liens.">
      <ActionForm action={updateBasics.bind(null, project.slug)}>
        <Field label="Nom du jeu" htmlFor="title">
          <Input id="title" name="title" defaultValue={project.title} maxLength={80} required />
          <FieldError name="title" />
        </Field>

        <Field label="Phrase d'accroche" htmlFor="pitch" hint="Explique le concept du jeu et donne envie d'y jouer (200 caractères max).">
          <Textarea id="pitch" name="pitch" defaultValue={project.pitch} maxLength={200} className="min-h-20" />
          <FieldError name="pitch" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Plateforme" htmlFor="platform">
            <Select id="platform" name="platform" defaultValue={project.platform}>
              {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Genre" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={project.category_id?.toString() ?? ""}>
              <option value="">Non précisé</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError name="categoryId" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ImageField name="coverUrl" label="Visuel de couverture" defaultValue={project.cover_url} bucket="project-media" folder={project.id} hint="Affiché sur les cartes et en l'absence de vidéo. Format paysage conseillé." />
          <ImageField name="logoUrl" label="Logo du jeu" defaultValue={project.logo_url} bucket="project-media" folder={project.id} aspect="square" maxSize={512} />
        </div>
        <FieldError name="coverUrl" />

        <Field label="Vidéo de présentation" htmlFor="videoUrl" hint="Lien YouTube ou Vimeo (les vidéos ne sont pas hébergées sur Sparkly).">
          <Input id="videoUrl" name="videoUrl" type="url" defaultValue={project.video_url ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
          <FieldError name="videoUrl" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Lien vers le jeu" htmlFor="gameUrl" hint="Site du jeu ou démo WebGL.">
            <Input id="gameUrl" name="gameUrl" type="url" defaultValue={project.game_url ?? ""} placeholder="https://…" />
            <FieldError name="gameUrl" />
          </Field>
          <Field label="Dépôt du code" htmlFor="repoUrl" hint="Optionnel (GitHub, GitLab…).">
            <Input id="repoUrl" name="repoUrl" type="url" defaultValue={project.repo_url ?? ""} placeholder="https://github.com/…" />
            <FieldError name="repoUrl" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Début du projet" htmlFor="startsOn">
            <Input id="startsOn" name="startsOn" type="date" defaultValue={project.starts_on} required />
            <FieldError name="startsOn" />
          </Field>
          <Field label="Fin du projet" htmlFor="endsOn" hint="Sert à la jauge « Timeline du projet ».">
            <Input id="endsOn" name="endsOn" type="date" defaultValue={project.ends_on} required />
            <FieldError name="endsOn" />
          </Field>
        </div>
      </ActionForm>
    </EditorSection>
  );
}
