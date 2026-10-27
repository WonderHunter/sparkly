import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SparkMark } from "@/components/ui/misc";

/** Écran d'erreur façon borne d'arcade, commun aux pages 404, 403 et 500. */
export function ErrorScreen({
  code,
  kicker,
  title,
  children,
  actions,
}: {
  code: string;
  kicker: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    // Coupe seulement en largeur (pas de défilement horizontal) : le flou des halos s'estompe en bas au lieu d'être tranché.
    <section className="relative overflow-x-clip">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-spark/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-ember/15 blur-3xl" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:py-28">
        <p className="relative font-display text-8xl leading-none font-extrabold tracking-tight text-spark sm:text-9xl">
          {code}
          <SparkMark className="absolute -top-4 -right-10 h-10 w-10 text-spark sm:-right-12 sm:h-12 sm:w-12" />
        </p>
        <p className="mt-6 font-mono text-sm font-semibold tracking-[0.3em] text-muted uppercase">{kicker}</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {children && <div className="mt-4 max-w-xl text-lg text-muted">{children}</div>}
        {actions && <div className="mt-10 flex flex-wrap justify-center gap-3">{actions}</div>}
        <p aria-hidden="true" className="mt-12 font-mono text-xs tracking-[0.4em] text-spark-strong motion-safe:animate-pulse">
          INSERT COIN
        </p>
      </div>
    </section>
  );
}

/**
 * Écran 500 partagé par error.tsx et global-error.tsx (composants client).
 * Le digest identifie l'erreur dans les logs serveur sans en exposer le détail.
 */
export function CrashScreen({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <ErrorScreen
      code="500"
      kicker="Tilt !"
      title="La borne a planté"
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RotateCcw className="h-4 w-4" /> Rejouer
          </Button>
          <ButtonLink href="/" size="lg" variant="outline">
            Retour à l&apos;accueil
          </ButtonLink>
        </>
      }
    >
      <p>Une erreur inattendue est survenue. Réessaie dans un instant.</p>
      {digest && <p className="mt-3 font-mono text-xs">Code : {digest}</p>}
    </ErrorScreen>
  );
}
