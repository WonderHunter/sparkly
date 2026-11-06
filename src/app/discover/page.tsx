import type { Metadata } from "next";
import Link from "next/link";
import { ProjectGrid } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/misc";
import { getFundingSettings } from "@/lib/data/funding";
import { listCategories, listCharacters, listEmotions, listProjects, type SortKey, type StateFilter } from "@/lib/data/projects";
import { PLATFORM_LABEL, PLATFORM_OPTIONS } from "@/lib/types";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Découvrir les projets" };

const SORTS: Record<SortKey, string> = {
  recent: "Plus récents",
  active: "Mis à jour",
  progress: "Plus avancés",
  popular: "Plus suivis",
};
const STATES: Record<StateFilter, string> = { all: "État", in_progress: "En cours", finished: "Terminés" };

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const [categories, characters, emotions] = await Promise.all([listCategories(), listCharacters(), listEmotions()]);

  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = pick(params.category, categories.map((c) => c.slug));
  const character = pick(params.character, characters.map((c) => c.slug));
  const emotion = pick(params.emotion, emotions.map((e) => e.slug));
  const platform = pick(params.platform, PLATFORM_OPTIONS);
  const state = pick(params.state, Object.keys(STATES) as StateFilter[]) ?? "all";
  const sort = pick(params.sort, Object.keys(SORTS) as SortKey[]) ?? "recent";

  const [projects, { goal }] = await Promise.all([listProjects({ q, category, character, emotion, platform, state, sort }), getFundingSettings()]);
  const hasFilters = Boolean(q || category || character || emotion || platform || state !== "all");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Découvrir les projets</h1>
      <p className="mt-2 text-muted">
        {pluralize(projects.length, "projet")} {hasFilters ? "correspondant à ta recherche" : "publiés par la promo"}.
      </p>

      <form className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 lg:grid-cols-5" role="search">
        <label className="sr-only" htmlFor="q">
          Recherche
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Nom du jeu, mot-clé…" className="col-span-2 lg:col-span-3" />
        <label className="sr-only" htmlFor="category">
          Type de jeu
        </label>
        <Select
          id="category"
          name="category"
          defaultValue={category ?? ""}
          options={[{ value: "", label: "Type de jeu" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
        />
        <label className="sr-only" htmlFor="character">
          Personnage
        </label>
        <Select
          id="character"
          name="character"
          defaultValue={character ?? ""}
          options={[{ value: "", label: "Personnage" }, ...characters.map((c) => ({ value: c.slug, label: c.name }))]}
        />
        <label className="sr-only" htmlFor="emotion">
          Émotion
        </label>
        <Select
          id="emotion"
          name="emotion"
          defaultValue={emotion ?? ""}
          options={[{ value: "", label: "Émotion" }, ...emotions.map((e) => ({ value: e.slug, label: e.name }))]}
        />
        <label className="sr-only" htmlFor="platform">
          Plateforme
        </label>
        <Select
          id="platform"
          name="platform"
          defaultValue={platform ?? ""}
          options={[
            { value: "", label: "Plateforme" },
            ...PLATFORM_OPTIONS.map((value) => ({ value, label: PLATFORM_LABEL[value] })),
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
        <Button type="submit" variant="secondary" className="col-span-2 h-11 lg:col-span-1">
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
