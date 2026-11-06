import { expect, test, type Page } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("combobox", { name: label })).toHaveText(new RegExp(option));
}

test.describe("Contraintes de la SAÉ", () => {
  test("un prof fixe type de jeu, personnage et émotion ; tout le monde les voit", async ({ page }) => {
    // Le seed impose casino / un aimant / défoulement à Neon Pusher.
    await login(page, "prof.demo@univ-reims.fr", "/p/neon-pusher");
    const header = page.getByRole("list", { name: "Contraintes de la SAÉ" }).first();
    await expect(header).toContainText("Casino");
    await expect(header).toContainText("Un aimant");

    await choose(page, "Type de jeu", "Plateforme");
    await choose(page, "Personnage imposé", "Une bougie");
    await choose(page, "Émotion à faire ressentir", "Apaisement");
    await page.getByRole("button", { name: "Enregistrer les contraintes" }).click();
    await expect(page.getByText("Contraintes enregistrées.")).toBeVisible();
    await expect(header).toContainText("Plateforme");
    await expect(header).toContainText("Une bougie");
    await expect(header).toContainText("Apaisement");
    await logout(page);

    // Un visiteur les voit, sans le formulaire.
    await page.goto("/p/neon-pusher");
    await expect(page.getByRole("list", { name: "Contraintes de la SAÉ" })).toContainText("Une bougie");
    await expect(page.getByRole("button", { name: "Enregistrer les contraintes" })).toHaveCount(0);

    // Découvrir filtre par personnage et par émotion.
    await page.goto("/discover?character=bougie&emotion=apaisement");
    await expect(page.getByRole("link", { name: "Neon Pusher" }).first()).toBeVisible();
    await page.goto("/discover?character=pieuvre");
    await expect(page.getByRole("link", { name: "Neon Pusher" })).toHaveCount(0);

    // Remise à l'état du seed.
    await login(page, "prof.demo@univ-reims.fr", "/p/neon-pusher");
    await choose(page, "Type de jeu", "Casino");
    await choose(page, "Personnage imposé", "Un aimant");
    await choose(page, "Émotion à faire ressentir", "Défoulement");
    await page.getByRole("button", { name: "Enregistrer les contraintes" }).click();
    await expect(page.getByText("Contraintes enregistrées.")).toBeVisible();
  });

  test("un groupe voit ses contraintes en lecture seule dans l'éditeur", async ({ page }) => {
    await login(page, uniqueEmail("contraintes"), "/dashboard");
    await page.getByLabel(/Nom du jeu/).fill(`Contraintes E2E ${Date.now()}`);
    await page.getByRole("button", { name: "Créer le projet" }).click();
    await page.waitForURL(/\/edit\/basics$/);

    const group = page.getByRole("group", { name: "Contraintes de la SAÉ" });
    await expect(group).toContainText("Fixées par l'équipe pédagogique");
    await expect(group.getByText("à définir")).toHaveCount(3);
    await expect(page.getByRole("combobox", { name: "Genre" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Type de jeu" })).toHaveCount(0);
  });

  test("l'admin ajoute puis retire une émotion", async ({ page }) => {
    await login(page, "admin.demo@univ-reims.fr", "/admin/settings");
    const emotions = page.getByRole("region", { name: /Émotions à faire ressentir/ });
    await emotions.getByLabel("Nouveau nom").fill("Nostalgie");
    await emotions.getByRole("button", { name: "Ajouter l'émotion" }).click();
    await expect(page.getByText("Émotion ajoutée.")).toBeVisible();
    await expect(emotions.getByRole("button", { name: "Retirer Nostalgie" })).toBeVisible();

    await emotions.getByRole("button", { name: "Retirer Nostalgie" }).click();
    const dialog = page.getByRole("dialog", { name: "Retirer « Nostalgie » ?" });
    await dialog.getByRole("button", { name: "Retirer" }).click();
    await expect(emotions.getByRole("button", { name: "Retirer Nostalgie" })).toHaveCount(0);
  });
});
