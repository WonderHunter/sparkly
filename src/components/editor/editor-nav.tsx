"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, Flag, Megaphone, Rocket, Settings2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "basics", label: "Les bases", icon: Settings2 },
  { slug: "story", label: "Description", icon: BookOpen },
  { slug: "planning", label: "Planning", icon: Flag },
  { slug: "devlog", label: "Actualités", icon: Megaphone },
  { slug: "team", label: "Équipe", icon: Users },
  { slug: "faq", label: "FAQ", icon: CircleHelp },
  { slug: "publish", label: "Publication", icon: Rocket },
];

/** Onglets de l'éditeur (inspirés de l'éditeur de projet Kickstarter). */
export function EditorNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections de l'éditeur" className="-mx-4 min-w-0 px-4 sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:self-start">
      {/* Mobile : bandeau défilant horizontalement ; desktop : colonne. */}
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
        {TABS.map(({ slug, label, icon: Icon }) => {
          const href = `${base}/${slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap",
                  active ? "bg-ink text-white" : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
