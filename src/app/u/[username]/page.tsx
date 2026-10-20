import { notFound } from "next/navigation";
import { ProjectCard } from "@/components/project/project-card";
import { Avatar, Badge, EmptyState } from "@/components/ui/misc";
import { getFundingSettings } from "@/lib/data/funding";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ROLE_LABEL, ROLE_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/utils";

async function getProfile(username: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, role, promo, created_at")
    .ilike("username", username)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getProfile(username);
  return { title: profile ? profile.display_name : "Profil introuvable" };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("project_members")
    .select("role, team_title, project_id")
    .eq("user_id", profile.id);
  const ids = (memberships ?? []).map((m) => m.project_id);
  const { data: cards } = ids.length
    ? await supabase.from("project_cards").select("*").in("id", ids).order("updated_at", { ascending: false })
    : { data: [] };
  const { goal } = await getFundingSettings();
  const projects = (cards ?? []).map((card) => ({
    card,
    membership: memberships!.find((m) => m.project_id === card.id)!,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <Avatar name={profile.display_name} src={profile.avatar_url} size="xl" />
        <div className="mt-4 sm:mt-0">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{profile.display_name}</h1>
          <p className="text-muted">@{profile.username}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge tone={profile.role === "student" ? "neutral" : "spark"}>{ROLE_LABEL[profile.role]}</Badge>
            {profile.promo && <Badge>{profile.promo}</Badge>}
            <Badge>Membre depuis le {formatDate(profile.created_at)}</Badge>
          </div>
          {profile.bio && <p className="mt-4 max-w-xl whitespace-pre-line">{profile.bio}</p>}
        </div>
      </header>

      <section className="mt-14">
        <h2 className="mb-6 font-display text-2xl font-extrabold">
          {projects.length > 1 ? `Projets (${projects.length})` : "Projet"}
        </h2>
        {projects.length > 0 ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(({ card, membership }) => (
              <div key={card.id}>
                <p className="mb-3 text-sm text-muted">{membership.team_title || MEMBER_ROLE_LABEL[membership.role]}</p>
                <ProjectCard project={card} goal={goal} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Pas de projet visible">
            {profile.role === "student" ? "Aucun projet publié pour l'instant." : "Les enseignant·es accompagnent les projets."}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
