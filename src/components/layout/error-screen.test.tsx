import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrashScreen, ErrorScreen } from "./error-screen";

describe("ErrorScreen", () => {
  it("affiche le code, le titre, le texte et les actions", () => {
    render(
      <ErrorScreen code="404" kicker="Game over" title="Cette page n'existe pas" actions={<button>Accueil</button>}>
        Le lien est cassé.
      </ErrorScreen>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Cette page n'existe pas" })).toBeInTheDocument();
    expect(screen.getByText("Le lien est cassé.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accueil" })).toBeInTheDocument();
  });

  it("garde « INSERT COIN » hors des lecteurs d'écran", () => {
    render(<ErrorScreen code="404" kicker="Game over" title="Introuvable" />);
    expect(screen.getByText("INSERT COIN")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("CrashScreen", () => {
  it("relance le rendu avec « Rejouer »", () => {
    const retry = vi.fn();
    render(<CrashScreen error={new Error("boum")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Rejouer" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("affiche le digest de l'erreur serveur, jamais son message", () => {
    const error = Object.assign(new Error("secret interne"), { digest: "1234567890" });
    render(<CrashScreen error={error} retry={() => {}} />);
    expect(screen.getByText("Code : 1234567890")).toBeInTheDocument();
    expect(screen.queryByText(/secret interne/)).not.toBeInTheDocument();
  });

  it("n'affiche pas de code sans digest", () => {
    render(<CrashScreen error="pas une Error" retry={() => {}} />);
    expect(screen.queryByText(/Code :/)).not.toBeInTheDocument();
  });
});
