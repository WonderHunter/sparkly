import Link from "next/link";
import { Eye, EyeOff, Rocket, Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Badge, ProgressBar } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LABEL, STATUS_LABEL } from "@/lib/types";
import { formatRelative, pluralize } from "@/lib/utils";
import { adminDeleteProject, forcePublishProject, setProjectHidden } from "../actions";

export default async function AdminProjects() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("project_cards")
    .select(
      "id, slug, title, status, platform, progress, members_count, posts_count, comments_count, last_post_at, updated_at, category_name, character_name, emotion_name",
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Tous les projets</caption>
        <thead className="border-b border-border bg-surface-muted text-xs text-muted uppercase">
          <tr>
            <th className="px-3 py-3 sm:px-4">Projet</th>
            <th className="px-3 py-3 sm:px-4">Statut</th>
            <th className="hidden px-4 py-3 md:table-cell">Avancée</th>
            <th className="hidden px-4 py-3 lg:table-cell">Activité</th>
            <th className="px-3 py-3 text-right sm:px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(projects ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-3 sm:px-4">
                <Link href={`/p/${p.slug}`} className="font-semibold hover:text-spark-strong">
                  {p.title}
                </Link>
                <p className="text-xs text-muted">{p.members_count} membres</p>
                {p.platform && p.category_name && p.character_name && p.emotion_name ? (
                  <p className="mt-1 text-xs">
                    {PLATFORM_LABEL[p.platform]} · {p.category_name} · {p.character_name} · {p.emotion_name}
                  </p>
                ) : (
                  <Badge tone="warning" className="mt-1">
                    Contraintes à définir
                  </Badge>
                )}
              </td>
              <td className="px-3 py-3 sm:px-4">
                {p.status && (
                  <Badge tone={p.status === "published" ? "success" : p.status === "hidden" ? "danger" : "warning"}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                )}
              </td>
              <td className="hidden w-40 px-4 py-3 md:table-cell">
                <ProgressBar value={p.progress ?? 0} label={`Avancée de ${p.title}`} size="sm" />
                <span className="text-xs text-muted">{p.progress} %</span>
              </td>
              <td className="hidden px-4 py-3 text-xs text-muted lg:table-cell">
                {p.posts_count} devlogs · {p.comments_count} comm.
                <br />
                {p.updated_at && `modifié ${formatRelative(p.updated_at)}`}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <div className="flex justify-end gap-1">
                  {p.status === "draft" && (
                    <form action={forcePublishProject.bind(null, p.id!)}>
                      <button
                        type="submit"
                        title="Publier ce brouillon, même s'il est incomplet"
                        className="inline-flex items-center gap-1 rounded-full p-2 text-xs font-semibold sm:px-3 sm:py-1.5 text-success hover:bg-success-soft"
                      >
                        <Rocket className="h-3.5 w-3.5" /> <span className="sr-only sm:not-sr-only">Publier</span>
                      </button>
                    </form>
                  )}
                  <form action={setProjectHidden.bind(null, p.id!, p.status !== "hidden")}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full p-2 text-xs font-semibold sm:px-3 sm:py-1.5 hover:bg-surface-muted"
                    >
                      {p.status === "hidden" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span className="sr-only sm:not-sr-only">{p.status === "hidden" ? "Rétablir" : "Masquer"}</span>
                    </button>
                  </form>
                  {viewer?.isStaff && (
                    <ConfirmDelete
                      action={adminDeleteProject.bind(null, p.id!)}
                      title={`Supprimer « ${p.title} » ?`}
                      description={`Le projet disparaît de Sparkly avec tout son contenu : ${pluralize(p.posts_count ?? 0, "devlog")}, ${pluralize(p.comments_count ?? 0, "commentaire")}, le planning et la FAQ. Pour le retirer temporairement, préfère « Masquer ».`}
                      confirmLabel="Supprimer le projet"
                      triggerLabel={`Supprimer ${p.title}`}
                      triggerClassName="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmDelete>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
