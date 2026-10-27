/**
 * Affiché dès le clic sur un onglet du projet, pendant que le serveur prépare la page :
 * l'onglet change tout de suite (et la page remonte en haut) au lieu d'attendre la réponse.
 */
export default function ProjectTabLoading() {
  return (
    <div aria-busy="true" className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <p className="sr-only" role="status">
        Chargement…
      </p>
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-muted" />
      </div>
      <div className="hidden space-y-4 lg:block">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    </div>
  );
}
