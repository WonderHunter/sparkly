import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test.describe("Financement fictif par les enseignant·es", () => {
  test("un étudiant voit la jauge mais pas le formulaire", async ({ page }) => {
    await login(page, uniqueEmail("curieux"), "/p/neon-pusher");
    await expect(page.getByRole("progressbar", { name: "Financement du projet" })).toBeVisible();
    await expect(page.getByText(/financés sur un objectif de/)).toBeVisible();
    await expect(page.getByLabel(/Financer ce projet/)).toHaveCount(0);
  });

  test("un prof finance, modifie puis retire son financement", async ({ page }) => {
    await login(page, "prof.demo@univ-reims.fr", "/p/table-tempete");

    // Le budget annuel apparaît sous le formulaire (6 000 € déjà engagés par le seed).
    await expect(page.getByText(/Budget restant .* 114\s000\s€/)).toBeVisible();

    await page.getByLabel("Financer ce projet").fill("5000");
    await page.getByRole("button", { name: "Financer" }).click();
    await expect(page.getByText("Merci pour ton soutien !")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Financement du projet" })).toHaveAttribute("aria-valuenow", "50");
    await expect(page.getByText(/1 prof financeur/)).toBeVisible();

    // Au-delà du budget, le bouton est bloqué côté interface.
    await page.getByLabel("Modifier ton financement").fill("200000");
    await expect(page.getByText(/Au-delà de ton budget/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Mettre à jour" })).toBeDisabled();

    await page.getByLabel("Modifier ton financement").fill("8000");
    await page.getByRole("button", { name: "Mettre à jour" }).click();
    await expect(page.getByText("Financement mis à jour.")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Financement du projet" })).toHaveAttribute("aria-valuenow", "80");

    // La liste « Ils ont financé » est publique.
    await expect(page.getByRole("heading", { name: "Ils ont financé" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prof Démo" }).first()).toBeVisible();

    // Le tableau de bord résume le budget.
    await page.goto("/dashboard");
    await expect(page.getByText(/Mon budget de financement/)).toBeVisible();
    await expect(page.getByText(/106\s000\s€/).first()).toBeVisible();

    // Retrait : l'argent revient dans le budget.
    await page.goto("/p/table-tempete");
    await page.getByRole("button", { name: /Retirer mon financement/ }).click();
    await expect(page.getByRole("progressbar", { name: "Financement du projet" })).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText(/Budget restant .* 114\s000\s€/)).toBeVisible();
    await logout(page);
  });
});
