export type MilestoneStatus = "todo" | "in_progress" | "done";

export interface WeightedMilestone {
  weight: number;
  status: MilestoneStatus;
}

const STATUS_FACTOR: Record<MilestoneStatus, number> = {
  todo: 0,
  in_progress: 0.5,
  done: 1,
};

/**
 * Avancée du projet en % (miroir de public.compute_progress en base) :
 * somme pondérée des jalons, « en cours » compte pour moitié.
 */
export function computeProgress(milestones: WeightedMilestone[]): number {
  const total = milestones.reduce((sum, m) => sum + Math.max(0, m.weight), 0);
  if (total === 0) return 0;
  const achieved = milestones.reduce(
    (sum, m) => sum + Math.max(0, m.weight) * STATUS_FACTOR[m.status],
    0,
  );
  return Math.round((100 * achieved) / total);
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};
