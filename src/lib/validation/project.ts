import { z } from "zod";
import { slugify } from "@/lib/domain/slug";
import { parseVideoUrl } from "@/lib/domain/video";

const PLATFORMS = ["borne", "cocktail", "tv", "web"] as const;

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Indique une adresse complète (https://…).")
  .nullable();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

/** Adresse du projet : « Orbit Smash ! » devient « orbit-smash ». */
export const slugSchema = z
  .string()
  .trim()
  .transform((v) => slugify(v))
  .refine((v) => v.length >= 3, "L'adresse doit faire au moins 3 caractères (lettres, chiffres, tirets).")
  .refine((v) => /^[a-z0-9][a-z0-9-]{2,59}$/.test(v), "Utilise uniquement des lettres, chiffres et tirets.");

export const createProjectSchema = z.object({
  title: z.string().trim().min(2, "Le nom du jeu doit faire au moins 2 caractères.").max(80, "80 caractères maximum."),
  platform: z.enum(PLATFORMS, { error: "Choisis une plateforme." }),
});

export const basicsSchema = z
  .object({
    title: z.string().trim().min(2, "Le nom du jeu doit faire au moins 2 caractères.").max(80, "80 caractères maximum."),
    slug: slugSchema,
    pitch: z.string().trim().max(200, "200 caractères maximum."),
    platform: z.enum(PLATFORMS, { error: "Choisis une plateforme." }),
    categoryId: z
      .string()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Catégorie invalide."),
    startsOn: isoDate,
    endsOn: isoDate,
    videoUrl: optionalUrl.refine((v) => v === null || parseVideoUrl(v) !== null, "Seules les vidéos YouTube ou Vimeo sont acceptées."),
    gameUrl: optionalUrl,
    repoUrl: optionalUrl,
    siteUrl: optionalUrl,
    coverUrl: optionalUrl,
    logoUrl: optionalUrl,
  })
  .refine((v) => v.endsOn > v.startsOn, { path: ["endsOn"], message: "La fin doit être après le début." });

export const storySchema = z.object({
  story: z.string().max(100_000, "Texte trop long."),
});

export const milestoneSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Donne un titre au jalon.").max(120),
  description: z.string().trim().max(500),
  periodLabel: z.string().trim().max(40),
  weight: z.coerce.number().int("Poids entier.").min(0, "Poids entre 0 et 100.").max(100, "Poids entre 0 et 100."),
  status: z.enum(["todo", "in_progress", "done"]),
});

export const faqSchema = z.object({
  question: z.string().trim().min(1, "La question est vide.").max(200),
  answer: z.string().trim().min(1, "La réponse est vide.").max(2000),
});

export const postSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre à ta mise à jour.").max(140, "140 caractères maximum."),
  body: z.string().max(50_000, "Texte trop long."),
  milestoneId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
  images: z.array(z.url()).max(8, "8 images maximum."),
  publish: z.boolean(),
});

export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(["dev", "crea"]),
  teamTitle: z.string().trim().max(60),
});

export const memberSchema = z.object({
  teamTitle: z.string().trim().max(60, "60 caractères maximum."),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Indique ton nom.").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,30}$/, "Lettres minuscules, chiffres et tirets (2 à 31 caractères)."),
  bio: z.string().trim().max(500, "500 caractères maximum."),
  promo: z.string().trim().max(40),
  avatarUrl: optionalUrl,
});

/** Renvoie les messages d'erreur par champ, pour les formulaires. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
