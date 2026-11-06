import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { imagesInHtml } from "@/lib/domain/rich-images";
import { Lightbox } from "./lightbox";

beforeAll(() => {
  // jsdom ne gère pas les modals natifs.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const IMAGES = [
  { src: "https://img.test/a.webp", alt: "Menu" },
  { src: "https://img.test/b.webp", alt: "Niveau 1" },
  { src: "https://img.test/c.webp", alt: "Boss" },
];

function Harness({ start = 0 }: { start?: number | null }) {
  const [index, setIndex] = useState<number | null>(start);
  return (
    <>
      <button type="button" onClick={() => setIndex(0)}>
        Ouvrir
      </button>
      <Lightbox images={IMAGES} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} label="Images du devlog" />
    </>
  );
}

const shown = () => screen.getByRole("dialog", { name: "Images du devlog" }).querySelector("figure img");

describe("Lightbox", () => {
  it("affiche l'image, le compteur et passe à la suivante / précédente en boucle", () => {
    render(<Harness />);
    expect(shown()).toHaveAttribute("alt", "Menu");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Image suivante" }));
    expect(shown()).toHaveAttribute("alt", "Niveau 1");
    fireEvent.click(screen.getByRole("button", { name: "Image précédente" }));
    fireEvent.click(screen.getByRole("button", { name: "Image précédente" }));
    expect(shown()).toHaveAttribute("alt", "Boss");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("se pilote aux flèches du clavier et par les vignettes", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(shown()).toHaveAttribute("alt", "Niveau 1");
    fireEvent.click(screen.getByRole("button", { name: "Voir l'image 3 sur 3" }));
    expect(shown()).toHaveAttribute("alt", "Boss");
    expect(screen.getByRole("button", { name: "Voir l'image 3 sur 3" })).toHaveAttribute("aria-current", "true");
  });

  it("change d'image au glissé du doigt", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    fireEvent.touchStart(dialog, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 120 }] });
    expect(shown()).toHaveAttribute("alt", "Niveau 1");
  });

  it("se ferme avec le bouton Fermer", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("imagesInHtml", () => {
  it("retrouve les images d'un texte riche assaini, dans l'ordre", () => {
    const html = '<p>Avant</p><img src="https://a.test/x.png?w=1&amp;h=2" alt="Écran titre" /><p><img src="https://a.test/y.png" /></p>';
    expect(imagesInHtml(html)).toEqual([
      { src: "https://a.test/x.png?w=1&h=2", alt: "Écran titre" },
      { src: "https://a.test/y.png", alt: "" },
    ]);
  });
});
