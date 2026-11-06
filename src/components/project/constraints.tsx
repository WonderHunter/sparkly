"use client";

import { useActionState } from "react";
import { Drama, Gamepad2, PersonStanding } from "lucide-react";
import { setProjectConstraints, type ActionState } from "@/app/p/[slug]/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { submitKeepingValues } from "@/lib/keep-form-values";
import { cn } from "@/lib/utils";

type Named = { name: string } | null | undefined;
type Option = { id: number; name: string };

/** Les trois contraintes de la SAÉ, en pastilles (type de jeu, personnage, émotion). */
export function ConstraintBadges({
  category,
  character,
  emotion,
  showMissing = false,
  className,
}: {
  category: Named;
  character: Named;
  emotion: Named;
  /** Affiche « à définir » pour les contraintes absentes (éditeur, admin). */
  showMissing?: boolean;
  className?: string;
}) {
  const items = [
    { key: "type", icon: Gamepad2, label: "Type de jeu", value: category?.name },
    { key: "character", icon: PersonStanding, label: "Personnage", value: character?.name },
    { key: "emotion", icon: Drama, label: "Émotion", value: emotion?.name },
  ].filter((i) => showMissing || i.value);
  if (items.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Contraintes de la SAÉ">
      {items.map(({ key, icon: Icon, label, value }) => (
        <li
          key={key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
            value ? "border-border bg-surface" : "border-dashed border-border text-muted",
          )}
        >
          <Icon className="h-3.5 w-3.5 text-spark-strong" aria-hidden />
          <span className="text-muted">{label} :</span>
          <span className={value ? "font-semibold" : "italic"}>{value ?? "à définir"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Carte réservée à l'équipe pédagogique : fixe les trois contraintes d'un projet. */
export function ConstraintsForm({
  slug,
  projectId,
  current,
  categories,
  characters,
  emotions,
}: {
  slug: string;
  projectId: string;
  current: { category: number | null; character: number | null; emotion: number | null };
  categories: Option[];
  characters: Option[];
  emotions: Option[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setProjectConstraints.bind(null, slug, projectId), {});
  const toOptions = (list: Option[]) => [{ value: "", label: "À définir" }, ...list.map((o) => ({ value: String(o.id), label: o.name }))];

  return (
    <form
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="space-y-3 rounded-2xl border border-spark/25 bg-spark-soft/40 p-4"
      aria-labelledby="constraints-title"
    >
      <div>
        <p id="constraints-title" className="text-sm font-semibold">
          Contraintes de la SAÉ
        </p>
        <p className="text-xs text-muted">Fixées par l&apos;équipe pédagogique, visibles de tous.</p>
      </div>
      {(
        [
          ["constraint-category", "categoryId", "Type de jeu", categories, current.category],
          ["constraint-character", "characterId", "Personnage imposé", characters, current.character],
          ["constraint-emotion", "emotionId", "Émotion à faire ressentir", emotions, current.emotion],
        ] as const
      ).map(([id, name, label, list, value]) => (
        <div key={id}>
          <label htmlFor={id} className="mb-1 block text-xs font-semibold">
            {label}
          </label>
          <Select id={id} name={name} defaultValue={value === null ? "" : String(value)} options={toOptions([...list])} />
        </div>
      ))}
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && state.message && <FormMessage tone="success">{state.message}</FormMessage>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer les contraintes"}
      </Button>
    </form>
  );
}
