import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui/misc";
import { computePace, computeTimeline } from "@/lib/domain/timeline";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const supabase = await createClient();
  const count = (table: "profiles" | "projects" | "posts" | "comments" | "reports") =>
    supabase.from(table).select("*", { count: "exact", head: true });

  const [users, projects, posts, comments, openReports, { data: cards }] = await Promise.all([
    count("profiles"),
    count("projects"),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    count("comments"),
    supabase.from("reports").select("*", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("project_cards").select("id, slug, title, status, progress, starts_on, ends_on, last_post_at"),
  ]);

  const all = cards ?? [];
  const avg = all.length ? Math.round(all.reduce((s, p) => s + (p.progress ?? 0), 0) / all.length) : 0;
  const behind = all.filter((p) => computePace(p.progress ?? 0, computeTimeline(p.starts_on!, p.ends_on!)) === "behind");

  const stats = [
    { label: "Comptes", value: users.count ?? 0 },
    { label: "Projets", value: projects.count ?? 0 },
    { label: "Devlogs publiés", value: posts.count ?? 0 },
    { label: "Commentaires", value: comments.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="font-display text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">Avancée moyenne</h2>
          <p className="mt-2 font-display text-4xl font-extrabold text-spark-strong">{avg} %</p>
          <div className="mt-3">
            <ProgressBar value={avg} label="Avancée moyenne des projets" />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">Signalements à traiter</h2>
          <p className="mt-2 font-display text-4xl font-extrabold">{openReports.count ?? 0}</p>
          <Link href="/admin/reports" className="mt-3 inline-block text-sm font-semibold text-spark-strong hover:underline">
            Voir les signalements
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <AlertTriangle className="h-5 w-5 text-warning" /> Projets en retard sur le planning
        </h2>
        {behind.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucun projet en retard pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {behind.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <Link href={`/p/${p.slug}`} className="font-semibold hover:text-spark-strong">
                  {p.title}
                </Link>
                <span className="text-muted">
                  {p.progress} % fait · {computeTimeline(p.starts_on!, p.ends_on!)} % du temps écoulé
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
