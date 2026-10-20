import { afterEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }),
}));

const { getSiteUrl } = await import("./site-url");

afterEach(() => {
  headerStore.clear();
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("utilise l'adresse officielle quand elle est configurée", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sparkly.lbalocchi.fr/");
    headerStore.set("host", "sparkly-abc123.vercel.app");
    expect(await getSiteUrl()).toBe("https://sparkly.lbalocchi.fr");
  });

  it("sinon, reprend l'hôte réel de la requête (preview Vercel)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    headerStore.set("x-forwarded-host", "sparkly-git-ma-branche.vercel.app");
    headerStore.set("x-forwarded-proto", "https");
    expect(await getSiteUrl()).toBe("https://sparkly-git-ma-branche.vercel.app");
  });

  it("garde http en local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    headerStore.set("host", "localhost:3000");
    expect(await getSiteUrl()).toBe("http://localhost:3000");
  });
});
