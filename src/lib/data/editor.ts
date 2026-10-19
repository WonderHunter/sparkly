import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getViewer, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export interface EditContext {
  viewer: Viewer;
  project: Project;
  isOwner: boolean;
}

/**
 * Charge un projet modifiable par l'utilisateur courant (membre non suspendu ou admin).
 * La RLS fait foi côté base ; cette vérification sert à rediriger proprement.
 */
export const getEditContext = cache(async (slug: string): Promise<EditContext> => {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/p/${slug}/edit`)}`);

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").ilike("slug", slug).maybeSingle();
  if (!project) notFound();

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!viewer.isAdmin && (!membership || viewer.isSuspended)) redirect(`/p/${project.slug}`);
  return { viewer, project, isOwner: membership?.role === "owner" || viewer.isAdmin };
});
