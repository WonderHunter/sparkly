import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type Project = Tables<"projects">;
export type ProjectCard = Tables<"project_cards">;
export type Milestone = Tables<"milestones">;
export type Post = Tables<"posts">;
export type Faq = Tables<"faqs">;
export type Comment = Tables<"comments">;
export type Category = Tables<"categories">;
export type Invitation = Tables<"project_invitations">;
export type UserRole = Enums<"user_role">;
export type Platform = Enums<"platform">;
export type ProjectStatus = Enums<"project_status">;
export type MemberRole = Enums<"member_role">;

export type PublicProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "role">;

export interface Member {
  user_id: string;
  role: MemberRole;
  team_title: string;
  position: number;
  profile: PublicProfile;
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  borne: "Borne d'arcade",
  cocktail: "Table cocktail",
  tv: "Télé du hall",
  web: "Web",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Étudiant·e",
  teacher: "Enseignant·e",
  admin: "Admin",
};

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Chef·fe de projet",
  dev: "Dev",
  crea: "Créa / Com",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  hidden: "Masqué",
};
