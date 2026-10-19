import { describe, expect, it } from "vitest";
import { emailDomain, isAllowedEmail, normalizeEmail } from "./email";

describe("isAllowedEmail", () => {
  it.each([
    "alice.martin@etudiant.univ-reims.fr",
    "prof@univ-reims.fr",
    "  Alice.Martin@ETUDIANT.univ-reims.FR ",
  ])("accepte %s", (email) => {
    expect(isAllowedEmail(email)).toBe(true);
  });

  it.each([
    "alice@gmail.com",
    "alice@faux.univ-reims.fr",
    "alice@univ-reims.fr.evil.com",
    "pas-un-email",
    "@univ-reims.fr",
    "",
  ])("refuse %s", (email) => {
    expect(isAllowedEmail(email)).toBe(false);
  });
});

describe("helpers e-mail", () => {
  it("normalise et extrait le domaine", () => {
    expect(normalizeEmail("  A@B.FR ")).toBe("a@b.fr");
    expect(emailDomain("a@Etudiant.Univ-Reims.fr")).toBe("etudiant.univ-reims.fr");
    expect(emailDomain("sans-arobase")).toBe("");
  });
});
