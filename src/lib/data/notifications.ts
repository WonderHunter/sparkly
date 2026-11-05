import "server-only";
import { cache } from "react";
import type { NotificationKind } from "@/lib/domain/notifications";
import { createClient } from "@/lib/supabase/server";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  readAt: string | null;
  createdAt: string;
  commentId: string;
  excerpt: string | null;
  postNumber: number | null;
  project: { slug: string; title: string } | null;
  actor: { displayName: string; avatarUrl: string | null } | null;
}

/** Dernières notifications de l'utilisateur connecté (la RLS ne renvoie que les siennes) et nombre de non lues. */
export const getNotifications = cache(async (limit = 8): Promise<{ items: NotificationItem[]; unread: number }> => {
  const supabase = await createClient();
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, kind, read_at, created_at, comment_id, comment:comments(body, post:posts(number)), project:projects(slug, title), actor:profiles!notifications_actor_id_fkey(display_name, avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  const items = (list.data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind as NotificationKind,
    readAt: n.read_at,
    createdAt: n.created_at,
    commentId: n.comment_id,
    excerpt: n.comment?.body ?? null,
    postNumber: n.comment?.post?.number ?? null,
    project: n.project,
    actor: n.actor ? { displayName: n.actor.display_name, avatarUrl: n.actor.avatar_url } : null,
  }));
  return { items, unread: unread.count ?? 0 };
});
