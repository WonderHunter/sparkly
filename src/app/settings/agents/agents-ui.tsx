"use client";

import { useActionState, useRef, useState } from "react";
import { KeyRound, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { submitKeepingValues } from "@/lib/keep-form-values";
import { cn } from "@/lib/utils";
import { createApiKey, setConnectionExpiry, type CreateKeyState, type ExpiryState } from "./actions";

/** « Nouvelle clé » : modal de création ; le secret s'affiche une seule fois. */
export function NewKeyDialog({
  scopes,
  minDate,
  defaultDate,
  maxDate,
}: {
  scopes: { value: string; label: string; description: string }[];
  minDate: string;
  defaultDate: string;
  maxDate: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createApiKey, {});
  const [formKey, setFormKey] = useState(0);
  // Une fois la modale fermée, le secret quitte la page : il ne s'affiche qu'une fois.
  const [dismissed, setDismissed] = useState<string | undefined>();
  const secret = state.secret && state.secret !== dismissed ? state.secret : undefined;
  const close = () => {
    dialog.current?.close();
    setDismissed(state.secret);
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => dialog.current?.showModal()}>
        <Plus className="h-4 w-4" aria-hidden /> Nouvelle clé
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="new-key-title"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm"
      >
        <div key={formKey} className="p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-spark-soft text-spark-strong">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="new-key-title" className="mt-4 font-display text-xl font-extrabold">
            {secret ? "Ta nouvelle clé" : "Nouvelle clé d'API"}
          </h2>

          {secret ? (
            <div className="mt-4 space-y-4">
              <p className="flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Copie-la maintenant : elle ne sera plus jamais affichée. Garde-la comme un mot de passe.
              </p>
              <code className="block rounded-xl border border-border bg-surface-muted px-3 py-2.5 font-mono text-xs break-all">{secret}</code>
              <div className="flex justify-end gap-2">
                <CopyButton value={secret} label="Copier la clé" />
                <Button type="button" size="sm" onClick={close}>
                  J&apos;ai copié ma clé
                </Button>
              </div>
            </div>
          ) : (
            <form action={action} onSubmit={submitKeepingValues(action)} className="mt-4 space-y-4">
              <Field label="Nom" htmlFor="key-name" hint="Pour t'y retrouver, ex. « Claude Code – portable ».">
                <Input id="key-name" name="name" maxLength={80} required />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Permissions</legend>
                <div className="space-y-2">
                  {scopes.map((s) => (
                    <label key={s.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                      <input type="checkbox" name="scopes" value={s.value} defaultChecked className="mt-0.5 h-4 w-4 accent-spark" />
                      <span className="text-sm">
                        <span className="block font-semibold">{s.label}</span>
                        <span className="text-muted">{s.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Expire le" htmlFor="key-expires" hint={`Au plus tard le ${new Date(`${maxDate}T12:00:00Z`).toLocaleDateString("fr-FR")} : une clé n'est jamais éternelle.${scopes.some((sc) => sc.value === "financement" || sc.value === "moderation") ? " Avec Financer ou Modérer, 30 jours au plus." : ""}`}>
                <Input id="key-expires" name="expires" type="date" min={minDate} max={maxDate} defaultValue={defaultDate} required />
              </Field>
              {state.error && <FormMessage>{state.error}</FormMessage>}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={close}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Création…" : "Créer la clé"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Raccourcir ou prolonger une connexion (jamais au-delà du plafond). */
export function ExpiryForm({ connectionId, current, minDate, maxDate }: { connectionId: string; current: string; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState<ExpiryState, FormData>(setConnectionExpiry.bind(null, connectionId), {});
  return (
    <form action={action} onSubmit={submitKeepingValues(action)} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold">
        Expire le
        <Input name="expires" type="date" min={minDate} max={maxDate} defaultValue={current} className={cn("mt-1 h-9 w-44")} required />
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "…" : "Enregistrer"}
      </Button>
      {state.error && <span className="text-xs font-medium text-danger">{state.error}</span>}
      {state.ok && <span className="text-xs font-medium text-success">Durée mise à jour.</span>}
    </form>
  );
}
