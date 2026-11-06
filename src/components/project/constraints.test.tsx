import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConstraintBadges } from "./constraints";

describe("ConstraintBadges", () => {
  it("affiche les trois contraintes fixées", () => {
    render(<ConstraintBadges category={{ name: "Plateforme" }} character={{ name: "Une bougie" }} emotion={{ name: "Apaisement" }} />);
    const list = screen.getByRole("list", { name: "Contraintes de la SAÉ" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Type de jeu :Plateforme",
      "Personnage :Une bougie",
      "Émotion :Apaisement",
    ]);
  });

  it("cache les contraintes absentes sur la page publique", () => {
    render(<ConstraintBadges category={{ name: "Rythme" }} character={null} emotion={null} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("à définir")).not.toBeInTheDocument();
  });

  it("signale « à définir » dans l'éditeur", () => {
    render(<ConstraintBadges category={null} character={{ name: "Un reflet" }} emotion={null} showMissing />);
    expect(screen.getAllByText("à définir")).toHaveLength(2);
  });

  it("n'affiche rien sans aucune contrainte", () => {
    const { container } = render(<ConstraintBadges category={null} character={null} emotion={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
