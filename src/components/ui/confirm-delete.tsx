"use client";

import { useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDeleteProps = {
  /** Action serveur exécutée après confirmation. */
  action: (formData: FormData) => void | Promise<void>;
  /** Titre du modal, ex. « Supprimer « Orbit Smash » ? ». */
  title: string;
  /** Ce qui sera perdu, affiché sous le titre. */
  description?: ReactNode;
  confirmLabel?: string;
  /** Contenu du bouton déclencheur (icône, texte…). */
  children: ReactNode;
  triggerClassName?: string;
  /** Nom accessible du déclencheur quand il n'affiche qu'une icône. */
  triggerLabel?: string;
};

/** Bouton de suppression qui ouvre un modal de confirmation avant d'appeler l'action. */
export function ConfirmDelete({
  action,
  title,
  description,
  confirmLabel = "Supprimer",
  children,
  triggerClassName,
  triggerLabel,
}: ConfirmDeleteProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" aria-label={triggerLabel} className={triggerClassName} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        // Un clic sur le fond (hors de la carte) ferme le modal.
        onClick={(event) => event.target === event.currentTarget && close()}
        className={cn(
          "m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl",
          "backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm",
          "motion-safe:transition-[opacity,scale,overlay,display] motion-safe:transition-discrete motion-safe:duration-200",
          "scale-95 opacity-0 open:scale-100 open:opacity-100 starting:open:scale-95 starting:open:opacity-0",
        )}
      >
        <div className="relative overflow-hidden p-6 sm:p-7">
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-danger/10 blur-3xl" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <TriangleAlert className="h-6 w-6" aria-hidden />
          </span>
          <h2 id={titleId} className="relative mt-5 font-display text-xl leading-tight font-extrabold text-balance">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="relative mt-2 text-sm text-muted">
              {description}
            </div>
          )}
          <p className="relative mt-4 text-sm font-semibold text-danger">Cette action est définitive.</p>
          <div className="relative mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            {/* Premier bouton focalisable : « Annuler » reçoit le focus à l'ouverture. */}
            <Button variant="outline" onClick={close} autoFocus>
              Annuler
            </Button>
            <form action={action}>
              <SubmitButton label={confirmLabel} />
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending} className="w-full sm:w-auto">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      {label}
    </Button>
  );
}
