-- =============================================================================
-- L'équipe pédagogique (enseignant·es et admins) gère aussi :
--   - le panel Agents IA (réglages, connexions, applications, journal) ;
--   - la suppression de projets.
-- La suppression de comptes passe par l'API Auth (clé de service) : son contrôle est
-- fait côté serveur (un·e enseignant·e ne supprime que des comptes étudiants).
-- =============================================================================

-- Projets : suppression par l'équipe pédagogique (plus seulement les admins).
drop policy "projets: suppression" on public.projects;
create policy "projets: suppression" on public.projects for delete
  using ((public.is_owner(id) and public.is_active_user()) or public.is_staff());

-- Réglages des agents : passent par une fonction, car la politique de mise à jour de
-- app_settings reste réservée aux admins (budget, dates, domaines…).
create or replace function public.set_agent_settings(p_enabled boolean, p_max_days integer, p_disabled_scopes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
  end if;
  if p_max_days is null or p_max_days < 1 or p_max_days > 366 then
    raise exception 'Durée invalide (1 à 366 jours).' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_disabled_scopes, '{}')) s
    where s not in ('projet', 'devlog', 'commentaires', 'contraintes', 'financement', 'moderation')
  ) then
    raise exception 'Permission inconnue ou impossible à désactiver.' using errcode = '22023';
  end if;
  update public.app_settings
  set agents_enabled = coalesce(p_enabled, true),
      agent_max_days = p_max_days,
      agent_disabled_scopes = coalesce(p_disabled_scopes, '{}')
  where id = true;
end;
$$;

revoke execute on function public.set_agent_settings(boolean, integer, text[]) from public, anon;
grant execute on function public.set_agent_settings(boolean, integer, text[]) to authenticated;

-- Panel Agents IA : ouvert à l'équipe pédagogique.
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
  if not public.is_staff() then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
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
  if not public.is_staff() then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
  end if;
  return query
  select cl.id, cl.client_id, cl.kind, cl.name, cl.logo_url, cl.redirect_uris, cl.verified, cl.blocked_at, cl.created_at,
         (select count(distinct c.user_id) from public.agent_connections c where c.client_id = cl.id)
  from public.agent_clients cl
  order by users_count desc, cl.created_at desc
  limit 500;
end;
$$;

create or replace function public.admin_agent_recent_audit()
returns table (user_name text, client_name text, tool text, ok boolean, error text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
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
  if not public.is_staff() then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
  end if;
  update public.agent_clients
  set verified = p_verified,
      blocked_at = case when p_blocked then coalesce(blocked_at, now()) else null end
  where id = p_client;
end;
$$;

-- Révoque une connexion : la sienne, ou n'importe laquelle pour l'équipe pédagogique.
create or replace function public.revoke_agent_connection(p_connection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agent_connections
  set revoked_at = now()
  where id = p_connection and revoked_at is null and (user_id = auth.uid() or public.is_staff());
  if not found then
    raise exception 'Connexion introuvable ou déjà révoquée.' using errcode = 'P0002';
  end if;
end;
$$;
