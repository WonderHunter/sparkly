-- La plateforme devient une contrainte de la SAÉ, fixée par l'équipe pédagogique comme le type
-- de jeu, le personnage et l'émotion. Trois plateformes : borne d'arcade, table cocktail,
-- écran + smartphone (valeur « tv »). L'ancienne valeur « web » n'est plus proposée.

alter table public.projects
  alter column platform drop not null,
  alter column platform drop default;

-- « Web » n'existe plus : un prof choisira la plateforme.
update public.projects set platform = null where platform = 'web';

-- La garde couvre aussi la plateforme (à la création comme à la modification).
create or replace function public.projects_constraints_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (public.is_staff() and public.is_active_user()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.platform is not null or new.category_id is not null or new.character_id is not null or new.emotion_id is not null then
      raise exception 'Les contraintes de la SAÉ sont fixées par l''équipe pédagogique.' using errcode = '42501';
    end if;
  elsif new.platform is distinct from old.platform
     or new.category_id is distinct from old.category_id
     or new.character_id is distinct from old.character_id
     or new.emotion_id is distinct from old.emotion_id then
    raise exception 'Les contraintes de la SAÉ sont fixées par l''équipe pédagogique.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function public.set_project_constraints(uuid, smallint, smallint, smallint);

create or replace function public.set_project_constraints(
  p_project uuid,
  p_platform public.platform,
  p_category smallint,
  p_character smallint,
  p_emotion smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_staff() and public.is_active_user()) then
    raise exception 'Réservé à l''équipe pédagogique.' using errcode = '42501';
  end if;
  if p_platform = 'web' then
    raise exception 'Plateforme inconnue.' using errcode = '22023';
  end if;
  update public.projects
  set platform = p_platform, category_id = p_category, character_id = p_character, emotion_id = p_emotion
  where id = p_project;
  if not found then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_project_constraints(uuid, public.platform, smallint, smallint, smallint) from public, anon;
grant execute on function public.set_project_constraints(uuid, public.platform, smallint, smallint, smallint) to authenticated;
