import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { notificationHref } from "@/lib/domain/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * Ouvre une notification : la marque comme lue puis redirige vers le commentaire.
 * La destination est recalculée ici depuis la base (jamais reprise de l'URL).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/notifications/[id]">) {
  const { id } = await params;
  const home = new URL("/", request.url);
  if (!z.uuid().safeParse(id).success) return NextResponse.redirect(home);

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("comment_id, comment:comments(post:posts(number)), project:projects(slug)")
    .eq("id", id)
    .maybeSingle();
  if (!data?.project) return NextResponse.redirect(home);

  await supabase.rpc("mark_notifications_read", { p_id: id });
  const href = notificationHref({ slug: data.project.slug, postNumber: data.comment?.post?.number, commentId: data.comment_id });
  return NextResponse.redirect(new URL(href, request.url));
}
