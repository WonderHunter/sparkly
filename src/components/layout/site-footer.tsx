import Link from "next/link";
import { Logo } from "@/components/ui/misc";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            Every idea starts with a spark. La vitrine des projets de jeux d&apos;arcade des étudiant·es du BUT MMI.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Explorer</p>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/discover" className="hover:text-foreground">
                Tous les projets
              </Link>
            </li>
            <li>
              <Link href="/discover?sort=active" className="hover:text-foreground">
                Projets actifs
              </Link>
            </li>
            <li>
              <Link href="/discover?sort=progress" className="hover:text-foreground">
                Les plus avancés
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Participer</p>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Se connecter
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-foreground">
                Créer le projet de mon groupe
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        Projet pédagogique BUT MMI · Aucun paiement, aucune transaction : seule l&apos;avancée compte.
      </div>
    </footer>
  );
}
