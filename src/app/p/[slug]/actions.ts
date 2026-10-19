"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
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
