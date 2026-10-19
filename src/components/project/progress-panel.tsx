import { CalendarClock, Flame, Gauge } from "lucide-react";
import { Badge, ProgressBar } from "@/components/ui/misc";
import { PACE_LABEL, computePace, computeTimeline, daysLeft, formatLongDate } from "@/lib/domain/timeline";

interface ProgressPanelProps {
  progress: number;
  startsOn: string;
  endsOn: string;
  now?: Date;
}

const PACE_TONE = { ahead: "success", on_track: "spark", behind: "warning" } as const;

/**
 * Encart des deux jauges imposées par le gabarit pédagogique :
 * « Avancée du projet » (jalons) et « Timeline du projet » (temps écoulé).
 * Il remplace le bloc « montant collecté / jours restants » de Kickstarter.
 */
export function ProgressPanel({ progress, startsOn, endsOn, now = new Date() }: ProgressPanelProps) {
  const timeline = computeTimeline(startsOn, endsOn, now);
  const remaining = daysLeft(endsOn, now);
  const pace = computePace(progress, timeline);

  return (
    <section aria-labelledby="progress-title" className="space-y-6">
      <h2 id="progress-title" className="sr-only">
        Avancement du projet
      </h2>

      <div>
        <ProgressBar value={progress} label="Avancée du projet" size="lg" />
        <p className="mt-4 font-display text-4xl font-extrabold text-spark-strong">
          {progress}
          <span className="text-2xl"> %</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Gauge className="h-4 w-4" aria-hidden /> Avancée du projet (jalons terminés)
        </p>
      </div>

      <div>
        <ProgressBar value={timeline} label="Timeline du projet" tone="ink" />
        <p className="mt-4 font-display text-3xl font-extrabold">
          {timeline}
          <span className="text-xl"> %</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarClock className="h-4 w-4" aria-hidden /> Timeline du projet
        </p>
        <p className="mt-1 text-sm">
          Le projet se termine le <strong>{formatLongDate(endsOn)}</strong>
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
        <div>
          <p className="font-display text-2xl font-extrabold">{remaining}</p>
          <p className="text-xs text-muted">jours restants</p>
        </div>
        <Badge tone={PACE_TONE[pace]}>
          <Flame className="h-3.5 w-3.5" aria-hidden /> {PACE_LABEL[pace]}
        </Badge>
      </div>
    </section>
  );
}
