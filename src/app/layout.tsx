import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { fontVariables } from "@/lib/fonts";
import { getSiteUrl } from "@/lib/site-url";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Métadonnées calculées à la requête : l'URL du site n'est pas connue au moment du build.
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteUrl()),
    title: {
      default: "Sparkly · Every idea starts with a spark.",
      template: "%s · Sparkly",
    },
    description:
      "Sparkly suit l'avancée des projets de jeux d'arcade des étudiant·es MMI : planning, devlogs et retours de la communauté.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme est posé par le script avant l'hydratation : React ne doit pas le signaler.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <ScrollToTop />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ink-foreground"
        >
          Aller au contenu
        </a>
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Mesures Vercel (sans cookies) : n'envoient rien hors d'un déploiement Vercel. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
