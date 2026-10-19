import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { EditorNav } from "@/components/editor/editor-nav";
import { Badge } from "@/components/ui/misc";
import { getEditContext } from "@/lib/data/editor";
import { STATUS_LABEL } from "@/lib/types";

export async function generateMetadata({ params }: LayoutProps<"/p/[slug]/edit">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);
  return { title: `Modifier ${project.title}`, robots: { index: false } };
}

export default async function EditLayout({ params, children }: LayoutProps<"/p/[slug]/edit">) {
  const { slug } = await params;
  const { project } = await getEditContext(slug);
  const base = `/p/${project.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Mon projet
          </Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{project.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Badge tone={project.status === "published" ? "success" : project.status === "hidden" ? "danger" : "warning"}>
              {STATUS_LABEL[project.status]}
            </Badge>
            <span className="text-muted">Avancée : {project.progress} %</span>
          </div>
        </div>
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm font-semibold text-spark-strong hover:underline">
          Voir la page publique <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <EditorNav base={`${base}/edit`} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
