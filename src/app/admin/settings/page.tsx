import { X } from "lucide-react";
import { ActionForm } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/types";
import { addCategory, addDomain, removeCategory, removeDomain, updateSettings } from "../actions";

export default async function AdminSettings() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: settings }, { data: domains }, { data: categories }] = await Promise.all([
    supabase.from("app_settings").select("*").single(),
    supabase.from("allowed_email_domains").select("*").order("domain"),
    supabase.from("categories").select("*").order("position"),
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
            <Textarea id="adminEmails" name="adminEmails" defaultValue={settings?.admin_emails.join("\n")} className="min-h-20 font-mono text-sm" />
          </Field>
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

      <EditorSection title="Genres de jeu">
        <ul className="mb-6 flex flex-wrap gap-2">
          {(categories ?? []).map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border py-1 pr-1 pl-3 text-sm">
              {c.name}
              <form action={removeCategory.bind(null, c.id)}>
                <button type="submit" aria-label={`Retirer le genre ${c.name}`} className="rounded-full p-1 text-muted hover:bg-danger-soft hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addCategory} submitLabel="Ajouter le genre" resetOnSuccess>
          <Field label="Nom du genre" htmlFor="name">
            <Input id="name" name="name" maxLength={40} placeholder="Ex. Coin pusher" />
          </Field>
        </ActionForm>
      </EditorSection>
    </div>
  );
}
