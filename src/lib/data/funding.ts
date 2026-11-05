import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";

export interface FundingSettings {
  budget: number;
  goal: number;
  maxProjectsPerStudent: number | null;
  /** Les enseignant·es peuvent joindre un mot (commentaire) à chaque financement. */
  commentsEnabled: boolean;
}

export const getFundingSettings = cache(async (): Promise<FundingSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("teacher_annual_budget, funding_goal, max_projects_per_student, funding_comments_enabled")
    .single();
  return {
    budget: data?.teacher_annual_budget ?? 120000,
    goal: data?.funding_goal ?? 10000,
    maxProjectsPerStudent: data?.max_projects_per_student ?? null,
    commentsEnabled: data?.funding_comments_enabled ?? true,
  };
});

/** Année universitaire courante, calculée en base (source de vérité). */
export const getCurrentSchoolYear = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_school_year");
  return (data as string | null) ?? "";
});

export interface Investment {
  id: string;
  amount: number;
  school_year: string;
  created_at: string;
  updated_at: string;
  investor: PublicProfile | null;
  /** Mot joint au financement (commentaire relié), s'il y en a un. */
  message: { id: string; body: string } | null;
}

/** Financements d'un projet, du plus récent au plus ancien (un·e enseignant·e peut en avoir plusieurs). */
export const listInvestments = cache(async (projectId: string): Promise<Investment[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investments")
    .select(
      "id, amount, school_year, created_at, updated_at, investor:profiles(id, username, display_name, avatar_url, role), comments(id, body)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(({ comments, ...inv }) => ({ ...inv, message: comments[0] ?? null })) as Investment[];
});

export interface TeacherBudget {
  schoolYear: string;
  budget: number;
  spent: number;
  remaining: number;
  investments: { id: string; amount: number; project: { id: string; slug: string; title: string; ends_on: string } | null }[];
}

/** Budget annuel d'un·e enseignant·e et ses financements de l'année. */
export const getTeacherBudget = cache(async (userId: string): Promise<TeacherBudget> => {
  const supabase = await createClient();
  const [{ budget }, schoolYear] = await Promise.all([getFundingSettings(), getCurrentSchoolYear()]);
  const { data } = await supabase
    .from("investments")
    .select("id, amount, project:projects(id, slug, title, ends_on)")
    .eq("investor_id", userId)
    .eq("school_year", schoolYear)
    .order("amount", { ascending: false });
  const investments = (data ?? []) as TeacherBudget["investments"];
  const spent = investments.reduce((sum, i) => sum + i.amount, 0);
  return { schoolYear, budget, spent, remaining: Math.max(0, budget - spent), investments };
});
