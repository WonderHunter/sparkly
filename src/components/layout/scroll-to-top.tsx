"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Remonte en haut de page à chaque changement de page.
 * Next.js garde la position quand la nouvelle page est déjà visible (onglets d'un projet,
 * pages courtes) : on force le retour en haut, sauf pour précédent/suivant, où le
 * navigateur restaure la position, et pour les liens vers une ancre.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
