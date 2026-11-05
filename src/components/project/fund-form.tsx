"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { HandCoins, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { invest, updateInvestment, withdrawInvestment, type ActionState } from "@/app/p/[slug]/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { FormMessage, Input, Textarea } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/misc";
import { formatEuros, parseEuros } from "@/lib/domain/funding";
import { submitKeepingValues } from "@/lib/keep-form-values";
import { formatRelative } from "@/lib/utils";

/** Un financement de l'enseignant·e connecté·e sur ce projet. */
export interface MyInvestment {
  id: string;
  amount: number;
  created_at: string;
  message: string | null;
}

interface FundFormProps {
  slug: string;
  projectId: string;
  /** Ses financements de l'année sur ce projet (un·e enseignant·e peut financer plusieurs fois). */
  mine: MyInvestment[];
  /** Budget encore disponible sur l'année. */
  remaining: number;
  /** Budget annuel total de l'enseignant·e. */
  budget: number;
  schoolYear: string;
  fundable: boolean;
  /** Option admin : un mot peut accompagner chaque financement. */
  allowMessage: boolean;
}

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

/** Financer ce projet (réservé aux enseignant·es), puis gérer chacun de ses financements. */
export function FundForm({ slug, projectId, mine, remaining, budget, schoolYear, fundable, allowMessage }: FundFormProps) {
  const total = mine.reduce((sum, i) => sum + i.amount, 0);
  const invested = Math.max(0, budget - remaining);

  if (!fundable) {
    return (
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
        {total > 0 ? `Tu as financé ce projet à hauteur de ${formatEuros(total)}. ` : ""}
        Le projet est terminé ou n&apos;est pas publié : le financement est clos.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-4">
      <div role="group" aria-label="Ton solde pour investir" className="mb-4 rounded-xl border border-success/20 bg-surface p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">Ton solde pour investir</p>
          <p className="text-xs text-muted">{schoolYear}</p>
        </div>
        <p className="mt-1 font-display text-3xl leading-none font-extrabold text-success">{formatEuros(remaining)}</p>
        <div className="mt-3">
          <ProgressBar value={budget > 0 ? (invested / budget) * 100 : 0} tone="success" size="sm" label="Part de ton budget déjà investie" />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {formatEuros(invested)} investis sur {formatEuros(budget)} · remis à zéro le 1er septembre
        </p>
      </div>
      <NewFunding slug={slug} projectId={projectId} remaining={remaining} allowMessage={allowMessage} />
      {mine.length > 0 && (
        <div className="mt-4 border-t border-success/20 pt-4">
          <p className="text-sm font-semibold">
            Tes financements · <span className="text-success">{formatEuros(total)}</span>
          </p>
          <ul className="mt-2 space-y-2">
            {mine.map((inv) => (
              <FundingItem key={inv.id} slug={slug} investment={inv} remaining={remaining} allowMessage={allowMessage} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NewFunding({
  slug,
  projectId,
  remaining,
  allowMessage,
}: {
  slug: string;
  projectId: string;
  remaining: number;
  allowMessage: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(invest.bind(null, slug, projectId), {});
  const [value, setValue] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const parsed = parseEuros(value);
  const tooMuch = Number.isFinite(parsed) && parsed > remaining;

  // Après un financement réussi, le formulaire repart à zéro pour le suivant.
  useEffect(() => {
    if (!state.ok) return;
    form.current?.reset();
    setValue(""); // eslint-disable-line react-hooks/set-state-in-effect -- remise à zéro après l'action
  }, [state]);

  return (
    <form ref={form} action={action} onSubmit={submitKeepingValues(action)} className="space-y-3" noValidate>
      <label htmlFor="fund-amount" className="block text-sm font-semibold">
        Financer ce projet
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
          <HandCoins className="h-4 w-4" /> {pending ? "…" : "Financer"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.filter((a) => a <= remaining).map((a) => (
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
      {allowMessage && (
        <div>
          <label htmlFor="fund-message" className="sr-only">
            Un mot pour l&apos;équipe (facultatif)
          </label>
          <Textarea
            id="fund-message"
            name="message"
            maxLength={2000}
            placeholder="Un mot pour l'équipe (facultatif) : ce qui t'a convaincu, un conseil…"
            className="min-h-20 text-sm"
          />
          <p className="mt-1 text-xs text-muted">Publié dans les commentaires du projet, avec ton financement.</p>
        </div>
      )}
      <p id="fund-hint" className={tooMuch ? "text-xs font-medium text-danger" : "text-xs text-muted"}>
        {tooMuch
          ? `Au-delà de ton solde : ${formatEuros(remaining)} maximum.`
          : "Argent fictif. Chaque financement reste modifiable jusqu'à la fin du projet."}
      </p>
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && state.message && <FormMessage tone="success">{state.message}</FormMessage>}
    </form>
  );
}

function FundingItem({
  slug,
  investment,
  remaining,
  allowMessage,
}: {
  slug: string;
  investment: MyInvestment;
  remaining: number;
  allowMessage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateInvestment.bind(null, slug, investment.id), {});
  const max = remaining + investment.amount;

  useEffect(() => {
    if (state.ok) setEditing(false); // eslint-disable-line react-hooks/set-state-in-effect -- refermer après l'enregistrement
  }, [state]);

  const label = `${formatEuros(investment.amount)} du ${new Date(investment.created_at).toLocaleDateString("fr-FR")}`;

  return (
    <li className="rounded-xl border border-border bg-surface p-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-bold text-success">{formatEuros(investment.amount)}</span>{" "}
            <span className="text-xs text-muted">· {formatRelative(investment.created_at)}</span>
          </p>
          {investment.message && !editing && (
            <p className="mt-1 flex gap-1.5 text-muted">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">{investment.message}</span>
            </p>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Modifier le financement de ${label}`}
              className="rounded-full p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <ConfirmDelete
              action={withdrawInvestment.bind(null, slug, investment.id)}
              title={`Retirer ce financement de ${formatEuros(investment.amount)} ?`}
              description={
                investment.message
                  ? "Le montant revient dans ton solde et ton mot est retiré des commentaires."
                  : "Le montant revient dans ton solde."
              }
              confirmLabel="Retirer le financement"
              triggerLabel={`Retirer le financement de ${label}`}
              triggerClassName="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ConfirmDelete>
          </div>
        )}
      </div>
      {editing && (
        <form action={action} onSubmit={submitKeepingValues(action)} className="mt-3 space-y-2" noValidate>
          <label htmlFor={`amount-${investment.id}`} className="block text-xs font-semibold">
            Montant (max {formatEuros(max)})
          </label>
          <Input id={`amount-${investment.id}`} name="amount" inputMode="numeric" defaultValue={String(investment.amount)} />
          {(allowMessage || investment.message) && (
            <>
              <label htmlFor={`message-${investment.id}`} className="block text-xs font-semibold">
                Ton mot (vide pour le retirer)
              </label>
              <Textarea
                id={`message-${investment.id}`}
                name="message"
                maxLength={2000}
                defaultValue={investment.message ?? ""}
                className="min-h-16 text-sm"
              />
            </>
          )}
          {state.error && <FormMessage>{state.error}</FormMessage>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
