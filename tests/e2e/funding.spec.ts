import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test.describe("Financement fictif par les enseignant·es", () => {
  test("un étudiant voit la jauge mais pas le formulaire", async ({ page }) => {
    await login(page, uniqueEmail("curieux"), "/p/neon-pusher");
    await expect(page.getByRole("progressbar", { name: "Financement du projet" })).toBeVisible();
    await expect(page.getByText(/financés sur un objectif de/)).toBeVisible();
    await expect(page.getByLabel(/Financer ce projet/)).toHaveCount(0);
  });

  test("un prof finance plusieurs fois avec un mot, modifie puis retire chaque financement", async ({ page }) => {
    await login(page, "prof.demo@univ-reims.fr", "/p/table-tempete");
    const gauge = page.getByRole("progressbar", { name: "Financement du projet" });

    // Le solde pour investir est mis en avant (6 000 € déjà engagés par le seed).
    const balance = page.getByRole("group", { name: "Ton solde pour investir" });
    await expect(balance).toContainText(/114\s000\s€/);
    await expect(balance).toContainText(/6\s000\s€ investis sur 120\s000\s€/);

    // 1er financement, avec un mot pour l'équipe.
    await page.getByLabel("Financer ce projet").fill("5000");
    await page.getByLabel("Un mot pour l'équipe (facultatif)").fill("Le pitch est top, foncez !");
    await page.getByRole("button", { name: "Financer" }).click();
    await expect(page.getByText("Merci pour ton soutien !")).toBeVisible();
    await expect(gauge).toHaveAttribute("aria-valuenow", "50");
    await expect(page.getByText(/1 prof financeur/)).toBeVisible();
    // Le formulaire repart à zéro pour le financement suivant.
    await expect(page.getByLabel("Financer ce projet")).toHaveValue("");
    await expect(page.getByLabel("Un mot pour l'équipe (facultatif)")).toHaveValue("");

    // 2e financement du même prof, sans mot : toujours un seul financeur.
    await page.getByLabel("Financer ce projet").fill("2000");
    await page.getByRole("button", { name: "Financer" }).click();
    await expect(gauge).toHaveAttribute("aria-valuenow", "70");
    await expect(balance).toContainText(/107\s000\s€/);
    await expect(page.getByText(/1 prof financeur/)).toBeVisible();
    await expect(page.getByText(/Tes financements · 7\s000\s€/)).toBeVisible();

    // Au-delà du budget, le bouton est bloqué côté interface.
    await page.getByLabel("Financer ce projet").fill("200000");
    await expect(page.getByText(/Au-delà de ton solde/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Financer" })).toBeDisabled();
    await page.getByLabel("Financer ce projet").fill("");

    // Modifier le premier financement : montant et mot.
    await page.getByRole("button", { name: /Modifier le financement de 5\s000\s€/ }).click();
    await page.getByLabel(/Montant \(max/).fill("3000");
    await page.getByLabel("Ton mot (vide pour le retirer)").fill("Le pitch est top, foncez sur la borne !");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(gauge).toHaveAttribute("aria-valuenow", "50");
    await expect(page.getByText(/Tes financements · 5\s000\s€/)).toBeVisible();

    // Le mot apparaît dans les commentaires, avec le badge du financement.
    await page.goto("/p/table-tempete/comments");
    const comment = page.locator("main article").filter({ hasText: "Le pitch est top, foncez sur la borne !" });
    await expect(comment).toContainText(/A financé 3\s000\s€/);

    // La liste « Ils ont financé » regroupe par personne.
    await page.goto("/p/table-tempete");
    await expect(page.getByRole("heading", { name: "Ils ont financé" })).toBeVisible();
    await expect(page.getByText("en 2 fois")).toBeVisible();

    // Le tableau de bord résume le budget (120 000 - 6 000 - 5 000).
    await page.goto("/dashboard");
    await expect(page.getByText(/Mon budget de financement/)).toBeVisible();
    await expect(page.getByText(/109\s000\s€/).first()).toBeVisible();

    // Retrait de chaque financement (avec confirmation) : l'argent revient, le mot disparaît.
    await page.goto("/p/table-tempete");
    for (const amount of [/3\s000\s€/, /2\s000\s€/]) {
      await page.getByRole("button", { name: new RegExp(`Retirer le financement de ${amount.source}`) }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Retirer le financement" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
    await expect(gauge).toHaveAttribute("aria-valuenow", "0");
    await expect(balance).toContainText(/114\s000\s€/);
    await page.goto("/p/table-tempete/comments");
    await expect(page.locator("main").getByText("Le pitch est top, foncez sur la borne !")).toHaveCount(0);
    await logout(page);
  });

  test("l'admin peut désactiver le mot joint au financement", async ({ page }) => {
    await login(page, "admin.demo@univ-reims.fr", "/admin/settings");
    const option = page.getByLabel("Les enseignant·es peuvent joindre un mot à leur financement");
    await expect(option).toBeChecked();
    await option.uncheck();
    const save = page.getByRole("button", { name: "Enregistrer" }).nth(1);
    await save.click();
    await expect(page.getByText("Réglages enregistrés.")).toBeVisible();
    await logout(page);

    await login(page, "prof.demo@univ-reims.fr", "/p/table-tempete");
    await expect(page.getByLabel("Financer ce projet")).toBeVisible();
    await expect(page.getByLabel("Un mot pour l'équipe (facultatif)")).toHaveCount(0);
    await logout(page);

    // On remet l'option comme avant.
    await login(page, "admin.demo@univ-reims.fr", "/admin/settings");
    await page.getByLabel("Les enseignant·es peuvent joindre un mot à leur financement").check();
    await save.click();
    await expect(page.getByText("Réglages enregistrés.")).toBeVisible();
  });
});
