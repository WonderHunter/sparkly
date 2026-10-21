import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("affiche la version de Sparkly", () => {
    render(<SiteFooter />);
    expect(screen.getByTitle("Version de Sparkly")).toHaveTextContent(`v${pkg.version}`);
  });
});
