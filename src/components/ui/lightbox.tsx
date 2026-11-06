"use client";

import { useEffect, useRef, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  src: string;
  alt: string;
}

/**
 * Visionneuse plein écran : fond flouté, image précédente / suivante (boutons, flèches du clavier,
 * glissé au doigt), compteur et vignettes. Modal natif (<dialog>) : Échap et focus gérés par le navigateur.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  label,
}: {
  images: LightboxImage[];
  /** Image affichée, ou null quand la visionneuse est fermée. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  const open = index !== null;
  const count = images.length;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const go = (delta: number) => {
    if (index === null || count < 2) return;
    onIndexChange((index + delta + count) % count);
  };

  const onTouchStart = (event: TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const current = index !== null ? images[index] : null;

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      // Un clic sur le fond (pas sur l'image ni les boutons) ferme la visionneuse.
      onClick={(event) => {
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.backdrop) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        "m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-white",
        "backdrop:bg-stone-950/80 backdrop:backdrop-blur-md",
        "motion-safe:transition-[opacity,overlay,display] motion-safe:transition-discrete motion-safe:duration-200",
        "opacity-0 open:opacity-100 starting:open:opacity-0",
      )}
    >
      {current && (
        <div data-backdrop="true" className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 sm:px-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2.5 backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" />
          </button>

          <figure data-backdrop="true" className="flex min-h-0 w-full flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- images du devlog ou du texte riche, hôtes variés */}
            <img
              key={current.src}
              src={current.src}
              alt={current.alt}
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl motion-safe:animate-[sparkly-pop_180ms_ease-out]"
            />
          </figure>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Image précédente"
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Image suivante"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <p aria-live="polite" className="text-sm font-semibold text-white/80">
                {(index ?? 0) + 1} / {count}
              </p>
              <ul className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {images.map((image, i) => (
                  <li key={image.src} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onIndexChange(i)}
                      aria-label={`Voir l'image ${i + 1} sur ${count}`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        "block h-12 w-16 overflow-hidden rounded-lg ring-2 transition",
                        i === index ? "opacity-100 ring-white" : "opacity-50 ring-transparent hover:opacity-80",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- vignette de la visionneuse */}
                      <img src={image.src} alt="" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
