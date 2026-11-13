import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mention discrète « via Claude » sur un contenu écrit par un agent IA au nom de la personne. */
export function ViaAgent({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-muted", className)}
      title={`Écrit avec l'application « ${name} », au nom de cette personne`}
    >
      <Bot className="h-3.5 w-3.5" aria-hidden />
      via {name}
    </span>
  );
}
