import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountMenu } from "./account-menu";

function setup() {
  render(
    <div>
      <p>Dehors</p>
      <AccountMenu trigger={<summary>Menu du compte</summary>}>
        <div>
          <a href="#profil">Mon profil public</a>
          <button type="button">Action</button>
        </div>
      </AccountMenu>
    </div>,
  );
  const details = screen.getByText("Menu du compte").closest("details")!;
  details.open = true;
  return details;
}

describe("AccountMenu", () => {
  it("se ferme au clic à l'extérieur", () => {
    const details = setup();
    fireEvent.pointerDown(screen.getByText("Dehors"));
    expect(details.open).toBe(false);
  });

  it("reste ouvert quand on clique dedans (hors lien)", () => {
    const details = setup();
    fireEvent.pointerDown(screen.getByText("Action"));
    expect(details.open).toBe(true);
  });

  it("se ferme avec Échap et rend le focus au bouton", () => {
    const details = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Menu du compte"));
  });

  it("se ferme après un clic sur un lien du menu", () => {
    const details = setup();
    fireEvent.click(screen.getByText("Mon profil public"));
    expect(details.open).toBe(false);
  });
});
