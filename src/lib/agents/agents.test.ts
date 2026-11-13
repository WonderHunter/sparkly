import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isAcceptableRedirectUri, redirectUriMatches } from "./clients";
import { randomToken, sha256Hex, verifyPkceS256 } from "./crypto";
import { grantableScopes, parseScopeParam } from "./scopes";

const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

describe("jetons et PKCE", () => {
  it("génère des jetons préfixés, longs et différents", () => {
    const a = randomToken("spk");
    const b = randomToken("spk");
    expect(a).toMatch(/^spk_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("stocke une empreinte SHA-256 hexadécimale, jamais le jeton", () => {
    expect(sha256Hex("spk_abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex("spk_abc")).toBe(sha256Hex("spk_abc"));
  });

  it("vérifie PKCE S256 (RFC 7636)", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(verifyPkceS256(verifier, challengeOf(verifier))).toBe(true);
    expect(verifyPkceS256(verifier, challengeOf(`${verifier}x`))).toBe(false);
  });

  it("refuse un verifier trop court ou avec des caractères interdits", () => {
    expect(verifyPkceS256("court", challengeOf("court"))).toBe(false);
    const bad = "a".repeat(42) + "!";
    expect(verifyPkceS256(bad, challengeOf(bad))).toBe(false);
  });
});

describe("permissions des agents", () => {
  it("propose les permissions disponibles pour le rôle", () => {
    expect(grantableScopes("student")).toEqual(["lecture", "projet", "devlog", "commentaires"]);
    expect(grantableScopes("teacher")).toEqual(["lecture", "commentaires"]);
  });

  it("retire celles que l'admin a désactivées, jamais la lecture", () => {
    expect(grantableScopes("student", ["devlog", "projet"])).toEqual(["lecture", "commentaires"]);
  });

  it("lit le paramètre scope sans jamais dépasser le rôle", () => {
    expect(parseScopeParam("lecture moderation", "student")).toEqual(["lecture"]);
    expect(parseScopeParam("lecture devlog", "student")).toEqual(["lecture", "devlog"]);
    expect(parseScopeParam("devlog", "teacher")).toEqual(["lecture", "commentaires"]);
    expect(parseScopeParam(null, "student", ["devlog"])).toEqual(["lecture", "projet", "commentaires"]);
  });
});

describe("adresses de redirection", () => {
  it("accepte https et la boucle locale en http, refuse le reste", () => {
    expect(isAcceptableRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAcceptableRedirectUri("http://localhost:3334/callback")).toBe(true);
    expect(isAcceptableRedirectUri("http://127.0.0.1/cb")).toBe(true);
    expect(isAcceptableRedirectUri("http://exemple.com/cb")).toBe(false);
    expect(isAcceptableRedirectUri("https://exemple.com/cb#frag")).toBe(false);
    expect(isAcceptableRedirectUri("javascript:alert(1)")).toBe(false);
  });

  it("compare exactement, sauf le port de la boucle locale (RFC 8252)", () => {
    const registered = ["https://claude.ai/cb", "http://localhost:8000/callback"];
    expect(redirectUriMatches(registered, "https://claude.ai/cb")).toBe(true);
    expect(redirectUriMatches(registered, "https://claude.ai/cb?x=1")).toBe(false);
    expect(redirectUriMatches(registered, "https://evil.example/cb")).toBe(false);
    expect(redirectUriMatches(registered, "http://localhost:51234/callback")).toBe(true);
    expect(redirectUriMatches(registered, "http://localhost:51234/autre")).toBe(false);
  });
});
