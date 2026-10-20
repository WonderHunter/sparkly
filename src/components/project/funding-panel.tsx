import { Coins } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { formatEuros, fundingPercent } from "@/lib/domain/funding";
import { pluralize } from "@/lib/utils";

/** Bloc « montant financé / objectif » de la page projet (financement fictif par les profs). */
export function FundingPanel({ amount, goal, backers }: { amount: number; goal: number; backers: number }) {
  const percent = fundingPercent(amount, goal);
  return (
    <section aria-labelledby="funding-title">
      <h2 id="funding-title" className="sr-only">
        Financement par l&apos;équipe pédagogique
      </h2>
      <ProgressBar value={percent} label="Financement du projet" tone="success" size="lg" />
      <p className="mt-4 font-display text-4xl font-extrabold text-success">{formatEuros(amount)}</p>
      <p className="text-sm text-muted">
        financés sur un objectif de <strong className="text-foreground">{formatEuros(goal)}</strong>
        {percent > 0 && <> · {percent} %</>}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <Coins className="h-4 w-4" aria-hidden /> {pluralize(backers, "prof financeur", "profs financeurs")}
      </p>
    </section>
  );
}

/** Version compacte pour les cartes projet. */
export function FundingLine({ amount, goal, title }: { amount: number; goal: number; title: string }) {
  const percent = fundingPercent(amount, goal);
  return (
    <div>
      <ProgressBar value={percent} label={`Financement de ${title}`} tone="success" size="sm" />
      <p className="mt-1.5 text-sm">
        <strong className="text-success">{formatEuros(amount)}</strong>
        <span className="text-muted"> financés · {percent} %</span>
      </p>
    </div>
  );
}
