import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test("le ou la chef·fe passe le relais à un membre de l'équipe", async ({ page }) => {
  const ownerEmail = uniqueEmail("relais");
  const memberEmail = uniqueEmail("releve");
  const title = `Relais E2E ${Date.now()}`;

  // 1. Création du projet et invitation
  await login(page, ownerEmail, "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(title);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  const teamUrl = page.url().replace(/basics$/, "team");
  await page.goto(teamUrl);
  // Personne à qui passer le relais tant que l'équipe est vide.
  await expect(page.getByRole("heading", { name: "Passer le relais" })).toHaveCount(0);
  await page.getByLabel("Adresse universitaire").fill(memberEmail);
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByText(memberEmail, { exact: true })).toBeVisible();
  await logout(page);

  // 2. Le membre rejoint le projet
  await login(page, memberEmail, "/dashboard");
  await page.getByRole("button", { name: "Rejoindre" }).click();
  await expect(page.getByText("Bienvenue dans l'équipe !")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await logout(page);

  // 3. Le ou la chef·fe passe le relais
  await login(page, ownerEmail, new URL(teamUrl).pathname);
  await page.getByRole("combobox", { name: "Nouveau ou nouvelle chef·fe" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("combobox", { name: "Ton nouveau profil" }).click();
  await page.getByRole("option", { name: "Créa / Com" }).click();
  await page.getByRole("button", { name: "Passer le relais" }).click();
  await expect(page.getByText("Coche la case pour confirmer.")).toBeVisible();
  await page.getByLabel("Je confirme : je ne serai plus chef·fe de ce projet.").check();
  await page.getByRole("button", { name: "Passer le relais" }).click();
  await expect(page.getByText("C'est fait : tu n'es plus chef·fe de ce projet.")).toBeVisible();

  // L'ancien·ne chef·fe reste dans l'équipe, sans la section de transfert.
  await expect(page.getByRole("heading", { name: "Passer le relais" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quitter le projet" })).toBeVisible();
});
