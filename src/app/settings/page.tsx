import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { ImageField } from "@/components/editor/image-upload";
import { Field, Input, Textarea } from "@/components/ui/form";
import { requireViewer } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const { profile } = viewer;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-extrabold tracking-tight">Réglages</h1>
      <EditorSection
        title="Profil public"
        description="Ton nom et ta photo apparaissent dans l'équipe de ton projet et à côté de tes commentaires."
      >
        <ActionForm action={updateProfile}>
          <ImageField name="avatarUrl" label="Photo" defaultValue={profile.avatar_url} bucket="avatars" folder={viewer.id} aspect="square" maxSize={400} />
          <FieldError name="avatarUrl" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prénom et nom" htmlFor="displayName">
              <Input id="displayName" name="displayName" defaultValue={profile.display_name} maxLength={80} required />
              <FieldError name="displayName" />
            </Field>
            <Field label="Pseudo" htmlFor="username" hint={`Adresse de ton profil : /u/${profile.username}`}>
              <Input id="username" name="username" defaultValue={profile.username} maxLength={31} required />
              <FieldError name="username" />
            </Field>
          </div>
          <Field label="Promo" htmlFor="promo" hint="Ex. MMI3 2026-2027">
            <Input id="promo" name="promo" defaultValue={profile.promo ?? ""} maxLength={40} />
          </Field>
          <Field label="Bio" htmlFor="bio" hint="Quelques mots sur toi (500 caractères max).">
            <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
            <FieldError name="bio" />
          </Field>
        </ActionForm>
      </EditorSection>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-6 text-sm sm:p-8">
        <h2 className="font-display text-xl font-extrabold">Compte</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">Adresse e-mail</dt>
          <dd className="font-medium">{viewer.email}</dd>
          <dt className="text-muted">Rôle</dt>
          <dd className="font-medium">{ROLE_LABEL[profile.role]}</dd>
        </dl>
        <p className="mt-6 text-muted">
          Pour supprimer ton compte, demande-le à ton enseignant·e depuis{" "}
          <Link href="/dashboard" className="font-semibold text-spark-strong hover:underline">
            ton espace
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
