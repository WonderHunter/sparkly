import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { getProjectPage, listFaqs } from "@/lib/data/projects";

export default async function FaqPage({ params }: PageProps<"/p/[slug]/faq">) {
  const { slug } = await params;
  const page = await getProjectPage(slug);
  if (!page) notFound();
  const faqs = await listFaqs(page.project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-8 font-display text-3xl font-extrabold">Questions fréquentes</h2>
      {faqs.length ? (
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {faqs.map((faq) => (
            <details key={faq.id} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 whitespace-pre-line text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState title="Pas encore de FAQ">Pose ta question dans les commentaires !</EmptyState>
      )}
    </div>
  );
}
