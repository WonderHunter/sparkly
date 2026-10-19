import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

test("nom déjà utilisé : avertissement, puis adresse personnalisée et redirection de l'ancien lien", async ({ page }) => {
  await login(page, uniqueEmail("doublon"), "/dashboard");

  // Créer un projet qui porte le même nom que « Neon Pusher » (seed).
  await page.getByLabel(/Nom du jeu/).fill("Neon Pusher");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);

  const warning = page.getByRole("status").filter({ hasText: "Un autre projet s'appelle déjà" });
  await expect(warning).toBeVisible();
  await expect(warning.getByRole("link", { name: "/p/neon-pusher" })).toBeVisible();

  // L'adresse générée a un suffixe ; on en choisit une lisible.
  const oldPath = new URL(page.url()).pathname.replace(/\/edit\/basics$/, "");
  const wanted = `Neon Pusher Bis ${Date.now()}`;
  const slugInput = page.getByLabel("Adresse du projet");
  await slugInput.fill(wanted);
  const expectedSlug = `neon-pusher-bis-${wanted.split(" ").pop()}`;
  await expect(page.getByText(`Sera enregistrée comme ${expectedSlug}`)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(`/p/${expectedSlug}/edit/basics?saved=1`);
  await expect(page.getByText("Le projet a une nouvelle adresse.")).toBeVisible();

  // Une adresse déjà prise est refusée.
  await page.getByLabel("Adresse du projet").fill("neon-pusher");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Adresse déjà utilisée par un autre projet.")).toBeVisible();

  // L'ancien lien redirige vers la nouvelle adresse, en gardant l'onglet.
  await page.goto(`${oldPath}/roadmap`);
  await expect(page).toHaveURL(`/p/${expectedSlug}/roadmap`);
});
