import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ConfirmDelete } from "./confirm-delete";

beforeAll(() => {
  // jsdom ne gère pas les modals natifs.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function setup() {
  const action = vi.fn();
  render(
    <ConfirmDelete action={action} title="Supprimer « Orbit Smash » ?" description="Tout son contenu disparaît." confirmLabel="Supprimer le projet" triggerLabel="Supprimer Orbit Smash">
      <span>poubelle</span>
    </ConfirmDelete>,
  );
  return { action };
}

describe("ConfirmDelete", () => {
  it("ne supprime rien au clic sur la poubelle : il ouvre le modal", () => {
    const { action } = setup();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer Orbit Smash" }));
    const dialog = screen.getByRole("dialog", { name: "Supprimer « Orbit Smash » ?" });
    expect(dialog).toHaveAccessibleDescription("Tout son contenu disparaît.");
    expect(action).not.toHaveBeenCalled();
  });

  it("« Annuler » ferme le modal sans supprimer", () => {
    const { action } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer Orbit Smash" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("le bouton de confirmation envoie le formulaire de suppression", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer Orbit Smash" }));
    const confirm = screen.getByRole("button", { name: "Supprimer le projet" });
    expect(confirm).toHaveAttribute("type", "submit");
    expect(confirm.closest("form")).not.toBeNull();
  });
});
