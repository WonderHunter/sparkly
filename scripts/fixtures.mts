/**
 * Fixtures de démo pour Sparkly (développement local uniquement).
 *
 *   pnpm db:fixtures     ajoute les fixtures à la base locale (relançable)
 *   pnpm db:demo         remet la base à zéro (seed) puis ajoute les fixtures
 *
 * Tout est fictif : comptes *.fixture@…univ-reims.fr, jeux inventés, visuels
 * générés en SVG puis rendus en image avec le Chromium de Playwright.
 */
import { chromium, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SECRET) throw new Error("SUPABASE_SECRET_KEY manquante (lance avec --env-file=.env.local).");
if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL)) {
  throw new Error(`Refus : les fixtures ne s'appliquent qu'à un Supabase local (URL actuelle : ${SUPABASE_URL}).`);
}

const db = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const FIXTURE_TAG = ".fixture@";
const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

// Générateur pseudo-aléatoire déterministe : mêmes fixtures à chaque lancement.
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];

function must<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label} : ${result.error.message}`);
  return result.data;
}

// ---------------------------------------------------------------------------
// Personnes
// ---------------------------------------------------------------------------
const STUDENTS = [
  ["lea.bernard", "Léa Bernard"], ["hugo.moreau", "Hugo Moreau"], ["ines.fournier", "Inès Fournier"],
  ["noah.girard", "Noah Girard"], ["jade.lambert", "Jade Lambert"], ["louis.bonnet", "Louis Bonnet"],
  ["manon.francois", "Manon François"], ["ethan.mercier", "Ethan Mercier"], ["sarah.blanc", "Sarah Blanc"],
  ["tom.guerin", "Tom Guérin"], ["zoe.muller", "Zoé Muller"], ["adam.henry", "Adam Henry"],
  ["lina.roussel", "Lina Roussel"], ["gabriel.nicolas", "Gabriel Nicolas"], ["camille.perrin", "Camille Perrin"],
  ["yanis.morin", "Yanis Morin"], ["ambre.mathieu", "Ambre Mathieu"], ["nathan.clement", "Nathan Clément"],
  ["clara.gauthier", "Clara Gauthier"], ["mael.dumont", "Maël Dumont"],
] as const;

const TEACHERS = [
  ["sophie.prof", "Sophie Lemaire", "Graphisme et game design."],
  ["marc.prof", "Marc Delattre", "Support technique Unity et dev arcade."],
] as const;

const BIOS = [
  "Dev gameplay, accro aux shoot'em up.",
  "Motion design et juice à tous les étages.",
  "Je fais des sons bizarres avec mon synthé.",
  "Unity le jour, pixel art la nuit.",
  "Fan de jeux de rythme et de bornes rétro.",
  "Je teste tout, je casse tout, je note tout.",
  "",
];

// ---------------------------------------------------------------------------
// Projets (jeux inventés)
// ---------------------------------------------------------------------------
interface ProjectSpec {
  slug: string;
  title: string;
  pitch: string;
  story: string;
  platform: "borne" | "cocktail" | "tv" | "web";
  category: string;
  status: "published" | "draft";
  done: number; // jalons terminés
  inProgress: boolean; // le suivant est en cours
  palette: [string, string, string];
  motif: "orbits" | "grid" | "waves" | "blocks" | "stars" | "rings";
  members: [number, string][]; // [index étudiant, rôle affiché]
  publishedDaysAgo: number;
  posts: [number, string, string][]; // [jours, titre, texte]
  faqs?: [string, string][];
}

const P = (title: string, body: string) => `<h2>${title}</h2><p>${body}</p>`;

const PROJECTS: ProjectSpec[] = [
  {
    slug: "orbit-smash", title: "Orbit Smash", platform: "borne", category: "arcade", status: "published",
    pitch: "Lance des comètes autour d'une planète et fais exploser les satellites ennemis en chaîne.",
    story: P("Le concept", "Tu contrôles une planète qui attire tout ce qui passe. Chaque comète lancée suit une orbite que tu dois anticiper : plus la chaîne d'explosions est longue, plus le score grimpe.") +
      "<ul><li>Parties de 3 minutes</li><li>Un joystick, deux boutons</li><li>Difficulté qui accélère toutes les 30 secondes</li></ul>" +
      P("Techno web", "Les scores et les réglages de gravité sont pilotés depuis le site du jeu, en temps réel."),
    done: 3, inProgress: true, palette: ["#1b1035", "#ff5d8f", "#ffd166"], motif: "orbits",
    members: [[0, "Lead dev"], [1, "Motion designer"], [2, "Game designer"], [3, "Dev back-end"]],
    publishedDaysAgo: 40,
    posts: [
      [38, "Concept validé", "Le prof a validé l'idée des orbites. On part sur une seule planète au centre de l'écran."],
      [24, "La physique tourne !", "Les comètes suivent enfin des trajectoires crédibles. Il a fallu tricher un peu sur la gravité pour que ce soit fun."],
      [9, "Premier playtest sur la borne", "Huit personnes ont testé : la difficulté monte trop vite après 2 minutes. On ajuste."],
    ],
    faqs: [["Combien de joueurs ?", "Un joueur, mais on prépare un mode duel."], ["On peut y jouer sur le web ?", "Oui, une version WebGL sera en ligne en janvier."]],
  },
  {
    slug: "pixel-fermier", title: "Pixel Fermier", platform: "cocktail", category: "party", status: "published",
    pitch: "Quatre fermiers, une seule récolte : le premier qui remplit sa grange gagne.",
    story: P("Vue de dessus, quatre côtés", "Pensé pour la table cocktail : chaque joueur a son côté et sa grange. Les légumes poussent au centre, il faut les attraper avant les autres.") +
      P("Ambiance", "Pixel art chaleureux, musique chiptune et beaucoup de petites animations quand on récolte."),
    done: 2, inProgress: true, palette: ["#f4f1de", "#81b29a", "#e07a5f"], motif: "blocks",
    members: [[4, "Pixel artist"], [5, "Dev gameplay"], [6, "Sound designer"], [0, "Dev réseau"]],
    publishedDaysAgo: 33,
    posts: [
      [30, "Moodboard terminé", "On a fixé la palette : couleurs terre, pastels et un orange bien vif pour les carottes."],
      [12, "Les quatre côtés fonctionnent", "Chaque manette contrôle bien son fermier. Prochaine étape : les bonus."],
    ],
  },
  {
    slug: "laser-mirage", title: "Laser Mirage", platform: "tv", category: "puzzle", status: "published",
    pitch: "Oriente des miroirs avec ton téléphone pour guider le laser jusqu'à la cible.",
    story: P("Jouable avec son téléphone", "Le jeu tourne sur la télé du hall. Les joueurs scannent un QR code et leur téléphone devient une manette pour tourner les miroirs.") +
      P("Pourquoi c'est fun", "Les niveaux se résolvent à plusieurs : il faut se coordonner en criant devant l'écran."),
    done: 4, inProgress: true, palette: ["#03071e", "#00f5d4", "#9b5de5"], motif: "grid",
    members: [[7, "Lead dev"], [8, "UI designer"], [9, "Dev WebSocket"]],
    publishedDaysAgo: 45,
    posts: [
      [44, "Le téléphone devient une manette", "Première connexion WebSocket entre un téléphone et la télé : 40 ms de latence, c'est jouable."],
      [31, "Douze niveaux prototypés", "On a des niveaux faciles pour apprendre et deux vrais casse-têtes."],
      [16, "Le rendu des lasers", "Shader de lueur terminé, les lasers bavent juste ce qu'il faut."],
      [4, "Tests dans le hall", "Une vraie file d'attente s'est formée. On garde le niveau 7, tout le monde l'adore."],
    ],
    faqs: [["Il faut installer une appli ?", "Non, le navigateur du téléphone suffit."]],
  },
  {
    slug: "cuisine-chaos", title: "Cuisine Chaos", platform: "cocktail", category: "party", status: "published",
    pitch: "Une cuisine en feu, quatre chefs et des commandes qui n'arrêtent pas d'arriver.",
    story: P("Coopératif et bruyant", "Les quatre joueurs partagent une cuisine en vue de dessus. Il faut couper, cuire et servir avant que le client ne parte.") +
      P("La difficulté", "Les commandes s'accélèrent et la cuisine se réorganise toutes les minutes."),
    done: 1, inProgress: true, palette: ["#fff3e2", "#ff7b54", "#2b2d42"], motif: "rings",
    members: [[10, "Game designer"], [11, "Dev gameplay"], [12, "Illustratrice"]],
    publishedDaysAgo: 20,
    posts: [[18, "On a trouvé notre concept", "Après trois idées abandonnées, on part sur la cuisine. Ça fait rire tout le monde en playtest papier."]],
  },
  {
    slug: "gravity-goals", title: "Gravity Goals", platform: "borne", category: "action", status: "published",
    pitch: "Du foot en apesanteur : inverse la gravité pour marquer dans le but adverse.",
    story: P("Un duel", "Deux joueurs sur la borne, chacun peut inverser la gravité trois fois par manche. Le ballon devient imprévisible.") +
      "<ul><li>Manches de 90 secondes</li><li>Effets de ralenti sur les buts</li></ul>",
    done: 5, inProgress: false, palette: ["#0b132b", "#5bc0be", "#f6ae2d"], motif: "waves",
    members: [[13, "Dev physique"], [14, "Graphiste"], [1, "Motion designer"]],
    publishedDaysAgo: 50,
    posts: [
      [48, "Premier ballon qui flotte", "La gravité inversée marche, mais le ballon part dans l'espace. On ajoute des murs."],
      [35, "Le ralenti sur les buts", "Chaque but déclenche un ralenti avec zoom et confettis. C'est notre meilleur moment de juice."],
      [21, "Intégration sur la borne", "Les commandes de la borne sont branchées, tout répond bien."],
      [7, "Équilibrage final", "On a réduit la puissance du tir et allongé les manches. Les parties sont plus serrées."],
      [2, "Prêts pour la soutenance", "Il ne reste que l'attract mode à finaliser."],
    ],
  },
  {
    slug: "metro-rush", title: "Métro Rush", platform: "web", category: "course", status: "published",
    pitch: "Trace les lignes de métro plus vite que la foule n'arrive sur les quais.",
    story: P("Un jeu de réflexe et de planification", "Les stations apparaissent, les voyageurs s'impatientent. Relie tout avant la saturation.") +
      P("Sur le web", "Jouable directement dans le navigateur, avec un classement en ligne."),
    done: 2, inProgress: false, palette: ["#f8f9fa", "#e63946", "#1d3557"], motif: "grid",
    members: [[15, "Dev front"], [16, "Designer UI"], [7, "Dev back-end"]],
    publishedDaysAgo: 27,
    posts: [
      [25, "Le tracé des lignes", "On dessine les lignes à la souris ou au doigt, avec un aimant vers les stations."],
      [10, "Le classement en ligne", "Les scores sont enregistrés et le top 10 s'affiche à la fin de chaque partie."],
    ],
  },
  {
    slug: "comet-runner", title: "Comet Runner", platform: "borne", category: "plateforme", status: "published",
    pitch: "Cours sur une comète qui se désagrège et saute avant qu'il ne soit trop tard.",
    story: P("Endless runner", "Le sol disparaît derrière toi, la vitesse augmente sans arrêt. Un seul bouton : sauter."),
    done: 1, inProgress: false, palette: ["#10002b", "#e0aaff", "#ff9e00"], motif: "stars",
    members: [[17, "Dev Unity"], [18, "Pixel artist"]],
    publishedDaysAgo: 14,
    posts: [[13, "Le personnage court !", "Animation de course en 8 images, on est assez fiers."]],
  },
  {
    slug: "beat-blocks", title: "Beat Blocks", platform: "tv", category: "rythme", status: "published",
    pitch: "Empile des blocs au rythme de la musique, en rythme ou tout s'effondre.",
    story: P("Rythme et équilibre", "Chaque bloc tombe sur le temps : appuie au bon moment pour le poser droit."),
    done: 0, inProgress: true, palette: ["#22223b", "#f72585", "#4cc9f0"], motif: "blocks",
    members: [[19, "Compositeur"], [2, "Game designer"], [9, "Dev"]],
    publishedDaysAgo: 6,
    posts: [],
  },
  {
    slug: "projet-secret", title: "Projet secret", platform: "borne", category: "shoot", status: "draft",
    pitch: "On garde la surprise pour l'instant.",
    story: "<p>Brouillon en cours de rédaction.</p>",
    done: 0, inProgress: true, palette: ["#212529", "#adb5bd", "#f8f9fa"], motif: "rings",
    members: [[3, "Lead dev"], [12, "Graphiste"]],
    publishedDaysAgo: 0,
    posts: [],
  },
];

const COMMENTS = [
  "Le rendu est super, hâte d'y jouer !",
  "Vous avez pensé à un mode deux joueurs ?",
  "La musique du teaser est incroyable.",
  "Gros niveau de juice, bravo.",
  "Petit conseil : la police du score est un peu petite sur la borne.",
  "On a testé hier, impossible de décrocher.",
  "Ça donne envie de mettre un crédit !",
  "Vous utilisez quel moteur pour la physique ?",
];
const TEACHER_COMMENTS = [
  "Attention à garder des parties courtes : 3 minutes maximum, c'est l'esprit arcade.",
  "Très bon devlog, continuez à documenter vos choix.",
  "Pensez à l'attract mode dès maintenant, il demande plus de temps qu'on ne croit.",
];
const REPLIES = ["Merci beaucoup !", "Bonne idée, on note.", "C'est prévu pour la prochaine mise à jour 😉", "On y travaille !"];

// ---------------------------------------------------------------------------
// Visuels générés (art original)
// ---------------------------------------------------------------------------
function motifSvg(motif: ProjectSpec["motif"], [, a, b]: ProjectSpec["palette"], w: number, h: number) {
  const parts: string[] = [];
  const cx = w * 0.68;
  const cy = h * 0.45;
  switch (motif) {
    case "orbits":
      for (let i = 1; i <= 5; i++) {
        parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${70 * i}" ry="${30 * i}" fill="none" stroke="${a}" stroke-opacity="${0.5 - i * 0.07}" stroke-width="3" transform="rotate(-18 ${cx} ${cy})"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="70" fill="${b}"/><circle cx="${cx + 210}" cy="${cy - 40}" r="16" fill="${a}"/>`);
      break;
    case "grid":
      for (let x = 0; x < w; x += 80) parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${a}" stroke-opacity=".18"/>`);
      for (let y = 0; y < h; y += 80) parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${a}" stroke-opacity=".18"/>`);
      parts.push(`<polyline points="${w * 0.35},${h * 0.85} ${w * 0.55},${h * 0.3} ${w * 0.75},${h * 0.7} ${w * 0.95},${h * 0.2}" fill="none" stroke="${a}" stroke-width="10" stroke-linejoin="round"/>`);
      parts.push(`<circle cx="${w * 0.95}" cy="${h * 0.2}" r="26" fill="${b}"/>`);
      break;
    case "waves":
      for (let i = 0; i < 7; i++) {
        const y = h * 0.35 + i * 55;
        parts.push(`<path d="M0 ${y} C ${w * 0.25} ${y - 80}, ${w * 0.5} ${y + 80}, ${w} ${y - 30}" fill="none" stroke="${i % 2 ? a : b}" stroke-width="8" stroke-opacity="${0.9 - i * 0.1}"/>`);
      }
      break;
    case "blocks":
      for (let i = 0; i < 26; i++) {
        const s = 50 + rand() * 90;
        parts.push(`<rect x="${w * 0.4 + rand() * w * 0.55}" y="${rand() * h}" width="${s}" height="${s}" rx="10" fill="${rand() > 0.5 ? a : b}" fill-opacity="${0.5 + rand() * 0.5}" transform="rotate(${rand() * 30 - 15})"/>`);
      }
      break;
    case "stars":
      for (let i = 0; i < 90; i++) parts.push(`<circle cx="${rand() * w}" cy="${rand() * h}" r="${rand() * 3 + 0.5}" fill="${a}" fill-opacity="${rand()}"/>`);
      parts.push(`<path d="M${w * 0.6} ${h * 0.7} Q ${w * 0.75} ${h * 0.35} ${w * 0.95} ${h * 0.25}" stroke="${b}" stroke-width="40" stroke-linecap="round" stroke-opacity=".9" fill="none"/>`);
      break;
    case "rings":
      for (let i = 0; i < 6; i++) parts.push(`<circle cx="${cx}" cy="${cy}" r="${40 + i * 45}" fill="none" stroke="${i % 2 ? a : b}" stroke-width="14" stroke-opacity="${1 - i * 0.14}"/>`);
      break;
  }
  return parts.join("");
}

function coverHtml(p: ProjectSpec) {
  const [bg, a, b] = p.palette;
  const w = 1600;
  const h = 1000;
  const dark = parseInt(bg.slice(1, 3), 16) < 128;
  return `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${a}" stop-opacity=".35"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#g)"/>
    ${motifSvg(p.motif, p.palette, w, h)}
    <text x="90" y="${h - 150}" font-family="Arial Black, Impact, sans-serif" font-size="120" font-weight="900" fill="${dark ? "#ffffff" : "#1c1917"}">${p.title}</text>
    <rect x="94" y="${h - 110}" width="220" height="16" rx="8" fill="${b}"/>
  </svg></body></html>`;
}

function logoHtml(p: ProjectSpec) {
  const [bg, a, b] = p.palette;
  const letter = p.title[0];
  return `<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect x="16" y="16" width="480" height="480" rx="120" fill="${bg}"/>
    <circle cx="256" cy="256" r="170" fill="${a}"/><circle cx="360" cy="150" r="46" fill="${b}"/>
    <text x="256" y="330" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="220" font-weight="900" fill="${bg}">${letter}</text>
  </svg></body></html>`;
}

function shotHtml(p: ProjectSpec, index: number) {
  const [bg, a, b] = p.palette;
  const w = 1200;
  const h = 675;
  const blocks = Array.from({ length: 14 }, () => {
    const x = rand() * w;
    const y = h * 0.55 + rand() * h * 0.4;
    return `<rect x="${x}" y="${y}" width="${40 + rand() * 120}" height="18" rx="9" fill="${b}" fill-opacity=".85"/>`;
  }).join("");
  return `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${bg}"/>${motifSvg(p.motif, p.palette, w, h)}${blocks}
    <rect x="30" y="30" width="250" height="56" rx="12" fill="#000" fill-opacity=".35"/>
    <text x="52" y="70" font-family="Courier New, monospace" font-size="30" font-weight="700" fill="${a}">SCORE ${String(1200 * (index + 3)).padStart(6, "0")}</text>
  </svg></body></html>`;
}

async function render(browser: Browser, html: string, width: number, height: number, transparent = false) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  const buffer = await page.screenshot({ type: transparent ? "png" : "jpeg", quality: transparent ? undefined : 82, omitBackground: transparent });
  await page.close();
  return buffer;
}

async function upload(path: string, body: Buffer, contentType: string) {
  must(await db.storage.from("project-media").upload(path, body, { contentType, upsert: true }), `upload ${path}`);
  return db.storage.from("project-media").getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Nettoyage des fixtures précédentes
// ---------------------------------------------------------------------------
async function cleanup() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const fixtureUsers = (data?.users ?? []).filter((u) => u.email?.includes(FIXTURE_TAG));
  for (const user of fixtureUsers) {
    const { data: projects } = await db.from("projects").select("id").eq("created_by", user.id);
    for (const p of projects ?? []) {
      const { data: files } = await db.storage.from("project-media").list(p.id);
      if (files?.length) await db.storage.from("project-media").remove(files.map((f) => `${p.id}/${f.name}`));
    }
    await db.from("projects").delete().eq("created_by", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
  return fixtureUsers.length;
}

async function createUser(local: string, domain: string) {
  const email = `${local}${FIXTURE_TAG}${domain}`;
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`Création de ${email} : ${error?.message}`);
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const removed = await cleanup();
  if (removed) console.log(`↺ ${removed} comptes de fixtures précédents supprimés`);

  // Personnes
  const students: string[] = [];
  for (const [local, name] of STUDENTS) {
    const id = await createUser(local, "etudiant.univ-reims.fr");
    must(await db.from("profiles").update({ display_name: name, promo: "MMI3 2026-2027", bio: pick(BIOS) || null }).eq("id", id), "profil");
    students.push(id);
  }
  const teachers: string[] = [];
  for (const [local, name, bio] of TEACHERS) {
    const id = await createUser(local, "univ-reims.fr");
    must(await db.from("profiles").update({ display_name: name, bio }).eq("id", id), "profil prof");
    teachers.push(id);
  }
  console.log(`✓ ${students.length} étudiant·es et ${teachers.length} enseignant·es`);

  const categories = must(await db.from("categories").select("id, slug"), "catégories") as { id: number; slug: string }[];
  const browser = await chromium.launch();

  try {
    for (const spec of PROJECTS) {
      const [ownerIndex] = spec.members[0];
      const ownerId = students[ownerIndex];
      const project = must(
        await db
          .from("projects")
          .insert({
            slug: spec.slug,
            title: spec.title,
            pitch: spec.pitch,
            story: spec.story,
            platform: spec.platform,
            category_id: categories.find((c) => c.slug === spec.category)?.id ?? null,
            created_by: ownerId,
          })
          .select("id")
          .single(),
        `projet ${spec.slug}`,
      ) as { id: string };

      // Visuels
      const cover = await upload(`${project.id}/cover.jpg`, await render(browser, coverHtml(spec), 1600, 1000), "image/jpeg");
      const logo = await upload(`${project.id}/logo.png`, await render(browser, logoHtml(spec), 512, 512, true), "image/png");

      // Équipe : le trigger a ajouté le créateur ; on complète.
      must(await db.from("project_members").update({ team_title: spec.members[0][1] }).eq("project_id", project.id).eq("user_id", ownerId), "owner");
      for (const [position, [index, title]] of spec.members.slice(1).entries()) {
        must(
          await db.from("project_members").insert({
            project_id: project.id,
            user_id: students[index],
            role: /son|graph|design|illustr|pixel|compos|motion|ui/i.test(title) ? "crea" : "dev",
            team_title: title,
            position: position + 1,
          }),
          "membre",
        );
      }

      // Planning
      for (let position = 1; position <= 6; position++) {
        const status = position <= spec.done ? "done" : position === spec.done + 1 && spec.inProgress ? "in_progress" : "todo";
        if (status !== "todo") {
          must(await db.from("milestones").update({ status }).eq("project_id", project.id).eq("position", position), "jalon");
        }
      }

      // Devlog (dans l'ordre chronologique pour la numérotation)
      for (const [i, [days, title, text]] of [...spec.posts].sort((x, y) => y[0] - x[0]).entries()) {
        const images: string[] = [];
        if (i % 2 === 0) {
          for (let k = 0; k < 1 + (i % 3); k++) {
            images.push(await upload(`${project.id}/devlog-${i}-${k}.jpg`, await render(browser, shotHtml(spec, i + k), 1200, 675), "image/jpeg"));
          }
        }
        must(
          await db.from("posts").insert({
            project_id: project.id,
            author_id: students[pick(spec.members)[0]],
            title,
            body: `<p>${text}</p>`,
            images,
            status: "published",
            published_at: daysAgo(days),
            created_at: daysAgo(days),
          }),
          "post",
        );
      }

      // FAQ
      for (const [position, [question, answer]] of (spec.faqs ?? []).entries()) {
        must(await db.from("faqs").insert({ project_id: project.id, question, answer, position: position + 1 }), "faq");
      }

      // Publication (et cohérence des dates)
      must(
        await db
          .from("projects")
          .update({
            cover_url: cover,
            logo_url: logo,
            status: spec.status,
            published_at: spec.status === "published" ? daysAgo(spec.publishedDaysAgo) : null,
          })
          .eq("id", project.id),
        "publication",
      );

      if (spec.status === "published") {
        // Commentaires d'autres étudiant·es et des profs, avec quelques réponses de l'équipe
        const outsiders = students.filter((_, idx) => !spec.members.some(([m]) => m === idx));
        const count = 2 + Math.floor(rand() * 4);
        for (let c = 0; c < count; c++) {
          const isTeacher = c === 0 && rand() > 0.3;
          const ago = Math.max(1, Math.floor(rand() * spec.publishedDaysAgo));
          const comment = must(
            await db
              .from("comments")
              .insert({
                project_id: project.id,
                author_id: isTeacher ? pick(teachers) : pick(outsiders),
                body: isTeacher ? pick(TEACHER_COMMENTS) : pick(COMMENTS),
                created_at: daysAgo(ago),
              })
              .select("id")
              .single(),
            "commentaire",
          ) as { id: string };
          if (rand() > 0.5) {
            must(
              await db.from("comments").insert({
                project_id: project.id,
                parent_id: comment.id,
                author_id: students[pick(spec.members)[0]],
                body: pick(REPLIES),
                created_at: daysAgo(Math.max(0, ago - 1)),
              }),
              "réponse",
            );
          }
        }
        // Suivis
        const followers = outsiders.filter(() => rand() > 0.55);
        if (followers.length) {
          must(await db.from("follows").insert(followers.map((user_id) => ({ user_id, project_id: project.id }))), "suivis");
        }
      }
      console.log(`✓ ${spec.title} (${spec.status === "published" ? "publié" : "brouillon"})`);
    }
  } finally {
    await browser.close();
  }

  // Financements fictifs des profs (dans la limite de leur budget annuel).
  const { data: schoolYear } = await db.rpc("current_school_year");
  const FUNDING: [number, string, number][] = [
    [0, "gravity-goals", 15000], [0, "laser-mirage", 12000], [0, "orbit-smash", 8000],
    [0, "pixel-fermier", 5000], [0, "metro-rush", 4000],
    [1, "laser-mirage", 6000], [1, "gravity-goals", 3000], [1, "cuisine-chaos", 2500],
    [1, "comet-runner", 1500],
  ];
  const { data: fixtureProjects } = await db.from("projects").select("id, slug").in("slug", PROJECTS.map((p) => p.slug));
  for (const [teacherIndex, slug, amount] of FUNDING) {
    const projectId = fixtureProjects?.find((p) => p.slug === slug)?.id;
    if (!projectId) continue;
    must(
      await db.from("investments").insert({ project_id: projectId, investor_id: teachers[teacherIndex], amount, school_year: schoolYear as string }),
      `financement ${slug}`,
    );
  }
  console.log(`✓ ${FUNDING.length} financements de profs`);

  const multi = new Map<number, number>();
  for (const p of PROJECTS) for (const [m] of p.members) multi.set(m, (multi.get(m) ?? 0) + 1);
  const shared = [...multi.entries()].filter(([, n]) => n > 1).map(([i]) => STUDENTS[i][1]);
  console.log(`\n✦ Fixtures prêtes : ${PROJECTS.length} projets. Membres de plusieurs projets : ${shared.join(", ")}.`);
  console.log(`  Connexion : ${STUDENTS[0][0]}${FIXTURE_TAG}etudiant.univ-reims.fr (code dans Mailpit : http://127.0.0.1:54324)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
