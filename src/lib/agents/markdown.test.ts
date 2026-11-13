import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "@/lib/domain/sanitize";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml", () => {
  it("convertit titres, paragraphes et mise en forme", () => {
    expect(markdownToHtml("## Cette semaine\n\nOn a **fini** le *saut* et le `dash`.\nDeuxième ligne."))
      .toBe("<h2>Cette semaine</h2><p>On a <strong>fini</strong> le <em>saut</em> et le <code>dash</code>.<br>Deuxième ligne.</p>");
  });

  it("convertit les listes et les citations", () => {
    expect(markdownToHtml("- un\n- deux\n\n1. premier\n2. second\n\n> retour testeur"))
      .toBe("<ul><li><p>un</p></li><li><p>deux</p></li></ul><ol><li><p>premier</p></li><li><p>second</p></li></ol><blockquote><p>retour testeur</p></blockquote>");
  });

  it("garde les liens http(s) et neutralise le HTML et les liens javascript", () => {
    const html = sanitizeRichText(markdownToHtml("[démo](https://exemple.fr) <script>alert(1)</script> [x](javascript:alert(1))"));
    expect(html).toContain('<a href="https://exemple.fr" rel="noopener noreferrer nofollow" target="_blank">démo</a>');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
  });

  it("n'interprète pas la mise en forme dans le code", () => {
    expect(markdownToHtml("`**pas gras**`")).toBe("<p><code>**pas gras**</code></p>");
  });
});
