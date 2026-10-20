import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail(prefix: string, domain = "etudiant.univ-reims.fr") {
  return `${prefix}.e2e${Date.now()}${Math.floor(Math.random() * 1000)}@${domain}`;
}

async function readOtp(email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.[0]) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string };
      const code = msg.Text.match(/\b\d{6,10}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun code reçu pour ${email}`);
}

/** Connexion complète par l'interface : e-mail, puis code lu dans Mailpit. */
export async function login(page: Page, email: string, next?: string) {
  await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`, { method: "DELETE" });
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Adresse e-mail universitaire").fill(email);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(page.getByText(`Code envoyé à ${email}`)).toBeVisible();
  await page.getByLabel("Code reçu par e-mail").fill(await readOtp(email));
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.locator("summary", { hasText: "Menu du compte" }).click();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL("/");
}
