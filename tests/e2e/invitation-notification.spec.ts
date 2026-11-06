import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test("une personne ajoutée à l'équipe reçoit une notification qui mène à l'invitation", async ({ page }) => {
  const title = `Invitation E2E ${Date.now()}`;

  // Un·e étudiant·e crée un projet et invite alice (compte de démo existant).
  await login(page, uniqueEmail("recruteur"), "/dashboard");
  await page.getByLabel(/Nom du jeu/).fill(title);
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.waitForURL(/\/edit\/basics$/);
  await page.goto(page.url().replace(/basics$/, "team"));
  await page.getByLabel("Adresse universitaire").fill("alice.demo@etudiant.univ-reims.fr");
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByText("alice.demo@etudiant.univ-reims.fr", { exact: true })).toBeVisible();
  await logout(page);

  // alice voit la notification dans la cloche, même si le projet est encore un brouillon.
  await login(page, "alice.demo@etudiant.univ-reims.fr", "/discover");
  const bell = page.locator('summary[aria-label^="Notifications"]');
  await expect(bell).toHaveAttribute("aria-label", /non lue/);
  await bell.click();
  const item = page.getByRole("link", { name: new RegExp(`t'invite à rejoindre ${title}`) });
  await expect(item).toBeVisible();

  // Un clic mène à l'invitation, sur le tableau de bord.
  await item.click();
  await page.waitForURL(/\/dashboard#invitations$/);
  const invitations = page.locator("#invitations");
  await expect(invitations).toContainText(title);
  await expect(invitations.getByRole("button", { name: "Rejoindre" }).first()).toBeVisible();
});
