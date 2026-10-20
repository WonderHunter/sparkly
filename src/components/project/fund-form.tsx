"use client";

import { useActionState, useState } from "react";
import { HandCoins, Undo2 } from "lucide-react";
import { invest, withdrawInvestment, type ActionState } from "@/app/p/[slug]/actions";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";
import { formatEuros, parseEuros } from "@/lib/domain/funding";

interface FundFormProps {
  slug: string;
  projectId: string;
  /** Financement actuel de l'enseignant·e pour ce projet, s'il existe. */
  current: { id: string; amount: number } | null;
  /** Budget encore disponible, en plus du financement actuel. */
  remaining: number;
  schoolYear: string;
  fundable: boolean;
}

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

/** Formulaire « Financer ce projet », réservé aux enseignant·es. */
export function FundForm({ slug, projectId, current, remaining, schoolYear, fundable }: FundFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(invest.bind(null, slug, projectId), {});
  const [value, setValue] = useState(current ? String(current.amount) : "");
  // Plafond pour ce projet : ce qui reste + ce qui est déjà engagé ici.
  const max = remaining + (current?.amount ?? 0);
  const parsed = parseEuros(value);
  const tooMuch = Number.isFinite(parsed) && parsed > max;

  if (!fundable) {
    return (
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
        {current ? `Tu as financé ce projet à hauteur de ${formatEuros(current.amount)}. ` : ""}
        Le projet est terminé ou n&apos;est pas publié : le financement est clos.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-4">
      <form action={action} className="space-y-3" noValidate>
        <label htmlFor="fund-amount" className="block text-sm font-semibold">
          {current ? "Modifier ton financement" : "Financer ce projet"}
        </label>
        <div className="flex gap-2">
          <Input
            id="fund-amount"
            name="amount"
            inputMode="numeric"
            placeholder="Montant en €"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={tooMuch}
            aria-describedby="fund-hint"
          />
          <Button type="submit" variant="secondary" disabled={pending || !value || tooMuch} className="h-11 shrink-0">
            <HandCoins className="h-4 w-4" /> {pending ? "…" : current ? "Mettre à jour" : "Financer"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.filter((a) => a <= max).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setValue(String(a))}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold hover:border-success hover:text-success"
            >
              {formatEuros(a)}
            </button>
          ))}
        </div>
        <p id="fund-hint" className={tooMuch ? "text-xs font-medium text-danger" : "text-xs text-muted"}>
          {tooMuch
            ? `Au-delà de ton budget : ${formatEuros(max)} maximum pour ce projet.`
            : `Budget restant ${schoolYear} : ${formatEuros(remaining)}. Argent fictif, modifiable jusqu'à la fin du projet.`}
        </p>
        {state.error && <FormMessage>{state.error}</FormMessage>}
        {state.ok && state.message && <FormMessage tone="success">{state.message}</FormMessage>}
      </form>
      {current && (
        <form action={withdrawInvestment.bind(null, slug, current.id)} className="mt-2">
          <button type="submit" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger">
            <Undo2 className="h-3.5 w-3.5" /> Retirer mon financement ({formatEuros(current.amount)})
          </button>
        </form>
      )}
    </div>
  );
}
