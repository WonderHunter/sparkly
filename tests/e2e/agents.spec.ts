import { createHash, randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers";

const ALICE = "alice.demo@etudiant.univ-reims.fr";
const REDIRECT = "http://127.0.0.1:8976/callback";

/** Appel JSON-RPC à l'endpoint MCP ; la réponse peut arriver en JSON ou en flux SSE. */
async function mcp(request: APIRequestContext, token: string, method: string, params: Record<string, unknown> = {}) {
  const res = await request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
    data: { jsonrpc: "2.0", id: 1, method, params },
  });
  if (res.status() !== 200) return { status: res.status(), headers: res.headers(), body: null };
  const text = await res.text();
  const json = text.trimStart().startsWith("{") ? text : (text.split("\n").find((l) => l.startsWith("data:")) ?? "").slice(5);
  return { status: 200, headers: res.headers(), body: JSON.parse(json) };
}

const initialize = (request: APIRequestContext, token: string) =>
  mcp(request, token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1.0" } });

async function callTool(request: APIRequestContext, token: string, name: string, args: Record<string, unknown> = {}) {
  const { body } = await mcp(request, token, "tools/call", { name, arguments: args });
  return JSON.parse(body.result.content[0].text);
}

test.describe("agents IA", () => {
  test("une application se connecte par OAuth, lit les projets, puis perd l'accès", async ({ page, request, baseURL }) => {
    // Découverte : sans jeton, l'endpoint MCP indique où trouver le serveur d'autorisation.
    const anonymous = await mcp(request, "", "tools/list");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers["www-authenticate"]).toContain("/.well-known/oauth-protected-resource/api/mcp");
    const metadata = await (await request.get("/.well-known/oauth-authorization-server")).json();
    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);

    // Enregistrement dynamique (RFC 7591).
    const registration = await request.post("/oauth/register", {
      data: { client_name: "Agent E2E", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] },
    });
    expect(registration.status()).toBe(201);
    const { client_id: clientId } = await registration.json();

    // Consentement dans le navigateur, connectée en tant qu'Alice.
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const resource = `${baseURL}/api/mcp`;
    const authorize = `/oauth/authorize?${new URLSearchParams({
      response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge,
      code_challenge_method: "S256", state: "etat-123", scope: "lecture", resource,
    })}`;
    await login(page, ALICE, authorize);
    await expect(page.getByRole("heading", { name: /Agent E2E veut accéder à ton compte Sparkly/ })).toBeVisible();
    await expect(page.getByText("Application non vérifiée")).toBeVisible();

    await page.route(`${REDIRECT}**`, (route) => route.fulfill({ status: 200, body: "ok" }));
    const callback = page.waitForRequest((req) => req.url().startsWith(REDIRECT));
    await page.getByRole("button", { name: "Autoriser Agent E2E" }).click();
    const back = new URL((await callback).url());
    expect(back.searchParams.get("state")).toBe("etat-123");
    expect(back.searchParams.get("iss")).toBe(baseURL);
    const code = back.searchParams.get("code")!;

    // Échange du code (PKCE obligatoire).
    const exchange = (codeVerifier: string) =>
      request.post("/oauth/token", {
        form: { grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: codeVerifier, resource },
      });
    const tokens = await (await exchange(verifier)).json();
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.access_token).toMatch(/^spt_/);
    expect(tokens.refresh_token).toMatch(/^spr_/);

    // Appels MCP en tant qu'Alice : ses projets, oui ; le brouillon d'un autre groupe, non.
    expect((await initialize(request, tokens.access_token)).body.result.serverInfo).toBeTruthy();
    const { body: list } = await mcp(request, tokens.access_token, "tools/list");
    expect(list.result.tools.map((t: { name: string }) => t.name)).toContain("mes_projets");
    const mine = await callTool(request, tokens.access_token, "mes_projets");
    expect(mine.length).toBeGreaterThan(0);
    const hidden = await callTool(request, tokens.access_token, "voir_projet", { slug: "rythme-hall" });
    expect(hidden.erreur).toContain("introuvable");

    // Rotation : un nouveau couple de jetons ; rejouer l'ancien jeton de rafraîchissement coupe tout.
    const refresh = (refreshToken: string) =>
      request.post("/oauth/token", { form: { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId } });
    const rotated = await (await refresh(tokens.refresh_token)).json();
    expect(rotated.refresh_token).not.toBe(tokens.refresh_token);
    expect((await initialize(request, rotated.access_token)).status).toBe(200);
    const replay = await refresh(tokens.refresh_token);
    expect(replay.status()).toBe(400);
    expect((await replay.json()).error).toBe("invalid_grant");
    expect((await initialize(request, rotated.access_token)).status).toBe(401);

    // Un code d'autorisation ne sert qu'une fois.
    expect((await (await exchange(verifier)).json()).error).toBe("invalid_grant");

    // La connexion apparaît dans les réglages, révoquée.
    await page.goto("/settings/agents");
    await expect(page.getByText("Agent E2E").first()).toBeVisible();
  });

  test("refuser l'autorisation renvoie access_denied à l'application", async ({ page, request }) => {
    const registration = await request.post("/oauth/register", {
      data: { client_name: "Agent refusé", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" },
    });
    const { client_id: clientId } = await registration.json();
    const challenge = createHash("sha256").update(randomBytes(32).toString("base64url")).digest("base64url");
    const authorize = `/oauth/authorize?${new URLSearchParams({
      response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "s",
    })}`;
    await login(page, ALICE, authorize);
    await page.route(`${REDIRECT}**`, (route) => route.fulfill({ status: 200, body: "ok" }));
    const callback = page.waitForRequest((req) => req.url().startsWith(REDIRECT));
    await page.getByRole("button", { name: "Refuser" }).click();
    const back = new URL((await callback).url());
    expect(back.searchParams.get("error")).toBe("access_denied");
    expect(back.searchParams.get("code")).toBeNull();
  });

  test("une clé d'API se crée, s'affiche une seule fois, fonctionne puis se révoque", async ({ page, request }) => {
    await login(page, ALICE, "/settings/agents");
    await page.getByRole("button", { name: "Nouvelle clé" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle clé d'API" });
    await dialog.getByLabel("Nom").fill("Script E2E");
    await dialog.getByRole("button", { name: "Créer la clé" }).click();
    await expect(page.getByRole("heading", { name: "Ta nouvelle clé" })).toBeVisible();
    const secret = (await page.locator("dialog code").textContent())!.trim();
    expect(secret).toMatch(/^spk_/);

    expect((await callTool(request, secret, "moi")).display_name).toBe("Alice Martin");

    // Phase 2 : l'agent écrit une actualité et un commentaire, signés « via » la clé.
    const post = await callTool(request, secret, "creer_devlog", {
      slug: "neon-pusher", titre: "Mise à jour écrite par un agent", texte: "## Avancée\n\nLe **mode deux joueurs** fonctionne.", publier: true,
    });
    expect(post.statut).toBe("publiée");
    await callTool(request, secret, "commenter", { slug: "table-tempete", texte: "Commentaire laissé par un agent" });

    await page.getByRole("button", { name: "J'ai copié ma clé" }).click();
    await expect(page.getByText("Script E2E").first()).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);

    await page.goto(`/p/neon-pusher/devlog/${post.numero}`);
    await expect(page.getByRole("heading", { name: "Avancée" })).toBeVisible();
    await expect(page.getByText("via Script E2E").first()).toBeVisible();
    await page.goto("/p/table-tempete/comments");
    const comment = page.locator("article", { hasText: "Commentaire laissé par un agent" });
    await expect(comment.getByText("via Script E2E")).toBeVisible();

    await page.goto("/settings/agents");

    await page.getByRole("button", { name: "Révoquer Script E2E" }).click();
    await page.getByRole("dialog", { name: /Révoquer « Script E2E »/ }).getByRole("button", { name: "Révoquer" }).click();
    await expect(page.getByRole("button", { name: "Révoquer Script E2E" })).toHaveCount(0);
    expect((await initialize(request, secret)).status).toBe(401);
  });
  test("une enseignante finance via un agent, en deux temps, avec la mention « via »", async ({ page, request }) => {
    await login(page, "prof.demo@univ-reims.fr", "/settings/agents");
    await page.getByRole("button", { name: "Nouvelle clé" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle clé d'API" });
    await dialog.getByLabel("Nom").fill("Agent prof E2E");
    await dialog.getByRole("button", { name: "Créer la clé" }).click();
    await expect(page.getByRole("heading", { name: "Ta nouvelle clé" })).toBeVisible();
    const secret = (await page.locator("dialog code").textContent())!.trim();

    const params = { slug: "table-tempete", montant: 777, mot: "Financé par mon agent" };
    const recap = await callTool(request, secret, "financer", params);
    expect(recap.confirmation_requise).toBe(true);
    expect(recap.recapitulatif).toContain("Table Tempête");
    const done = await callTool(request, secret, "financer", { ...params, confirmation: recap.code_de_confirmation });
    expect(done.ok).toBe(true);

    await page.goto("/p/table-tempete/comments");
    const comment = page.locator("article", { hasText: "Financé par mon agent" });
    await expect(comment.getByText("via Agent prof E2E")).toBeVisible();
    await expect(comment.getByText(/A financé 777/)).toBeVisible();

    // Nettoyage : retrait, toujours confirmé.
    const withdraw = await callTool(request, secret, "retirer_financement", { financement_id: done.financement_id });
    expect((await callTool(request, secret, "retirer_financement", { financement_id: done.financement_id, confirmation: withdraw.code_de_confirmation })).ok).toBe(true);
  });

  test("le guide des agents est public et rangé dans /docs", async ({ page }) => {
    await page.goto("/docs");
    await expect(page).toHaveURL(/\/docs\/agents$/);
    await expect(page.getByRole("heading", { level: 1, name: "Connecter un agent IA à Sparkly" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Actions à confirmer" })).toBeVisible();
    await expect(page.getByText("financer", { exact: true })).toBeVisible();
  });
});
