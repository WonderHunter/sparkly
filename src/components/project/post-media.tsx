"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import { Expand } from "lucide-react";
import { Lightbox, type LightboxImage } from "@/components/ui/lightbox";
import { imagesInHtml } from "@/lib/domain/rich-images";
import { cn } from "@/lib/utils";

/**
 * Texte et images d'une mise à jour. Toutes les images (dans le texte et dans la galerie)
 * s'ouvrent dans la visionneuse, où l'on passe de l'une à l'autre.
 */
export function PostMedia({
  title,
  html,
  images,
  full,
}: {
  title: string;
  /** Texte riche déjà assaini (page de la mise à jour), sinon null. */
  html: string | null;
  images: string[];
  full: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const gallery = images.slice(0, full ? 8 : 3);

  // Images du texte d'abord, puis celles de la galerie (sans doublon).
  const all: LightboxImage[] = [];
  for (const image of [...(html ? imagesInHtml(html) : []), ...images.map((src) => ({ src, alt: "" }))]) {
    if (!all.some((i) => i.src === image.src)) all.push(image);
  }
  const openSrc = (src: string) => setIndex(Math.max(0, all.findIndex((i) => i.src === src)));

  const onBodyClick = (event: MouseEvent<HTMLDivElement>) => {
    const img = (event.target as HTMLElement).closest("img");
    const src = img?.getAttribute("src");
    if (src) openSrc(src);
  };

  return (
    <>
      {html && (
        <div
          className="prose-sparkly mt-5 [&_img]:cursor-zoom-in"
          onClick={onBodyClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {gallery.length > 0 && (
        <div className={full ? "mt-6 grid gap-3 sm:grid-cols-2" : "mt-4 flex gap-3 overflow-x-auto"}>
          {gallery.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => openSrc(src)}
              aria-label={`Agrandir l'image ${i + 1} de « ${title} »`}
              className={cn(
                "group relative cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark",
                full ? "aspect-video" : "h-28 w-44 shrink-0",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes={full ? "(min-width: 640px) 50vw, 100vw" : "176px"}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute right-2 bottom-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand className="h-3.5 w-3.5" aria-hidden />
              </span>
              {!full && i === gallery.length - 1 && images.length > gallery.length && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
                  +{images.length - gallery.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <Lightbox images={all} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} label={`Images de « ${title} »`} />
    </>
  );
}
