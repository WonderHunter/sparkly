import { Check, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input, Select } from "@/components/ui/form";
import { Badge, ProgressBar } from "@/components/ui/misc";
import { getEditContext } from "@/lib/data/editor";
import { MILESTONE_STATUS_LABEL, type MilestoneStatus } from "@/lib/domain/progress";
import { createClient } from "@/lib/supabase/server";
import type { Milestone } from "@/lib/types";
import { deleteMilestone, saveMilestone, setMilestoneStatus } from "../actions";

const TONE = { done: "success", in_progress: "spark", todo: "neutral" } as const;

export default async function PlanningTab({ params }: PageProps<"/p/[slug]/edit/planning">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("milestones").select("*").eq("project_id", project.id).order("position");
  const milestones = data ?? [];
  const totalWeight = milestones.reduce((s, m) => s + m.weight, 0);

  return (
    <div className="space-y-6">
      <EditorSection
        title="Planning"
        description="Coche les jalons au fil du projet : ils font monter la jauge d'avancée. Un jalon « en cours » compte pour moitié."
      >
        <div className="mb-8 max-w-md">
          <ProgressBar value={project.progress} label="Avancée du projet" />
          <p className="mt-2 text-sm">
            <strong className="text-spark-strong">{project.progress} %</strong> d&apos;avancée · somme des poids : {totalWeight}
            {totalWeight !== 100 && (
              <span className="text-warning"> (l&apos;avancée est calculée en proportion, viser 100 reste plus lisible)</span>
            )}
          </p>
        </div>

        <ul className="space-y-3">
          {milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} slug={project.slug} />
          ))}
        </ul>
      </EditorSection>

      <EditorSection title="Ajouter un jalon">
        <ActionForm action={saveMilestone.bind(null, project.slug)} submitLabel="Ajouter le jalon" resetOnSuccess>
          <input type="hidden" name="position" value={milestones.length + 1} />
          <input type="hidden" name="status" value="todo" />
          <MilestoneFields />
        </ActionForm>
      </EditorSection>
    </div>
  );
}

function MilestoneRow({ milestone: m, slug }: { milestone: Milestone; slug: string }) {
  const next: Record<MilestoneStatus, { status: MilestoneStatus; label: string; icon: React.ReactNode }> = {
    todo: { status: "in_progress", label: "Démarrer", icon: <LoaderCircle className="h-3.5 w-3.5" /> },
    in_progress: { status: "done", label: "Terminer", icon: <Check className="h-3.5 w-3.5" /> },
    done: { status: "todo", label: "Rouvrir", icon: <RotateCcw className="h-3.5 w-3.5" /> },
  };
  const step = next[m.status];

  return (
    <li className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{m.title}</span>
            <Badge tone={TONE[m.status]}>{MILESTONE_STATUS_LABEL[m.status]}</Badge>
            <span className="text-xs text-muted">{m.weight} %</span>
          </div>
          <p className="text-sm text-muted">{[m.period_label, m.description].filter(Boolean).join(" · ")}</p>
        </div>
        <form action={setMilestoneStatus.bind(null, slug, m.id, step.status)}>
          <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:border-foreground/40">
            {step.icon} {step.label}
          </button>
        </form>
        <form action={deleteMilestone.bind(null, slug, m.id)}>
          <button type="submit" aria-label={`Supprimer le jalon ${m.title}`} className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">Modifier</summary>
        <div className="mt-4">
          <ActionForm action={saveMilestone.bind(null, slug)}>
            <input type="hidden" name="id" value={m.id} />
            <MilestoneFields milestone={m} withStatus />
          </ActionForm>
        </div>
      </details>
    </li>
  );
}

function MilestoneFields({ milestone, withStatus = false }: { milestone?: Milestone; withStatus?: boolean }) {
  const p = milestone?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Titre" htmlFor={`title-${p}`}>
        <Input id={`title-${p}`} name="title" defaultValue={milestone?.title} maxLength={120} required />
        <FieldError name="title" />
      </Field>
      <Field label="Période" htmlFor={`period-${p}`} hint="Ex. « Novembre - décembre »">
        <Input id={`period-${p}`} name="periodLabel" defaultValue={milestone?.period_label} maxLength={40} />
      </Field>
      <Field label="Détail" htmlFor={`desc-${p}`} className="sm:col-span-2">
        <Input id={`desc-${p}`} name="description" defaultValue={milestone?.description} maxLength={500} />
      </Field>
      <Field label="Poids dans l'avancée (%)" htmlFor={`weight-${p}`}>
        <Input id={`weight-${p}`} name="weight" type="number" min={0} max={100} defaultValue={milestone?.weight ?? 10} required />
        <FieldError name="weight" />
      </Field>
      {withStatus && (
        <Field label="Statut" htmlFor={`status-${p}`}>
          <Select id={`status-${p}`} name="status" defaultValue={milestone?.status}>
            {Object.entries(MILESTONE_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
