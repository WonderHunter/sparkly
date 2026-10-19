-- =============================================================================
-- Adresse (slug) personnalisable et signalement des titres déjà utilisés.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Titres : « Néon  Pusher » et « neon pusher » sont considérés comme identiques.
-- -----------------------------------------------------------------------------
create or replace function public.normalize_title(p_title text)
returns text
language sql
stable
set search_path = ''
as $$
  select lower(extensions.unaccent(regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g')));
$$;

-- Projets portant déjà ce titre (hors `p_exclude`). Le slug n'est renvoyé que
-- pour les projets publiés : on ne révèle rien des brouillons des autres groupes.
create or replace function public.title_conflicts(p_title text, p_exclude uuid default null)
returns table (title text, slug text, is_published boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.title,
    case when p.status = 'published' then p.slug end,
    p.status = 'published'
  from public.projects p
  where public.normalize_title(p.title) = public.normalize_title(p_title)
    and (p_exclude is null or p.id <> p_exclude)
  order by p.status = 'published' desc, p.created_at
  limit 5;
$$;

revoke execute on function public.title_conflicts(text, uuid) from anon, public;
grant execute on function public.title_conflicts(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Historique des adresses : les anciens liens redirigent vers la nouvelle URL.
-- -----------------------------------------------------------------------------
create table public.project_slug_history (
  slug text primary key check (slug = lower(slug)),
  project_id uuid not null references public.projects (id) on delete cascade,
  changed_at timestamptz not null default now()
);
create index project_slug_history_project_idx on public.project_slug_history (project_id);

alter table public.project_slug_history enable row level security;
-- Lecture publique : la correspondance ancien slug -> projet ne donne accès à
-- rien d'autre (la page du projet reste soumise à la RLS de `projects`).
create policy "historique slugs: lecture publique" on public.project_slug_history for select using (true);

create or replace function public.projects_slug_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.slug := lower(new.slug);

  -- Une adresse déjà utilisée par un autre projet (même ancienne) est réservée.
  if exists (
    select 1 from public.project_slug_history
    where slug = new.slug and project_id <> new.id
  ) then
    raise exception 'Cette adresse est déjà prise' using errcode = '23505';
  end if;

  if tg_op = 'UPDATE' and new.slug <> old.slug then
    -- Le projet reprend une de ses anciennes adresses : elle redevient active.
    delete from public.project_slug_history where slug = new.slug;
    insert into public.project_slug_history (slug, project_id)
    values (old.slug, new.id)
    on conflict (slug) do update set project_id = excluded.project_id, changed_at = now();
  end if;
  return new;
end;
$$;

create trigger projects_slug_history before insert or update of slug on public.projects
  for each row execute function public.projects_slug_history();
