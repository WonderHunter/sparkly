import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = await import("@/lib/agents/db");
const { randomToken, sha256Hex } = await import("@/lib/agents/crypto");
const { verifyBearer } = await import("@/lib/agents/tokens");
const { runTool, TOOLS } = await import("@/lib/agents/mcp-tools");

/**
 * Vérification des jetons d'agent contre la vraie base locale : chaque condition
 * (expiration, révocation, compte suspendu, application bloquée, interrupteur admin) coupe l'accès.
 */
const ALICE = "00000000-0000-4000-a000-000000000002";
const sql = db();
const connections: string[] = [];
let clientId: string;

async function connection(opts: { expires?: string; tokenExpires?: string; kind?: "api_key" | "access"; } = {}) {
  const kind = opts.kind ?? "api_key";
  const token = randomToken(kind === "api_key" ? "spk" : "spt");
  const [c] = await sql<{ id: string }[]>`
    insert into public.agent_connections (user_id, kind, name, scopes, key_prefix, client_id, expires_at)
    values (${ALICE}, ${kind === "api_key" ? "api_key" : "oauth"}, 'Test intégration', ${["lecture"]},
            ${kind === "api_key" ? token.slice(0, 12) : null}, ${kind === "access" ? clientId : null},
            now() + ${opts.expires ?? "10 days"}::interval)
    returning id`;
  connections.push(c.id);
  await sql`insert into public.agent_tokens (hash, connection_id, kind, expires_at)
            values (${sha256Hex(token)}, ${c.id}, ${kind}, now() + ${opts.tokenExpires ?? "1 hour"}::interval)`;
  return { id: c.id, token };
}

beforeAll(async () => {
  const [cl] = await sql<{ id: string }[]>`
    insert into public.agent_clients (client_id, kind, name, redirect_uris)
    values (${`spc_integration_${Date.now()}`}, 'registered', 'Client intégration', ${["https://exemple.test/cb"]})
    returning id`;
  clientId = cl.id;
});

afterAll(async () => {
  await sql`update public.app_settings set agents_enabled = true where id`;
  await sql`update public.profiles set suspended_at = null where id = ${ALICE}`;
  if (connections.length) await sql`delete from public.agent_connections where id in ${sql(connections)}`;
  await sql`delete from public.agent_clients where id = ${clientId}`;
  await sql.end();
});

describe("vérification des jetons d'agent", () => {
  it("accepte une clé valide et note sa dernière utilisation", async () => {
    const { id, token } = await connection();
    const identity = await verifyBearer(token);
    expect(identity).toMatchObject({ connectionId: id, userId: ALICE, scopes: ["lecture"] });
    const [row] = await sql`select last_used_at from public.agent_connections where id = ${id}`;
    expect(row.last_used_at).not.toBeNull();
  });

  it("refuse un jeton inconnu ou présenté sous le mauvais type", async () => {
    expect(await verifyBearer("spk_inconnu")).toBeNull();
    const { token } = await connection({ kind: "access" });
    expect(await verifyBearer(token)).not.toBeNull();
    expect(await verifyBearer(`spk_${token.slice(4)}`)).toBeNull();
  });

  it("refuse un jeton expiré, ou une connexion expirée", async () => {
    expect(await verifyBearer((await connection({ tokenExpires: "-1 minute" })).token)).toBeNull();
    expect(await verifyBearer((await connection({ expires: "-1 minute" })).token)).toBeNull();
  });

  it("refuse une connexion révoquée", async () => {
    const { id, token } = await connection();
    await sql`update public.agent_connections set revoked_at = now() where id = ${id}`;
    expect(await verifyBearer(token)).toBeNull();
  });

  it("coupe tout si l'application est bloquée par un admin", async () => {
    const { token } = await connection({ kind: "access" });
    expect(await verifyBearer(token)).toMatchObject({ clientName: "Client intégration" });
    await sql`update public.agent_clients set blocked_at = now() where id = ${clientId}`;
    expect(await verifyBearer(token)).toBeNull();
    await sql`update public.agent_clients set blocked_at = null where id = ${clientId}`;
  });

  it("coupe tout si le compte est suspendu ou si les agents sont désactivés", async () => {
    const { token } = await connection();
    await sql`update public.profiles set suspended_at = now() where id = ${ALICE}`;
    expect(await verifyBearer(token)).toBeNull();
    await sql`update public.profiles set suspended_at = null where id = ${ALICE}`;
    await sql`update public.app_settings set agents_enabled = false where id`;
    expect(await verifyBearer(token)).toBeNull();
    await sql`update public.app_settings set agents_enabled = true where id`;
    expect(await verifyBearer(token)).not.toBeNull();
  });
});

describe("outils MCP", () => {
  it("lisent les données en tant que la personne, avec ses droits, et journalisent l'appel", async () => {
    const { id } = await connection();
    const identity = { connectionId: id, userId: ALICE, scopes: ["lecture" as const], clientName: "Test" };
    const tool = (name: string) => TOOLS.find((t) => t.name === name)!;

    const me = (await runTool(tool("moi"), identity, {}, "1.0")) as { result: { display_name: string } };
    expect(me.result.display_name).toBe("Alice Martin");
    const draft = (await runTool(tool("voir_projet"), identity, { slug: "rythme-hall" }, null)) as { result: { erreur?: string } };
    expect(draft.result.erreur).toContain("introuvable");

    const audit = await sql`select tool, ok, client_version from public.agent_audit where connection_id = ${id} order by created_at`;
    expect(audit.map((a) => a.tool)).toEqual(["moi", "voir_projet"]);
    expect(audit[0].client_version).toBe("1.0");
  });

  it("refusent un outil dont la connexion n'a pas la permission", async () => {
    const { id } = await connection();
    const identity = { connectionId: id, userId: ALICE, scopes: [] as never[], clientName: "Test" };
    const out = await runTool(TOOLS[0], identity, {}, null);
    expect(out).toEqual({ error: "Cette connexion n'a pas la permission « lecture »." });
  });
});

describe("outils d'écriture (phase 2)", () => {
  const NEON = "neon-pusher"; // projet publié d'Alice
  const AGENT = "Agent intégration";
  const write = { scopes: ["lecture", "projet", "devlog", "commentaires"] as ("lecture" | "projet" | "devlog" | "commentaires")[], clientName: AGENT };
  const tool = (name: string) => TOOLS.find((t) => t.name === name)!;
  let identity: { connectionId: string; userId: string; scopes: typeof write.scopes; clientName: string };

  beforeAll(async () => {
    identity = { connectionId: (await connection()).id, userId: ALICE, ...write };
  });

  afterAll(async () => {
    await sql`delete from public.posts where via_agent = ${AGENT}`;
    await sql`delete from public.comments where via_agent = ${AGENT}`;
    await sql`delete from public.reports where reason = 'Test intégration agents'`;
    await sql`update public.app_settings set agent_disabled_scopes = '{}' where id`;
  });

  it("écrit un brouillon, le modifie puis le publie, avec la mention « via »", async () => {
    const created = (await runTool(tool("creer_devlog"), identity, { slug: NEON, titre: "Brouillon agent", texte: "## Avancée\n\n- **saut** fini" }, null)) as {
      result: { id: string; statut: string; numero: number | null };
    };
    expect(created.result).toMatchObject({ statut: "brouillon", numero: null });
    const [draft] = await sql`select body, via_agent, status from public.posts where id = ${created.result.id}`;
    expect(draft).toMatchObject({ via_agent: AGENT, status: "draft" });
    expect(draft.body).toBe("<h2>Avancée</h2><ul><li><p><strong>saut</strong> fini</p></li></ul>");

    await runTool(tool("modifier_devlog"), identity, { id: created.result.id, titre: "Le saut est fini" }, null);
    const published = (await runTool(tool("publier_devlog"), identity, { id: created.result.id }, null)) as { result: { numero: number; adresse: string } };
    expect(published.result.numero).toBeGreaterThan(0);
    expect(published.result.adresse).toContain(`/p/${NEON}/devlog/${published.result.numero}`);
    const [post] = await sql`select title, status from public.posts where id = ${created.result.id}`;
    expect(post).toMatchObject({ title: "Le saut est fini", status: "published" });
  });

  it("refuse d'écrire dans le projet d'un autre groupe ou de commenter un brouillon invisible", async () => {
    expect(await runTool(tool("creer_devlog"), identity, { slug: "table-tempete", titre: "Intrus", texte: "x" }, null)).toEqual({
      error: "Tu ne fais pas partie de l'équipe de ce projet : modification impossible.",
    });
    expect(await runTool(tool("commenter"), identity, { slug: "rythme-hall", texte: "Coucou" }, null)).toEqual({
      error: "Projet introuvable (ou non visible pour toi).",
    });
    expect(await runTool(tool("modifier_bases"), identity, { slug: NEON, debut: "2027-06-01", fin: "2027-01-01" }, null)).toEqual({
      error: "La fin doit être après le début.",
    });
  });

  it("commente, répond dans le même fil et signale", async () => {
    const comment = (await runTool(tool("commenter"), identity, { slug: "table-tempete", texte: "Très beau projet" }, null)) as { result: { commentaire_id: string } };
    const reply = (await runTool(tool("repondre"), identity, { commentaire_id: comment.result.commentaire_id, texte: "Et une réponse" }, null)) as {
      result: { commentaire_id: string };
    };
    const second = (await runTool(tool("repondre"), identity, { commentaire_id: reply.result.commentaire_id, texte: "Réponse à la réponse" }, null)) as {
      result: { commentaire_id: string };
    };
    const [row] = await sql`select parent_id, via_agent from public.comments where id = ${second.result.commentaire_id}`;
    expect(row).toMatchObject({ parent_id: comment.result.commentaire_id, via_agent: AGENT });

    const reported = await runTool(tool("signaler"), identity, { type: "projet", slug: "table-tempete", raison: "Test intégration agents" }, null);
    expect(reported).toMatchObject({ result: { ok: true } });
  });

  it("retire une permission désactivée par l'admin, à l'appel suivant", async () => {
    const { token } = await connection();
    await sql`update public.agent_connections set scopes = ${["lecture", "devlog"]} where id = (select connection_id from public.agent_tokens where hash = ${sha256Hex(token)})`;
    expect((await verifyBearer(token))?.scopes.sort()).toEqual(["devlog", "lecture"]);
    await sql`update public.app_settings set agent_disabled_scopes = ${["devlog"]} where id`;
    expect((await verifyBearer(token))?.scopes).toEqual(["lecture"]);
    await sql`update public.app_settings set agent_disabled_scopes = '{}' where id`;
  });

  it("limite les écritures à 20 par heure et par connexion", async () => {
    const limited = { ...identity, connectionId: (await connection()).id };
    await sql`
      insert into public.agent_audit (connection_id, user_id, tool, ok)
      select ${limited.connectionId}, ${ALICE}, 'commenter', true from generate_series(1, 20)`;
    expect(await runTool(tool("commenter"), limited, { slug: "table-tempete", texte: "Encore" }, null)).toEqual({
      error: "Limite atteinte : 20 modifications par heure via un agent.",
    });
    expect(await runTool(tool("moi"), limited, {}, null)).toHaveProperty("result");
  });
});

describe("outils de l'équipe pédagogique (phases 3 et 4)", () => {
  const PROF = "00000000-0000-4000-a000-000000000001";
  const tool = (name: string) => TOOLS.find((t) => t.name === name)!;
  const teacherScopes = ["lecture", "commentaires", "contraintes", "financement", "moderation"] as ("lecture" | "commentaires" | "contraintes" | "financement" | "moderation")[];
  let prof: { connectionId: string; userId: string; scopes: typeof teacherScopes; clientName: string };
  type Recap = { result: { confirmation_requise: true; recapitulatif: string; code_de_confirmation: string } };

  beforeAll(async () => {
    const [c] = await sql<{ id: string }[]>`
      insert into public.agent_connections (user_id, kind, name, scopes, key_prefix, expires_at)
      values (${PROF}, 'api_key', 'Prof intégration', ${teacherScopes}, 'spk_profint', now() + interval '10 days') returning id`;
    connections.push(c.id);
    prof = { connectionId: c.id, userId: PROF, scopes: teacherScopes, clientName: "Agent prof" };
  });

  afterAll(async () => {
    await sql`delete from public.investments where investor_id = ${PROF} and project_id = (select id from public.projects where slug = 'table-tempete')`;
    await sql`update public.projects set status = 'draft' where slug = 'rythme-hall'`;
    await sql`update public.projects set status = 'published' where slug = 'table-tempete'`;
    await sql`delete from public.reports where reason = 'Signalement intégration staff'`;
  });

  it("finance en deux temps : récapitulatif sans effet, puis code à usage unique et paramètres identiques", async () => {
    const params = { slug: "table-tempete", montant: 1234, mot: "Bravo pour la tempête !" };
    const recap = (await runTool(tool("financer"), prof, params, null)) as Recap;
    expect(recap.result.confirmation_requise).toBe(true);
    expect(recap.result.recapitulatif).toMatch(/Financer « Table Tempête » de 1\s234\s€/);
    expect(recap.result.recapitulatif).toContain("aujourd'hui : 0/10");
    const code = recap.result.code_de_confirmation;
    const before = await sql`select count(*)::int as n from public.investments where investor_id = ${PROF} and amount = 1234`;
    expect(before[0].n).toBe(0);

    // Le code ne vaut que pour ces paramètres exacts.
    expect(await runTool(tool("financer"), prof, { ...params, montant: 99999, confirmation: code }, null)).toHaveProperty("error");
    const done = (await runTool(tool("financer"), prof, { ...params, confirmation: code }, null)) as { result: { financement_id: string; mot: string } };
    expect(done.result.mot).toBe("publié dans les commentaires");
    const [comment] = await sql`select body, via_agent from public.comments where investment_id = ${done.result.financement_id}`;
    expect(comment).toMatchObject({ body: "Bravo pour la tempête !", via_agent: "Agent prof" });

    // Déjà utilisé : refusé.
    expect(await runTool(tool("financer"), prof, { ...params, confirmation: code }, null)).toHaveProperty("error");

    // Retrait, toujours en deux temps.
    const withdraw = (await runTool(tool("retirer_financement"), prof, { financement_id: done.result.financement_id }, null)) as Recap;
    expect(withdraw.result.recapitulatif).toMatch(/Retirer ton financement de 1\s234\s€/);
    await runTool(tool("retirer_financement"), prof, { financement_id: done.result.financement_id, confirmation: withdraw.result.code_de_confirmation }, null);
    const after = await sql`select count(*)::int as n from public.investments where id = ${done.result.financement_id}`;
    expect(after[0].n).toBe(0);
  });

  it("limite les financements via un agent à 10 par jour", async () => {
    await sql`
      insert into public.agent_audit (connection_id, user_id, tool, ok)
      select ${prof.connectionId}, ${PROF}, 'financer', true from generate_series(1, 10)`;
    expect(await runTool(tool("financer"), prof, { slug: "table-tempete", montant: 10 }, null)).toEqual({
      error: "Limite atteinte : 10 financements par jour via un agent (création, modification et retrait compris). Tu peux continuer directement sur Sparkly.",
    });
    await sql`delete from public.agent_audit where connection_id = ${prof.connectionId} and tool = 'financer'`;
  });

  it("refuse le financement à un compte qui n'est pas enseignant", async () => {
    const student = { connectionId: (await connection()).id, userId: ALICE, scopes: ["financement" as const], clientName: "Intrus" };
    expect(await runTool(tool("financer"), student, { slug: "table-tempete", montant: 10 }, null)).toEqual({
      error: "Seul·es les enseignant·es peuvent financer un projet.",
    });
  });

  it("fixe les contraintes d'un projet par identifiants", async () => {
    const ok = (await runTool(tool("fixer_contraintes"), prof, { slug: "table-tempete", plateforme: "tv" }, null)) as { result: { contraintes: { plateforme: string } } };
    expect(ok.result.contraintes.plateforme).toBe("tv");
    expect(await runTool(tool("fixer_contraintes"), prof, { slug: "table-tempete", type_de_jeu: "inexistant" }, null)).toEqual({
      error: "Type de jeu inconnu : « inexistant » (voir lister_contraintes).",
    });
    await sql`update public.projects set platform = 'cocktail' where slug = 'table-tempete'`;
  });

  it("modère : signalements, masquer et rétablir un projet, publier un brouillon, avec confirmation", async () => {
    await sql`insert into public.reports (target_type, target_id, reason) select 'project', id, 'Signalement intégration staff' from public.projects where slug = 'table-tempete'`;
    const reports = (await runTool(tool("voir_signalements"), prof, {}, null)) as { result: { signalements: { raison: string; projet: string }[] } };
    expect(reports.result.signalements.find((r) => r.raison === "Signalement intégration staff")?.projet).toBe("table-tempete");

    const hide = (await runTool(tool("masquer"), prof, { type: "projet", slug: "table-tempete" }, null)) as Recap;
    expect(hide.result.recapitulatif).toContain("Masquer le projet « Table Tempête »");
    await runTool(tool("masquer"), prof, { type: "projet", slug: "table-tempete", confirmation: hide.result.code_de_confirmation }, null);
    expect((await sql`select status from public.projects where slug = 'table-tempete'`)[0].status).toBe("hidden");

    const restore = (await runTool(tool("retablir"), prof, { type: "projet", slug: "table-tempete" }, null)) as Recap;
    await runTool(tool("retablir"), prof, { type: "projet", slug: "table-tempete", confirmation: restore.result.code_de_confirmation }, null);
    expect((await sql`select status from public.projects where slug = 'table-tempete'`)[0].status).toBe("draft");

    const publish = (await runTool(tool("publier_brouillon"), prof, { slug: "rythme-hall" }, null)) as Recap;
    await runTool(tool("publier_brouillon"), prof, { slug: "rythme-hall", confirmation: publish.result.code_de_confirmation }, null);
    expect((await sql`select status from public.projects where slug = 'rythme-hall'`)[0].status).toBe("published");
  });

  it("refuse la modération à un compte étudiant, même avec la permission", async () => {
    const student = { connectionId: (await connection()).id, userId: ALICE, scopes: ["moderation" as const], clientName: "Intrus" };
    expect(await runTool(tool("voir_signalements"), student, {}, null)).toEqual({ error: "Réservé à l'équipe pédagogique." });
  });
});
