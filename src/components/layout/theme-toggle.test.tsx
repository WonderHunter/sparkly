import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeToggle } from "./theme-toggle";

describe("resolveTheme", () => {
  it("respecte le choix enregistré", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("suit le système sans choix (ou avec une valeur invalide)", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("violet", false)).toBe("light");
  });
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    document.documentElement.dataset.theme = "light";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("bascule entre clair et sombre et mémorise le choix", async () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Passer au thème sombre" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    fireEvent.click(await screen.findByRole("button", { name: "Passer au thème clair" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("utilise le fondu enchaîné du navigateur quand il existe", () => {
    const startViewTransition = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Passer au thème sombre" }));
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.theme).toBe("dark");
    Reflect.deleteProperty(document, "startViewTransition");
  });
});
