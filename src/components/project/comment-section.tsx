import Link from "next/link";
import { EyeOff, Trash2 } from "lucide-react";
import { deleteComment, setCommentHidden } from "@/app/p/[slug]/actions";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Avatar, Badge } from "@/components/ui/misc";
import type { Viewer } from "@/lib/auth";
import type { CommentThread, CommentWithAuthor } from "@/lib/data/projects";
import { ROLE_LABEL } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { CommentForm, ReportButton } from "./comment-form";

interface CommentSectionProps {
  slug: string;
  projectId: string;
  postId?: string;
  threads: CommentThread[];
  viewer: Viewer | null;
  canComment: boolean;
}

export function CommentSection({ slug, projectId, postId, threads, viewer, canComment }: CommentSectionProps) {
  const total = threads.reduce((sum, t) => sum + 1 + t.replies.length, 0);
  const canWrite = Boolean(viewer && !viewer.isSuspended && canComment);

  return (
    <section aria-labelledby="comments-title">
      <h2 id="comments-title" className="font-display text-3xl font-extrabold">
        Commentaires <span className="text-muted">({total})</span>
      </h2>

      <div className="mt-6">
        {canWrite ? (
          <CommentForm slug={slug} projectId={projectId} postId={postId} />
        ) : !viewer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-muted px-5 py-4 text-sm">
            <span>Connecte-toi avec ton adresse universitaire pour laisser un retour.</span>
            <ButtonLink href={`/login?next=${encodeURIComponent(`/p/${slug}/comments`)}`} size="sm" variant="secondary">
              Se connecter
            </ButtonLink>
          </div>
        ) : !canComment ? (
          <p className="rounded-2xl bg-surface-muted px-5 py-4 text-sm text-muted">
            Les commentaires ouvriront quand le projet sera publié.
          </p>
        ) : (
          <p className="rounded-2xl bg-danger-soft px-5 py-4 text-sm text-danger">Ton compte est suspendu.</p>
        )}
      </div>

      {threads.length === 0 ? (
        <p className="mt-10 text-center text-muted">Pas encore de commentaire. Lance la discussion !</p>
      ) : (
        <ul className="mt-10 space-y-8">
          {threads.map((thread) => (
            <li key={thread.id}>
              <CommentItem comment={thread} slug={slug} viewer={viewer} />
              {(thread.replies.length > 0 || canWrite) && (
                <div className="mt-4 ml-6 space-y-5 border-l-2 border-border pl-6 sm:ml-12">
                  {thread.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} slug={slug} viewer={viewer} />
                  ))}
                  {canWrite && (
                    <details className="group">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                        Répondre
                      </summary>
                      <div className="mt-3">
                        <CommentForm slug={slug} projectId={projectId} postId={postId} parentId={thread.id} compact />
                      </div>
                    </details>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({ comment, slug, viewer }: { comment: CommentWithAuthor; slug: string; viewer: Viewer | null }) {
  const author = comment.author;
  const isAuthor = viewer?.id === author?.id;
  const hidden = comment.hidden_at !== null;

  return (
    <article id={`comment-${comment.id}`} className={cn("scroll-mt-24", hidden && "opacity-60")}>
      <header className="flex items-center gap-3">
        <Avatar name={author?.display_name ?? "Compte supprimé"} src={author?.avatar_url} size="sm" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          {author ? (
            <Link href={`/u/${author.username}`} className="font-semibold hover:text-spark-strong">
              {author.display_name}
            </Link>
          ) : (
            <span className="font-semibold text-muted">Compte supprimé</span>
          )}
          {author && author.role !== "student" && <Badge tone="spark">{ROLE_LABEL[author.role]}</Badge>}
          <time dateTime={comment.created_at} className="text-muted">
            {formatRelative(comment.created_at)}
          </time>
          {hidden && (
            <Badge tone="danger">
              <EyeOff className="h-3 w-3" /> Masqué
            </Badge>
          )}
        </div>
      </header>
      <p className="mt-2 pl-11 whitespace-pre-line text-[15px]">{comment.body}</p>
      {viewer && (
        <div className="mt-2 flex gap-4 pl-11 text-xs font-semibold text-muted">
          {(isAuthor || viewer.isStaff) && (
            <ConfirmDelete
              action={deleteComment.bind(null, slug, comment.id)}
              title="Supprimer ce commentaire ?"
              description={
                isAuthor
                  ? "Ton commentaire et les réponses qu'il a reçues disparaîtront de la page du projet."
                  : `Le commentaire de ${comment.author?.display_name ?? "ce compte"} et ses réponses disparaîtront. Pour le cacher sans le perdre, préfère « Masquer ».`
              }
              confirmLabel="Supprimer le commentaire"
              triggerClassName="inline-flex items-center gap-1 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </ConfirmDelete>
          )}
          {viewer.isStaff && (
            <form action={setCommentHidden.bind(null, slug, comment.id, !hidden)}>
              <button type="submit" className="inline-flex items-center gap-1 hover:text-foreground">
                <EyeOff className="h-3.5 w-3.5" /> {hidden ? "Rétablir" : "Masquer"}
              </button>
            </form>
          )}
          {!isAuthor && !viewer.isStaff && <ReportButton targetType="comment" targetId={comment.id} />}
        </div>
      )}
    </article>
  );
}
