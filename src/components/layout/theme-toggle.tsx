"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { ensureThemeApplied, resolveTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** Applique le thème avec un fondu enchaîné (désactivé si l'utilisateur réduit les animations). */
function switchTheme(theme: Theme) {
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return applyTheme(theme);
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => applyTheme(theme));
    return;
  }
  root.classList.add("theme-fade");
  applyTheme(theme);
  window.setTimeout(() => root.classList.remove("theme-fade"), 500);
}

/** Suit l'attribut data-theme de <html>, seule source de vérité du thème affiché. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Bouton soleil / lune : bascule entre le thème clair et le thème sombre « Braise ». */
export function ThemeToggle({ className }: { className?: string }) {
  // null côté serveur : l'icône ne dépend que du CSS (data-theme), donc pas d'écart à l'hydratation.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  useEffect(() => {
    ensureThemeApplied();
    // Sans choix explicite, on suit le thème du système quand il change.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {}
      if (!stored) applyTheme(resolveTheme(null, media.matches));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    switchTheme(next);
  };

  const label = theme === null ? "Changer de thème" : theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-spark/40 focus-visible:outline-none",
        className,
      )}
    >
      <Sun
        aria-hidden
        className="absolute h-4 w-4 transition-all duration-500 ease-out motion-reduce:transition-none dark:scale-50 dark:-rotate-90 dark:opacity-0"
      />
      <Moon
        aria-hidden
        className="absolute h-4 w-4 scale-50 rotate-90 opacity-0 transition-all duration-500 ease-out motion-reduce:transition-none dark:scale-100 dark:rotate-0 dark:opacity-100"
      />
    </button>
  );
}
