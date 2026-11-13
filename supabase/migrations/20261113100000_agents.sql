-- Agents IA : serveur d'autorisation OAuth 2.1 de Sparkly, clés d'API et journal.
-- Les tables ne sont jamais lisibles par l'API (anon / authenticated) : seules les routes serveur
-- (connexion Postgres directe) et les fonctions ci-dessous y accèdent.
-- Un agent agit toujours « en tant que » la personne : ses droits = rôle ∩ permissions accordées.

-- -----------------------------------------------------------------------------
-- Réglages admin
-- -----------------------------------------------------------------------------
alter table public.app_settings
  add column agents_enabled boolean not null default true,
  add column agent_max_days integer not null default 90 check (agent_max_days between 1 and 366);

grant select (agents_enabled, agent_max_days) on public.app_settings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
-- Applications clientes (Claude, ChatGPT, Cursor…).
create table public.agent_clients (
  id uuid primary key default gen_random_uuid(),
  -- URL du document de métadonnées (kind = metadata) ou identifiant généré (kind = registered).
  client_id text not null unique check (char_length(client_id) between 8 and 500),
  kind text not null check (kind in ('metadata', 'registered')),
  name text not null check (char_length(name) between 1 and 100),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  verified boolean not null default false,
  blocked_at timestamptz,
  metadata_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

-- Une autorisation donnée par une personne : connexion OAuth ou clé d'API.
create table public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('oauth', 'api_key')),
  client_id uuid references public.agent_clients (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  scopes text[] not null check (cardinality(scopes) >= 1),
  key_prefix text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'oauth') = (client_id is not null)),
  check ((kind = 'api_key') = (key_prefix is not null))
);
create index agent_connections_user_idx on public.agent_connections (user_id, created_at desc);

-- Jetons et clés : seule leur empreinte SHA-256 est stockée.
create table public.agent_tokens (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  connection_id uuid not null references public.agent_connections (id) on delete cascade,
  kind text not null check (kind in ('access', 'refresh', 'api_key')),
  expires_at timestamptz not null,
  -- Jeton de rafraîchissement déjà échangé : une réutilisation révoque toute la connexion.
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index agent_tokens_connection_idx on public.agent_tokens (connection_id);

-- Codes d'autorisation : 10 minutes, usage unique, liés au défi PKCE.
create table public.agent_codes (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  client_id uuid not null references public.agent_clients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  scopes text[] not null,
  resource text not null,
  expires_on timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  connection_id uuid references public.agent_connections (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Journal des appels d'outils.
create table public.agent_audit (
  id bigint generated always as identity primary key,
  connection_id uuid not null references public.agent_connections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tool text not null,
  client_name text,
  client_version text,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index agent_audit_connection_idx on public.agent_audit (connection_id, created_at desc);
create index agent_audit_user_idx on public.agent_audit (user_id, created_at desc);

-- Fermées à l'API : aucune policy, aucun droit.
alter table public.agent_clients enable row level security;
alter table public.agent_connections enable row level security;
alter table public.agent_tokens enable row level security;
alter table public.agent_codes enable row level security;
alter table public.agent_audit enable row level security;
revoke all on public.agent_clients, public.agent_connections, public.agent_tokens, public.agent_codes, public.agent_audit
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Règles : permissions par rôle, durée maximale
-- -----------------------------------------------------------------------------
-- Permissions qu'une personne peut accorder à un agent selon son rôle.
create or replace function public.agent_allowed_scopes(p_role public.user_role)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'student' then array['lecture', 'projet', 'devlog', 'commentaires']
    when 'teacher' then array['lecture', 'commentaires', 'contraintes', 'financement', 'moderation']
    when 'admin' then array['lecture', 'commentaires', 'contraintes', 'moderation']
  end;
$$;

-- Date d'expiration maximale : maintenant + durée max (réglage admin), jamais après le 31 août
-- de l'année universitaire en cours ; 30 jours au plus avec financement ou modération.
create or replace function public.agent_expiry_cap(p_scopes text[])
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select least(
    now() + make_interval(days => case when p_scopes && array['financement', 'moderation'] then least(s.agent_max_days, 30) else s.agent_max_days end),
    make_timestamptz(split_part(public.current_school_year(), '-', 2)::int, 8, 31, 23, 59, 59, 'Europe/Paris')
  )
  from public.app_settings s
  where s.id;
$$;

-- -----------------------------------------------------------------------------
-- Fonctions pour les écrans (Réglages › Agents IA, admin) : appelées « en tant que » la personne
-- -----------------------------------------------------------------------------
create or replace function public.my_agent_connections()
returns table (
  id uuid, kind text, name text, scopes text[], key_prefix text, client_name text, client_logo text,
  client_verified boolean, expires_at timestamptz, revoked_at timestamptz, last_used_at timestamptz,
  created_at timestamptz, max_expires_at timestamptz, actions_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.name, c.scopes, c.key_prefix, cl.name, cl.logo_url, coalesce(cl.verified, false),
         c.expires_at, c.revoked_at, c.last_used_at, c.created_at, public.agent_expiry_cap(c.scopes),
         (select count(*) from public.agent_audit a where a.connection_id = c.id)
  from public.agent_connections c
  left join public.agent_clients cl on cl.id = c.client_id
  where c.user_id = auth.uid()
    and (c.revoked_at is null or c.revoked_at > now() - interval '30 days')
    and c.expires_at > now() - interval '30 days'
  order by (c.revoked_at is null and c.expires_at > now()) desc, c.created_at desc;
$$;

create or replace function public.my_agent_audit(p_connection uuid)
returns table (tool text, ok boolean, error text, client_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.tool, a.ok, a.error, a.client_name, a.created_at
  from public.agent_audit a
  join public.agent_connections c on c.id = a.connection_id
  where a.connection_id = p_connection and (c.user_id = auth.uid() or public.is_admin())
  order by a.created_at desc
  limit 50;
$$;

-- Révoque une connexion (la sienne, ou n'importe laquelle pour un admin). Effet immédiat.
create or replace function public.revoke_agent_connection(p_connection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agent_connections
  set revoked_at = now()
  where id = p_connection and revoked_at is null and (user_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'Connexion introuvable ou déjà révoquée.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.revoke_all_agent_connections()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.agent_connections set revoked_at = now()
  where user_id = auth.uid() and revoked_at is null and expires_at > now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Raccourcir ou prolonger : jamais au-delà du plafond, jamais dans le passé.
create or replace function public.set_agent_connection_expiry(p_connection uuid, p_expires_at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conn public.agent_connections;
  v_cap timestamptz;
begin
  select * into v_conn from public.agent_connections
  where id = p_connection and user_id = auth.uid() and revoked_at is null and expires_at > now();
  if not found then
    raise exception 'Connexion introuvable, expirée ou révoquée.' using errcode = 'P0002';
  end if;
  if p_expires_at <= now() + interval '1 hour' then
    raise exception 'La nouvelle date doit être dans le futur.' using errcode = '22023';
  end if;
  v_cap := public.agent_expiry_cap(v_conn.scopes);
  if p_expires_at > v_cap then
    raise exception 'Au plus tard le %.', to_char(v_cap at time zone 'Europe/Paris', 'DD/MM/YYYY') using errcode = '22023';
  end if;
  update public.agent_connections set expires_at = p_expires_at where id = p_connection;
  -- Les jetons de rafraîchissement et la clé suivent la connexion.
  update public.agent_tokens set expires_at = p_expires_at where connection_id = p_connection and kind in ('refresh', 'api_key');
  return p_expires_at;
end;
$$;

-- Crée une clé d'API. Le secret est généré côté serveur ; seule son empreinte arrive ici.
create or replace function public.create_agent_api_key(
  p_name text, p_scopes text[], p_expires_at timestamptz, p_key_hash text, p_key_prefix text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Compte suspendu.' using errcode = '42501';
  end if;
  if not (select agents_enabled from public.app_settings where id) then
    raise exception 'Les agents IA sont désactivés par l''équipe pédagogique.' using errcode = '42501';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  if p_scopes is null or cardinality(p_scopes) = 0 or not (p_scopes <@ public.agent_allowed_scopes(v_role)) then
    raise exception 'Permissions non autorisées pour ton rôle.' using errcode = '42501';
  end if;
  if p_expires_at <= now() + interval '1 hour' or p_expires_at > public.agent_expiry_cap(p_scopes) then
    raise exception 'Durée de validité hors limites.' using errcode = '22023';
  end if;
  insert into public.agent_connections (user_id, kind, name, scopes, key_prefix, expires_at)
  values (auth.uid(), 'api_key', p_name, p_scopes, p_key_prefix, p_expires_at)
  returning id into v_id;
  insert into public.agent_tokens (hash, connection_id, kind, expires_at)
  values (p_key_hash, v_id, 'api_key', p_expires_at);
  return v_id;
end;
$$;

-- Admin : toutes les connexions actives ou récentes, avec la personne et l'application.
create or replace function public.admin_agent_connections()
returns table (
  id uuid, user_id uuid, user_name text, user_role public.user_role, kind text, name text, scopes text[],
  client_name text, client_verified boolean, expires_at timestamptz, revoked_at timestamptz,
  last_used_at timestamptz, created_at timestamptz, actions_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux admins.' using errcode = '42501';
  end if;
  return query
  select c.id, c.user_id, p.display_name, p.role, c.kind, c.name, c.scopes, cl.name, coalesce(cl.verified, false),
         c.expires_at, c.revoked_at, c.last_used_at, c.created_at,
         (select count(*) from public.agent_audit a where a.connection_id = c.id)
  from public.agent_connections c
  join public.profiles p on p.id = c.user_id
  left join public.agent_clients cl on cl.id = c.client_id
  where c.revoked_at is null or c.revoked_at > now() - interval '30 days'
  order by c.last_used_at desc nulls last, c.created_at desc
  limit 500;
end;
$$;

create or replace function public.admin_agent_clients()
returns table (
  id uuid, client_id text, kind text, name text, logo_url text, redirect_uris text[], verified boolean,
  blocked_at timestamptz, created_at timestamptz, users_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux admins.' using errcode = '42501';
  end if;
  return query
  select cl.id, cl.client_id, cl.kind, cl.name, cl.logo_url, cl.redirect_uris, cl.verified, cl.blocked_at, cl.created_at,
         (select count(distinct c.user_id) from public.agent_connections c where c.client_id = cl.id)
  from public.agent_clients cl
  order by users_count desc, cl.created_at desc
  limit 500;
end;
$$;

-- Admin : dernières actions faites via un agent, toutes personnes confondues.
create or replace function public.admin_agent_recent_audit()
returns table (user_name text, client_name text, tool text, ok boolean, error text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux admins.' using errcode = '42501';
  end if;
  return query
  select p.display_name, a.client_name, a.tool, a.ok, a.error, a.created_at
  from public.agent_audit a
  join public.profiles p on p.id = a.user_id
  order by a.created_at desc
  limit 50;
end;
$$;

create or replace function public.admin_set_agent_client(p_client uuid, p_verified boolean, p_blocked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux admins.' using errcode = '42501';
  end if;
  update public.agent_clients
  set verified = p_verified,
      blocked_at = case when p_blocked then coalesce(blocked_at, now()) else null end
  where id = p_client;
end;
$$;

revoke execute on function public.my_agent_connections(), public.my_agent_audit(uuid), public.revoke_agent_connection(uuid),
  public.revoke_all_agent_connections(), public.set_agent_connection_expiry(uuid, timestamptz),
  public.create_agent_api_key(text, text[], timestamptz, text, text), public.admin_agent_connections(),
  public.admin_agent_clients(), public.admin_set_agent_client(uuid, boolean, boolean), public.admin_agent_recent_audit()
  from public, anon;
grant execute on function public.my_agent_connections(), public.my_agent_audit(uuid), public.revoke_agent_connection(uuid),
  public.revoke_all_agent_connections(), public.set_agent_connection_expiry(uuid, timestamptz),
  public.create_agent_api_key(text, text[], timestamptz, text, text), public.admin_agent_connections(),
  public.admin_agent_clients(), public.admin_set_agent_client(uuid, boolean, boolean), public.admin_agent_recent_audit()
  to authenticated;

-- -----------------------------------------------------------------------------
-- Notification « ta connexion expire bientôt »
-- -----------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications drop constraint notifications_comment_required;
alter table public.notifications
  alter column project_id drop not null,
  add column agent_connection_id uuid references public.agent_connections (id) on delete cascade,
  add column agent_name text,
  add constraint notifications_kind_check check (kind in ('comment', 'reply', 'invitation', 'agent_expiring')),
  add constraint notifications_comment_required check (kind in ('invitation', 'agent_expiring') or comment_id is not null),
  add constraint notifications_project_required check (kind = 'agent_expiring' or project_id is not null);

-- Appelée au chargement de la cloche : crée, pour la personne, un rappel par connexion qui expire
-- dans les 7 jours (une seule fois par connexion). Pas de tâche planifiée à maintenir.
create or replace function public.agent_expiry_reminders()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, agent_connection_id, agent_name)
  select c.user_id, 'agent_expiring', c.id, c.name
  from public.agent_connections c
  where c.user_id = auth.uid()
    and c.revoked_at is null
    and c.expires_at > now()
    and c.expires_at <= now() + interval '7 days'
    and not exists (select 1 from public.notifications n where n.agent_connection_id = c.id and n.kind = 'agent_expiring');
$$;

revoke execute on function public.agent_expiry_reminders() from public, anon;
grant execute on function public.agent_expiry_reminders() to authenticated;
