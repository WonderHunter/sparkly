"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, profileSchema } from "@/lib/validation/project";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/settings");
  if (viewer.isSuspended) return { error: "Ton compte est suspendu." };

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    username: formData.get("username") ?? "",
    bio: formData.get("bio") ?? "",
    promo: formData.get("promo") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) return { error: "Vérifie les champs en rouge.", fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName,
      username: d.username,
      bio: d.bio || null,
      promo: d.promo || null,
      avatar_url: d.avatarUrl,
    })
    .eq("id", viewer.id);

  if (error) {
    if (error.code === "23505") return { error: "Ce pseudo est déjà pris.", fields: { username: "Pseudo déjà utilisé." } };
    return { error: "Enregistrement impossible." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour." };
}
