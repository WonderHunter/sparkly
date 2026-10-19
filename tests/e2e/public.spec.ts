import { expect, test } from "@playwright/test";

test.describe("Vue publique", () => {
  test("l'accueil présente Sparkly et les projets publiés", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every idea starts with a");
    await expect(page.getByRole("link", { name: "Neon Pusher", exact: true }).first()).toBeVisible();
    // Les brouillons ne sont jamais listés.
    await expect(page.getByText("Rythme du Hall")).toHaveCount(0);
  });

  test("Découvrir filtre par plateforme et par recherche", async ({ page }) => {
    await page.goto("/discover?platform=cocktail");
    await expect(page.getByRole("link", { name: "Table Tempête", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Neon Pusher", exact: true })).toHaveCount(0);

    await page.goto("/discover");
    await page.getByLabel("Recherche", { exact: true }).fill("néon");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page.getByRole("link", { name: "Neon Pusher", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Table Tempête", exact: true })).toHaveCount(0);
  });

  test("la page projet affiche les informations du gabarit", async ({ page }) => {
    await page.goto("/p/neon-pusher");
    await expect(page.getByRole("heading", { level: 1, name: "Neon Pusher" })).toBeVisible();
    await expect(page.getByText("Un coin pusher néon")).toBeVisible();
    // Les deux jauges : avancée (jalons) et timeline (temps).
    await expect(page.getByRole("progressbar", { name: "Avancée du projet" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Timeline du projet" })).toBeVisible();
    await expect(page.getByText("Le projet se termine le")).toBeVisible();
    // Vidéo intégrée depuis YouTube.
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeAttached();
    // Description, équipe, planning, actualités.
    await expect(page.getByRole("heading", { name: "Description du jeu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Présentation de l'équipe" })).toBeVisible();
    await expect(page.getByText("Alice Martin").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Planning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dernières actualités" })).toBeVisible();
    await expect(page.getByText(/Mise à jour n°\d/).first()).toBeVisible();
  });

  test("les onglets du projet fonctionnent", async ({ page }) => {
    await page.goto("/p/neon-pusher");
    const tabs = page.getByRole("navigation", { name: "Sections du projet" });
    await tabs.getByRole("link", { name: /FAQ/ }).click();
    await expect(page.getByText("Combien de temps dure une partie ?")).toBeVisible();
    await tabs.getByRole("link", { name: /Commentaires/ }).click();
    await expect(page.getByText("Le rendu néon est superbe")).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" }).last()).toBeVisible();
  });

  test("un brouillon n'est pas accessible publiquement", async ({ page }) => {
    const response = await page.goto("/p/rythme-hall");
    expect(response?.status()).toBe(404);
  });

  test("les pages privées redirigent vers la connexion", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
