import type { Metadata } from "next";
import { ErrorScreen } from "@/components/layout/error-screen";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accès réservé" };

export default function Forbidden() {
  return (
    <ErrorScreen
      code="403"
      kicker="Accès réservé"
      title="Cette zone est réservée"
      actions={
        <>
          <ButtonLink href="/" size="lg">
            Retour à l&apos;accueil
          </ButtonLink>
          <ButtonLink href="/dashboard" size="lg" variant="outline">
            Mes projets
          </ButtonLink>
        </>
      }
    >
      Elle est réservée à l&apos;équipe pédagogique.
    </ErrorScreen>
  );
}
