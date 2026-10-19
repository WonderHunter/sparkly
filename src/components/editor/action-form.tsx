"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };
type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const FieldsContext = createContext<Record<string, string>>({});

interface ActionFormProps {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Boutons supplémentaires (ex. « Publier » avec name="intent"). */
  extraActions?: ReactNode;
  hideSubmit?: boolean;
}

/** Formulaire relié à une Server Action, avec message de retour et erreurs par champ. */
export function ActionForm({
  action,
  children,
  submitLabel = "Enregistrer",
  pendingLabel = "Enregistrement…",
  className,
  resetOnSuccess = false,
  extraActions,
  hideSubmit = false,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FieldsContext value={state.fields ?? {}}>
      <form ref={ref} action={formAction} className={cn("space-y-5", className)} noValidate>
        {children}
        {state.error && <FormMessage>{state.error}</FormMessage>}
        {state.ok && state.message && <FormMessage tone="success">{state.message}</FormMessage>}
        {(!hideSubmit || extraActions) && (
          <div className="flex flex-wrap items-center gap-3">
            {!hideSubmit && (
              <Button type="submit" disabled={pending}>
                {pending ? pendingLabel : submitLabel}
              </Button>
            )}
            {extraActions}
          </div>
        )}
      </form>
    </FieldsContext>
  );
}

/** Erreur d'un champ, lue depuis le dernier retour de l'action. */
export function useFieldError(name: string): string | undefined {
  return useContext(FieldsContext)[name];
}

export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return (
    <p id={`${name}-error`} role="alert" className="text-[13px] font-medium text-danger">
      {error}
    </p>
  );
}
