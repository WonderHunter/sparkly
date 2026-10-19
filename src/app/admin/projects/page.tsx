import Link from "next/link";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge, ProgressBar } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LABEL, STATUS_LABEL } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { adminDeleteProject, setProjectHidden } from "../actions";

export default async function AdminProjects() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("project_cards")
    .select("id, slug, title, status, platform, progress, members_count, posts_count, comments_count, last_post_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Tous les projets</caption>
        <thead className="border-b border-border bg-surface-muted text-xs text-muted uppercase">
          <tr>
            <th className="px-4 py-3">Projet</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 md:table-cell">Avancée</th>
            <th className="hidden px-4 py-3 lg:table-cell">Activité</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(projects ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <Link href={`/p/${p.slug}`} className="font-semibold hover:text-spark-strong">
                  {p.title}
                </Link>
                <p className="text-xs text-muted">
                  {p.platform && PLATFORM_LABEL[p.platform]} · {p.members_count} membres
                </p>
              </td>
              <td className="px-4 py-3">
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
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <form action={setProjectHidden.bind(null, p.id!, p.status !== "hidden")}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                    >
                      {p.status === "hidden" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {p.status === "hidden" ? "Rétablir" : "Masquer"}
                    </button>
                  </form>
                  {viewer?.isAdmin && (
                    <form action={adminDeleteProject.bind(null, p.id!)}>
                      <button
                        type="submit"
                        aria-label={`Supprimer ${p.title}`}
                        className="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
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
