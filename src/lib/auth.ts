import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface Viewer {
  id: string;
  email: string;
  profile: Profile;
  isStaff: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
}

/**
 * Utilisateur connecté (ou null), mis en cache le temps de la requête.
 * getClaims() vérifie la signature du JWT : on ne fait pas confiance au cookie brut.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    profile,
    isStaff: profile.role === "teacher" || profile.role === "admin",
    isAdmin: profile.role === "admin",
    isSuspended: profile.suspended_at !== null,
  };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isStaff) redirect("/");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isAdmin) redirect("/admin");
  return viewer;
}
