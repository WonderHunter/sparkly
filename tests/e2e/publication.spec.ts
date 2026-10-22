import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test("un brouillon indique ce qui manque, puis un prof le publie", async ({ page }) => {
  const title = `Brouillon E2E ${Date.now()}`;

  // 1. L'étudiant crée le projet : l'éditeur rappelle qu'il s'agit d'un brouillon.
  await login(page, uniqueEmail("brouillon"), "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(title);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  await expect(page.getByText("Ce projet est encore un brouillon, invisible dans Découvrir.")).toBeVisible();
  const projectPath = new URL(page.url()).pathname.replace(/\/edit\/basics$/, "");

  // 2. La page du projet liste ce qui manque, avec un lien vers l'onglet à compléter.
  await page.goto(projectPath);
  const banner = page.getByRole("region", { name: "Projet en brouillon" });
  await expect(banner).toContainText("il manque : une phrase d'accroche et une description du jeu");
  await banner.getByRole("link", { name: "une phrase d'accroche" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  await page.getByLabel("Phrase d'accroche").fill("Un jeu de test qui donne envie d'y jouer.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();

  await page.goto(projectPath);
  await expect(banner).toContainText("il manque : une description du jeu.");
  await expect(banner.getByRole("button", { name: /Publier maintenant/ })).toHaveCount(0);

  // 3. La publication est refusée tant que la description manque.
  await banner.getByRole("link", { name: "Publier le projet" }).click();
  await page.getByRole("button", { name: "Publier (complète d'abord la liste)" }).click();
  await expect(page.getByText("Avant de publier, il manque : une description du jeu.")).toBeVisible();
  await logout(page);

  // 4. Un prof publie le brouillon, même incomplet.
  await login(page, "prof.demo@univ-reims.fr", projectPath);
  await expect(banner).toContainText("il manque : une description du jeu.");
  await banner.getByRole("button", { name: "Publier maintenant (prof)" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("changer de page ramène en haut", async ({ page }) => {
  await page.goto("/p/neon-pusher");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

  // Les onglets restent visibles (collants) : sans correctif, la position était conservée.
  await page.getByRole("navigation", { name: "Sections du projet" }).getByRole("link", { name: "Planning" }).click();
  await page.waitForURL(/\/roadmap$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // Un lien du pied de page ramène aussi en haut de la nouvelle page.
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: "Tous les projets" }).click();
  await page.waitForURL(/\/discover/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
