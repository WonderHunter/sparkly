export type NotificationKind = "comment" | "reply";

/** Lien vers le commentaire concerné : sur le devlog s'il y est rattaché, sinon dans l'onglet Commentaires. */
export function notificationHref(target: { slug: string; postNumber?: number | null; commentId: string }): string {
  const base = target.postNumber ? `/p/${target.slug}/devlog/${target.postNumber}` : `/p/${target.slug}/comments`;
  return `${base}#comment-${target.commentId}`;
}

/** Phrase courte après le nom de l'auteur : « Léa a commenté » … « Orbit Smash ». */
export function notificationVerb(kind: NotificationKind): string {
  return kind === "reply" ? "a répondu à ton commentaire sur" : "a commenté";
}

/** Pastille du compteur : au-delà de 9, « 9+ ». */
export function unreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
