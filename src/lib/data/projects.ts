import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Faq, Member, Milestone, Platform, Post, Project, ProjectCard, PublicProfile } from "@/lib/types";

export type SortKey = "recent" | "progress" | "active" | "popular";
export type StateFilter = "all" | "in_progress" | "finished";

export interface ProjectFilters {
  q?: string;
  category?: string;
  platform?: Platform;
  state?: StateFilter;
  sort?: SortKey;
  limit?: number;
}

const PROFILE_FIELDS = "id, username, display_name, avatar_url, role";

/** Projets publiés pour Découvrir et l'accueil (la RLS filtre déjà les brouillons). */
export async function listProjects(filters: ProjectFilters = {}): Promise<ProjectCard[]> {
  const supabase = await createClient();
  let query = supabase.from("project_cards").select("*").eq("status", "published");

  if (filters.q?.trim()) {
    query = query.textSearch("fts", filters.q.trim(), { type: "websearch", config: "french" });
  }
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.state === "finished") query = query.gte("progress", 100);
  if (filters.state === "in_progress") query = query.lt("progress", 100);

  switch (filters.sort) {
    case "progress":
      query = query.order("progress", { ascending: false });
      break;
    case "active":
      query = query.order("last_post_at", { ascending: false, nullsFirst: false });
      break;
    case "popular":
      query = query.order("followers_count", { ascending: false }).order("comments_count", { ascending: false });
      break;
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query.limit(filters.limit ?? 60);
  if (error) throw error;
  return data ?? [];
}

export const listCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("position");
  return data ?? [];
});

export interface ProjectPage {
  project: Project & { category: { slug: string; name: string } | null };
  members: Member[];
  milestones: Milestone[];
  stats: { followers: number; comments: number; posts: number };
}

/** Tout ce qu'il faut pour l'en-tête et l'onglet Campagne d'une page projet. */
export const getProjectPage = cache(async (slug: string): Promise<ProjectPage | null> => {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, category:categories(slug, name)")
    .ilike("slug", slug)
    .maybeSingle();
  if (!project) return null;

  const [members, milestones, card] = await Promise.all([
    supabase
      .from("project_members")
      .select(`user_id, role, team_title, position, profile:profiles(${PROFILE_FIELDS})`)
      .eq("project_id", project.id)
      .order("position"),
    supabase.from("milestones").select("*").eq("project_id", project.id).order("position"),
    supabase
      .from("project_cards")
      .select("followers_count, comments_count, posts_count")
      .eq("id", project.id)
      .maybeSingle(),
  ]);

  return {
    project,
    members: (members.data ?? []).filter((m) => m.profile) as Member[],
    milestones: milestones.data ?? [],
    stats: {
      followers: card.data?.followers_count ?? 0,
      comments: card.data?.comments_count ?? 0,
      posts: card.data?.posts_count ?? 0,
    },
  };
});

export type PostWithAuthor = Post & { author: PublicProfile | null };

export async function listPosts(projectId: string, opts: { limit?: number; includeDrafts?: boolean } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(`*, author:profiles(${PROFILE_FIELDS})`)
    .eq("project_id", projectId);
  if (!opts.includeDrafts) query = query.eq("status", "published");
  const { data } = await query
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  return (data ?? []) as PostWithAuthor[];
}

export async function getPostByNumber(projectId: string, number: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(`*, author:profiles(${PROFILE_FIELDS})`)
    .eq("project_id", projectId)
    .eq("number", number)
    .eq("status", "published")
    .maybeSingle();
  return data as PostWithAuthor | null;
}

export async function listFaqs(projectId: string): Promise<Faq[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("*").eq("project_id", projectId).order("position");
  return data ?? [];
}

export type CommentWithAuthor = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  post_id: string | null;
  hidden_at: string | null;
  author: PublicProfile | null;
};

export interface CommentThread extends CommentWithAuthor {
  replies: CommentWithAuthor[];
}

/** Commentaires d'un projet (ou d'un post), regroupés en fils d'un niveau. */
export async function listComments(projectId: string, postId: string | null = null): Promise<CommentThread[]> {
  const supabase = await createClient();
  let query = supabase
    .from("comments")
    .select(`id, body, created_at, updated_at, parent_id, post_id, hidden_at, author:profiles(${PROFILE_FIELDS})`)
    .eq("project_id", projectId);
  query = postId ? query.eq("post_id", postId) : query.is("post_id", null);
  const { data } = await query.order("created_at", { ascending: true }).limit(500);

  const rows = (data ?? []) as CommentWithAuthor[];
  const threads = new Map<string, CommentThread>();
  for (const row of rows) if (!row.parent_id) threads.set(row.id, { ...row, replies: [] });
  for (const row of rows) if (row.parent_id) threads.get(row.parent_id)?.replies.push(row);
  return [...threads.values()].reverse();
}

export async function isFollowing(projectId: string, userId: string | undefined) {
  if (!userId) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** Les projets dont l'utilisateur est membre (il peut en avoir plusieurs). */
export async function listMyProjects(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role, team_title, joined_at, project:projects(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  return (data ?? [])
    .filter((m) => m.project)
    .map((m) => ({ role: m.role, team_title: m.team_title, project: m.project as Project }));
}

export type MyProject = Awaited<ReturnType<typeof listMyProjects>>[number];
