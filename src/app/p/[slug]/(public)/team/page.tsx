import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge } from "@/components/ui/misc";
import { getProjectPage } from "@/lib/data/projects";
import { MEMBER_ROLE_LABEL } from "@/lib/types";

export default async function TeamPage({ params }: PageProps<"/p/[slug]/team">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-8 font-display text-3xl font-extrabold">L&apos;équipe</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {page.members.map((m) => (
          <li key={m.user_id}>
            <Link
              href={`/u/${m.profile.username}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-spark/50"
            >
              <Avatar name={m.profile.display_name} src={m.profile.avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{m.profile.display_name}</p>
                <p className="text-sm text-muted">{m.team_title || MEMBER_ROLE_LABEL[m.role]}</p>
                <Badge tone={m.role === "owner" ? "spark" : "neutral"} className="mt-2">
                  {MEMBER_ROLE_LABEL[m.role]}
                </Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
