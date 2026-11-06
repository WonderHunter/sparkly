import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

// Petite image PNG (1×1) envoyée trois fois : chaque envoi obtient sa propre adresse.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("les images d'une actualité s'ouvrent dans la visionneuse, avec précédent / suivant", async ({ page }) => {
  await login(page, uniqueEmail("visionneuse"), "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(`Visionneuse E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  const projectPath = new URL(page.url()).pathname.replace(/\/edit\/basics$/, "");

  // Une mise à jour avec trois images.
  await page.goto(`${projectPath}/edit/devlog`);
  await page.getByRole("link", { name: "Nouvelle mise à jour" }).click();
  const title = "Trois captures du prototype";
  await page.getByLabel("Titre de ce qui a été fait").fill(title);
  const body = page.getByRole("textbox", { name: "Texte de la mise à jour" });
  await body.click();
  await body.pressSequentially("Voici où on en est.");
  await page.locator("input[type=file][multiple]").setInputFiles(
    [1, 2, 3].map((i) => ({ name: `capture-${i}.png`, mimeType: "image/png", buffer: PNG })),
  );
  await expect(page.getByText("Images (3/")).toBeVisible();
  await page.getByRole("button", { name: "Publier la mise à jour" }).click();
  await expect(page.getByText("Mise à jour publiée !")).toBeVisible();

  // Côté lecteur : un clic sur une image ouvre la visionneuse sur cette image.
  await page.goto(`${projectPath}/devlog/1`);
  await page.getByRole("button", { name: `Agrandir l'image 2 de « ${title} »` }).click();
  const viewer = page.getByRole("dialog", { name: `Images de « ${title} »` });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("2 / 3")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("3 / 3")).toBeVisible();
  await viewer.getByRole("button", { name: "Image suivante" }).click();
  await expect(viewer.getByText("1 / 3")).toBeVisible();
  await viewer.getByRole("button", { name: "Voir l'image 3 sur 3" }).click();
  await expect(viewer.getByText("3 / 3")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();

  // Depuis la liste des actualités aussi (vignettes).
  await page.goto(`${projectPath}/devlog`);
  await page.getByRole("button", { name: `Agrandir l'image 1 de « ${title} »` }).click();
  await expect(page.getByRole("dialog", { name: `Images de « ${title} »` }).getByText("1 / 3")).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.getByRole("dialog", { name: `Images de « ${title} »` })).toBeHidden();
});
