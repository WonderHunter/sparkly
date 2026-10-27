"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Menu déroulant du compte : <details> natif (fonctionne sans JS),
 * enrichi pour se fermer au clic extérieur, avec Échap et après un clic sur un lien.
 */
export function AccountMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    function close(focusTrigger = false) {
      if (!details?.open) return;
      details.open = false;
      if (focusTrigger) details.querySelector("summary")?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (details && !details.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details
      ref={ref}
      className="group relative"
      onClick={(event) => {
        // Un clic sur un lien du menu le referme (la navigation reste côté client).
        if ((event.target as HTMLElement).closest("a")) event.currentTarget.open = false;
      }}
    >
      {trigger}
      {children}
    </details>
  );
}
