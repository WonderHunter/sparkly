import type { Metadata } from "next";
import Link from "next/link";
import { ProjectGrid } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/misc";
import { getFundingSettings } from "@/lib/data/funding";
import { listCategories, listProjects, type SortKey, type StateFilter } from "@/lib/data/projects";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Découvrir les projets" };

const SORTS: Record<SortKey, string> = {
  recent: "Les plus récents",
  active: "Mis à jour récemment",
  progress: "Les plus avancés",
  popular: "Les plus suivis",
};
const STATES: Record<StateFilter, string> = { all: "Tous", in_progress: "En cours", finished: "Terminés" };

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const categories = await listCategories();

  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = pick(params.category, categories.map((c) => c.slug));
  const platform = pick(params.platform, Object.keys(PLATFORM_LABEL) as Platform[]);
  const state = pick(params.state, Object.keys(STATES) as StateFilter[]) ?? "all";
  const sort = pick(params.sort, Object.keys(SORTS) as SortKey[]) ?? "recent";

  const [projects, { goal }] = await Promise.all([listProjects({ q, category, platform, state, sort }), getFundingSettings()]);
  const hasFilters = Boolean(q || category || platform || state !== "all");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Découvrir les projets</h1>
      <p className="mt-2 text-muted">
        {pluralize(projects.length, "projet")} {hasFilters ? "correspondant à ta recherche" : "publiés par la promo"}.
      </p>

      <form className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" role="search">
        <label className="sr-only" htmlFor="q">
          Recherche
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Nom du jeu, mot-clé…" />
        <label className="sr-only" htmlFor="category">
          Genre
        </label>
        <Select
          id="category"
          name="category"
          defaultValue={category ?? ""}
          options={[{ value: "", label: "Tous les genres" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
        />
        <label className="sr-only" htmlFor="platform">
          Plateforme
        </label>
        <Select
          id="platform"
          name="platform"
          defaultValue={platform ?? ""}
          options={[
            { value: "", label: "Toutes les plateformes" },
            ...Object.entries(PLATFORM_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <label className="sr-only" htmlFor="state">
          État
        </label>
        <Select
          id="state"
          name="state"
          defaultValue={state}
          options={Object.entries(STATES).map(([value, label]) => ({ value, label }))}
        />
        <label className="sr-only" htmlFor="sort">
          Tri
        </label>
        <Select
          id="sort"
          name="sort"
          defaultValue={sort}
          options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
        />
        <Button type="submit" variant="secondary" className="h-11">
          Filtrer
        </Button>
      </form>

      <div className="mt-10">
        {projects.length > 0 ? (
          <ProjectGrid projects={projects} goal={goal} />
        ) : (
          <EmptyState
            title="Aucun projet ne correspond"
            action={
              hasFilters ? (
                <Link href="/discover" className="font-semibold text-spark-strong hover:underline">
                  Réinitialiser les filtres
                </Link>
              ) : undefined
            }
          >
            Essaie d&apos;autres mots-clés ou retire un filtre.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
