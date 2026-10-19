import Image from "next/image";
import Link from "next/link";
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
      {full ? (
        <div className="prose-sparkly mt-5" dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.body) }} />
      ) : (
        <p className="mt-3 line-clamp-3 text-[15px] text-foreground/85">{toPlainText(post.body, 320)}</p>
      )}
      {post.images.length > 0 && (
        <div className={full ? "mt-6 grid gap-3 sm:grid-cols-2" : "mt-4 flex gap-3 overflow-x-auto"}>
          {post.images.slice(0, full ? 8 : 3).map((src) => (
            <div
              key={src}
              className={full ? "relative aspect-video overflow-hidden rounded-xl" : "relative h-28 w-44 shrink-0 overflow-hidden rounded-xl"}
            >
              <Image src={src} alt="" fill sizes={full ? "(min-width: 640px) 50vw, 100vw" : "176px"} className="object-cover" />
            </div>
          ))}
        </div>
      )}
      {!full && (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-spark-strong hover:underline">
          Lire la mise à jour
        </Link>
      )}
    </article>
  );
}
