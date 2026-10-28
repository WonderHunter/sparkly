"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CrashScreen } from "@/components/layout/error-screen";
import { Logo } from "@/components/ui/misc";
import { fontVariables } from "@/lib/fonts";
import { ensureThemeApplied, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/** Remplace le layout racine quand c'est lui qui plante : document, styles et thème sont à fournir ici. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    ensureThemeApplied();
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" suppressHydrationWarning className={`${fontVariables} h-full antialiased`}>
      <head>
        <title>La borne a planté · Sparkly</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
            <Link href="/" aria-label="Sparkly, accueil">
              <Logo />
            </Link>
          </div>
        </header>
        <main className="flex-1">
          <CrashScreen error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
