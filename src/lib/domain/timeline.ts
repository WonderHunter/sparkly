const DAY = 24 * 60 * 60 * 1000;

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Une date ISO « AAAA-MM-JJ » est interprétée à midi UTC pour éviter les décalages de fuseau.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}

/** Jauge « Timeline du projet » : % du temps écoulé entre le début et la fin, borné à [0, 100]. */
export function computeTimeline(startsOn: string | Date, endsOn: string | Date, now: Date = new Date()): number {
  const start = toDate(startsOn).getTime();
  const end = toDate(endsOn).getTime();
  if (!(end > start)) return 100;
  const ratio = (now.getTime() - start) / (end - start);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

/** Jours restants avant la fin du projet (0 si terminé). */
export function daysLeft(endsOn: string | Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((toDate(endsOn).getTime() - now.getTime()) / DAY));
}

export type Pace = "ahead" | "on_track" | "behind";

/** Compare l'avancée à la timeline, avec une marge de tolérance (en points). */
export function computePace(progress: number, timeline: number, tolerance = 10): Pace {
  if (progress >= timeline + tolerance) return "ahead";
  if (progress < timeline - tolerance) return "behind";
  return "on_track";
}

export const PACE_LABEL: Record<Pace, string> = {
  ahead: "En avance",
  on_track: "Dans les temps",
  behind: "En retard",
};

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export function formatLongDate(value: string | Date): string {
  return LONG_DATE.format(toDate(value));
}
