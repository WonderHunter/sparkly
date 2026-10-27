import { expect, test } from "@playwright/test";

test("le thème sombre se choisit, se mémorise et suit le système par défaut", async ({ page }) => {
  // Sans choix, le thème suit celui du système.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Le bouton bascule et le choix survit au rechargement, même si le système est clair.
  await page.getByRole("button", { name: "Passer au thème sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(20, 17, 15)");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Passer au thème clair" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("le thème est appliqué avant l'affichage de la page (pas de flash clair)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sparkly-theme", "dark"));
  // Le script s'exécute dans <head> : data-theme existe dès que le DOM est lu, avant hydratation.
  await page.goto("/discover", { waitUntil: "commit" });
  await page.waitForSelector("body");
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
});
