-- =============================================================================
-- Durcissement après revue de sécurité (2026-10-20)
--
-- 1. project_members : un membre ne peut plus se promouvoir chef·fe, déplacer
--    ou réattribuer une place dans l'équipe (PostgREST permettait de modifier
--    role, user_id et project_id de n'importe quelle ligne du projet).
-- 2. app_settings.admin_emails : plus lisible par anon ni authenticated ;
--    les admins passent par une fonction dédiée.
-- 3. posts / comments : auteur et rattachement figés après création.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Équipe : garde sur les modifications de project_members
-- -----------------------------------------------------------------------------
create or replace function public.project_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Seed, service, admins et transfert via transfer_ownership() : pas de restriction.
  if auth.uid() is null or public.is_admin()
     or current_setting('sparkly.allow_role_transfer', true) = 'on' then
    return new;
  end if;

  if new.project_id is distinct from old.project_id or new.user_id is distinct from old.user_id then
    raise exception 'Une place dans l''équipe ne peut être ni déplacée ni réattribuée.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if not public.is_owner(old.project_id) then
      raise exception 'Seul·e le ou la chef·fe de projet peut changer les rôles.' using errcode = '42501';
    end if;
    if new.role = 'owner' or old.role = 'owner' then
      raise exception 'Le rôle de chef·fe de projet se transmet avec « Passer le relais ».' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger project_members_guard before update on public.project_members
  for each row execute function public.project_members_guard();

-- Le ou la chef·fe passe le relais à un autre membre et redevient dev ou créa.
create or replace function public.transfer_ownership(p_project uuid, p_new_owner uuid, p_my_role public.member_role default 'dev')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_my_title text;
begin
  if v_me is null or not public.is_active_user() or not public.is_owner(p_project) then
    raise exception 'Seul·e le ou la chef·fe de projet peut passer le relais.' using errcode = '42501';
  end if;
  if p_my_role = 'owner' then
    raise exception 'Choisis ton nouveau rôle : dev ou créa.' using errcode = '22023';
  end if;
  if p_new_owner = v_me or not exists (
    select 1 from public.project_members where project_id = p_project and user_id = p_new_owner
  ) then
    raise exception 'Cette personne ne fait pas partie de l''équipe.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where id = p_new_owner and suspended_at is not null) then
    raise exception 'Ce compte est suspendu.' using errcode = '42501';
  end if;

  select team_title into v_my_title from public.project_members where project_id = p_project and user_id = v_me;

  perform set_config('sparkly.allow_role_transfer', 'on', true);
  update public.project_members
    set role = p_my_role,
        team_title = case when team_title = 'Chef·fe de projet' then '' else team_title end
    where project_id = p_project and user_id = v_me;
  update public.project_members
    set role = 'owner',
        team_title = case when v_my_title = 'Chef·fe de projet' then v_my_title else team_title end
    where project_id = p_project and user_id = p_new_owner;
  perform set_config('sparkly.allow_role_transfer', 'off', true);
end;
$$;

revoke execute on function public.transfer_ownership(uuid, uuid, public.member_role) from anon, public;
grant execute on function public.transfer_ownership(uuid, uuid, public.member_role) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Réglages : admin_emails réservé aux admins
-- -----------------------------------------------------------------------------
-- La RLS filtre les lignes, pas les colonnes : on retire le droit de lecture
-- de la table et on le redonne colonne par colonne (sauf admin_emails).
-- Toute nouvelle colonne publique de app_settings devra être ajoutée ici.
revoke select on public.app_settings from anon, authenticated;
grant select (
  id, school_year, default_starts_on, default_ends_on,
  teacher_annual_budget, funding_goal, max_projects_per_student, updated_at
) on public.app_settings to anon, authenticated;

create or replace function public.admin_bootstrap_emails()
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;
  return (select admin_emails from public.app_settings where id);
end;
$$;

revoke execute on function public.admin_bootstrap_emails() from anon, public;
grant execute on function public.admin_bootstrap_emails() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Devlogs et commentaires : auteur et rattachement figés
-- -----------------------------------------------------------------------------
create or replace function public.posts_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.author_id := old.author_id;
    new.project_id := old.project_id;
    -- Le numéro de « Mise à jour n°X » ne change plus une fois attribué.
    if old.number is not null then
      new.number := old.number;
    end if;
  end if;
  return new;
end;
$$;

-- Nommé pour s'exécuter avant posts_set_number (ordre alphabétique des triggers).
create trigger posts_guard before update on public.posts
  for each row execute function public.posts_guard();

create or replace function public.comments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.author_id := old.author_id;
    new.project_id := old.project_id;
    new.post_id := old.post_id;
    new.parent_id := old.parent_id;
  end if;
  return new;
end;
$$;

-- Nommé pour s'exécuter avant comments_check_parent.
create trigger comments_aa_guard before update on public.comments
  for each row execute function public.comments_guard();
