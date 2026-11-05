import { ExternalLink, Globe, Link2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/** Adresse affichée sans protocole ni « www. » : « https://www.monjeu.fr/ » devient « monjeu.fr ». */
export function displayHost(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
    return hostname.replace(/^www\./, "") + path;
  } catch {
    return url;
  }
}

/** Encart « Site du jeu » : lien vers le site de gestion / promotion tenu par le groupe. */
export function SiteCard({ url }: { url: string }) {
  return (
    <section
      aria-labelledby="site-du-jeu"
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border bg-surface p-4"
    >
      <div className="pointer-events-none absolute -right-10 -bottom-14 h-40 w-40 rounded-full bg-spark/10 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-spark-soft text-spark-strong">
          <Globe className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="site-du-jeu" className="font-display text-lg leading-tight font-extrabold">
            Site du jeu
          </h2>
          <p className="text-sm text-muted">Classements, actus et infos</p>
        </div>
      </div>
      <p className="relative text-sm text-muted">
        Le site de l&apos;équipe pour suivre le jeu : meilleurs scores, nouveautés et réglages de la borne.
      </p>
      <p className="relative flex min-w-0 items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-2 text-sm font-medium">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        <span className="truncate">{displayHost(url)}</span>
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "lg", "relative")}>
        Visiter le site <ExternalLink className="h-4 w-4" aria-hidden />
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </section>
  );
}
