import { describe, expect, it } from "vitest";
import { formatEuros, fundingPercent, parseEuros, schoolYearOf } from "./funding";

const spaces = (s: string) => s.replace(/[  ]/g, " ");

describe("formatEuros", () => {
  it("formate en euros sans décimales", () => {
    expect(spaces(formatEuros(12500))).toBe("12 500 €");
    expect(spaces(formatEuros(120000))).toBe("120 000 €");
    expect(spaces(formatEuros(0))).toBe("0 €");
  });
});

describe("fundingPercent", () => {
  it("calcule la part de l'objectif, sans plafond", () => {
    expect(fundingPercent(4500, 10000)).toBe(45);
    expect(fundingPercent(13500, 10000)).toBe(135);
    expect(fundingPercent(0, 10000)).toBe(0);
    expect(fundingPercent(500, 0)).toBe(0);
  });
});

describe("schoolYearOf", () => {
  it("bascule le 1er septembre, à l'heure de Paris", () => {
    expect(schoolYearOf(new Date("2027-08-31T12:00:00Z"))).toBe("2026-2027");
    expect(schoolYearOf(new Date("2027-09-01T12:00:00Z"))).toBe("2027-2028");
    // 31 août 23h30 UTC = 1er septembre 1h30 à Paris
    expect(schoolYearOf(new Date("2027-08-31T23:30:00Z"))).toBe("2027-2028");
    expect(schoolYearOf(new Date("2027-01-15T12:00:00Z"))).toBe("2026-2027");
  });
});

describe("parseEuros", () => {
  it("lit les saisies courantes", () => {
    expect(parseEuros("12500")).toBe(12500);
    expect(parseEuros("12 500 €")).toBe(12500);
    expect(parseEuros("12 500,00")).toBe(12500);
  });

  it("refuse ce qui n'est pas un montant", () => {
    expect(parseEuros("abc")).toBeNaN();
    expect(parseEuros("-500")).toBeNaN();
    expect(parseEuros("")).toBeNaN();
  });
});
