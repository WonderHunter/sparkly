import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { displayHost, SiteCard } from "./site-card";

describe("displayHost", () => {
  it("retire le protocole, « www. » et la barre finale", () => {
    expect(displayHost("https://www.orbit-smash.fr/")).toBe("orbit-smash.fr");
    expect(displayHost("http://mmi.fr/jeux/orbit/")).toBe("mmi.fr/jeux/orbit");
  });

  it("renvoie l'adresse telle quelle si elle est illisible", () => {
    expect(displayHost("pas une url")).toBe("pas une url");
  });
});

describe("SiteCard", () => {
  it("affiche l'encart avec l'adresse courte et un lien qui ouvre un nouvel onglet", () => {
    render(<SiteCard url="https://www.orbit-smash.fr/" />);
    const card = screen.getByRole("region", { name: "Site du jeu" });
    expect(card).toHaveTextContent("orbit-smash.fr");
    const link = screen.getByRole("link", { name: /Visiter le site/ });
    expect(link).toHaveAttribute("href", "https://www.orbit-smash.fr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
