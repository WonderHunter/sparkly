export type NotificationKind = "comment" | "reply" | "invitation" | "agent_expiring";

/** Lien vers le commentaire concerné : sur le devlog s'il y est rattaché, sinon dans l'onglet Commentaires. */
export function notificationHref(target: { slug: string; postNumber?: number | null; commentId: string }): string {
  const base = target.postNumber ? `/p/${target.slug}/devlog/${target.postNumber}` : `/p/${target.slug}/comments`;
  return `${base}#comment-${target.commentId}`;
}

/**
 * Lien d'une invitation : le tableau de bord pour l'accepter tant qu'elle est en attente,
 * sinon la page du projet (rejoint entre-temps), sinon le tableau de bord.
 */
export function invitationHref(target: { pending: boolean; slug: string | null }): string {
  if (target.pending) return "/dashboard#invitations";
  return target.slug ? `/p/${target.slug}` : "/dashboard";
}

/** Phrase courte après le nom de l'auteur : « Léa a commenté » … « Orbit Smash ». */
export function notificationVerb(kind: NotificationKind): string {
  if (kind === "invitation") return "t'invite à rejoindre";
  if (kind === "agent_expiring") return "expire bientôt :";
  return kind === "reply" ? "a répondu à ton commentaire sur" : "a commenté";
}

/** Pastille du compteur : au-delà de 9, « 9+ ». */
export function unreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
