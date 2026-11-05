"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { submitKeepingValues } from "@/lib/keep-form-values";
import { requestOtp, verifyOtp, type LoginState } from "../actions";

const INITIAL: LoginState = { step: "email" };

export function LoginForm({ next }: { next: string }) {
  const [emailState, sendCode, sending] = useActionState(requestOtp, INITIAL);
  const [codeState, checkCode, checking] = useActionState(verifyOtp, INITIAL);

  // On passe à l'étape « code » dès qu'un code a été envoyé.
  const codeStep = emailState.step === "code" ? emailState : null;

  if (!codeStep) {
    return (
      <form action={sendCode} onSubmit={submitKeepingValues(sendCode)} className="mt-6 space-y-4" noValidate>
        <Field
          label="Adresse e-mail universitaire"
          htmlFor="email"
          hint="@etudiant.univ-reims.fr ou @univ-reims.fr"
          error={emailState.error}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="prenom.nom@etudiant.univ-reims.fr"
            defaultValue={emailState.step === "email" ? emailState.email : ""}
            aria-invalid={Boolean(emailState.error)}
            aria-describedby={emailState.error ? "email-error" : undefined}
            required
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={sending}>
          {sending ? "Envoi du code…" : "Recevoir mon code"}
        </Button>
      </form>
    );
  }

  const error = codeState.step === "code" ? codeState.error : undefined;
  return (
    <div className="mt-6 space-y-4">
      <FormMessage tone="success">{codeStep.info}</FormMessage>
      <form action={checkCode} onSubmit={submitKeepingValues(checkCode)} className="space-y-4" noValidate>
        <input type="hidden" name="email" value={codeStep.email} />
        <input type="hidden" name="next" value={next} />
        <Field label="Code reçu par e-mail" htmlFor="code" error={error}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,10}"
            maxLength={12}
            placeholder="123456"
            className="text-center font-mono text-2xl tracking-[0.5em]"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "code-error" : undefined}
            required
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={checking}>
          {checking ? "Vérification…" : "Se connecter"}
        </Button>
      </form>
      <form action={sendCode}>
        <input type="hidden" name="email" value={codeStep.email} />
        <button type="submit" className="w-full text-center text-sm text-muted underline-offset-4 hover:underline" disabled={sending}>
          Renvoyer un code
        </button>
      </form>
    </div>
  );
}
