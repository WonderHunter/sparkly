import type { UserRole } from "@/lib/types";

/** Permissions qu'une personne peut accorder à un agent IA. */
export const AGENT_SCOPES = {
  lecture: {
    label: "Lire",
    description: "Projets, actualités, commentaires, planning et tes notifications.",
    available: true,
  },
  projet: { label: "Modifier tes projets", description: "Bases, description, liens, FAQ et planning.", available: true },
  devlog: { label: "Écrire des actualités", description: "Créer, modifier et publier des mises à jour.", available: true },
  commentaires: { label: "Commenter", description: "Commenter, répondre et signaler.", available: true },
  contraintes: { label: "Fixer les contraintes", description: "Plateforme, type de jeu, personnage et émotion.", available: false },
  financement: { label: "Financer", description: "Financer des projets, avec confirmation.", available: false },
  moderation: { label: "Modérer", description: "Masquer ou rétablir des contenus, avec confirmation.", available: false },
} as const;

export type AgentScope = keyof typeof AGENT_SCOPES;

/** Miroir de public.agent_allowed_scopes() : ce que chaque rôle peut accorder. */
const BY_ROLE: Record<UserRole, AgentScope[]> = {
  student: ["lecture", "projet", "devlog", "commentaires"],
  teacher: ["lecture", "commentaires", "contraintes", "financement", "moderation"],
  admin: ["lecture", "commentaires", "contraintes", "moderation"],
};

/** Permissions proposées à la personne : autorisées pour son rôle, disponibles et non désactivées par l'admin. */
export function grantableScopes(role: UserRole, disabled: readonly string[] = []): AgentScope[] {
  return BY_ROLE[role].filter((s) => AGENT_SCOPES[s].available && !disabled.includes(s));
}

/** Permissions que l'admin peut désactiver (la lecture reste toujours possible). */
export const DISABLEABLE_SCOPES = ["projet", "devlog", "commentaires", "contraintes", "financement", "moderation"] as const satisfies readonly AgentScope[];

export function isAgentScope(value: string): value is AgentScope {
  return Object.hasOwn(AGENT_SCOPES, value);
}

/** Lit un paramètre `scope` OAuth (séparé par des espaces) : ne garde que les permissions accordables. */
export function parseScopeParam(param: string | null | undefined, role: UserRole, disabled: readonly string[] = []): AgentScope[] {
  const grantable = grantableScopes(role, disabled);
  if (!param?.trim()) return grantable;
  const requested = param.split(/\s+/).filter(isAgentScope);
  const kept = grantable.filter((s) => requested.includes(s));
  return kept.length > 0 ? kept : grantable;
}
