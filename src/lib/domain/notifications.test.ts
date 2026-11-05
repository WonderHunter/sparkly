import { describe, expect, it } from "vitest";
import { notificationHref, notificationVerb, unreadBadge } from "./notifications";

describe("notificationHref", () => {
  it("mène au commentaire dans l'onglet Commentaires", () => {
    expect(notificationHref({ slug: "orbit-smash", commentId: "c1" })).toBe("/p/orbit-smash/comments#comment-c1");
  });

  it("mène au devlog quand le commentaire y est rattaché", () => {
    expect(notificationHref({ slug: "orbit-smash", postNumber: 3, commentId: "c2" })).toBe("/p/orbit-smash/devlog/3#comment-c2");
  });
});

describe("notificationVerb", () => {
  it("distingue un commentaire d'une réponse", () => {
    expect(notificationVerb("comment")).toBe("a commenté");
    expect(notificationVerb("reply")).toBe("a répondu à ton commentaire sur");
  });
});

describe("unreadBadge", () => {
  it("n'affiche rien sans non-lues et plafonne à 9+", () => {
    expect(unreadBadge(0)).toBeNull();
    expect(unreadBadge(3)).toBe("3");
    expect(unreadBadge(12)).toBe("9+");
  });
});
