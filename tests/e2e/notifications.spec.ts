import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test("un commentaire notifie l'équipe du projet, discrètement dans le header", async ({ page }) => {
  // Un étudiant extérieur commente Neon Pusher (projet de démo d'alice).
  const name = `Visiteur ${Date.now()}`;
  const body = `Super projet, vivement la borne ! ${Date.now()}`;
  await login(page, uniqueEmail("commentateur"), "/settings");
  await page.getByLabel("Prénom et nom").fill(name);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Profil mis à jour.")).toBeVisible();
  await page.goto("/p/neon-pusher/comments");
  await page.getByLabel("Ton commentaire").fill(body);
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.locator("main").getByText(body)).toBeVisible();
  await logout(page);

  // alice, membre du projet, voit la pastille puis la notification.
  await login(page, "alice.demo@etudiant.univ-reims.fr", "/dashboard");
  const bell = page.locator('summary[aria-label^="Notifications"]');
  await expect(bell).toHaveAttribute("aria-label", /non lue/);
  await bell.click();
  const item = page.getByRole("link", { name: new RegExp(`${name} a commenté Neon Pusher`) });
  await expect(item).toBeVisible();
  await expect(item).toContainText(body);

  // Un clic à côté referme le menu.
  await page.mouse.click(20, 700);
  await expect(item).toBeHidden();
  await bell.click();

  // Un clic mène au commentaire et le marque comme lu.
  await item.click();
  await page.waitForURL(/\/p\/neon-pusher\/comments#comment-/);
  await expect(page.locator("main").getByText(body)).toBeVisible();
  await bell.click();
  await expect(page.getByRole("link", { name: new RegExp(`${name} a commenté Neon Pusher`) })).not.toContainText("Non lue");

  // « Tout marquer comme lu » retire la pastille.
  const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
  if (await markAll.isVisible()) await markAll.click();
  await expect(bell).toHaveAttribute("aria-label", "Notifications");
});
