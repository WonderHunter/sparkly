import { X } from "lucide-react";
import { ActionForm } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { addDomain, addListItem, removeDomain, removeListItem, updateFundingSettings, updateSettings, type ConstraintList } from "../actions";

export default async function AdminSettings() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: settings }, { data: adminEmails }, { data: domains }, { data: categories }, { data: characters }, { data: emotions }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("school_year, default_starts_on, default_ends_on, teacher_annual_budget, funding_goal, max_projects_per_student, funding_comments_enabled")
      .single(),
    // admin_emails n'est lisible que via cette fonction réservée aux admins.
    supabase.rpc("admin_bootstrap_emails"),
    supabase.from("allowed_email_domains").select("*").order("domain"),
    supabase.from("categories").select("*").order("position"),
    supabase.from("characters").select("*").order("position"),
    supabase.from("emotions").select("*").order("position"),
  ]);

  return (
    <div className="space-y-6">
      <EditorSection title="Promo en cours" description="Dates par défaut des nouveaux projets (jauge « Timeline du projet »).">
        <ActionForm action={updateSettings}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Année scolaire" htmlFor="schoolYear">
              <Input id="schoolYear" name="schoolYear" defaultValue={settings?.school_year} />
            </Field>
            <Field label="Début" htmlFor="startsOn">
              <Input id="startsOn" name="startsOn" type="date" defaultValue={settings?.default_starts_on} />
            </Field>
            <Field label="Fin" htmlFor="endsOn">
              <Input id="endsOn" name="endsOn" type="date" defaultValue={settings?.default_ends_on} />
            </Field>
          </div>
          <Field
            label="Adresses admin automatiques"
            htmlFor="adminEmails"
            hint="Ces adresses deviennent admin à leur première connexion. Une par ligne."
          >
            <Textarea id="adminEmails" name="adminEmails" defaultValue={(adminEmails ?? []).join("\n")} className="min-h-20 font-mono text-sm" />
          </Field>
        </ActionForm>
      </EditorSection>

      <EditorSection
        title="Financement et participation"
        description="L'argent est fictif : chaque enseignant·e reçoit un budget annuel, remis à zéro chaque 1er septembre."
      >
        <ActionForm action={updateFundingSettings}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Budget par enseignant·e (€ / an)" htmlFor="budget">
              <Input id="budget" name="budget" type="number" min={0} step={1000} defaultValue={settings?.teacher_annual_budget} />
            </Field>
            <Field label="Objectif par projet (€)" htmlFor="goal" hint="Commun à tous les projets, dépassable.">
              <Input id="goal" name="goal" type="number" min={1} step={500} defaultValue={settings?.funding_goal} />
            </Field>
            <Field label="Projets max par étudiant·e / an" htmlFor="maxProjects" hint="Créés ou rejoints. Vide = illimité.">
              <Input id="maxProjects" name="maxProjects" type="number" min={1} max={20} defaultValue={settings?.max_projects_per_student ?? ""} placeholder="Illimité" />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
            <input
              type="checkbox"
              name="fundingComments"
              defaultChecked={settings?.funding_comments_enabled ?? true}
              className="mt-0.5 h-4 w-4 accent-spark"
            />
            <span>
              <span className="block font-semibold">Les enseignant·es peuvent joindre un mot à leur financement</span>
              <span className="text-muted">
                Il est publié dans les commentaires du projet avec un badge « A financé ». Désactivé, seuls les montants restent possibles.
              </span>
            </span>
          </label>
        </ActionForm>
      </EditorSection>

      <EditorSection title="Domaines autorisés" description="Seules ces adresses peuvent créer un compte (contrôle fait en base).">
        <ul className="mb-6 flex flex-wrap gap-2">
          {(domains ?? []).map((d) => (
            <li key={d.domain} className="inline-flex items-center gap-2 rounded-full border border-border py-1 pr-1 pl-3 text-sm">
              @{d.domain}
              <Badge>{ROLE_LABEL[d.default_role]}</Badge>
              <form action={removeDomain.bind(null, d.domain)}>
                <button type="submit" aria-label={`Retirer @${d.domain}`} className="rounded-full p-1 text-muted hover:bg-danger-soft hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addDomain} submitLabel="Autoriser le domaine" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Domaine" htmlFor="domain">
              <Input id="domain" name="domain" placeholder="etudiant.univ-reims.fr" />
            </Field>
            <Field label="Rôle par défaut" htmlFor="role">
              <Select
                id="role"
                name="role"
                defaultValue="student"
                options={[
                  { value: "student", label: "Étudiant·e" },
                  { value: "teacher", label: "Enseignant·e" },
                ]}
              />
            </Field>
          </div>
        </ActionForm>
      </EditorSection>

      <EditorSection
        title="Contraintes de la SAÉ"
        description="Les listes proposées aux enseignant·es pour fixer le type de jeu, le personnage et l'émotion de chaque groupe."
      >
        <div className="space-y-8">
          <ConstraintListEditor list="categories" title="Types de jeu" items={categories ?? []} placeholder="Ex. Coin pusher" />
          <ConstraintListEditor list="characters" title="Personnages imposés" items={characters ?? []} placeholder="Ex. Une plume" />
          <ConstraintListEditor list="emotions" title="Émotions à faire ressentir" items={emotions ?? []} placeholder="Ex. Nostalgie" />
        </div>
      </EditorSection>
    </div>
  );
}

const LIST_WORDING: Record<ConstraintList, { one: string; add: string }> = {
  categories: { one: "le type de jeu", add: "Ajouter le type de jeu" },
  characters: { one: "le personnage", add: "Ajouter le personnage" },
  emotions: { one: "l'émotion", add: "Ajouter l'émotion" },
};

function ConstraintListEditor({
  list,
  title,
  items,
  placeholder,
}: {
  list: ConstraintList;
  title: string;
  items: { id: number; name: string }[];
  placeholder: string;
}) {
  const wording = LIST_WORDING[list];
  return (
    <section aria-labelledby={`list-${list}`}>
      <h3 id={`list-${list}`} className="text-sm font-semibold">
        {title} <span className="font-normal text-muted">· {items.length}</span>
      </h3>
      <ul className="mt-3 mb-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id} className="inline-flex items-center gap-1 rounded-full border border-border py-1 pr-1 pl-3 text-sm">
            {item.name}
            <ConfirmDelete
              action={removeListItem.bind(null, list, item.id)}
              title={`Retirer « ${item.name} » ?`}
              description={`Les projets qui ont ${wording.one} « ${item.name} » repasseront à « à définir ».`}
              confirmLabel="Retirer"
              triggerLabel={`Retirer ${item.name}`}
              triggerClassName="rounded-full p-1 text-muted hover:bg-danger-soft hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </ConfirmDelete>
          </li>
        ))}
      </ul>
      <ActionForm action={addListItem.bind(null, list)} submitLabel={wording.add} resetOnSuccess className="flex flex-wrap items-end gap-3 space-y-0">
        <Field label="Nouveau nom" htmlFor={`new-${list}`} className="min-w-56 flex-1">
          <Input id={`new-${list}`} name="name" maxLength={60} placeholder={placeholder} />
        </Field>
      </ActionForm>
    </section>
  );
}
