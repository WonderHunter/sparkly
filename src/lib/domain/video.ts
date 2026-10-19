export interface VideoEmbed {
  provider: "youtube" | "vimeo";
  id: string;
  embedUrl: string;
  thumbnailUrl: string | null;
}

/** Transforme une URL YouTube ou Vimeo en lecteur intégrable (les vidéos ne sont pas hébergées). */
export function parseVideoUrl(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = url.pathname.slice(1).split("/")[0] || null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") youtubeId = url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
    if (m) youtubeId = m[1];
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    return {
      provider: "youtube",
      id: youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(/(?:^|\/)(\d{6,12})(?:$|\/)/);
    if (m) {
      return { provider: "vimeo", id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}`, thumbnailUrl: null };
    }
  }
  return null;
}
