import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select";

const OPTIONS = [
  { value: "", label: "Toutes les plateformes" },
  { value: "borne", label: "Borne d'arcade" },
  { value: "tv", label: "Télé du hall", hint: "Avec les téléphones" },
];

function renderInForm(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  render(
    <form data-testid="form">
      <label htmlFor="platform">Plateforme</label>
      <Select id="platform" name="platform" options={OPTIONS} {...props} />
    </form>,
  );
  const form = screen.getByTestId("form") as HTMLFormElement;
  return { form, value: () => new FormData(form).get("platform") };
}

describe("Select (menu déroulant Sparkly)", () => {
  it("affiche la valeur par défaut et la transmet au formulaire", () => {
    const { value } = renderInForm({ defaultValue: "borne" });
    expect(screen.getByRole("combobox", { name: "Plateforme" })).toHaveTextContent("Borne d'arcade");
    expect(value()).toBe("borne");
  });

  it("gère la valeur vide (« Toutes les plateformes »)", () => {
    const { value } = renderInForm({ defaultValue: "" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Toutes les plateformes");
    expect(value()).toBe("");
  });

  it("s'ouvre, liste les options et met à jour la valeur au clic", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { value } = renderInForm({ defaultValue: "", onValueChange });

    await user.click(screen.getByRole("combobox", { name: "Plateforme" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("Avec les téléphones")).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /Télé du hall/ }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Télé du hall");
    expect(value()).toBe("tv");
    expect(onValueChange).toHaveBeenCalledWith("tv");
  });

  it("se pilote au clavier", async () => {
    const user = userEvent.setup();
    const { value } = renderInForm({ defaultValue: "" });

    screen.getByRole("combobox").focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(value()).toBe("borne");
  });
});
