"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { slugify } from "@/lib/domain/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };

const uuid = z.uuid();

// ---------------------------------------------------------------------------
// Comptes (admin uniquement)
// ---------------------------------------------------------------------------
export async function setUserRole(userId: string, role: "student" | "teacher" | "admin") {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success || userId === admin.id) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success || userId === admin.id) return;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", userId);
  revalidatePath("/admin/users");
}

/** Supprime définitivement un compte (Auth + profil + contenus en cascade). */
export async function deleteUser(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success) return { error: "Compte invalide." };
  if (userId === admin.id) return { error: "Tu ne peux pas supprimer ton propre compte." };
  if (formData.get("confirm") !== "SUPPRIMER") return { error: "Écris SUPPRIMER pour confirmer." };

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { error: "Suppression impossible." };
  revalidatePath("/", "layout");
  // La ligne disparaît de la liste : le retour s'affiche en haut de page.
  redirect("/admin/users?deleted=1");
}

// ---------------------------------------------------------------------------
// Projets (modération par l'équipe pédagogique)
// ---------------------------------------------------------------------------
export async function setProjectHidden(projectId: string, hidden: boolean) {
  await requireStaff();
  if (!uuid.safeParse(projectId).success) return;
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status: hidden ? "hidden" : "draft" })
    .eq("id", projectId);
  revalidatePath("/", "layout");
}

export async function adminDeleteProject(projectId: string) {
  await requireAdmin();
  if (!uuid.safeParse(projectId).success) return;
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Signalements
// ---------------------------------------------------------------------------
export async function resolveReport(reportId: string) {
  const staff = await requireStaff();
  if (!uuid.safeParse(reportId).success) return;
  const supabase = await createClient();
  await supabase
    .from("reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: staff.id })
    .eq("id", reportId);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Réglages (admin)
// ---------------------------------------------------------------------------
const settingsSchema = z
  .object({
    schoolYear: z.string().trim().min(4, "Indique l'année scolaire.").max(20),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
    adminEmails: z
      .string()
      .transform((v) => v.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))
      .pipe(z.array(z.email("Une adresse admin est invalide."))),
  })
  .refine((v) => v.endsOn > v.startsOn, { path: ["endsOn"], message: "La fin doit être après le début." });

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    schoolYear: formData.get("schoolYear") ?? "",
    startsOn: formData.get("startsOn") ?? "",
    endsOn: formData.get("endsOn") ?? "",
    adminEmails: formData.get("adminEmails") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      school_year: parsed.data.schoolYear,
      default_starts_on: parsed.data.startsOn,
      default_ends_on: parsed.data.endsOn,
      admin_emails: parsed.data.adminEmails,
    })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Réglages enregistrés. Ils s'appliquent aux nouveaux projets." };
}

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Domaine invalide (ex. etudiant.univ-reims.fr).");

export async function addDomain(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const domain = domainSchema.safeParse(formData.get("domain") ?? "");
  const role = z.enum(["student", "teacher"]).safeParse(formData.get("role"));
  if (!domain.success) return { error: domain.error.issues[0].message };
  if (!role.success) return { error: "Rôle invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_email_domains").insert({ domain: domain.data, default_role: role.data });
  if (error) return { error: error.code === "23505" ? "Ce domaine est déjà autorisé." : "Ajout impossible." };
  revalidatePath("/admin/settings");
  return { ok: true, message: `@${domain.data} est autorisé.` };
}

export async function removeDomain(domain: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("allowed_email_domains").select("*", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return; // Toujours garder au moins un domaine.
  await supabase.from("allowed_email_domains").delete().eq("domain", domain);
  revalidatePath("/admin/settings");
}

export async function addCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = z.string().trim().min(2, "Nom trop court.").max(40).safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };
  const slug = slugify(name.data);
  if (!slug) return { error: "Nom invalide." };
  const supabase = await createClient();
  const { count } = await supabase.from("categories").select("*", { count: "exact", head: true });
  const { error } = await supabase.from("categories").insert({ name: name.data, slug, position: (count ?? 0) + 1 });
  if (error) return { error: error.code === "23505" ? "Ce genre existe déjà." : "Ajout impossible." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Genre ajouté." };
}

export async function removeCategory(categoryId: number) {
  await requireAdmin();
  if (!Number.isInteger(categoryId)) return;
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", categoryId);
  revalidatePath("/admin/settings");
}

// ---------------------------------------------------------------------------
// Financement et limite de projets (admin)
// ---------------------------------------------------------------------------
const fundingSettingsSchema = z.object({
  budget: z.coerce.number().int("Montant entier.").min(0, "Le budget ne peut pas être négatif.").max(10_000_000),
  goal: z.coerce.number().int("Montant entier.").min(1, "L'objectif doit être positif.").max(10_000_000),
  maxProjects: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 20), "Entre 1 et 20, ou vide pour illimité."),
});

export async function updateFundingSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = fundingSettingsSchema.safeParse({
    budget: formData.get("budget") ?? "",
    goal: formData.get("goal") ?? "",
    maxProjects: formData.get("maxProjects") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      teacher_annual_budget: parsed.data.budget,
      funding_goal: parsed.data.goal,
      max_projects_per_student: parsed.data.maxProjects,
    })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Réglages enregistrés." };
}
