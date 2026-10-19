import { Check, Circle, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { MILESTONE_STATUS_LABEL } from "@/lib/domain/progress";
import type { Milestone } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON = {
  done: <Check className="h-3.5 w-3.5" aria-hidden />,
  in_progress: <LoaderCircle className="h-3.5 w-3.5" aria-hidden />,
  todo: <Circle className="h-3 w-3" aria-hidden />,
};

const DOT = {
  done: "bg-success text-white",
  in_progress: "bg-spark text-white",
  todo: "bg-surface border-2 border-border text-muted",
};

const TONE = { done: "success", in_progress: "spark", todo: "neutral" } as const;

/** Frise verticale du planning (bloc « Planning » du gabarit). */
export function PlanningTimeline({ milestones, compact = false }: { milestones: Milestone[]; compact?: boolean }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted">Le planning n&apos;a pas encore été défini.</p>;
  }
  return (
    <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-border">
      {milestones.map((m) => (
        <li key={m.id} className="relative flex gap-4">
          <span className={cn("relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", DOT[m.status])}>
            {ICON[m.status]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className={cn("font-semibold", m.status === "done" && "text-muted line-through decoration-1")}>{m.title}</h3>
              <Badge tone={TONE[m.status]}>{MILESTONE_STATUS_LABEL[m.status]}</Badge>
            </div>
            {m.period_label && <p className="text-sm text-muted">{m.period_label}</p>}
            {!compact && m.description && <p className="mt-1 text-sm">{m.description}</p>}
          </div>
          {!compact && <span className="shrink-0 text-xs text-muted">{m.weight} %</span>}
        </li>
      ))}
    </ol>
  );
}
