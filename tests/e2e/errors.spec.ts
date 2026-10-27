import { expect, test } from "@playwright/test";

test.describe("Pages d'erreur", () => {
  test("une adresse inconnue affiche la 404 Sparkly", async ({ page }) => {
    const response = await page.goto("/nimporte-quoi");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Cette page n'existe pas (ou plus)" })).toBeVisible();
    await expect(page.getByText("Game over")).toBeVisible();
    await expect(page).toHaveTitle("Page introuvable · Sparkly");

    await page.getByRole("link", { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL("/");
  });

  test("un projet inexistant affiche la même 404", async ({ page }) => {
    const response = await page.goto("/p/projet-inexistant");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Cette page n'existe pas (ou plus)" })).toBeVisible();
  });

  test("la 404 suit le thème sombre", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sparkly-theme", "dark"));
    await page.goto("/nimporte-quoi");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(20, 17, 15)");
  });
});
