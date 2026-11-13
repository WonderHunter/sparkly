import "server-only";
import type postgres from "postgres";
import { z } from "zod";
import { isEmptyRichText, sanitizeRichText } from "@/lib/domain/sanitize";
import { getSiteUrl } from "@/lib/site-url";
import { asUser } from "./db";
import { markdownToHtml } from "./markdown";
import type { ToolDefinition } from "./mcp-tools";

/** Erreur attendue (droits, contenu invalide) : son message est renvoyé tel quel à l'agent. */
export class ToolError extends Error {}

type Sql = postgres.TransactionSql;

const slug = z.string().trim().min(1).max(80).describe("Adresse du projet, ex. « orbit-smash »");
const markdown = (max: number) => z.string().max(max).describe("Texte en Markdown simple : ## titres, **gras**, *italique*, listes, liens.");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ.");
const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Adresse complète attendue (https://…), ou vide pour effacer.")
  .optional();
const milestoneStatus = z.enum(["todo", "in_progress", "done"]).describe("todo = à faire, in_progress = en cours, done = terminé");

const richText = (text: string) => sanitizeRichText(markdownToHtml(text));

/** Projet que la personne peut modifier (membre du groupe), sinon erreur claire. */
async function editableProject(sql: Sql, projectSlug: string) {
  const [project] = await sql<{ id: string; slug: string; can_edit: boolean }[]>`
    select id, slug, public.can_edit_project(id) as can_edit from public.projects where slug = ${projectSlug}`;
  if (!project) throw new ToolError("Projet introuvable (ou non visible pour toi).");
  if (!project.can_edit) throw new ToolError("Tu ne fais pas partie de l'équipe de ce projet : modification impossible.");
  return project;
}

/** Adresse publique du site, si on peut la connaître : un lien manquant ne doit jamais annuler une écriture. */
async function siteUrl(): Promise<string | null> {
  try {
    return (await getSiteUrl()).replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Lien complet vers une page du site, ou le chemin seul si l'adresse publique est inconnue. */
async function pageUrl(path: string) {
  return `${(await siteUrl()) ?? ""}${path}`;
}

export const WRITE_TOOLS: ToolDefinition[] = [
  // ---------------------------------------------------------------------------
  // projet
  // ---------------------------------------------------------------------------
  {
    name: "modifier_bases",
    title: "Modifier les bases d'un projet",
    description: "Modifie le nom, l'accroche, les dates ou les liens d'un de tes projets. Seuls les champs fournis changent.",
    scope: "projet",
    write: true,
    inputSchema: z.object({
      slug,
      titre: z.string().trim().min(2).max(80).optional().describe("Nom du jeu"),
      accroche: z.string().trim().max(200).optional().describe("Accroche en une phrase"),
      debut: isoDate.optional(),
      fin: isoDate.optional(),
      lien_jeu: link.describe("Version jouable"),
      lien_depot: link.describe("Dépôt de code"),
      lien_site: link.describe("Site de gestion ou de promotion du jeu"),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          const changes: Record<string, string | null> = {};
          if (input.titre !== undefined) changes.title = input.titre as string;
          if (input.accroche !== undefined) changes.pitch = input.accroche as string;
          if (input.debut !== undefined) changes.starts_on = input.debut as string;
          if (input.fin !== undefined) changes.ends_on = input.fin as string;
          for (const [key, column] of [["lien_jeu", "game_url"], ["lien_depot", "repo_url"], ["lien_site", "site_url"]] as const) {
            if (input[key] !== undefined) changes[column] = (input[key] as string) || null;
          }
          if (Object.keys(changes).length === 0) throw new ToolError("Rien à modifier : indique au moins un champ.");
          const [dates] = await sql<{ starts_on: string; ends_on: string }[]>`
            select coalesce(${changes.starts_on ?? null}::date, starts_on)::text as starts_on,
                   coalesce(${changes.ends_on ?? null}::date, ends_on)::text as ends_on
            from public.projects where id = ${project.id}`;
          if (dates.ends_on <= dates.starts_on) throw new ToolError("La fin doit être après le début.");
          const [row] = await sql`
            update public.projects set ${sql(changes)} where id = ${project.id}
            returning title, pitch, starts_on as debut, ends_on as fin, game_url as lien_jeu, repo_url as lien_depot, site_url as lien_site`;
          return { ok: true, projet: row };
        },
        id.clientName,
      ),
  },
  {
    name: "modifier_description",
    title: "Modifier la description d'un projet",
    description: "Remplace la description complète (onglet « Le projet ») d'un de tes projets.",
    scope: "projet",
    write: true,
    inputSchema: z.object({ slug, texte: markdown(50_000) }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          await sql`update public.projects set story = ${richText(input.texte as string)} where id = ${project.id}`;
          return { ok: true, adresse: await pageUrl(`/p/${project.slug}`) };
        },
        id.clientName,
      ),
  },
  {
    name: "ajouter_jalon",
    title: "Ajouter un jalon au planning",
    description: "Ajoute une étape au planning d'un de tes projets (le poids compte dans l'avancée affichée).",
    scope: "projet",
    write: true,
    inputSchema: z.object({
      slug,
      titre: z.string().trim().min(1).max(120),
      description: z.string().trim().max(500).optional(),
      periode: z.string().trim().max(40).optional().describe("Ex. « Semaine 3 » ou « Novembre »"),
      poids: z.number().int().min(0).max(100).optional().describe("Importance dans l'avancée, de 0 à 100 (10 par défaut)"),
      statut: milestoneStatus.optional(),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          const [row] = await sql`
            insert into public.milestones (project_id, title, description, period_label, weight, status, position)
            values (${project.id}, ${input.titre as string}, ${(input.description as string) ?? ""}, ${(input.periode as string) ?? ""},
                    ${(input.poids as number) ?? 10}, ${(input.statut as string) ?? "todo"},
                    (select coalesce(max(position), 0) + 1 from public.milestones where project_id = ${project.id}))
            returning id, title as jalon, status as statut, weight as poids`;
          return { ok: true, jalon: row };
        },
        id.clientName,
      ),
  },
  {
    name: "modifier_jalon",
    title: "Modifier un jalon",
    description: "Change le statut, le titre, la période ou le poids d'un jalon (identifiant donné par voir_projet).",
    scope: "projet",
    write: true,
    inputSchema: z.object({
      slug,
      jalon_id: z.uuid(),
      titre: z.string().trim().min(1).max(120).optional(),
      description: z.string().trim().max(500).optional(),
      periode: z.string().trim().max(40).optional(),
      poids: z.number().int().min(0).max(100).optional(),
      statut: milestoneStatus.optional(),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          const changes: Record<string, string | number> = {};
          if (input.titre !== undefined) changes.title = input.titre as string;
          if (input.description !== undefined) changes.description = input.description as string;
          if (input.periode !== undefined) changes.period_label = input.periode as string;
          if (input.poids !== undefined) changes.weight = input.poids as number;
          if (input.statut !== undefined) changes.status = input.statut as string;
          if (Object.keys(changes).length === 0) throw new ToolError("Rien à modifier : indique au moins un champ.");
          const [row] = await sql`
            update public.milestones set ${sql(changes)} where id = ${input.jalon_id as string} and project_id = ${project.id}
            returning id, title as jalon, status as statut, weight as poids`;
          if (!row) throw new ToolError("Jalon introuvable dans ce projet.");
          return { ok: true, jalon: row };
        },
        id.clientName,
      ),
  },
  {
    name: "ajouter_faq",
    title: "Ajouter une question à la FAQ",
    description: "Ajoute une question et sa réponse à la FAQ d'un de tes projets.",
    scope: "projet",
    write: true,
    inputSchema: z.object({ slug, question: z.string().trim().min(1).max(200), reponse: z.string().trim().min(1).max(2000) }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          await sql`
            insert into public.faqs (project_id, question, answer, position)
            values (${project.id}, ${input.question as string}, ${input.reponse as string},
                    (select coalesce(max(position), 0) + 1 from public.faqs where project_id = ${project.id}))`;
          return { ok: true };
        },
        id.clientName,
      ),
  },

  // ---------------------------------------------------------------------------
  // devlog
  // ---------------------------------------------------------------------------
  {
    name: "creer_devlog",
    title: "Écrire une mise à jour (devlog)",
    description:
      "Crée une mise à jour pour un de tes projets. Par défaut c'est un brouillon (visible de l'équipe seulement) ; publier: true la rend publique avec un numéro. Elle portera la mention « via » ton application.",
    scope: "devlog",
    write: true,
    inputSchema: z.object({
      slug,
      titre: z.string().trim().min(1).max(140),
      texte: markdown(50_000),
      jalon_id: z.uuid().optional().describe("Jalon du planning concerné (facultatif)"),
      publier: z.boolean().optional().describe("true pour publier tout de suite (false par défaut : brouillon)"),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const project = await editableProject(sql, input.slug as string);
          const body = richText(input.texte as string);
          const publish = input.publier === true;
          if (publish && isEmptyRichText(body)) throw new ToolError("Ajoute un texte avant de publier.");
          const [post] = await sql<{ id: string; number: number | null; status: string }[]>`
            insert into public.posts (project_id, author_id, title, body, milestone_id, status)
            values (${project.id}, auth.uid(), ${input.titre as string}, ${body}, ${(input.jalon_id as string) ?? null},
                    ${publish ? "published" : "draft"})
            returning id, number, status`;
          return {
            ok: true,
            id: post.id,
            statut: post.status === "published" ? "publiée" : "brouillon",
            numero: post.number,
            adresse: await pageUrl(post.number ? `/p/${project.slug}/devlog/${post.number}` : `/p/${project.slug}/edit/devlog`),
          };
        },
        id.clientName,
      ),
  },
  {
    name: "modifier_devlog",
    title: "Modifier une mise à jour",
    description: "Modifie le titre, le texte ou le jalon d'une mise à jour (brouillon ou publiée), par son identifiant (voir mes_devlogs).",
    scope: "devlog",
    write: true,
    inputSchema: z.object({
      id: z.uuid().describe("Identifiant de la mise à jour"),
      titre: z.string().trim().min(1).max(140).optional(),
      texte: markdown(50_000).optional(),
      jalon_id: z.uuid().nullable().optional().describe("Jalon concerné, ou null pour le retirer"),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const changes: Record<string, string | null> = {};
          if (input.titre !== undefined) changes.title = input.titre as string;
          if (input.texte !== undefined) changes.body = richText(input.texte as string);
          if (input.jalon_id !== undefined) changes.milestone_id = input.jalon_id as string | null;
          if (Object.keys(changes).length === 0) throw new ToolError("Rien à modifier : indique au moins un champ.");
          const [current] = await sql<{ status: string; can_edit: boolean }[]>`
            select status, public.can_edit_project(project_id) as can_edit from public.posts where id = ${input.id as string}`;
          if (!current?.can_edit) throw new ToolError("Mise à jour introuvable, ou pas dans un de tes projets.");
          if (current.status === "published" && changes.body !== undefined && isEmptyRichText(changes.body ?? "")) {
            throw new ToolError("Une mise à jour publiée ne peut pas devenir vide.");
          }
          const [post] = await sql`
            update public.posts set ${sql(changes)} where id = ${input.id as string}
            returning id, title as titre, status as statut, number as numero`;
          return { ok: true, actualite: post };
        },
        id.clientName,
      ),
  },
  {
    name: "publier_devlog",
    title: "Publier une mise à jour",
    description: "Publie un brouillon de mise à jour : il devient public et reçoit son numéro.",
    scope: "devlog",
    write: true,
    inputSchema: z.object({ id: z.uuid().describe("Identifiant du brouillon") }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const [current] = await sql<{ status: string; body: string; images: string[]; slug: string; can_edit: boolean }[]>`
            select po.status, po.body, po.images, p.slug, public.can_edit_project(po.project_id) as can_edit
            from public.posts po join public.projects p on p.id = po.project_id where po.id = ${input.id as string}`;
          if (!current?.can_edit) throw new ToolError("Mise à jour introuvable, ou pas dans un de tes projets.");
          if (current.status === "published") throw new ToolError("Cette mise à jour est déjà publiée.");
          if (isEmptyRichText(current.body) && current.images.length === 0) throw new ToolError("Ajoute un texte avant de publier.");
          const [post] = await sql<{ number: number }[]>`
            update public.posts set status = 'published' where id = ${input.id as string} returning number`;
          return { ok: true, numero: post.number, adresse: await pageUrl(`/p/${current.slug}/devlog/${post.number}`) };
        },
        id.clientName,
      ),
  },

  // ---------------------------------------------------------------------------
  // commentaires
  // ---------------------------------------------------------------------------
  {
    name: "commenter",
    title: "Commenter un projet",
    description: "Publie un commentaire sur un projet publié, ou sur une de ses mises à jour (numero_actualite). Il portera la mention « via » ton application.",
    scope: "commentaires",
    write: true,
    inputSchema: z.object({
      slug,
      texte: z.string().trim().min(1).max(2000),
      numero_actualite: z.number().int().min(1).optional().describe("Numéro de la mise à jour à commenter (facultatif)"),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const [project] = await sql<{ id: string; status: string }[]>`select id, status from public.projects where slug = ${input.slug as string}`;
          if (!project) throw new ToolError("Projet introuvable (ou non visible pour toi).");
          if (project.status !== "published") throw new ToolError("On ne peut commenter qu'un projet publié.");
          let postId: string | null = null;
          if (input.numero_actualite) {
            const [post] = await sql<{ id: string }[]>`
              select id from public.posts where project_id = ${project.id} and number = ${input.numero_actualite as number} and status = 'published'`;
            if (!post) throw new ToolError("Cette mise à jour n'existe pas.");
            postId = post.id;
          }
          const [comment] = await sql<{ id: string }[]>`
            insert into public.comments (project_id, post_id, author_id, body)
            values (${project.id}, ${postId}, auth.uid(), ${input.texte as string}) returning id`;
          return { ok: true, commentaire_id: comment.id };
        },
        id.clientName,
      ),
  },
  {
    name: "repondre",
    title: "Répondre à un commentaire",
    description: "Répond à un commentaire (identifiant donné par voir_commentaires).",
    scope: "commentaires",
    write: true,
    inputSchema: z.object({ commentaire_id: z.uuid(), texte: z.string().trim().min(1).max(2000) }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          const [parent] = await sql<{ id: string; project_id: string; post_id: string | null; parent_id: string | null }[]>`
            select id, project_id, post_id, parent_id from public.comments where id = ${input.commentaire_id as string}`;
          if (!parent) throw new ToolError("Commentaire introuvable.");
          // Un seul niveau de réponses : répondre à une réponse rejoint le même fil.
          const [comment] = await sql<{ id: string }[]>`
            insert into public.comments (project_id, post_id, parent_id, author_id, body)
            values (${parent.project_id}, ${parent.post_id}, ${parent.parent_id ?? parent.id}, auth.uid(), ${input.texte as string})
            returning id`;
          return { ok: true, commentaire_id: comment.id };
        },
        id.clientName,
      ),
  },
  {
    name: "signaler",
    title: "Signaler un contenu",
    description: "Signale à l'équipe pédagogique un projet, une mise à jour ou un commentaire inapproprié.",
    scope: "commentaires",
    write: true,
    inputSchema: z.object({
      type: z.enum(["projet", "actualite", "commentaire"]),
      slug: slug.optional().describe("Pour un projet ou une mise à jour"),
      numero_actualite: z.number().int().min(1).optional().describe("Pour une mise à jour"),
      commentaire_id: z.uuid().optional().describe("Pour un commentaire"),
      raison: z.string().trim().min(3).max(500),
    }),
    run: (id, input) =>
      asUser(
        id.userId,
        async (sql) => {
          let target: { type: "project" | "post" | "comment"; id: string } | null = null;
          if (input.type === "commentaire" && input.commentaire_id) {
            const [c] = await sql<{ id: string }[]>`select id from public.comments where id = ${input.commentaire_id as string}`;
            if (c) target = { type: "comment", id: c.id };
          } else if (input.type === "actualite" && input.slug && input.numero_actualite) {
            const [p] = await sql<{ id: string }[]>`
              select po.id from public.posts po join public.projects p on p.id = po.project_id
              where p.slug = ${input.slug as string} and po.number = ${input.numero_actualite as number}`;
            if (p) target = { type: "post", id: p.id };
          } else if (input.type === "projet" && input.slug) {
            const [p] = await sql<{ id: string }[]>`select id from public.projects where slug = ${input.slug as string}`;
            if (p) target = { type: "project", id: p.id };
          }
          if (!target) throw new ToolError("Contenu introuvable : vérifie le type et les identifiants.");
          await sql`
            insert into public.reports (target_type, target_id, reason, reporter_id)
            values (${target.type}, ${target.id}, ${input.raison as string}, auth.uid())`;
          return { ok: true, message: "Signalement envoyé à l'équipe pédagogique." };
        },
        id.clientName,
      ),
  },
];
