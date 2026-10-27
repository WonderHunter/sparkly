"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
    { href: "/admin/projects", label: "Projets", icon: FolderKanban },
    { href: "/admin/reports", label: "Signalements", icon: Flag },
    { href: "/admin/users", label: "Comptes", icon: Users },
    ...(isAdmin ? [{ href: "/admin/settings", label: "Réglages", icon: Settings }] : []),
  ];
  return (
    <nav aria-label="Administration" className="-mx-4 min-w-0 px-4 sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:self-start">
      {/* Mobile : bandeau défilant horizontalement ; desktop : colonne. */}
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap",
                  active ? "bg-ink text-white" : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
