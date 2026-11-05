import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

test("une erreur à l'envoi ne fait pas perdre ce qui a été saisi", async ({ page }) => {
  await login(page, uniqueEmail("saisie"), "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(`Saisie E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);

  // L'étudiant remplit plusieurs champs, dont un invalide (vidéo hors YouTube/Vimeo).
  const pitch = "Un jeu de rythme où l'on fait danser tout un hall de gare.";
  await page.getByLabel("Phrase d'accroche").fill(pitch);
  await page.getByLabel("Site de gestion / promotion").fill("https://site-saisie.example.fr");
  await page.getByLabel("Vidéo de présentation").fill("https://example.com/video.mp4");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByText("Vérifie les champs en rouge.")).toBeVisible();
  await expect(page.getByText("Seules les vidéos YouTube ou Vimeo sont acceptées.")).toBeVisible();
  // Rien n'est effacé : il suffit de corriger le champ fautif.
  await expect(page.getByLabel("Phrase d'accroche")).toHaveValue(pitch);
  await expect(page.getByLabel("Site de gestion / promotion")).toHaveValue("https://site-saisie.example.fr");
  await expect(page.getByLabel("Vidéo de présentation")).toHaveValue("https://example.com/video.mp4");

  await page.getByLabel("Vidéo de présentation").fill("https://youtu.be/216_5nu4aVQ");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Phrase d'accroche")).toHaveValue(pitch);
});
