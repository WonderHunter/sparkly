"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { slugWithSuffix } from "@/lib/domain/slug";
import { createClient } from "@/lib/supabase/server";
import { createProjectSchema, fieldErrors } from "@/lib/validation/project";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };

/** Crée un projet de groupe : le créateur en devient chef·fe de projet. */
export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/dashboard");
  if (viewer.isSuspended) return { error: "Ton compte est suspendu." };

  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    platform: formData.get("platform"),
  });
  if (!parsed.success) return { error: "Vérifie le formulaire.", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  let slug = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    slug = slugWithSuffix(parsed.data.title);
    const { error } = await supabase.from("projects").insert({
      slug,
      title: parsed.data.title,
      platform: parsed.data.platform,
      created_by: viewer.id,
    });
    if (!error) break;
    if (error.code === "SP001") return { error: error.message };
    if (error.code === "42501") return { error: "Ton compte ne peut pas créer de projet." };
    if (error.code !== "23505" || attempt === 2) return { error: "Création impossible pour le moment." };
  }

  revalidatePath("/", "layout");
  redirect(`/p/${slug}/edit/basics`);
}

export async function acceptInvitation(invitationId: string) {
  await requireViewer("/dashboard");
  if (!z.uuid().safeParse(invitationId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_invitation: invitationId });
  if (error) redirect(`/dashboard?invitation=${error.code === "SP001" ? "limit" : "error"}`);
  revalidatePath("/", "layout");
  redirect("/dashboard?invitation=accepted");
}

export async function declineInvitation(invitationId: string) {
  await requireViewer("/dashboard");
  if (!z.uuid().safeParse(invitationId).success) return;
  const supabase = await createClient();
  await supabase.from("project_invitations").delete().eq("id", invitationId);
  revalidatePath("/dashboard");
}
