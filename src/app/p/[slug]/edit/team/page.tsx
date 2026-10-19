import { Mail, UserMinus, X } from "lucide-react";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input, Select } from "@/components/ui/form";
import { Avatar, Badge } from "@/components/ui/misc";
import { getEditContext } from "@/lib/data/editor";
import { getProjectPage } from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ROLE_LABEL } from "@/lib/types";
import { cancelInvitation, inviteMember, removeMember, updateMember } from "../actions";

export default async function TeamTab({ params }: PageProps<"/p/[slug]/edit/team">) {
  const { slug } = await params;
  const { project, viewer, isOwner } = await getEditContext(slug);
  const page = await getProjectPage(project.slug);
  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("project_invitations")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <EditorSection title="Équipe" description="Chaque membre affiche sa photo, son nom et son rôle dans l'équipe sur la page du projet.">
        <ul className="divide-y divide-border">
          {page?.members.map((m) => (
            <li key={m.user_id} className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={m.profile.display_name} src={m.profile.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {m.profile.display_name} {m.user_id === viewer.id && <span className="text-muted">(toi)</span>}
                  </p>
                  <Badge tone={m.role === "owner" ? "spark" : "neutral"}>{MEMBER_ROLE_LABEL[m.role]}</Badge>
                </div>
                {m.role !== "owner" && (isOwner || m.user_id === viewer.id) && (
                  <form action={removeMember.bind(null, project.slug, m.user_id)}>
                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-danger-soft hover:text-danger">
                      <UserMinus className="h-4 w-4" /> {m.user_id === viewer.id ? "Quitter le projet" : "Retirer"}
                    </button>
                  </form>
                )}
              </div>
              <ActionForm action={updateMember.bind(null, project.slug, m.user_id)} className="mt-3 flex flex-wrap items-end gap-3 space-y-0" submitLabel="OK">
                <div className="min-w-56 flex-1">
                  <label htmlFor={`title-${m.user_id}`} className="sr-only">
                    Rôle dans l&apos;équipe de {m.profile.display_name}
                  </label>
                  <Input id={`title-${m.user_id}`} name="teamTitle" defaultValue={m.team_title} maxLength={60} placeholder="Rôle dans l'équipe (ex. Graphiste)" />
                </div>
              </ActionForm>
            </li>
          ))}
        </ul>
      </EditorSection>

      <EditorSection title="Inviter un membre" description="La personne voit l'invitation dans « Mon projet » en se connectant avec cette adresse.">
        <ActionForm action={inviteMember.bind(null, project.slug)} submitLabel="Inviter" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Adresse universitaire" htmlFor="email" className="sm:col-span-3">
              <Input id="email" name="email" type="email" required placeholder="prenom.nom@etudiant.univ-reims.fr" />
              <FieldError name="email" />
            </Field>
            <Field label="Profil" htmlFor="role">
              <Select id="role" name="role" defaultValue="dev">
                <option value="dev">Dev</option>
                <option value="crea">Créa / Com</option>
              </Select>
            </Field>
            <Field label="Rôle affiché" htmlFor="teamTitle" className="sm:col-span-2">
              <Input id="teamTitle" name="teamTitle" maxLength={60} placeholder="Ex. Sound designer" />
            </Field>
          </div>
        </ActionForm>

        {invitations && invitations.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-muted">Invitations en attente</h3>
            <ul className="space-y-2">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-2.5 text-sm">
                  <Mail className="h-4 w-4 text-muted" />
                  <span className="flex-1 truncate">{inv.email}</span>
                  <Badge>{inv.team_title || MEMBER_ROLE_LABEL[inv.role]}</Badge>
                  <form action={cancelInvitation.bind(null, project.slug, inv.id)}>
                    <button type="submit" aria-label={`Annuler l'invitation de ${inv.email}`} className="rounded-full p-1 text-muted hover:text-danger">
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </EditorSection>
    </div>
  );
}
