import Link from "next/link";
import { LayoutDashboard, LogOut, Search, Settings, Shield, User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Logo } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Sparkly, accueil" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm font-semibold md:flex" aria-label="Navigation principale">
          <Link href="/discover" className="rounded-full px-3 py-2 hover:bg-surface-muted">
            Découvrir
          </Link>
          {viewer && (
            <Link href="/dashboard" className="rounded-full px-3 py-2 hover:bg-surface-muted">
              Mes projets
            </Link>
          )}
        </nav>

        <form action="/discover" role="search" className="ml-auto hidden max-w-xs flex-1 sm:block">
          <label htmlFor="header-search" className="sr-only">
            Rechercher un projet
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Rechercher un projet"
              className="h-10 w-full rounded-full border border-border bg-surface pr-4 pl-9 text-sm focus:border-spark focus:outline-none"
            />
          </div>
        </form>

        {viewer ? (
          <details className="group relative ml-auto sm:ml-0">
            <summary className="flex cursor-pointer list-none items-center rounded-full ring-spark/40 group-open:ring-2 [&::-webkit-details-marker]:hidden">
              <Avatar name={viewer.profile.display_name} src={viewer.profile.avatar_url} size="sm" />
              <span className="sr-only">Menu du compte</span>
            </summary>
            <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold">{viewer.profile.display_name}</p>
                <p className="truncate text-xs text-muted">{viewer.email}</p>
              </div>
              <hr className="my-1 border-border" />
              <MenuLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
                Mes projets
              </MenuLink>
              <MenuLink href={`/u/${viewer.profile.username}`} icon={<User className="h-4 w-4" />}>
                Mon profil public
              </MenuLink>
              <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />}>
                Réglages
              </MenuLink>
              {viewer.isStaff && (
                <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />}>
                  Administration
                </MenuLink>
              )}
              <hr className="my-1 border-border" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <LogOut className="h-4 w-4" /> Se déconnecter
                </button>
              </form>
            </div>
          </details>
        ) : (
          <ButtonLink href="/login" variant="secondary" size="sm" className="ml-auto sm:ml-0">
            Se connecter
          </ButtonLink>
        )}
      </div>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted">
      {icon}
      {children}
    </Link>
  );
}
