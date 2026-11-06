import Link from "next/link";
import { ArrowRight, Flag, MessageSquareHeart, Rocket } from "lucide-react";
import { ProjectGrid } from "@/components/project/project-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SparkMark } from "@/components/ui/misc";
import { getFundingSettings } from "@/lib/data/funding";
import { listCategories, listProjects } from "@/lib/data/projects";

export default async function HomePage() {
  const [recent, advanced, categories, { goal }] = await Promise.all([
    listProjects({ sort: "active", limit: 6 }),
    listProjects({ sort: "progress", limit: 3 }),
    listCategories(),
    getFundingSettings(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-spark/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-ember/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="inline-flex items-center gap-2 rounded-full bg-spark-soft px-3 py-1 text-sm font-semibold text-spark-strong">
            <SparkMark className="h-4 w-4" /> SAÉ jeux d&apos;arcade · BUT MMI
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Every idea starts with a <span className="text-spark">spark.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Suis la fabrication des jeux d&apos;arcade de la promo, du premier moodboard jusqu&apos;à la borne. Pas
            d&apos;argent ici : seule l&apos;avancée compte.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/discover" size="lg">
              Découvrir les projets <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/dashboard" size="lg" variant="outline">
              Lancer le projet de mon groupe
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title="Ça bouge en ce moment" href="/discover?sort=active" />
        {recent.length > 0 ? (
          <ProjectGrid projects={recent} goal={goal} />
        ) : (
          <EmptyState title="Aucun projet publié pour l'instant" action={<ButtonLink href="/dashboard">Créer le premier</ButtonLink>}>
            Les projets apparaîtront ici dès que les groupes les auront publiés.
          </EmptyState>
        )}
      </section>

      {advanced.length > 0 && (
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <SectionHeading title="Les plus avancés" href="/discover?sort=progress" />
            <ProjectGrid projects={advanced} goal={goal} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-extrabold">Comment ça marche</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Step icon={<Rocket className="h-5 w-5" />} title="1. Crée le projet du groupe">
            Un projet par groupe : nom du jeu, accroche, vidéo, équipe. Invite tes coéquipier·es avec leur adresse
            universitaire.
          </Step>
          <Step icon={<Flag className="h-5 w-5" />} title="2. Coche tes jalons">
            Le planning de la SAÉ est prérempli. Chaque jalon terminé fait monter la jauge d&apos;avancée, à comparer
            au temps écoulé.
          </Step>
          <Step icon={<MessageSquareHeart className="h-5 w-5" />} title="3. Raconte et récolte des retours">
            Publie des mises à jour (devlogs) et reçois les commentaires de la promo et des profs.
          </Step>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-extrabold">Explorer par type de jeu</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/discover?category=${c.slug}`}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-spark hover:text-spark-strong"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeading({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl font-extrabold">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-spark-strong hover:underline">
        Tout voir <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-spark-soft text-spark-strong">{icon}</span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
