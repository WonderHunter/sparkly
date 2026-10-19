import { describe, expect, it } from "vitest";
import { computePace, computeTimeline, daysLeft, formatLongDate } from "./timeline";

describe("computeTimeline", () => {
  const start = "2026-09-01";
  const end = "2027-01-31";

  it("vaut 0 avant le début et 100 après la fin", () => {
    expect(computeTimeline(start, end, new Date("2026-08-01T00:00:00Z"))).toBe(0);
    expect(computeTimeline(start, end, new Date("2027-03-01T00:00:00Z"))).toBe(100);
  });

  it("donne la part du temps écoulé", () => {
    // 152 jours au total, 76 jours écoulés : 50 %
    expect(computeTimeline(start, end, new Date("2026-11-16T12:00:00Z"))).toBe(50);
  });

  it("gère des dates incohérentes sans planter", () => {
    expect(computeTimeline(end, start, new Date())).toBe(100);
  });
});

describe("daysLeft", () => {
  it("compte les jours restants et ne devient jamais négatif", () => {
    expect(daysLeft("2027-01-31", new Date("2027-01-21T12:00:00Z"))).toBe(10);
    expect(daysLeft("2027-01-31", new Date("2027-02-10T12:00:00Z"))).toBe(0);
  });
});

describe("computePace", () => {
  it("compare l'avancée au temps écoulé", () => {
    expect(computePace(60, 40)).toBe("ahead");
    expect(computePace(45, 50)).toBe("on_track");
    expect(computePace(20, 50)).toBe("behind");
  });
});

describe("formatLongDate", () => {
  it("formate en français", () => {
    expect(formatLongDate("2027-01-23")).toBe("23 janvier 2027");
  });
});
