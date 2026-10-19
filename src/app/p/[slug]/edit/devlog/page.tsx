import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { EditorSection } from "@/components/editor/editor-section";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { getEditContext } from "@/lib/data/editor";
import { listPosts } from "@/lib/data/projects";
import { formatDate } from "@/lib/utils";
import { deletePost } from "../actions";

export default async function DevlogTab({ params, searchParams }: PageProps<"/p/[slug]/edit/devlog">) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const { project } = await getEditContext(slug);
  const posts = await listPosts(project.id, { includeDrafts: true });
  const base = `/p/${project.slug}/edit/devlog`;

  return (
    <EditorSection
      title="Actualités"
      description="Le devlog du groupe : chaque mise à jour publiée reçoit un numéro (« Mise à jour n°X »)."
      actions={
        <ButtonLink href={`${base}/new`}>
          <Plus className="h-4 w-4" /> Nouvelle mise à jour
        </ButtonLink>
      }
    >
      {saved && (
        <div className="mb-6">
          <FormMessage tone="success">{saved === "published" ? "Mise à jour publiée !" : "Brouillon enregistré."}</FormMessage>
        </div>
      )}
      {posts.length === 0 ? (
        <EmptyState title="Aucune mise à jour" action={<ButtonLink href={`${base}/new`}>Écrire la première</ButtonLink>}>
          Raconte où vous en êtes : moodboard, premier prototype, tests sur la borne…
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {post.status === "published" ? (
                    <Badge tone="success">Mise à jour n°{post.number}</Badge>
                  ) : (
                    <Badge tone="warning">Brouillon</Badge>
                  )}
                  <span className="font-semibold">{post.title}</span>
                </div>
                <p className="text-sm text-muted">
                  {post.published_at ? `Publiée le ${formatDate(post.published_at)}` : `Créée le ${formatDate(post.created_at)}`}
                  {post.author && ` · ${post.author.display_name}`}
                </p>
              </div>
              {post.status === "published" && (
                <Link href={`/p/${project.slug}/devlog/${post.number}`} className="text-sm font-semibold text-muted hover:text-foreground">
                  Voir
                </Link>
              )}
              <ButtonLink href={`${base}/${post.id}`} variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </ButtonLink>
              <form action={deletePost.bind(null, project.slug, post.id)}>
                <button type="submit" aria-label={`Supprimer « ${post.title} »`} className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </EditorSection>
  );
}
