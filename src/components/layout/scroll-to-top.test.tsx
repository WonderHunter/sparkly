import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { ScrollToTop } = await import("./scroll-to-top");

describe("ScrollToTop", () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    pathname = "/";
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    scrollTo.mockReset();
    window.location.hash = "";
  });

  it("ne bouge pas au premier affichage", () => {
    render(<ScrollToTop />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("remonte en haut quand la page change", () => {
    const { rerender } = render(<ScrollToTop />);
    pathname = "/p/neon-pusher/roadmap";
    rerender(<ScrollToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("laisse le navigateur restaurer la position avec précédent/suivant", () => {
    const { rerender } = render(<ScrollToTop />);
    window.dispatchEvent(new PopStateEvent("popstate"));
    pathname = "/discover";
    rerender(<ScrollToTop />);
    expect(scrollTo).not.toHaveBeenCalled();

    // La navigation suivante, par un lien, remonte de nouveau.
    pathname = "/dashboard";
    rerender(<ScrollToTop />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("respecte les liens vers une ancre", () => {
    const { rerender } = render(<ScrollToTop />);
    window.location.hash = "#commentaires";
    pathname = "/p/neon-pusher/comments";
    rerender(<ScrollToTop />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
