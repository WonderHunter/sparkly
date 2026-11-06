import { devices, expect, test } from "@playwright/test";

// Sur écran tactile, les menus déroulants utilisent le sélecteur natif du téléphone.
test.use({ ...devices["Pixel 7"] });

test("sur téléphone, les filtres utilisent le sélecteur natif et filtrent bien", async ({ page }) => {
  await page.goto("/discover");
  const platform = page.getByRole("combobox", { name: "Plateforme" });
  await expect(platform).toHaveJSProperty("tagName", "SELECT");

  await platform.selectOption("borne");
  await page.getByRole("combobox", { name: "État" }).selectOption("in_progress");
  await page.getByRole("button", { name: "Filtrer" }).tap();
  await page.waitForURL(/platform=borne/);
  expect(new URL(page.url()).searchParams.get("state")).toBe("in_progress");
  await expect(page.getByRole("combobox", { name: "Plateforme" })).toHaveValue("borne");
});
