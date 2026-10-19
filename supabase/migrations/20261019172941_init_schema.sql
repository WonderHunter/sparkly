-- =============================================================================
-- Sparkly — schéma initial
-- Plateforme façon Kickstarter pour suivre l'avancée des projets de la SAÉ MMI.
-- Un projet par groupe, pas d'argent réel : l'avancée se mesure par les jalons.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.project_status as enum ('draft', 'published', 'hidden');
create type public.platform as enum ('borne', 'cocktail', 'tv', 'web');
create type public.milestone_status as enum ('todo', 'in_progress', 'done');
create type public.member_role as enum ('owner', 'dev', 'crea');
create type public.post_status as enum ('draft', 'published');
create type public.report_target as enum ('project', 'post', 'comment');

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Réglages globaux (une seule ligne) et domaines autorisés
-- -----------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  school_year text not null default '2026-2027',
  default_starts_on date not null default '2026-09-01',
  default_ends_on date not null default '2027-01-31',
  -- Adresses qui deviennent admin à leur première connexion (bootstrap).
  admin_emails text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (default_ends_on > default_starts_on)
);
insert into public.app_settings (id) values (true);

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

create table public.allowed_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  -- Rôle attribué par défaut aux comptes de ce domaine.
  default_role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);
insert into public.allowed_email_domains (domain, default_role) values
  ('etudiant.univ-reims.fr', 'student'),
  ('univ-reims.fr', 'teacher');

create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  position smallint not null default 0
);
insert into public.categories (slug, name, position) values
  ('action', 'Action', 1),
  ('arcade', 'Arcade classique', 2),
  ('puzzle', 'Puzzle / Réflexion', 3),
  ('plateforme', 'Plateforme', 4),
  ('shoot', 'Shoot''em up', 5),
  ('course', 'Course', 6),
  ('rythme', 'Rythme', 7),
  ('party', 'Party game', 8),
  ('autre', 'Autre', 9);

-- -----------------------------------------------------------------------------
-- Profils (1-1 avec auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  role public.user_role not null default 'student',
  promo text check (char_length(promo) <= 40),
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (security definer pour éviter la récursion RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Prof ou admin : peut tout voir et modérer.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('teacher', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Compte connecté et non suspendu.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and suspended_at is null
  );
$$;

-- Dates par défaut d'un projet : celles de la promo en cours (réglables par l'admin).
create or replace function public.default_project_starts_on()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select default_starts_on from public.app_settings where id;
$$;

create or replace function public.default_project_ends_on()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select default_ends_on from public.app_settings where id;
$$;

-- -----------------------------------------------------------------------------
-- Projets (un par groupe)
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 2 and 80),
  pitch text not null default '' check (char_length(pitch) <= 200),
  story text not null default '' check (char_length(story) <= 100000),
  logo_url text,
  cover_url text,
  video_url text,
  category_id smallint references public.categories (id) on delete set null,
  platform public.platform not null default 'borne',
  status public.project_status not null default 'draft',
  starts_on date not null default public.default_project_starts_on(),
  ends_on date not null default public.default_project_ends_on(),
  progress smallint not null default 0 check (progress between 0 and 100),
  game_url text,
  repo_url text,
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('french', coalesce(title, '') || ' ' || coalesce(pitch, ''))
  ) stored,
  check (ends_on > starts_on)
);
create unique index projects_slug_key on public.projects (lower(slug));
create index projects_status_idx on public.projects (status, published_at desc);
create index projects_fts_idx on public.projects using gin (fts);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Membres du projet (un étudiant = un seul projet)
-- -----------------------------------------------------------------------------
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'dev',
  team_title text not null default '' check (char_length(team_title) <= 60),
  position smallint not null default 0,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create unique index project_members_one_project_per_user on public.project_members (user_id);

create or replace function public.is_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.project_is_public(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects where id = p_project and status = 'published'
  );
$$;

create or replace function public.can_view_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.project_is_public(p_project)
      or public.is_member(p_project)
      or public.is_staff();
$$;

-- Les membres peuvent éditer le projet (sauf s'ils sont suspendus).
create or replace function public.can_edit_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (public.is_member(p_project) and public.is_active_user()) or public.is_admin();
$$;

-- -----------------------------------------------------------------------------
-- Invitations d'équipe
-- -----------------------------------------------------------------------------
create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$'),
  role public.member_role not null default 'dev' check (role <> 'owner'),
  team_title text not null default '' check (char_length(team_title) <= 60),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

-- -----------------------------------------------------------------------------
-- Jalons (planning) : alimentent la jauge « Avancée du projet »
-- -----------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  weight smallint not null default 10 check (weight between 0 and 100),
  status public.milestone_status not null default 'todo',
  period_label text not null default '' check (char_length(period_label) <= 40),
  starts_on date,
  ends_on date,
  position smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index milestones_project_idx on public.milestones (project_id, position);

create trigger milestones_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

-- Avancée = somme pondérée (terminé = 1, en cours = 0,5) / somme des poids.
create or replace function public.compute_progress(p_project uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    round(
      100.0 * sum(weight * case status when 'done' then 1 when 'in_progress' then 0.5 else 0 end)
      / nullif(sum(weight), 0)
    )::smallint,
    0::smallint
  )
  from public.milestones
  where project_id = p_project;
$$;

create or replace function public.refresh_project_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid := coalesce(new.project_id, old.project_id);
begin
  perform set_config('sparkly.allow_progress', 'on', true);
  update public.projects
    set progress = public.compute_progress(v_project)
    where id = v_project;
  perform set_config('sparkly.allow_progress', 'off', true);
  return null;
end;
$$;

create trigger milestones_refresh_progress
  after insert or update or delete on public.milestones
  for each row execute function public.refresh_project_progress();

create or replace function public.milestones_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger milestones_set_completed_at before insert or update on public.milestones
  for each row execute function public.milestones_completed_at();

-- -----------------------------------------------------------------------------
-- Devlog (« Dernières actualités »)
-- -----------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  number integer,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '' check (char_length(body) <= 50000),
  images text[] not null default '{}' check (cardinality(images) <= 8),
  milestone_id uuid references public.milestones (id) on delete set null,
  status public.post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index posts_project_idx on public.posts (project_id, published_at desc);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- À la publication : numéro « Mise à jour n°X » et date.
create or replace function public.posts_on_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if new.number is null then
      perform pg_advisory_xact_lock(hashtext(new.project_id::text));
      select coalesce(max(number), 0) + 1 into new.number
        from public.posts where project_id = new.project_id;
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_set_number before insert or update on public.posts
  for each row execute function public.posts_on_publish();

-- -----------------------------------------------------------------------------
-- FAQ, commentaires, suivis, signalements
-- -----------------------------------------------------------------------------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  answer text not null check (char_length(answer) between 1 and 2000),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index faqs_project_idx on public.faqs (project_id, position);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_project_idx on public.comments (project_id, created_at desc);
create index comments_post_idx on public.comments (post_id, created_at);

create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- Une seule profondeur de réponse, dans le même projet / post.
create or replace function public.comments_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.comments;
begin
  if new.post_id is not null and not exists (
    select 1 from public.posts where id = new.post_id and project_id = new.project_id
  ) then
    raise exception 'Le post n''appartient pas à ce projet' using errcode = '23514';
  end if;
  if new.parent_id is not null then
    select * into v_parent from public.comments where id = new.parent_id;
    if v_parent.parent_id is not null then
      raise exception 'On ne peut répondre qu''à un commentaire de premier niveau' using errcode = '23514';
    end if;
    if v_parent.project_id <> new.project_id
       or v_parent.post_id is distinct from new.post_id then
      raise exception 'La réponse doit être dans le même fil' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_check_parent before insert or update of parent_id, post_id, project_id
  on public.comments for each row execute function public.comments_check_parent();

create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
create index follows_project_idx on public.follows (project_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  target_id uuid not null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index reports_open_idx on public.reports (created_at desc) where resolved_at is null;

-- -----------------------------------------------------------------------------
-- Gardes métier sur les colonnes sensibles
-- -----------------------------------------------------------------------------

-- Seul un admin change le rôle ou la suspension d'un profil.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Action réservée aux administrateurs' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Statut « masqué » réservé à l'équipe pédagogique, avancée calculée uniquement en base.
create or replace function public.projects_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(current_setting('sparkly.allow_progress', true), 'off') <> 'on' then
      new.progress := old.progress;
    end if;
    if new.created_by is distinct from old.created_by and auth.uid() is not null and not public.is_admin() then
      new.created_by := old.created_by;
    end if;
    if auth.uid() is not null and not public.is_staff()
       and (new.status = 'hidden' or old.status = 'hidden')
       and new.status is distinct from old.status then
      raise exception 'Seule l''équipe pédagogique peut masquer ou rétablir un projet' using errcode = '42501';
    end if;
  else
    new.progress := 0;
    if auth.uid() is not null and new.status = 'hidden' and not public.is_staff() then
      new.status := 'draft';
    end if;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_guard before insert or update on public.projects
  for each row execute function public.projects_guard();

-- -----------------------------------------------------------------------------
-- Création de projet : le créateur devient « owner », 6 jalons par défaut
-- (planning du gabarit pédagogique : préparation 8 %, moteur 42 %, polish 50 %).
-- -----------------------------------------------------------------------------
create or replace function public.projects_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  y integer := extract(year from new.starts_on)::integer;
begin
  if extract(month from new.starts_on) < 7 then
    y := y - 1;
  end if;

  if new.created_by is not null then
    insert into public.project_members (project_id, user_id, role, team_title, position)
    values (new.id, new.created_by, 'owner', 'Chef·fe de projet', 0);
  end if;

  insert into public.milestones (project_id, title, description, weight, period_label, starts_on, ends_on, position)
  values
    (new.id, 'Conception', 'Type de jeu, storytelling, moodboard', 8, 'Septembre',
      make_date(y, 9, 1), make_date(y, 9, 30), 1),
    (new.id, 'Prototypage', 'Fonctionnalités de base', 17, 'Octobre',
      make_date(y, 10, 1), make_date(y, 10, 31), 2),
    (new.id, 'Développement', 'Gestion des parties, intégration', 25, 'Novembre - décembre',
      make_date(y, 11, 1), make_date(y, 12, 15), 3),
    (new.id, 'Tests et ajustements', 'Identification des bugs', 15, 'Décembre',
      make_date(y, 12, 1), make_date(y, 12, 20), 4),
    (new.id, 'Intégration complète', 'Adaptation du jeu à la borne', 15, 'Décembre',
      make_date(y, 12, 1), make_date(y, 12, 31), 5),
    (new.id, 'Validation et déploiement', 'Derniers ajustements', 20, 'Janvier',
      make_date(y + 1, 1, 1), make_date(y + 1, 1, 31), 6);

  return null;
end;
$$;

create trigger projects_after_insert after insert on public.projects
  for each row execute function public.projects_after_insert();

-- -----------------------------------------------------------------------------
-- Comptes : restriction de domaine (hook Auth) et création du profil
-- -----------------------------------------------------------------------------
create or replace function public.email_domain(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(split_part(p_email, '@', 2));
$$;

create or replace function public.is_allowed_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_email_domains
    where domain = public.email_domain(p_email)
  );
$$;

-- Hook « before user created » : refuse toute adresse hors des domaines autorisés,
-- y compris via un appel direct à l'API Auth.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is null or not public.is_allowed_email(v_email) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Sparkly est réservé aux adresses @univ-reims.fr et @etudiant.univ-reims.fr.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(new.email);
  v_local text := split_part(v_email, '@', 1);
  v_base text;
  v_username text;
  v_display text;
  v_role public.user_role;
begin
  v_base := regexp_replace(regexp_replace(v_local, '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g');
  if char_length(v_base) < 2 then
    v_base := 'membre';
  end if;
  v_base := left(v_base, 24);
  v_username := v_base;
  while exists (select 1 from public.profiles where lower(username) = v_username) loop
    v_username := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  v_display := initcap(regexp_replace(v_local, '[._-]+', ' ', 'g'));
  if char_length(v_display) < 1 then
    v_display := v_username;
  end if;

  select default_role into v_role
    from public.allowed_email_domains where domain = public.email_domain(v_email);
  if exists (select 1 from public.app_settings where v_email = any (admin_emails)) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, username, display_name, role)
  values (new.id, v_username, left(v_display, 80), coalesce(v_role, 'student'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RPC : invitations
-- -----------------------------------------------------------------------------
create or replace function public.accept_invitation(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.project_invitations;
  v_email text;
begin
  if not public.is_active_user() then
    raise exception 'Compte inactif' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_inv from public.project_invitations where id = p_invitation;
  if v_inv.id is null or v_inv.email <> v_email then
    raise exception 'Invitation introuvable' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.project_members where user_id = auth.uid()) then
    raise exception 'Tu fais déjà partie d''un projet' using errcode = '23505';
  end if;

  insert into public.project_members (project_id, user_id, role, team_title, position)
  values (
    v_inv.project_id, auth.uid(), v_inv.role, v_inv.team_title,
    (select coalesce(max(position), 0) + 1 from public.project_members where project_id = v_inv.project_id)
  );
  delete from public.project_invitations where id = v_inv.id;
  return v_inv.project_id;
end;
$$;

-- Les invitations visibles par l'utilisateur connecté (par son e-mail).
create or replace function public.my_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Vue des cartes projet (respecte la RLS de l'appelant)
-- -----------------------------------------------------------------------------
create view public.project_cards
with (security_invoker = true)
as
select
  p.id, p.slug, p.title, p.pitch, p.logo_url, p.cover_url, p.platform, p.status,
  p.progress, p.starts_on, p.ends_on, p.published_at, p.created_at, p.updated_at,
  p.category_id, c.slug as category_slug, c.name as category_name, p.fts,
  (select count(*) from public.project_members m where m.project_id = p.id)::int as members_count,
  (select count(*) from public.follows f where f.project_id = p.id)::int as followers_count,
  (select count(*) from public.comments cm where cm.project_id = p.id and cm.hidden_at is null)::int as comments_count,
  (select count(*) from public.posts po where po.project_id = p.id and po.status = 'published')::int as posts_count,
  (select max(po.published_at) from public.posts po where po.project_id = p.id and po.status = 'published') as last_post_at
from public.projects p
left join public.categories c on c.id = p.category_id;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.allowed_email_domains enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.milestones enable row level security;
alter table public.posts enable row level security;
alter table public.faqs enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;

-- Réglages, domaines, catégories
create policy "settings: lecture publique" on public.app_settings for select using (true);
create policy "settings: admin" on public.app_settings for update using (public.is_admin()) with check (public.is_admin());

create policy "domaines: lecture publique" on public.allowed_email_domains for select using (true);
create policy "domaines: admin" on public.allowed_email_domains for all using (public.is_admin()) with check (public.is_admin());

create policy "catégories: lecture publique" on public.categories for select using (true);
create policy "catégories: admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Profils : publics (aucune donnée sensible), modifiables par leur propriétaire
create policy "profils: lecture publique" on public.profiles for select using (true);
create policy "profils: mise à jour par soi-même" on public.profiles for update
  using (id = auth.uid() and public.is_active_user()) with check (id = auth.uid());
create policy "profils: admin" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Projets
create policy "projets: lecture" on public.projects for select
  using (
    status = 'published'
    or public.is_member(id)
    or public.is_staff()
    -- Permet au créateur de relire la ligne au moment de l'INSERT ... RETURNING.
    or created_by = auth.uid()
  );
create policy "projets: création" on public.projects for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_active_user()
    and not exists (select 1 from public.project_members where user_id = auth.uid())
  );
create policy "projets: modification" on public.projects for update
  using (public.can_edit_project(id) or public.is_staff())
  with check (public.can_edit_project(id) or public.is_staff());
create policy "projets: suppression" on public.projects for delete
  using ((public.is_owner(id) and public.is_active_user()) or public.is_admin());

-- Membres
create policy "membres: lecture" on public.project_members for select
  using (public.can_view_project(project_id));
create policy "membres: modification" on public.project_members for update
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "membres: retrait" on public.project_members for delete
  using (
    public.is_admin()
    or (public.is_owner(project_id) and role <> 'owner')
    or (user_id = auth.uid() and role <> 'owner')
  );

-- Invitations
create policy "invitations: lecture" on public.project_invitations for select
  using (public.is_member(project_id) or email = public.my_email() or public.is_staff());
create policy "invitations: création" on public.project_invitations for insert to authenticated
  with check (
    public.can_edit_project(project_id)
    and public.is_allowed_email(email)
    and invited_by = auth.uid()
  );
create policy "invitations: suppression" on public.project_invitations for delete
  using (public.can_edit_project(project_id) or email = public.my_email());

-- Jalons et FAQ : lisibles avec le projet, éditables par ses membres
create policy "jalons: lecture" on public.milestones for select using (public.can_view_project(project_id));
create policy "jalons: écriture" on public.milestones for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "faq: lecture" on public.faqs for select using (public.can_view_project(project_id));
create policy "faq: écriture" on public.faqs for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- Devlog
create policy "posts: lecture" on public.posts for select
  using (
    (status = 'published' and public.project_is_public(project_id))
    or public.is_member(project_id)
    or public.is_staff()
  );
create policy "posts: création" on public.posts for insert to authenticated
  with check (public.can_edit_project(project_id) and author_id = auth.uid());
create policy "posts: modification" on public.posts for update
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "posts: suppression" on public.posts for delete
  using (public.can_edit_project(project_id) or public.is_staff());

-- Commentaires
create policy "commentaires: lecture" on public.comments for select
  using (
    public.is_staff()
    or (public.can_view_project(project_id) and (hidden_at is null or author_id = auth.uid()))
  );
create policy "commentaires: création" on public.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and hidden_at is null
    and public.project_is_public(project_id)
  );
create policy "commentaires: modification par l'auteur" on public.comments for update
  using (author_id = auth.uid() and public.is_active_user() and hidden_at is null)
  with check (author_id = auth.uid() and hidden_at is null);
create policy "commentaires: modération" on public.comments for update
  using (public.is_staff()) with check (public.is_staff());
create policy "commentaires: suppression" on public.comments for delete
  using (author_id = auth.uid() or public.is_staff());

-- Suivis
create policy "suivis: lecture publique" on public.follows for select using (true);
create policy "suivis: suivre" on public.follows for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user() and public.project_is_public(project_id));
create policy "suivis: ne plus suivre" on public.follows for delete using (user_id = auth.uid());

-- Signalements
create policy "signalements: création" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user() and resolved_at is null);
create policy "signalements: lecture staff" on public.reports for select using (public.is_staff());
create policy "signalements: traitement staff" on public.reports for update
  using (public.is_staff()) with check (public.is_staff());
create policy "signalements: suppression staff" on public.reports for delete using (public.is_staff());

-- -----------------------------------------------------------------------------
-- Stockage : avatars/<user_id>/... et project-media/<project_id>/...
-- -----------------------------------------------------------------------------
create or replace function public.can_edit_project_path(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.can_edit_project(p_folder::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create policy "avatars: écriture par le propriétaire" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: mise à jour par le propriétaire" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: suppression par le propriétaire" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "médias projet: écriture par les membres" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-media' and public.can_edit_project_path((storage.foldername(name))[1]));
create policy "médias projet: mise à jour par les membres" on storage.objects for update to authenticated
  using (bucket_id = 'project-media' and public.can_edit_project_path((storage.foldername(name))[1]));
create policy "médias projet: suppression par les membres" on storage.objects for delete to authenticated
  using (bucket_id = 'project-media' and public.can_edit_project_path((storage.foldername(name))[1]));
