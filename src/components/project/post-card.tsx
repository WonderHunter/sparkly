import Link from "next/link";
import { PostMedia } from "@/components/project/post-media";
import { Avatar } from "@/components/ui/misc";
import { sanitizeRichText, toPlainText } from "@/lib/domain/sanitize";
import type { PostWithAuthor } from "@/lib/data/projects";
import { formatDate } from "@/lib/utils";

/** Bloc « Dernières actualités » : « Mise à jour n°X », date, titre, texte, images. */
export function PostCard({ post, slug, full = false }: { post: PostWithAuthor; slug: string; full?: boolean }) {
  const href = `/p/${slug}/devlog/${post.number}`;
  return (
    <article className="border-b border-border py-8 first:pt-0 last:border-0">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-spark-strong">Mise à jour n°{post.number}</span>
        {post.published_at && (
          <time dateTime={post.published_at} className="text-muted">
            {formatDate(post.published_at)}
          </time>
        )}
      </div>
      <h3 className="mt-2 font-display text-xl font-bold">
        {full ? post.title : <Link href={href} className="hover:text-spark-strong">{post.title}</Link>}
      </h3>
      {post.author && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <Avatar name={post.author.display_name} src={post.author.avatar_url} size="sm" />
          {post.author.display_name}
        </p>
      )}
      {!full && <p className="mt-3 line-clamp-3 text-[15px] text-foreground/85">{toPlainText(post.body, 320)}</p>}
      <PostMedia title={post.title} html={full ? sanitizeRichText(post.body) : null} images={post.images} full={full} />
      {!full && (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-spark-strong hover:underline">
          Lire la mise à jour
        </Link>
      )}
    </article>
  );
}
