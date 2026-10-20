import { describe, expect, it } from "vitest";
import { otpSchema, safeNextPath } from "./auth";
import { basicsSchema, fieldErrors, milestoneSchema, postSchema, profileSchema, slugSchema } from "./project";

const validBasics = {
  title: "Neon Pusher",
  slug: "neon-pusher",
  pitch: "Un coin pusher néon.",
  platform: "borne",
  categoryId: "2",
  startsOn: "2026-09-01",
  endsOn: "2027-01-31",
  videoUrl: "https://youtu.be/216_5nu4aVQ",
  gameUrl: "",
  repoUrl: "https://github.com/mmi/neon",
  coverUrl: "",
  logoUrl: "",
};

describe("basicsSchema", () => {
  it("accepte un formulaire valide et normalise les champs vides", () => {
    const parsed = basicsSchema.parse(validBasics);
    expect(parsed.categoryId).toBe(2);
    expect(parsed.gameUrl).toBeNull();
    expect(parsed.repoUrl).toBe("https://github.com/mmi/neon");
  });

  it("refuse une vidéo hors YouTube/Vimeo", () => {
    const result = basicsSchema.safeParse({ ...validBasics, videoUrl: "https://example.com/v.mp4" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).videoUrl).toMatch(/YouTube/);
  });

  it("refuse des dates inversées", () => {
    const result = basicsSchema.safeParse({ ...validBasics, endsOn: "2026-08-01" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).endsOn).toBeDefined();
  });

  it("refuse une URL sans protocole", () => {
    expect(basicsSchema.safeParse({ ...validBasics, gameUrl: "monjeu.fr" }).success).toBe(false);
  });
});

describe("milestoneSchema", () => {
  it("convertit le poids et borne ses valeurs", () => {
    expect(milestoneSchema.parse({ title: "Tests", description: "", periodLabel: "", weight: "15", status: "todo" }).weight).toBe(15);
    expect(milestoneSchema.safeParse({ title: "x", description: "", periodLabel: "", weight: "120", status: "todo" }).success).toBe(false);
  });
});

describe("postSchema", () => {
  it("accepte un brouillon sans jalon", () => {
    const post = postSchema.parse({ title: "Devlog", body: "<p>ok</p>", milestoneId: "", images: [], publish: false });
    expect(post.milestoneId).toBeNull();
  });

  it("limite le nombre d'images", () => {
    const images = Array.from({ length: 9 }, (_, i) => `https://x.fr/${i}.webp`);
    expect(postSchema.safeParse({ title: "x", body: "", milestoneId: "", images, publish: true }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("normalise le pseudo", () => {
    expect(profileSchema.parse({ displayName: "Alice", username: "Alice-M", bio: "", promo: "", avatarUrl: "" }).username).toBe("alice-m");
  });

  it("refuse un pseudo invalide", () => {
    expect(profileSchema.safeParse({ displayName: "A", username: "a b", bio: "", promo: "", avatarUrl: "" }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/p/neon", "/p/neon"],
    ["https://evil.com", "/dashboard"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["/\t/evil.com", "/dashboard"],
    ["/\n/evil.com", "/dashboard"],
    ["/p/neon?tab=devlog#top", "/p/neon?tab=devlog#top"],
    ["/../../etc", "/etc"],
    [undefined, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("slugSchema", () => {
  it("convertit une saisie libre en adresse valide", () => {
    expect(slugSchema.parse("  Orbit Smash ! ")).toBe("orbit-smash");
    expect(slugSchema.parse("Équipe Été 2027")).toBe("equipe-ete-2027");
  });

  it("refuse une adresse trop courte ou vide", () => {
    expect(slugSchema.safeParse("ab").success).toBe(false);
    expect(slugSchema.safeParse("!!!").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepte les codes de 6 à 10 chiffres, espaces ignorés", () => {
    expect(otpSchema.parse("123456")).toBe("123456");
    expect(otpSchema.parse("7463 0235")).toBe("74630235");
    expect(otpSchema.parse(" 1234567890 ")).toBe("1234567890");
  });

  it("refuse un code trop court, trop long ou non numérique", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12345678901").success).toBe(false);
    expect(otpSchema.safeParse("12a456").success).toBe(false);
  });
});
