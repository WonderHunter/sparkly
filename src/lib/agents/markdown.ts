/**
 * Markdown simple → HTML de l'éditeur (titres ##/###, paragraphes, listes, citations, gras, italique,
 * code, liens). Les agents écrivent naturellement en Markdown ; le résultat passe ensuite par
 * sanitizeRichText comme tout contenu riche.
 */
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text: string): string {
  const codes: string[] = [];
  let out = escape(text).replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li><p>${inline(i)}</p></li>`).join("")}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${quote.map(inline).join("<br>")}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quoted = /^>\s?(.*)$/.exec(line);

    if (line.trim() === "") {
      flushAll();
    } else if (heading) {
      flushAll();
      // Le titre de l'actualité est déjà un h1 : # et ## deviennent h2, le reste h3.
      const level = heading[1].length <= 2 ? 2 : 3;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      html.push("<hr>");
    } else if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const tag = bullet ? "ul" : "ol";
      // (TypeScript ne voit pas que flushList, une fermeture, remet `list` à null.)
      let current = list as { tag: "ul" | "ol"; items: string[] } | null;
      if (current?.tag !== tag) {
        flushList();
        current = list = { tag, items: [] };
      }
      current.items.push((bullet ?? numbered)![1]);
    } else if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
    } else {
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
  }
  flushAll();
  return html.join("");
}
