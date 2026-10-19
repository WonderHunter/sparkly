-- =============================================================================
-- Une personne peut faire partie de plusieurs projets.
-- Un projet reste celui d'un groupe ; on lève seulement la limite « un projet
-- par étudiant » (index unique, politique de création, acceptation d'invitation).
-- =============================================================================

drop index if exists public.project_members_one_project_per_user;
create index if not exists project_members_user_idx on public.project_members (user_id);

-- Création : tout compte actif peut créer un projet, dont il devient chef·fe.
drop policy if exists "projets: création" on public.projects;
create policy "projets: création" on public.projects for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_user());

-- Accepter une invitation ne dépend plus des autres projets de la personne.
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

  if exists (
    select 1 from public.project_members
    where project_id = v_inv.project_id and user_id = auth.uid()
  ) then
    -- Déjà membre de ce projet : l'invitation n'a plus lieu d'être.
    delete from public.project_invitations where id = v_inv.id;
    return v_inv.project_id;
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
