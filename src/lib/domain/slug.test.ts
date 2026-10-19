import { describe, expect, it } from "vitest";
import { slugWithSuffix, slugify } from "./slug";

describe("slugify", () => {
  it("retire accents, ponctuation et espaces", () => {
    expect(slugify("  Table Tempête !! ")).toBe("table-tempete");
    expect(slugify("Shoot em up 2000")).toBe("shoot-em-up-2000");
  });

  it("limite la longueur", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe("slugWithSuffix", () => {
  it("ajoute un suffixe stable pour un aléa donné", () => {
    expect(slugWithSuffix("Neon Pusher", () => 0)).toBe("neon-pusher-0000");
  });

  it("produit un slug valide même pour un titre vide ou trop court", () => {
    expect(slugWithSuffix("!!", () => 0.5)).toMatch(/^projet-[a-z0-9]{4}$/);
    expect(slugWithSuffix("Go", () => 0.5)).toMatch(/^go-jeu-[a-z0-9]{4}$/);
  });
});
