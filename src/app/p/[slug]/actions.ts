"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getFundingSettings } from "@/lib/data/funding";
import { parseEuros } from "@/lib/domain/funding";
import { PLATFORM_OPTIONS, type Platform } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const uuid = z.uuid();

/** Suivre / ne plus suivre un projet publié. */
export async function toggleFollow(projectId: string, slug: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/p/${slug}`);
  if (!uuid.safeParse(projectId).success) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", viewer.id);

  if ((count ?? 0) > 0) {
    await supabase.from("follows").delete().eq("project_id", projectId).eq("user_id", viewer.id);
  } else {
    await supabase.from("follows").insert({ project_id: projectId, user_id: viewer.id });
  }
  revalidatePath(`/p/${slug}`, "layout");
}

const commentSchema = z.object({
  projectId: uuid,
  postId: uuid.optional().or(z.literal("").transform(() => undefined)),
  parentId: uuid.optional().or(z.literal("").transform(() => undefined)),
  body: z
    .string()
    .trim()
    .min(1, "Écris un commentaire avant d'envoyer.")
    .max(2000, "2 000 caractères maximum."),
});

export async function addComment(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connecte-toi pour commenter." };
  if (viewer.isSuspended) return { error: "Ton compte est suspendu." };

  const parsed = commentSchema.safeParse({
    projectId: formData.get("projectId"),
    postId: formData.get("postId") ?? "",
    parentId: formData.get("parentId") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    project_id: parsed.data.projectId,
    post_id: parsed.data.postId ?? null,
    parent_id: parsed.data.parentId ?? null,
    author_id: viewer.id,
    body: parsed.data.body,
  });
  if (error) return { error: "Impossible de publier ce commentaire." };

  revalidatePath(`/p/${slug}`, "layout");
  return { ok: true };
}

export async function deleteComment(slug: string, commentId: string) {
  const viewer = await getViewer();
  if (!viewer || !uuid.safeParse(commentId).success) return;
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/p/${slug}`, "layout");
}

/** Modération : l'équipe pédagogique masque ou rétablit un commentaire. */
export async function setCommentHidden(slug: string, commentId: string, hidden: boolean) {
  const viewer = await getViewer();
  if (!viewer?.isStaff || !uuid.safeParse(commentId).success) return;
  const supabase = await createClient();
  await supabase
    .from("comments")
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", commentId);
  revalidatePath(`/p/${slug}`, "layout");
}

const reportSchema = z.object({
  targetType: z.enum(["project", "post", "comment"]),
  targetId: uuid,
  reason: z.string().trim().min(3, "Explique en quelques mots.").max(500),
});

export async function report(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connecte-toi pour signaler un contenu." };
  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    reporter_id: viewer.id,
  });
  if (error) return { error: "Le signalement n'a pas pu être envoyé." };
  return { ok: true, message: "Merci, l'équipe pédagogique va regarder." };
}

// ---------------------------------------------------------------------------
// Contraintes de la SAÉ (plateforme, type de jeu, personnage, émotion), fixées par l'équipe pédagogique
// ---------------------------------------------------------------------------
const constraintId = z
  .string()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Choix invalide.");

export async function setProjectConstraints(
  slug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.isStaff || viewer.isSuspended) return { error: "Réservé à l'équipe pédagogique." };
  if (!uuid.safeParse(projectId).success) return { error: "Projet invalide." };
  const parsed = z
    .object({
      platform: z.enum(["", ...PLATFORM_OPTIONS], { error: "Plateforme invalide." }),
      categoryId: constraintId,
      characterId: constraintId,
      emotionId: constraintId,
    })
    .safeParse({
      platform: String(formData.get("platform") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      characterId: String(formData.get("characterId") ?? ""),
      emotionId: String(formData.get("emotionId") ?? ""),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_constraints", {
    p_project: projectId,
    p_platform: (parsed.data.platform || null) as Platform,
    p_category: parsed.data.categoryId as number,
    p_character: parsed.data.characterId as number,
    p_emotion: parsed.data.emotionId as number,
  });
  if (error) return { error: "Les contraintes n'ont pas pu être enregistrées." };
  revalidatePath(`/p/${slug}`, "layout");
  revalidatePath("/discover");
  revalidatePath("/admin/projects");
  return { ok: true, message: "Contraintes enregistrées." };
}

// ---------------------------------------------------------------------------
// Financement fictif par les enseignant·es
// ---------------------------------------------------------------------------
const FUNDING_ERRORS = new Set(["SP002", "SP003"]);

/** Lit le montant et le mot facultatif d'un formulaire de financement. */
function readFunding(formData: FormData): { amount: number; message: string } | { error: string } {
  const amount = parseEuros(String(formData.get("amount") ?? ""));
  if (!Number.isInteger(amount) || amount < 1) return { error: "Indique un montant en euros (nombre entier)." };
  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 2000) return { error: "Ton mot fait plus de 2 000 caractères." };
  return { amount, message };
}

function fundingError(error: { code?: string; message: string }): ActionState {
  // Les règles (budget, rôle, projet en cours) sont vérifiées en base.
  return { error: FUNDING_ERRORS.has(error.code ?? "") ? error.message : "Le financement n'a pas pu être enregistré." };
}

function refreshFunding(slug: string) {
  revalidatePath(`/p/${slug}`, "layout");
  revalidatePath("/discover");
  revalidatePath("/dashboard");
}

/**
 * Nouveau financement de l'enseignant·e connecté·e. Un·e enseignant·e peut financer plusieurs fois
 * le même projet ; chaque financement peut porter un mot, publié dans les commentaires du projet.
 */
export async function invest(slug: string, projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connecte-toi pour financer un projet." };
  if (viewer.profile.role !== "teacher") return { error: "Seul·es les enseignant·es peuvent financer un projet." };
  if (!uuid.safeParse(projectId).success) return { error: "Projet invalide." };
  const input = readFunding(formData);
  if ("error" in input) return input;

  const supabase = await createClient();
  const { data: schoolYear } = await supabase.rpc("current_school_year");
  const { data: investment, error } = await supabase
    .from("investments")
    .insert({ project_id: projectId, investor_id: viewer.id, amount: input.amount, school_year: schoolYear as string })
    .select("id")
    .single();
  if (error || !investment) return fundingError(error ?? { message: "" });

  let message = "Merci pour ton soutien !";
  if (input.message) {
    const { commentsEnabled } = await getFundingSettings();
    const { error: commentError } = commentsEnabled
      ? await supabase
          .from("comments")
          .insert({ project_id: projectId, author_id: viewer.id, body: input.message, investment_id: investment.id })
      : { error: null };
    if (!commentsEnabled || commentError) message = "Financement enregistré, mais ton mot n'a pas pu être publié.";
  }
  refreshFunding(slug);
  return { ok: true, message };
}

/** Modifie le montant et le mot d'un de ses financements. Vider le mot retire le commentaire. */
export async function updateInvestment(
  slug: string,
  investmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer || !uuid.safeParse(investmentId).success) return { error: "Financement introuvable." };
  const input = readFunding(formData);
  if ("error" in input) return input;

  const supabase = await createClient();
  const { data: investment, error } = await supabase
    .from("investments")
    .update({ amount: input.amount })
    .eq("id", investmentId)
    .eq("investor_id", viewer.id)
    .select("id, project_id, comments(id)")
    .maybeSingle();
  if (error) return fundingError(error);
  if (!investment) return { error: "Ce financement ne peut plus être modifié." };

  const comment = investment.comments[0];
  const { commentsEnabled } = await getFundingSettings();
  if (!input.message && comment) {
    await supabase.from("comments").delete().eq("id", comment.id);
  } else if (input.message && comment) {
    await supabase.from("comments").update({ body: input.message }).eq("id", comment.id);
  } else if (input.message && commentsEnabled) {
    await supabase
      .from("comments")
      .insert({ project_id: investment.project_id, author_id: viewer.id, body: input.message, investment_id: investment.id });
  }
  refreshFunding(slug);
  return { ok: true, message: "Financement mis à jour." };
}

export async function withdrawInvestment(slug: string, investmentId: string) {
  const viewer = await getViewer();
  if (!viewer || !uuid.safeParse(investmentId).success) return;
  const supabase = await createClient();
  // Le mot relié (commentaire) part avec le financement (on delete cascade).
  await supabase.from("investments").delete().eq("id", investmentId);
  refreshFunding(slug);
}
