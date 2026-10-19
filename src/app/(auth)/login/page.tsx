import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SparkMark } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { safeNextPath } from "@/lib/validation/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  if (await getViewer()) redirect(nextPath);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <section className="hidden lg:block">
        <SparkMark className="h-14 w-14 text-spark" />
        <h1 className="mt-6 font-display text-5xl leading-[1.05] font-extrabold tracking-tight">
          Every idea
          <br />
          starts with a <span className="text-spark">spark.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Publie l&apos;avancée du jeu de ton groupe, raconte chaque étape dans un devlog et récolte les retours de
          la promo et des profs.
        </p>
      </section>

      <section className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="font-display text-2xl font-bold">Connexion</h2>
        <p className="mt-1 text-sm text-muted">
          Pas de mot de passe : on t&apos;envoie un code par e-mail. Le compte est créé à la première connexion.
        </p>
        <LoginForm next={nextPath} />
      </section>
    </div>
  );
}
