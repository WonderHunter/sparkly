import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test.describe("Parcours étudiant", () => {
  test("une adresse hors université est refusée", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Adresse e-mail universitaire").fill("intrus@gmail.com");
    await page.getByRole("button", { name: "Recevoir mon code" }).click();
    await expect(page.getByText(/Sparkly est réservé aux adresses/)).toBeVisible();
  });

  test("créer, remplir, faire avancer et publier le projet du groupe, puis recevoir un commentaire", async ({ page }) => {
    const ownerEmail = uniqueEmail("chef");
    const title = `Jeu E2E ${Date.now()}`;

    // 1. Connexion et création du projet
    await login(page, ownerEmail, "/dashboard");
    await expect(page.getByRole("heading", { name: "Mon projet" })).toBeVisible();
    await page.getByLabel(/Nom du jeu/).fill(title);
    await page.getByRole("combobox", { name: "Plateforme" }).click();
    await page.getByRole("option", { name: "Télé du hall" }).click();
    await expect(page.getByRole("combobox", { name: "Plateforme" })).toHaveText(/Télé du hall/);
    await page.getByRole("button", { name: "Créer le projet" }).click();
    await page.waitForURL(/\/edit\/basics$/);

    // 2. Les bases
    const editorNav = page.getByRole("navigation", { name: "Sections de l'éditeur" });
    await page.getByLabel("Phrase d'accroche").fill("Un jeu de test qui donne envie d'y jouer.");
    await page.getByLabel("Vidéo de présentation").fill("https://youtu.be/216_5nu4aVQ");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Enregistré.")).toBeVisible();

    // Une vidéo hors YouTube/Vimeo est refusée
    await page.getByLabel("Vidéo de présentation").fill("https://example.com/video.mp4");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Seules les vidéos YouTube ou Vimeo sont acceptées.")).toBeVisible();
    await page.getByLabel("Vidéo de présentation").fill("https://youtu.be/216_5nu4aVQ");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Enregistré.")).toBeVisible();

    // 3. Description (éditeur riche)
    await editorNav.getByRole("link", { name: "Description" }).click();
    const editor = page.getByRole("textbox", { name: "Description du jeu" });
    await editor.click();
    await editor.pressSequentially("Un jeu d'arcade où chaque partie dure trois minutes.");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Description enregistrée.")).toBeVisible();

    // 4. Planning : terminer la conception (8 %)
    await editorNav.getByRole("link", { name: "Planning" }).click();
    await page.getByRole("button", { name: "Démarrer" }).first().click();
    await expect(page.getByRole("button", { name: "Terminer" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Terminer" }).first().click();
    await expect(page.getByText("8 % d'avancée")).toBeVisible();

    // 5. Devlog
    await editorNav.getByRole("link", { name: "Actualités" }).click();
    await page.getByRole("link", { name: "Nouvelle mise à jour" }).click();
    await page.getByLabel("Titre de ce qui a été fait").fill("Moodboard terminé");
    const body = page.getByRole("textbox", { name: "Texte de la mise à jour" });
    await body.click();
    await body.pressSequentially("On a choisi une direction artistique néon.");
    await page.getByRole("button", { name: "Publier la mise à jour" }).click();
    await expect(page.getByText("Mise à jour publiée !")).toBeVisible();
    await expect(page.getByText("Mise à jour n°1")).toBeVisible();

    // 6. Publication
    await editorNav.getByRole("link", { name: "Publication" }).click();
    await page.getByRole("button", { name: "Publier le projet" }).click();
    await expect(page.getByText("Projet publié !")).toBeVisible();

    // 7. Page publique
    await page.getByRole("link", { name: "Voir la page publique" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Avancée du projet" })).toHaveAttribute("aria-valuenow", "8");
    await expect(page.getByText("Moodboard terminé")).toBeVisible();
    const projectUrl = page.url();
    await logout(page);

    // 8. Un autre étudiant suit et commente
    await login(page, uniqueEmail("fan"), new URL(projectUrl).pathname);
    await page.getByRole("button", { name: "Suivre le projet" }).click();
    await expect(page.getByRole("button", { name: "Suivi" })).toBeVisible();
    await page.getByRole("navigation", { name: "Sections du projet" }).getByRole("link", { name: /Commentaires/ }).click();
    await page.getByLabel("Ton commentaire").fill("Trop hâte d'y jouer sur la télé du hall !");
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByText("Trop hâte d'y jouer sur la télé du hall !")).toBeVisible();

    // Le projet suivi alimente le fil du tableau de bord.
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /Moodboard terminé/ })).toBeVisible();
  });
});
