import { Trash2 } from "lucide-react";
import { ActionForm, FieldError } from "@/components/editor/action-form";
import { EditorSection } from "@/components/editor/editor-section";
import { Field, Input, Textarea } from "@/components/ui/form";
import { getEditContext } from "@/lib/data/editor";
import { listFaqs } from "@/lib/data/projects";
import { addFaq, deleteFaq } from "../actions";

export default async function FaqTab({ params }: PageProps<"/p/[slug]/edit/faq">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);
  const faqs = await listFaqs(project.id);

  return (
    <EditorSection title="FAQ" description="Réponds aux questions qu'on vous pose souvent : durée d'une partie, contrôles, plateforme…">
      {faqs.length > 0 && (
        <ul className="mb-8 divide-y divide-border rounded-2xl border border-border">
          {faqs.map((faq) => (
            <li key={faq.id} className="flex gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{faq.question}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-muted">{faq.answer}</p>
              </div>
              <form action={deleteFaq.bind(null, project.slug, faq.id)}>
                <button type="submit" aria-label={`Supprimer la question « ${faq.question} »`} className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addFaq.bind(null, project.slug)} submitLabel="Ajouter la question" resetOnSuccess>
        <Field label="Question" htmlFor="question">
          <Input id="question" name="question" maxLength={200} required />
          <FieldError name="question" />
        </Field>
        <Field label="Réponse" htmlFor="answer">
          <Textarea id="answer" name="answer" maxLength={2000} required />
          <FieldError name="answer" />
        </Field>
      </ActionForm>
    </EditorSection>
  );
}
