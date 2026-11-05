import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "@/app/notifications/actions";
import { AccountMenu } from "@/components/layout/account-menu";
import { Avatar } from "@/components/ui/misc";
import { getNotifications } from "@/lib/data/notifications";
import { notificationVerb, unreadBadge } from "@/lib/domain/notifications";
import { cn, formatRelative } from "@/lib/utils";

/** Cloche discrète du header : nouveaux commentaires sur ses projets et réponses à ses commentaires. */
export async function NotificationBell() {
  const { items, unread } = await getNotifications();
  const badge = unreadBadge(unread);
  const label =
    unread > 0
      ? `Notifications (${unread} non ${unread > 1 ? "lues" : "lue"})`
      : "Notifications";

  return (
    <AccountMenu
      trigger={
        <summary
          aria-label={label}
          title={label}
          className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors group-open:text-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {badge && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-spark px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background"
            >
              {badge}
            </span>
          )}
        </summary>
      }
    >
      {/* Sur mobile, le menu prend toute la largeur sous le header ; dès sm, il s'accroche à la cloche,
          sous la bordure du header, avec une petite pointe vers elle. */}
      <div className="fixed inset-x-4 top-18 z-50 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-4 sm:w-96">
        <span
          aria-hidden
          className="absolute -top-1.5 right-3 hidden h-3 w-3 rotate-45 rounded-tl-sm border-t border-l border-border bg-surface-muted sm:block"
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 shadow-stone-950/20 ring-stone-950/5 dark:shadow-black/70 dark:ring-white/5">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
            <p className="font-display font-extrabold">Notifications</p>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-muted hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Tout
                  marquer comme lu
                </button>
              </form>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Rien de neuf pour l&apos;instant.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,60vh)] divide-y divide-border overflow-y-auto overscroll-contain">
              {items.map((n) => (
                <li key={n.id}>
                  {/* <a> et non <Link> : pas de préchargement, qui marquerait la notification comme lue. */}
                  <a
                    href={`/notifications/${n.id}`}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-surface-muted",
                      !n.readAt && "bg-spark-soft/40",
                    )}
                  >
                    <Avatar
                      name={n.actor?.displayName ?? "Compte supprimé"}
                      src={n.actor?.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <strong className="font-semibold">
                          {n.actor?.displayName ?? "Quelqu'un"}
                        </strong>{" "}
                        {notificationVerb(n.kind)}{" "}
                        <strong className="font-semibold">
                          {n.project?.title}
                        </strong>
                      </span>
                      {n.excerpt && (
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          « {n.excerpt} »
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-spark">
                        <span className="sr-only">Non lue</span>
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-border bg-surface-muted px-4 py-2.5 text-center text-xs text-muted">
            Commentaires sur tes projets et réponses à tes commentaires
          </p>
        </div>
      </div>
    </AccountMenu>
  );
}
