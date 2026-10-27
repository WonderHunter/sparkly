import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test.describe("Administration", () => {
  test("un étudiant n'accède pas au panel admin", async ({ page }) => {
    await login(page, uniqueEmail("eleve"), "/admin");
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { name: "Cette zone est réservée" })).toBeVisible();

    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: "Cette zone est réservée" })).toBeVisible();
  });

  test("l'admin modère un projet et supprime un compte", async ({ page }) => {
    // Un compte à supprimer.
    const victimEmail = uniqueEmail("a-supprimer");
    await login(page, victimEmail, "/settings");
    await page.getByLabel("Prénom et nom").fill("Compte Jetable");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Profil mis à jour.")).toBeVisible();
    await logout(page);

    // L'admin de démo (seed) se connecte.
    await login(page, "admin.demo@univ-reims.fr", "/admin");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();

    // Masquer puis rétablir un projet.
    const adminNav = page.getByRole("navigation", { name: "Administration" });
    await adminNav.getByRole("link", { name: "Projets" }).click();
    const row = page.getByRole("row", { name: /Rythme du Hall/ });
    await row.getByRole("button", { name: "Masquer" }).click();
    await expect(row.getByText("Masqué")).toBeVisible();
    await row.getByRole("button", { name: "Rétablir" }).click();
    await expect(row.getByText("Brouillon")).toBeVisible();

    // Supprimer le compte jetable.
    await adminNav.getByRole("link", { name: "Comptes" }).click();
    await page.getByLabel("Rechercher un compte").fill("Compte Jetable");
    await page.getByRole("button", { name: "Rechercher" }).click();
    const item = page.getByRole("listitem").filter({ hasText: "Compte Jetable" });
    await item.getByText("Gérer").click();
    await item.getByRole("button", { name: "Supprimer le compte" }).click();
    await expect(item.getByText("Écris SUPPRIMER pour confirmer.")).toBeVisible();
    await item.getByLabel("Écris SUPPRIMER pour confirmer").fill("SUPPRIMER");
    await item.getByRole("button", { name: "Supprimer le compte" }).click();
    await expect(page.getByText("Compte supprimé.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Compte Jetable")).toHaveCount(0);
  });

  test("l'administration et l'éditeur tiennent sur un écran de téléphone", async ({ page }) => {
    await login(page, "admin.demo@univ-reims.fr", "/admin");
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/admin", "/admin/projects", "/admin/users", "/admin/reports", "/admin/settings", "/p/neon-pusher/edit/basics"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `débordement horizontal sur ${path}`).toBeLessThanOrEqual(0);
    }
    // Sur mobile, les actions des projets restent accessibles par leur nom.
    await page.goto("/admin/projects");
    await expect(page.getByRole("row", { name: /Rythme du Hall/ }).getByRole("button", { name: "Masquer" })).toBeVisible();
  });
});
