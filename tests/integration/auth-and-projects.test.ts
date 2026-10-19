import { afterAll, describe, expect, it } from "vitest";
import { anonClient, deleteUsersByEmail, serviceClient, signInWithOtp, uniqueEmail } from "./helpers";

/**
 * Tests d'intégration : vraie API Supabase locale (Auth + PostgREST + RLS + triggers),
 * avec le même client que l'application.
 */
const created: string[] = [];
afterAll(() => deleteUsersByEmail(created));

describe("Authentification par code e-mail", () => {
  it("refuse une adresse hors université, même par appel direct à l'API Auth", async () => {
    const { error } = await anonClient().auth.signInWithOtp({
      email: "intrus@gmail.com",
      options: { shouldCreateUser: true },
    });
    expect(error).not.toBeNull();
    expect(error?.status).toBe(403);
  });

  it("crée le compte et le profil étudiant à la première connexion", async () => {
    const email = uniqueEmail("nouveau");
    created.push(email);
    const client = await signInWithOtp(email);
    const { data: user } = await client.auth.getUser();
    const { data: profile } = await client.from("profiles").select("*").eq("id", user.user!.id).single();
    expect(profile?.role).toBe("student");
    expect(profile?.username).toMatch(/^nouveau-/);
  });

  it("donne le rôle enseignant aux adresses @univ-reims.fr", async () => {
    const email = uniqueEmail("prof", "univ-reims.fr");
    created.push(email);
    const client = await signInWithOtp(email);
    const { data: user } = await client.auth.getUser();
    const { data: profile } = await client.from("profiles").select("role").eq("id", user.user!.id).single();
    expect(profile?.role).toBe("teacher");
  });
});

describe("Cycle de vie d'un projet", () => {
  it("création, jalons par défaut, avancée, publication et visibilité publique", async () => {
    const email = uniqueEmail("chef");
    created.push(email);
    const client = await signInWithOtp(email);
    const { data: user } = await client.auth.getUser();
    const userId = user.user!.id;

    const slug = `projet-test-${Date.now()}`;
    const { data: project, error } = await client
      .from("projects")
      .insert({ slug, title: "Projet de test", platform: "borne", created_by: userId })
      .select()
      .single();
    expect(error).toBeNull();
    expect(project?.status).toBe("draft");

    // Le trigger fait du créateur le chef de projet et crée les 6 jalons du planning.
    const { data: members } = await client.from("project_members").select("role").eq("project_id", project!.id);
    expect(members).toEqual([{ role: "owner" }]);
    const { data: milestones } = await client
      .from("milestones")
      .select("id, weight")
      .eq("project_id", project!.id)
      .order("position");
    expect(milestones).toHaveLength(6);
    expect(milestones!.reduce((s, m) => s + m.weight, 0)).toBe(100);

    // Brouillon invisible du public.
    const anon = anonClient();
    expect((await anon.from("projects").select("id").eq("id", project!.id)).data).toEqual([]);

    // Terminer le premier jalon (8 %) met à jour l'avancée.
    await client.from("milestones").update({ status: "done" }).eq("id", milestones![0].id);
    const { data: afterMilestone } = await client.from("projects").select("progress").eq("id", project!.id).single();
    expect(afterMilestone?.progress).toBe(8);

    // Publication : visible du public et dans les cartes.
    await client.from("projects").update({ status: "published", pitch: "Accroche" }).eq("id", project!.id);
    const { data: publicCard } = await anon.from("project_cards").select("slug, progress").eq("id", project!.id).single();
    expect(publicCard).toEqual({ slug, progress: 8 });

    // Une même personne peut porter plusieurs projets.
    const second = await client
      .from("projects")
      .insert({ slug: `${slug}-bis`, title: "Second", platform: "tv", created_by: userId })
      .select("id")
      .single();
    expect(second.error).toBeNull();
    const { data: mine } = await client.from("project_members").select("project_id").eq("user_id", userId);
    expect(mine).toHaveLength(2);
  });

  it("un étudiant ne peut pas modifier le projet d'un autre groupe", async () => {
    const email = uniqueEmail("curieux");
    created.push(email);
    const client = await signInWithOtp(email);
    const { data } = await client
      .from("projects")
      .update({ title: "Piraté" })
      .eq("slug", "neon-pusher")
      .select();
    expect(data).toEqual([]);
    const { data: still } = await serviceClient().from("projects").select("title").eq("slug", "neon-pusher").single();
    expect(still?.title).toBe("Neon Pusher");
  });
});

describe("Invitations d'équipe", () => {
  it("le chef invite un camarade, qui accepte et rejoint l'équipe", async () => {
    const ownerEmail = uniqueEmail("owner");
    const mateEmail = uniqueEmail("mate");
    created.push(ownerEmail, mateEmail);

    const owner = await signInWithOtp(ownerEmail);
    const { data: ownerUser } = await owner.auth.getUser();
    const { data: project } = await owner
      .from("projects")
      .insert({ slug: `equipe-${Date.now()}`, title: "Équipe", platform: "cocktail", created_by: ownerUser.user!.id })
      .select("id")
      .single();

    const { error: inviteError } = await owner.from("project_invitations").insert({
      project_id: project!.id,
      email: mateEmail,
      role: "crea",
      team_title: "Graphiste",
      invited_by: ownerUser.user!.id,
    });
    expect(inviteError).toBeNull();

    const mate = await signInWithOtp(mateEmail);
    // La personne invitée a déjà son propre projet : elle peut quand même rejoindre l'équipe.
    const { data: mateUser } = await mate.auth.getUser();
    const own = await mate
      .from("projects")
      .insert({ slug: `perso-${Date.now()}`, title: "Projet perso", platform: "web", created_by: mateUser.user!.id });
    expect(own.error).toBeNull();

    const { data: invitations } = await mate.from("project_invitations").select("id").eq("email", mateEmail);
    expect(invitations).toHaveLength(1);
    const { data: joined, error } = await mate.rpc("accept_invitation", { p_invitation: invitations![0].id });
    expect(error).toBeNull();
    expect(joined).toBe(project!.id);

    const { data: members } = await owner
      .from("project_members")
      .select("role, team_title")
      .eq("project_id", project!.id)
      .order("position");
    expect(members).toEqual([
      { role: "owner", team_title: "Chef·fe de projet" },
      { role: "crea", team_title: "Graphiste" },
    ]);
  });
});
