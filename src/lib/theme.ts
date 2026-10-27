export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sparkly-theme";

/** Thème choisi par l'utilisateur, sinon celui du système. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Exécuté dans <head> avant l'affichage : pose data-theme pour éviter un flash clair
 * au chargement d'une page en thème sombre. Reprend resolveTheme en JavaScript brut.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){}})();`;
