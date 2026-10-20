# ✦ Sparkly

> *Every idea starts with a spark.*

Plateforme façon Kickstarter pour la SAÉ « jeu d'arcade » du BUT MMI. Chaque **groupe** publie la page de son projet et montre son **avancée** :
- planning de jalons ;
- devlog (« Mise à jour n°X ») ;
- retours de la promo et des profs.

Aucun argent réel : la barre de financement de Kickstarter devient la **jauge d'avancée**.

## Fonctionnalités

- **Vue publique**
  - accueil, page *Découvrir* (recherche, genres, plateforme, état, tris) et profils publics ;
  - page projet à onglets : Campagne, Planning, Actualités, FAQ, Commentaires, Équipe.
- **Informations minimales du gabarit pédagogique**
  - logo, nom et phrase d'accroche ;
  - vidéo ;
  - deux jauges : **Avancée du projet** (jalons) et **Timeline du projet** (temps écoulé, avec la date de fin) ;
  - description, équipe, planning, dernières actualités.
- **Comptes**
  - connexion sans mot de passe, par code à 6 chiffres reçu par e-mail ;
  - réservée aux adresses `@etudiant.univ-reims.fr` (rôle étudiant) et `@univ-reims.fr` (rôle enseignant) ;
  - la restriction est appliquée **en base** par un hook Supabase Auth, impossible à contourner par l'API.
- **Un projet par groupe, plusieurs projets par personne**
  - le créateur devient chef·fe de projet et invite ses camarades par e-mail ; il ou elle peut ensuite passer le relais à un autre membre (onglet Équipe) ;
  - une même personne peut faire partie de plusieurs groupes, avec un rôle différent dans chacun ;
  - les 6 jalons du planning de la SAÉ sont créés automatiquement.
- **Éditeur**
  - bases (visuels compressés en WebP, vidéo YouTube/Vimeo, liens, dates) ;
  - adresse du projet personnalisable (`/p/orbit-smash`) : les anciens liens redirigent vers la nouvelle adresse, qu'aucun autre projet ne peut reprendre ;
  - avertissement (non bloquant) quand un autre projet porte déjà le même nom, casse et accents ignorés ;
  - description (éditeur riche) ;
  - planning, devlog (brouillon ou publication), équipe, FAQ, publication.
- **Financement fictif par les enseignant·es**
  - chaque prof dispose d'un budget annuel (120 000 € par défaut), remis à zéro chaque 1er septembre ;
  - objectif commun à tous les projets (10 000 € par défaut), dépassable ; jauge en euros sur les cartes et la page projet ;
  - un financement est modifiable ou retirable tant que le projet n'est pas terminé ; la liste des financeurs est publique ;
  - règles appliquées en base : seuls les comptes enseignant financent, budget non dépassable.
- **Limite de projets par étudiant·e** : nombre maximum de projets créés ou rejoints par année universitaire, réglable par l'admin (illimité par défaut).
- **Communauté :** commentaires avec un niveau de réponse, suivi de projets, fil des projets suivis, signalements.
- **Administration**
  - statistiques et projets en retard sur le planning ;
  - modération (masquer un projet, un commentaire), signalements ;
  - comptes (rôle, suspension, suppression) ;
  - réglages (dates de la promo, domaines autorisés, genres).

## Stack

| Couche | Choix |
|---|---|
| Front et serveur | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS 4, lucide-react, Tiptap (éditeur riche) |
| Données | Supabase : Postgres, Auth (OTP e-mail), Storage, Row Level Security |
| Validation | Zod (client et serveur), `sanitize-html` pour le contenu riche |
| Tests | Vitest + Testing Library (unitaires, composants, intégration), pgTAP (base), Playwright (E2E) |
| CI/CD | GitHub Actions et Vercel |

## Démarrer en local

Prérequis : Node 22, pnpm, Docker.

```bash
pnpm install
pnpm db:start          # Supabase local : migrations + seed minimal
cp .env.example .env.local   # puis recopier les clés affichées par db:start
pnpm db:fixtures       # optionnel : 9 projets de démo, 22 comptes, visuels générés
pnpm dev
```

- Application : http://localhost:3000
- Supabase Studio : http://127.0.0.1:54323
- E-mails de connexion (Mailpit) : http://127.0.0.1:54324

`pnpm db:demo` remet la base à zéro puis recharge les fixtures. Le script refuse de tourner sur un Supabase qui n'est pas local. Les visuels (couvertures, logos, captures de devlog) sont des compositions SVG originales, rendues en image avec le Chromium de Playwright.

Comptes de démo (seed local uniquement) : `alice.demo@etudiant.univ-reims.fr` (étudiante, cheffe de *Neon Pusher*), `prof.demo@univ-reims.fr` (enseignant) et `admin.demo@univ-reims.fr` (admin). Avec les fixtures, s'ajoutent par exemple `lea.bernard.fixture@etudiant.univ-reims.fr`, membre de deux projets. Le code de connexion arrive dans Mailpit.

## Tests

| Commande | Contenu |
|---|---|
| `pnpm test` | Tests unitaires et de composants (logique métier, validation, blocs de la page projet) |
| `pnpm test:coverage` | Les mêmes, avec couverture |
| `pnpm test:db` | Tests pgTAP : RLS, triggers (avancée, numérotation des devlogs, jalons par défaut), hook de domaine |
| `pnpm test:integration` | Vraie API Supabase locale : connexion par code, cycle de vie d'un projet, invitations |
| `pnpm test:e2e` | Playwright sur le build de production : parcours public, parcours étudiant complet, administration |

Les tests d'intégration et E2E nécessitent `pnpm db:start` et les variables de `.env.local` exportées dans le shell.

## Architecture

```
src/
  app/                    routes (App Router)
    (auth)/login          connexion par code
    p/[slug]/(public)/    page projet et ses onglets
    p/[slug]/edit/        éditeur du groupe
    dashboard/ settings/ u/[username]/ admin/
  components/             ui/, project/, editor/, layout/, admin/
  lib/
    domain/               logique pure testée (avancée, timeline, e-mails, slugs, vidéos, assainissement)
    validation/           schémas Zod
    data/                 lectures côté serveur
    supabase/             clients serveur, navigateur et admin, types générés
supabase/
  migrations/             schéma, triggers, RLS, hook Auth, stockage
  tests/database/         tests pgTAP
  seed.sql                données de démo (local uniquement)
tests/                    intégration et E2E
```

La sécurité repose sur la base, pas sur l'interface :
- chaque table est protégée par des règles RLS ;
- l'avancée et la numérotation des devlogs sont calculées par des triggers ;
- les actions serveur revérifient les droits ;
- la clé `service_role` ne sert qu'à la suppression de comptes par un admin, côté serveur.

## CI/CD

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `ci.yml` | PR, push sur `develop` et `main` | Lint, types, tests unitaires et couverture ; Supabase local puis pgTAP, intégration et E2E |
| `deploy.yml` | CI verte | PR et `develop` : preview Vercel et Supabase de test. `main` : migrations et production |
| `keepalive.yml` | Chaque jour | Évite la mise en pause des projets Supabase gratuits |
| `backup.yml` | Chaque semaine | Dump chiffré de la production (artefact privé de 30 jours) |

Le déploiement Git automatique de Vercel est désactivé (`vercel.json`) : seule la CI déploie.

### Secrets et variables à configurer (environnements GitHub `production` et `preview`)

| Nom | Type | Usage |
|---|---|---|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secrets (dépôt) | Déploiement Vercel |
| `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | secrets (par environnement) | Migrations et sauvegardes |
| `SUPABASE_POOLER_HOST` | variable (par environnement) | Hôte du *session pooler* (ex. `aws-1-eu-west-3.pooler.supabase.com`) : les migrations passent par lui, sans l'API de gestion |
| `BACKUP_PASSPHRASE` | secret (production) | Chiffrement des sauvegardes |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | variables (par environnement) | Keep-alive |

Côté Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, et `NEXT_PUBLIC_SITE_URL` en production uniquement (`https://sparkly.lbalocchi.fr`). Les previews reprennent l'adresse réelle de la requête : la CI construit le site avant l'envoi à Vercel, l'URL du déploiement n'est donc pas connue au build.

Côté Supabase hébergé, à faire une fois par projet :
- activer le hook *Before User Created* sur `public.hook_before_user_created` ;
- reprendre le modèle d'e-mail `supabase/templates/otp.html` ;
- configurer un SMTP (Brevo ou Resend : l'expéditeur intégré n'envoie que quelques e-mails par heure) ;
- renseigner l'URL du site.

## Conventions

- Messages de commit au format Conventional Commits (`feat:`, `fix:`, `test:`…).

### Branches (gitflow)

| Branche | Part de | Revient dans | Rôle |
|---|---|---|---|
| `main` | — | — | Production (https://sparkly.lbalocchi.fr). Ne reçoit que des `release/*` et `hotfix/*` |
| `develop` | `main` | — | Intégration, branche par défaut. Chaque push part en preview |
| `feature/<sujet>` | `develop` | `develop` (PR) | Une fonctionnalité ou un correctif non urgent |
| `release/<version>` | `develop` | `main` puis `develop` | Gel avant mise en production (numéro de version, derniers correctifs) |
| `hotfix/<sujet>` | `main` | `main` puis `develop` | Correctif urgent en production |

`main` et `develop` sont protégées : pas de push direct ni de force push, merge uniquement par PR avec la CI verte. Les mises à jour Dependabot visent `develop`.

```bash
git switch develop && git pull
git switch -c feature/ma-fonctionnalite
# … commits …
git push -u origin feature/ma-fonctionnalite
gh pr create --base develop
```
