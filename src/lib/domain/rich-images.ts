/** Images contenues dans un texte riche déjà assaini (sanitizeRichText), dans l'ordre. */
export function imagesInHtml(html: string): { src: string; alt: string }[] {
  const images: { src: string; alt: string }[] = [];
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = attribute(tag, "src");
    if (src) images.push({ src, alt: attribute(tag, "alt") ?? "" });
  }
  return images;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

// sanitize-html encode les attributs : on retrouve la valeur que le navigateur lira (getAttribute).
function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
