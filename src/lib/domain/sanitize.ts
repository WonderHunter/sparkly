import sanitizeHtml from "sanitize-html";

/** Liste blanche du contenu riche (histoire, devlog) produit par l'éditeur Tiptap. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
    "blockquote", "code", "pre", "hr", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https", "http"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS).trim();
}

/** Texte brut (extraits, cartes, métadonnées). */
export function toPlainText(html: string, maxLength?: number): string {
  const text = sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength && text.length > maxLength) return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  return text;
}

/** Vrai si le HTML ne contient aucun texte ni image. */
export function isEmptyRichText(html: string): boolean {
  return toPlainText(html).length === 0 && !/<img\b/i.test(html ?? "");
}
