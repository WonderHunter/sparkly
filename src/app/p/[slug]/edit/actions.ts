"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEditContext } from "@/lib/data/editor";
import { missingForPublish } from "@/lib/domain/publish";
import { isEmptyRichText, sanitizeRichText } from "@/lib/domain/sanitize";
import { createClient } from "@/lib/supabase/server";
import {
  basicsSchema,
  faqSchema,
  fieldErrors,
  invitationSchema,
  memberSchema,
  milestoneSchema,
  postSchema,
  storySchema,
} from "@/lib/validation/project";
import { isAllowedEmail } from "@/lib/domain/email";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function refresh(slug: string) {
  revalidatePath(`/p/${slug}`, "layout");
  revalidatePath("/discover");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Bases
// ---------------------------------------------------------------------------
export async function updateBasics(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await getEditContext(slug);
  const parsed = basicsSchema.safeParse({
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    pitch: str(formData, "pitch"),
    startsOn: str(formData, "startsOn"),
    endsOn: str(formData, "endsOn"),
    videoUrl: str(formData, "videoUrl"),
    gameUrl: str(formData, "gameUrl"),
    repoUrl: str(formData, "repoUrl"),
    siteUrl: str(formData, "siteUrl"),
    coverUrl: str(formData, "coverUrl"),
    logoUrl: str(formData, "logoUrl"),
  });
  if (!parsed.success) return { error: "Vérifie les champs en rouge.", fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      title: d.title,
      slug: d.slug,
      pitch: d.pitch,
      starts_on: d.startsOn,
      ends_on: d.endsOn,
      video_url: d.videoUrl,
      game_url: d.gameUrl,
      repo_url: d.repoUrl,
      site_url: d.siteUrl,
      cover_url: d.coverUrl,
      logo_url: d.logoUrl,
    })
    .eq("id", project.id);
  if (error) {
    if (error.code === "23505") {
      return { error: "Cette adresse est déjà prise.", fields: { slug: "Adresse déjà utilisée par un autre projet." } };
    }
    return { error: "Enregistrement impossible." };
  }

  refresh(project.slug);
  if (d.slug !== project.slug) {
    // L'éditeur est à l'ancienne adresse : on bascule sur la nouvelle.
    refresh(d.slug);
    redirect(`/p/${d.slug}/edit/basics?saved=1`);
  }
  return { ok: true, message: "Enregistré." };
}

// ---------------------------------------------------------------------------
// Histoire (description du jeu)
// ---------------------------------------------------------------------------
export async function updateStory(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await getEditContext(slug);
  const parsed = storySchema.safeParse({ story: str(formData, "story") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ story: sanitizeRichText(parsed.data.story) })
    .eq("id", project.id);
  if (error) return { error: "Enregistrement impossible." };

  refresh(project.slug);
  return { ok: true, message: "Description enregistrée." };
}

// ---------------------------------------------------------------------------
// Planning (jalons)
// ---------------------------------------------------------------------------
export async function saveMilestone(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await getEditContext(slug);
  const parsed = milestoneSchema.safeParse({
    id: str(formData, "id") || undefined,
    title: str(formData, "title"),
    description: str(formData, "description"),
    periodLabel: str(formData, "periodLabel"),
    weight: str(formData, "weight"),
    status: str(formData, "status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  const supabase = await createClient();
  const values = {
    title: d.title,
    description: d.description,
    period_label: d.periodLabel,
    weight: d.weight,
    status: d.status,
  };

  const { error } = d.id
    ? await supabase.from("milestones").update(values).eq("id", d.id).eq("project_id", project.id)
    : await supabase.from("milestones").insert({
        ...values,
        project_id: project.id,
        position: Number(str(formData, "position")) || 99,
      });
  if (error) return { error: "Enregistrement impossible." };

  refresh(project.slug);
  return { ok: true, message: d.id ? "Jalon mis à jour." : "Jalon ajouté." };
}

/** Changement rapide de statut depuis la liste des jalons. */
export async function setMilestoneStatus(slug: string, milestoneId: string, status: "todo" | "in_progress" | "done") {
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("milestones").update({ status }).eq("id", milestoneId).eq("project_id", project.id);
  refresh(project.slug);
}

export async function deleteMilestone(slug: string, milestoneId: string) {
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("milestones").delete().eq("id", milestoneId).eq("project_id", project.id);
  refresh(project.slug);
}

// ---------------------------------------------------------------------------
// Devlog
// ---------------------------------------------------------------------------
export async function savePost(slug: string, postId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project, viewer } = await getEditContext(slug);
  const parsed = postSchema.safeParse({
    title: str(formData, "title"),
    body: str(formData, "body"),
    milestoneId: str(formData, "milestoneId"),
    images: formData.getAll("images").filter((v): v is string => typeof v === "string" && v !== ""),
    publish: str(formData, "intent") === "publish",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  const body = sanitizeRichText(d.body);
  if (d.publish && isEmptyRichText(body) && d.images.length === 0) {
    return { error: "Ajoute un texte ou une image avant de publier.", fields: { body: "Contenu vide." } };
  }

  const supabase = await createClient();
  const values = {
    title: d.title,
    body,
    images: d.images,
    milestone_id: d.milestoneId,
    ...(d.publish ? { status: "published" as const } : {}),
  };

  if (postId) {
    const { error } = await supabase.from("posts").update(values).eq("id", postId).eq("project_id", project.id);
    if (error) return { error: "Enregistrement impossible." };
  } else {
    const { error } = await supabase
      .from("posts")
      .insert({ ...values, project_id: project.id, author_id: viewer.id, status: d.publish ? "published" : "draft" });
    if (error) return { error: "Enregistrement impossible." };
  }

  refresh(project.slug);
  redirect(`/p/${project.slug}/edit/devlog?saved=${d.publish ? "published" : "draft"}`);
}

export async function deletePost(slug: string, postId: string) {
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", postId).eq("project_id", project.id);
  refresh(project.slug);
}

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------
export async function inviteMember(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project, viewer } = await getEditContext(slug);
  const parsed = invitationSchema.safeParse({
    email: str(formData, "email"),
    role: str(formData, "role"),
    teamTitle: str(formData, "teamTitle"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: domains } = await supabase.from("allowed_email_domains").select("domain");
  if (!isAllowedEmail(parsed.data.email, domains?.map((d) => d.domain))) {
    return { error: "On ne peut inviter que des adresses universitaires.", fields: { email: "Domaine non autorisé." } };
  }

  const { error } = await supabase.from("project_invitations").insert({
    project_id: project.id,
    email: parsed.data.email,
    role: parsed.data.role,
    team_title: parsed.data.teamTitle,
    invited_by: viewer.id,
  });
  if (error) {
    return { error: error.code === "23505" ? "Cette personne est déjà invitée." : "Invitation impossible." };
  }

  revalidatePath(`/p/${project.slug}/edit/team`);
  return {
    ok: true,
    message: `Invitation créée. ${parsed.data.email} la verra dans « Mes projets » à sa prochaine connexion.`,
  };
}

export async function cancelInvitation(slug: string, invitationId: string) {
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("project_invitations").delete().eq("id", invitationId).eq("project_id", project.id);
  revalidatePath(`/p/${project.slug}/edit/team`);
}

export async function updateMember(slug: string, userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await getEditContext(slug);
  const parsed = memberSchema.safeParse({ teamTitle: str(formData, "teamTitle") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .update({ team_title: parsed.data.teamTitle })
    .eq("project_id", project.id)
    .eq("user_id", userId);
  if (error) return { error: "Enregistrement impossible." };
  refresh(project.slug);
  return { ok: true, message: "Rôle mis à jour." };
}

export async function removeMember(slug: string, userId: string) {
  const { project, viewer } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("project_members").delete().eq("project_id", project.id).eq("user_id", userId);
  refresh(project.slug);
  if (userId === viewer.id) redirect("/dashboard");
}

export async function transferOwnership(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project, isOwner } = await getEditContext(slug);
  if (!isOwner) return { error: "Seul·e le ou la chef·fe de projet peut passer le relais." };
  const newOwner = str(formData, "newOwner");
  const myRole = str(formData, "myRole");
  if (!newOwner) return { error: "Choisis la personne qui reprend le projet.", fields: { newOwner: "Choisis un membre." } };
  if (myRole !== "dev" && myRole !== "crea") return { error: "Choisis ton nouveau rôle." };
  if (formData.get("confirm") !== "on") {
    return { error: "Coche la case pour confirmer.", fields: { confirm: "Confirmation requise." } };
  }
  const supabase = await createClient();
  // La base vérifie à nouveau que l'appelant est chef·fe et que la personne est membre.
  const { error } = await supabase.rpc("transfer_ownership", { p_project: project.id, p_new_owner: newOwner, p_my_role: myRole });
  if (error) return { error: error.code === "P0002" ? "Cette personne ne fait pas partie de l'équipe." : "Passage de relais impossible." };
  refresh(project.slug);
  // La section disparaît une fois le relais passé : le message s'affiche en bandeau.
  redirect(`/p/${project.slug}/edit/team?relais=ok`);
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
export async function addFaq(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await getEditContext(slug);
  const parsed = faqSchema.safeParse({ question: str(formData, "question"), answer: str(formData, "answer") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { count } = await supabase.from("faqs").select("*", { count: "exact", head: true }).eq("project_id", project.id);
  const { error } = await supabase
    .from("faqs")
    .insert({ project_id: project.id, question: parsed.data.question, answer: parsed.data.answer, position: (count ?? 0) + 1 });
  if (error) return { error: "Enregistrement impossible." };
  refresh(project.slug);
  return { ok: true, message: "Question ajoutée." };
}

export async function deleteFaq(slug: string, faqId: string) {
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  await supabase.from("faqs").delete().eq("id", faqId).eq("project_id", project.id);
  refresh(project.slug);
}

// ---------------------------------------------------------------------------
// Publication et suppression
// ---------------------------------------------------------------------------
export async function setPublished(slug: string, publish: boolean): Promise<FormState> {
  const { project } = await getEditContext(slug);
  if (project.status === "hidden") return { error: "Ce projet a été masqué par l'équipe pédagogique." };
  const missing = missingForPublish(project);
  if (publish && missing.length > 0) {
    return { error: `Avant de publier, il manque : ${missing.map((m) => m.label.toLowerCase()).join(" et ")}.` };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: publish ? "published" : "draft" })
    .eq("id", project.id);
  if (error) return { error: "Changement de statut impossible." };
  refresh(project.slug);
  return { ok: true, message: publish ? "Projet publié !" : "Projet repassé en brouillon." };
}

export async function deleteProject(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project, isOwner } = await getEditContext(slug);
  if (!isOwner) return { error: "Seul·e le ou la chef·fe de projet peut supprimer le projet." };
  if (str(formData, "confirm").trim() !== project.title) {
    return { error: "Recopie exactement le nom du projet pour confirmer." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", project.id);
  if (error) return { error: "Suppression impossible." };
  revalidatePath("/", "layout");
  redirect("/dashboard?deleted=1");
}
