import { describe, expect, it } from "vitest";
import { fitWithin } from "./images";
import { cn, formatRelative, initials, pluralize } from "./utils";

describe("utils", () => {
  it("fusionne les classes Tailwind en conflit", () => {
    expect(cn("px-2 text-sm", false && "hidden", "px-4")).toBe("text-sm px-4");
  });

  it("calcule les initiales", () => {
    expect(initials("Alice Martin")).toBe("AM");
    expect(initials("  chloé  ")).toBe("C");
    expect(initials("Jean Paul Durand")).toBe("JD");
    expect(initials("")).toBe("?");
  });

  it("accorde au pluriel", () => {
    expect(pluralize(1, "projet")).toBe("1 projet");
    expect(pluralize(3, "projet")).toBe("3 projets");
    expect(pluralize(0, "membre")).toBe("0 membre");
  });

  it("formate une date relative en français", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    expect(formatRelative("2026-10-19T11:59:40Z", now)).toBe("à l'instant");
    expect(formatRelative("2026-10-18T12:00:00Z", now)).toBe("hier");
    expect(formatRelative("2026-10-16T12:00:00Z", now)).toBe("il y a 3 jours");
    expect(formatRelative("2026-06-01T12:00:00Z", now)).toBe("1 juin 2026");
  });
});

describe("fitWithin (compression d'images)", () => {
  it("ne touche pas une image déjà assez petite", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("réduit en gardant les proportions", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 5000, 1600)).toEqual({ width: 320, height: 1600 });
  });
});
