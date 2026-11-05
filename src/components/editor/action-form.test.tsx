import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionForm, FieldError, type FormState } from "./action-form";

function setup(result: FormState, resetOnSuccess = false) {
  const action = vi.fn(async (): Promise<FormState> => result);
  render(
    <ActionForm action={action} resetOnSuccess={resetOnSuccess}>
      <label htmlFor="pitch">Accroche</label>
      <input id="pitch" name="pitch" defaultValue="" />
      <FieldError name="pitch" />
    </ActionForm>,
  );
  const input = screen.getByLabelText("Accroche") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Un jeu de rythme dans un hall de gare" } });
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  return { action, input };
}

describe("ActionForm", () => {
  it("garde la saisie quand l'envoi échoue", async () => {
    const { action, input } = setup({ error: "Vérifie les champs en rouge.", fields: { pitch: "Trop long." } });
    expect(await screen.findByText("Vérifie les champs en rouge.")).toBeInTheDocument();
    expect(screen.getByText("Trop long.")).toBeInTheDocument();
    expect(input.value).toBe("Un jeu de rythme dans un hall de gare");
    expect(action).toHaveBeenCalledOnce();
    expect((action.mock.calls[0] as unknown[])[1]).toBeInstanceOf(FormData);
  });

  it("garde aussi la saisie après un enregistrement réussi", async () => {
    const { input } = setup({ ok: true, message: "Enregistré." });
    expect(await screen.findByText("Enregistré.")).toBeInTheDocument();
    expect(input.value).toBe("Un jeu de rythme dans un hall de gare");
  });

  it("se vide après un succès quand resetOnSuccess est demandé", async () => {
    const { input } = setup({ ok: true, message: "Ajouté." }, true);
    expect(await screen.findByText("Ajouté.")).toBeInTheDocument();
    await waitFor(() => expect(input.value).toBe(""));
  });
});
