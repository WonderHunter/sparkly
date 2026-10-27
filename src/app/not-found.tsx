import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ErrorScreen } from "@/components/layout/error-screen";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      kicker="Game over"
      title="Cette page n'existe pas (ou plus)"
      actions={
        <>
          <ButtonLink href="/" size="lg">
            Retour à l&apos;accueil
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="outline">
            Découvrir les projets <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </>
      }
    >
      Le lien est peut-être cassé, ou le projet a été renommé.
    </ErrorScreen>
  );
}
