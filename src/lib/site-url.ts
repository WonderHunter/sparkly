import "server-only";
import { headers } from "next/headers";

/**
 * URL publique du site pour la requête en cours :
 * 1. NEXT_PUBLIC_SITE_URL si elle est définie (adresse officielle, ex. https://sparkly.lbalocchi.fr) ;
 * 2. sinon, l'hôte réellement utilisé par le visiteur (preview Vercel, local…).
 *
 * La CI construit le site avant de l'envoyer à Vercel : l'adresse du déploiement
 * n'est pas connue au moment du build, d'où cette résolution à la requête.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
