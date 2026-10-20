/** Financement fictif par les enseignant·es (aucune transaction réelle). */

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** 12500 -> « 12 500 € ». */
export function formatEuros(amount: number): string {
  return EUROS.format(Math.round(amount));
}

/** Part de l'objectif atteinte, en %, non plafonnée (un projet peut dépasser 100 %). */
export function fundingPercent(amount: number, goal: number): number {
  if (!(goal > 0) || !(amount > 0)) return 0;
  return Math.round((amount / goal) * 100);
}

/**
 * Année universitaire (septembre -> août), à l'heure de Paris :
 * 31 août 2027 -> « 2026-2027 », 1er septembre 2027 -> « 2027-2028 ».
 * Miroir de public.school_year_of() en base.
 */
export function schoolYearOf(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", year: "numeric", month: "numeric" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** « 12 500 € », « 12500 » ou « 12 500,00 » -> 12500 (euros entiers). NaN si illisible. */
export function parseEuros(input: string): number {
  const cleaned = input.replace(/[\s  €]/g, "").replace(/,\d{1,2}$/, "").replace(/\.\d{1,2}$/, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}
