-- Contraintes de la SAÉ imposées par l'équipe pédagogique à chaque groupe :
-- un type de jeu, un personnage et une émotion à faire ressentir.
-- Le « type de jeu » remplace l'ancien « genre » choisi par les étudiant·es (table categories).
-- Les trois listes sont gérées par l'admin ; seul·es les profs et admins fixent les contraintes.

-- -----------------------------------------------------------------------------
-- Types de jeu : nouvelle liste, anciens genres convertis quand c'est évident
-- -----------------------------------------------------------------------------
insert into public.categories (slug, name, position) values
  ('donjon-aventure', 'Donjon / aventure', 1),
  ('reflexion', 'Réflexion', 2),
  ('combat', 'Combat', 3),
  ('casino', 'Casino', 5),
  ('cooperatif', 'Coopératif', 8),
  ('sport', 'Sport', 9)
on conflict (slug) do nothing;
update public.categories set position = 4 where slug = 'course';
update public.categories set position = 6 where slug = 'plateforme';
update public.categories set position = 7 where slug = 'rythme';

update public.projects p set category_id = (select id from public.categories where slug = 'reflexion')
  where category_id = (select id from public.categories where slug = 'puzzle');
update public.projects p set category_id = (select id from public.categories where slug = 'combat')
  where category_id in (select id from public.categories where slug in ('action', 'shoot'));
-- Arcade classique, Party game, Autre : pas d'équivalent, un prof choisira (category_id passe à null).
delete from public.categories where slug in ('action', 'arcade', 'puzzle', 'shoot', 'party', 'autre');

-- -----------------------------------------------------------------------------
-- Personnages imposés et émotions à faire ressentir
-- -----------------------------------------------------------------------------
create table public.characters (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  position smallint not null default 0
);

create table public.emotions (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  position smallint not null default 0
);

insert into public.characters (slug, name, position) values
  ('gomme', 'Une gomme', 1),
  ('aimant', 'Un aimant', 2),
  ('bougie', 'Une bougie', 3),
  ('goutte-d-eau', 'Une goutte d''eau', 4),
  ('savon', 'Un savon', 5),
  ('corde', 'Une corde', 6),
  ('pieuvre', 'Une pieuvre', 7),
  ('poids-variable', 'Un personnage qui peut changer de poids', 8),
  ('cameleon', 'Un caméléon', 9),
  ('origami', 'Un origami', 10),
  ('eponge', 'Une éponge', 11),
  ('jouet-mecanique', 'Un jouet mécanique', 12),
  ('sablier', 'Un sablier', 13),
  ('loupe', 'Une loupe', 14),
  ('reflet', 'Un reflet', 15),
  ('poisson-globe', 'Un poisson globe', 16),
  ('fumee', 'De la fumée', 17);

insert into public.emotions (slug, name, position) values
  ('rage', 'Rage', 1),
  ('panique', 'Panique', 2),
  ('peur', 'Peur', 3),
  ('solitude', 'Solitude', 4),
  ('apaisement', 'Apaisement', 5),
  ('confusion', 'Confusion', 6),
  ('culpabilite', 'Culpabilité', 7),
  ('drole', 'Drôle', 8),
  ('mefiance', 'Méfiance', 9),
  ('defoulement', 'Défoulement', 10),
  ('surprise', 'Surprise', 11),
  ('emerveillement', 'Émerveillement', 12),
  ('attachement', 'L''attachement', 13),
  ('jalousie', 'La jalousie', 14),
  ('degout', 'Le dégoût', 15);

alter table public.characters enable row level security;
alter table public.emotions enable row level security;
create policy "personnages: lecture publique" on public.characters for select using (true);
create policy "personnages: admin" on public.characters for all using (public.is_admin()) with check (public.is_admin());
create policy "émotions: lecture publique" on public.emotions for select using (true);
create policy "émotions: admin" on public.emotions for all using (public.is_admin()) with check (public.is_admin());

alter table public.projects
  add column character_id smallint references public.characters (id) on delete set null,
  add column emotion_id smallint references public.emotions (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Seul·es les profs et admins fixent les contraintes (même via un appel direct à l'API)
-- -----------------------------------------------------------------------------
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
    if new.category_id is not null or new.character_id is not null or new.emotion_id is not null then
      raise exception 'Les contraintes de la SAÉ sont fixées par l''équipe pédagogique.' using errcode = '42501';
    end if;
  elsif new.category_id is distinct from old.category_id
     or new.character_id is distinct from old.character_id
     or new.emotion_id is distinct from old.emotion_id then
    raise exception 'Les contraintes de la SAÉ sont fixées par l''équipe pédagogique.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger projects_constraints_guard
  before insert or update on public.projects
  for each row execute function public.projects_constraints_guard();

-- Les profs ne sont pas éditeurs des projets (RLS) : cette fonction leur permet de fixer
-- les trois contraintes, et rien d'autre. null = « à définir ».
create or replace function public.set_project_constraints(
  p_project uuid,
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
  update public.projects
  set category_id = p_category, character_id = p_character, emotion_id = p_emotion
  where id = p_project;
  if not found then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_project_constraints(uuid, smallint, smallint, smallint) from public, anon;
grant execute on function public.set_project_constraints(uuid, smallint, smallint, smallint) to authenticated;

-- -----------------------------------------------------------------------------
-- Cartes projet : personnage et émotion, pour l'affichage et les filtres de Découvrir
-- -----------------------------------------------------------------------------
create or replace view public.project_cards
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
  (select max(po.published_at) from public.posts po where po.project_id = p.id and po.status = 'published') as last_post_at,
  (select coalesce(sum(i.amount), 0) from public.investments i where i.project_id = p.id)::int as funded_amount,
  (select count(distinct i.investor_id) from public.investments i where i.project_id = p.id)::int as backers_count,
  p.character_id, ch.slug as character_slug, ch.name as character_name,
  p.emotion_id, em.slug as emotion_slug, em.name as emotion_name
from public.projects p
left join public.categories c on c.id = p.category_id
left join public.characters ch on ch.id = p.character_id
left join public.emotions em on em.id = p.emotion_id;
