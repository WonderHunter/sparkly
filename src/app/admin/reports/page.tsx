import Link from "next/link";
import { Check } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { resolveReport } from "../actions";

const TARGET_LABEL = { project: "Projet", post: "Mise à jour", comment: "Commentaire" } as const;

export default async function AdminReports() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(display_name, username)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  // Contexte des contenus signalés (lien vers le projet concerné).
  const commentIds = (reports ?? []).filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const postIds = (reports ?? []).filter((r) => r.target_type === "post").map((r) => r.target_id);
  const projectIds = (reports ?? []).filter((r) => r.target_type === "project").map((r) => r.target_id);
  const [comments, posts] = await Promise.all([
    commentIds.length
      ? supabase.from("comments").select("id, body, project:projects(slug, title)").in("id", commentIds)
      : Promise.resolve({ data: [] as { id: string; body: string; project: { slug: string; title: string } | null }[] }),
    postIds.length
      ? supabase.from("posts").select("id, title, project:projects(slug, title)").in("id", postIds)
      : Promise.resolve({ data: [] as { id: string; title: string; project: { slug: string; title: string } | null }[] }),
  ]);
  const { data: projects } = projectIds.length
    ? await supabase.from("projects").select("id, slug, title").in("id", projectIds)
    : { data: [] as { id: string; slug: string; title: string }[] };

  function context(type: string, id: string): { label: string; href: string | null } {
    if (type === "comment") {
      const c = comments.data?.find((x) => x.id === id);
      return { label: c ? `« ${c.body.slice(0, 120)} »` : "Commentaire supprimé", href: c?.project ? `/p/${c.project.slug}/comments` : null };
    }
    if (type === "post") {
      const p = posts.data?.find((x) => x.id === id);
      return { label: p ? p.title : "Mise à jour supprimée", href: p?.project ? `/p/${p.project.slug}/devlog` : null };
    }
    const p = projects?.find((x) => x.id === id);
    return { label: p ? p.title : "Projet supprimé", href: p ? `/p/${p.slug}` : null };
  }

  if (!reports?.length) {
    return <EmptyState title="Aucun signalement en attente">Tout est calme.</EmptyState>;
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const ctx = context(r.target_type, r.target_id);
        return (
          <li key={r.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="warning">{TARGET_LABEL[r.target_type]}</Badge>
                  <span className="text-muted">
                    par {r.reporter?.display_name ?? "compte supprimé"} · {formatRelative(r.created_at)}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{r.reason}</p>
                <p className="mt-1 text-sm text-muted">
                  {ctx.href ? (
                    <Link href={ctx.href} className="hover:text-foreground hover:underline">
                      {ctx.label}
                    </Link>
                  ) : (
                    ctx.label
                  )}
                </p>
              </div>
              <form action={resolveReport.bind(null, r.id)}>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:border-foreground/40">
                  <Check className="h-4 w-4" /> Traité
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
