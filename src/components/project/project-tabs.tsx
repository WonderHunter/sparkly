"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Onglets de la page projet (équivalent de la barre Campagne / FAQ / Updates / Comments de Kickstarter). */
export function ProjectTabs({ base, counts }: { base: string; counts: { posts: number; comments: number } }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Campagne" },
    { href: `${base}/roadmap`, label: "Planning" },
    { href: `${base}/devlog`, label: "Actualités", count: counts.posts },
    { href: `${base}/faq`, label: "FAQ" },
    { href: `${base}/comments`, label: "Commentaires", count: counts.comments },
    { href: `${base}/team`, label: "Équipe" },
  ];

  return (
    <nav aria-label="Sections du projet" className="sticky top-16 z-30 mt-12 border-y border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-14 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                  active ? "border-spark text-foreground" : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="rounded-full bg-surface-muted px-1.5 text-xs text-muted">{tab.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
