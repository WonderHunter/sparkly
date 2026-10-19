/** « Neon Pusher ! » -> « neon-pusher ». */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Slug unique : ajoute un suffixe aléatoire court si besoin. */
export function slugWithSuffix(input: string, random: () => number = Math.random): string {
  const base = slugify(input) || "projet";
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `${base.length < 3 ? `${base}-jeu` : base}-${suffix}`;
}
