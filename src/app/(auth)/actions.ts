"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DEFAULT_ALLOWED_DOMAINS } from "@/lib/domain/email";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, otpSchema, safeNextPath } from "@/lib/validation/auth";

export type LoginState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string; info?: string };

async function allowedDomains(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("allowed_email_domains").select("domain");
  return data?.length ? data.map((d) => d.domain) : [...DEFAULT_ALLOWED_DOMAINS];
}

/** Étape 1 : envoie un code à 6 chiffres (crée le compte au premier passage). */
export async function requestOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema(await allowedDomains()).safeParse(formData.get("email"));
  if (!parsed.success) {
    return { step: "email", email: String(formData.get("email") ?? ""), error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });
  if (error) {
    const message =
      error.status === 429
        ? "Trop de demandes. Patiente une minute avant de redemander un code."
        : error.status === 403 || /domain|réservé/i.test(error.message)
          ? "Sparkly est réservé aux adresses universitaires de Reims."
          : "Impossible d'envoyer le code pour le moment. Réessaie dans un instant.";
    return { step: "email", email: parsed.data, error: message };
  }
  return { step: "code", email: parsed.data, info: `Code envoyé à ${parsed.data}.` };
}

/** Étape 2 : vérifie le code et ouvre la session. */
export async function verifyOtp(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = prev.step === "code" ? prev.email : String(formData.get("email") ?? "");
  const code = otpSchema.safeParse(formData.get("code"));
  if (!code.success) return { step: "code", email, error: code.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) {
    return { step: "code", email, error: "Code incorrect ou expiré. Vérifie l'e-mail ou demande un nouveau code." };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
