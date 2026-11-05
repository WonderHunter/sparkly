import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

test("le groupe ajoute le site de gestion / promotion, affiché dans un encart", async ({ page }) => {
  await login(page, uniqueEmail("site"), "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(`Site E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  const projectPath = new URL(page.url()).pathname.replace(/\/edit\/basics$/, "");

  // Sans site renseigné, pas d'encart.
  await page.goto(projectPath);
  await expect(page.getByRole("region", { name: "Site du jeu" })).toHaveCount(0);

  // Le groupe renseigne son site dans « Les bases ».
  await page.goto(`${projectPath}/edit/basics`);
  await page.getByLabel("Site de gestion / promotion").fill("https://www.site-e2e.example.fr/");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();

  await page.goto(projectPath);
  const card = page.getByRole("region", { name: "Site du jeu" });
  await expect(card).toContainText("site-e2e.example.fr");
  const link = card.getByRole("link", { name: /Visiter le site/ });
  await expect(link).toHaveAttribute("href", "https://www.site-e2e.example.fr/");
  await expect(link).toHaveAttribute("target", "_blank");
});
