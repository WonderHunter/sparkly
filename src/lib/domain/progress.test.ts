import { describe, expect, it } from "vitest";
import { computeProgress } from "./progress";

describe("computeProgress", () => {
  it("vaut 0 sans jalon ou avec des poids nuls", () => {
    expect(computeProgress([])).toBe(0);
    expect(computeProgress([{ weight: 0, status: "done" }])).toBe(0);
  });

  it("pondère les jalons terminés", () => {
    expect(
      computeProgress([
        { weight: 8, status: "done" },
        { weight: 17, status: "done" },
        { weight: 75, status: "todo" },
      ]),
    ).toBe(25);
  });

  it("compte un jalon en cours pour moitié", () => {
    expect(
      computeProgress([
        { weight: 50, status: "in_progress" },
        { weight: 50, status: "todo" },
      ]),
    ).toBe(25);
  });

  it("vaut 100 quand tout est terminé et ignore les poids négatifs", () => {
    expect(
      computeProgress([
        { weight: 30, status: "done" },
        { weight: 70, status: "done" },
        { weight: -5, status: "todo" },
      ]),
    ).toBe(100);
  });

  it("correspond au planning par défaut (conception + prototypage terminés, dev en cours)", () => {
    const weights = [8, 17, 25, 15, 15, 20];
    const statuses = ["done", "done", "in_progress", "todo", "todo", "todo"] as const;
    expect(computeProgress(weights.map((weight, i) => ({ weight, status: statuses[i] })))).toBe(38);
  });
});
