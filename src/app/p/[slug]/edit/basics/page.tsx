import { ActionForm, FieldError } from "@/components/editor/action-form";
import { ImageField } from "@/components/editor/image-upload";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { SlugField } from "@/components/editor/slug-field";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { findTitleConflicts, listCategories } from "@/lib/data/projects";
import { getSiteUrl } from "@/lib/site-url";
import { getEditContext } from "@/lib/data/editor";
import { PLATFORM_LABEL } from "@/lib/types";
import { EditorSection } from "@/components/editor/editor-section";
import { updateBasics } from "../actions";

export default async function BasicsTab({ params, searchParams }: PageProps<"/p/[slug]/edit/basics">) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const [{ project }, categories] = await Promise.all([getEditContext(slug), listCategories()]);
  const [conflicts, siteUrl] = await Promise.all([findTitleConflicts(project.title, project.id), getSiteUrl()]);

  return (
    <EditorSection title="Les bases" description="Ce qu'on voit en premier : le nom du jeu, son accroche, ses visuels et ses liens.">
      {saved && (
        <div className="mb-6">
          <FormMessage tone="success">Enregistré. Le projet a une nouvelle adresse.</FormMessage>
        </div>
      )}
      {conflicts.length > 0 && (
        <div role="status" className="mb-6 flex gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">
              {conflicts.length > 1 ? `${conflicts.length} autres projets s'appellent` : "Un autre projet s'appelle"} déjà
              « {project.title} ».
            </p>
            <p className="mt-0.5 text-foreground/80">
              Vous pouvez garder ce nom, mais pensez à vous distinguer : accroche, visuel et adresse du projet.
              {conflicts.some((c) => c.slug) && " Voir : "}
              {conflicts
                .filter((c) => c.slug)
                .map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 && ", "}
                    <Link href={`/p/${c.slug}`} className="font-semibold underline underline-offset-2" target="_blank">
                      /p/{c.slug}
                    </Link>
                  </span>
                ))}
            </p>
          </div>
        </div>
      )}
      <ActionForm action={updateBasics.bind(null, project.slug)}>
        <Field label="Nom du jeu" htmlFor="title">
          <Input id="title" name="title" defaultValue={project.title} maxLength={80} required />
          <FieldError name="title" />
        </Field>

        <SlugField defaultValue={project.slug} siteUrl={siteUrl} />

        <Field label="Phrase d'accroche" htmlFor="pitch" hint="Explique le concept du jeu et donne envie d'y jouer (200 caractères max).">
          <Textarea id="pitch" name="pitch" defaultValue={project.pitch} maxLength={200} className="min-h-20" />
          <FieldError name="pitch" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Plateforme" htmlFor="platform">
            <Select
              id="platform"
              name="platform"
              defaultValue={project.platform}
              options={Object.entries(PLATFORM_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Genre" htmlFor="categoryId">
            <Select
              id="categoryId"
              name="categoryId"
              defaultValue={project.category_id?.toString() ?? ""}
              options={[{ value: "", label: "Non précisé" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
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
