import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ActionForm } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input } from "@/components/ui/form";
import { getEditContext } from "@/lib/data/editor";
import { publishChecklist } from "@/lib/domain/publish";
import { createClient } from "@/lib/supabase/server";
import { deleteProject, setPublished } from "../actions";

export default async function PublishTab({ params }: PageProps<"/p/[slug]/edit/publish">) {
  const { slug } = await params;
  const { project, isOwner } = await getEditContext(slug);
  const supabase = await createClient();
  const { count: members } = await supabase
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project.id);

  const checklist = publishChecklist(project, members ?? 0);
  const ready = checklist.every((c) => !c.required || c.done);
  const published = project.status === "published";

  return (
    <div className="space-y-6">
      <EditorSection
        title={published ? "Le projet est publié" : "Publier le projet"}
        description={
          published
            ? "Il apparaît dans Découvrir et tout le monde peut le suivre et le commenter."
            : "Tant qu'il est en brouillon, seuls les membres du groupe et les profs le voient."
        }
      >
        <ul className="mb-8 space-y-2.5">
          {checklist.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center gap-2.5 text-sm">
              {item.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted" />}
              <span className={item.done ? undefined : "text-muted"}>
                {item.label}
                {item.required && !item.done && <span className="text-danger"> (obligatoire)</span>}
              </span>
              {!item.done && (
                <Link href={`/p/${project.slug}/edit/${item.tab}`} className="font-semibold text-spark-strong hover:underline">
                  Compléter
                </Link>
              )}
            </li>
          ))}
        </ul>
        {project.status === "hidden" ? (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Ce projet a été masqué par l&apos;équipe pédagogique. Contacte ton enseignant·e.
          </p>
        ) : (
          <ActionForm
            action={setPublished.bind(null, project.slug, !published)}
            submitLabel={published ? "Repasser en brouillon" : ready ? "Publier le projet" : "Publier (complète d'abord la liste)"}
            pendingLabel="…"
          >
            {null}
          </ActionForm>
        )}
      </EditorSection>

      {isOwner && (
        <section className="rounded-3xl border border-danger/30 bg-danger-soft/40 p-6 sm:p-8">
          <h2 className="font-display text-xl font-extrabold text-danger">Supprimer le projet</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Supprime définitivement le projet, son planning, ses actualités et ses commentaires.
          </p>
          <ActionForm action={deleteProject.bind(null, project.slug)} submitLabel="Supprimer définitivement" pendingLabel="Suppression…">
            <Field label={`Recopie « ${project.title} » pour confirmer`} htmlFor="confirm">
              <Input id="confirm" name="confirm" autoComplete="off" />
            </Field>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
