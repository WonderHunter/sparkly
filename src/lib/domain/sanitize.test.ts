import { describe, expect, it } from "vitest";
import { isEmptyRichText, sanitizeRichText, toPlainText } from "./sanitize";

describe("sanitizeRichText", () => {
  it("garde la mise en forme autorisée", () => {
    expect(sanitizeRichText("<h2>Titre</h2><p><strong>gras</strong></p>")).toBe(
      "<h2>Titre</h2><p><strong>gras</strong></p>",
    );
  });

  it("retire scripts, gestionnaires d'événements et liens javascript", () => {
    const dirty = '<p onclick="x()">ok</p><script>alert(1)</script><a href="javascript:alert(1)">lien</a>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|javascript/);
    expect(clean).toContain("<p>ok</p>");
  });

  it("force rel et target sur les liens", () => {
    expect(sanitizeRichText('<a href="https://mmi.fr">x</a>')).toBe(
      '<a href="https://mmi.fr" rel="noopener noreferrer nofollow" target="_blank">x</a>',
    );
  });
});

describe("toPlainText / isEmptyRichText", () => {
  it("extrait et tronque le texte", () => {
    expect(toPlainText("<p>Bonjour   <b>tout</b> le monde</p>")).toBe("Bonjour tout le monde");
    expect(toPlainText("<p>abcdefghij</p>", 6)).toBe("abcde…");
  });

  it("détecte un contenu vide", () => {
    expect(isEmptyRichText("<p></p><p> </p>")).toBe(true);
    expect(isEmptyRichText('<p><img src="https://x.fr/a.png"></p>')).toBe(false);
  });
});
