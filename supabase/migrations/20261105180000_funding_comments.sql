-- Financements multiples avec un mot pour l'équipe.
-- 1. Un·e enseignant·e peut financer plusieurs fois le même projet ; chaque financement
--    se modifie ou se retire à part. Le budget annuel reste vérifié sur la somme (investments_guard).
-- 2. Chaque financement peut porter un mot, publié comme commentaire du projet relié au financement
--    (badge « A financé X € »). Retirer le financement retire le mot. Option désactivable par l'admin.

alter table public.investments
  drop constraint investments_project_id_investor_id_school_year_key;

-- Le nombre de financeurs compte des personnes, plus des lignes.
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
  (select count(distinct i.investor_id) from public.investments i where i.project_id = p.id)::int as backers_count
from public.projects p
left join public.categories c on c.id = p.category_id;

alter table public.app_settings
  add column funding_comments_enabled boolean not null default true;

-- Colonnes de app_settings lisibles publiquement (voir security_hardening) : on ajoute la nouvelle.
grant select (funding_comments_enabled) on public.app_settings to anon, authenticated;

alter table public.comments
  add column investment_id uuid references public.investments (id) on delete cascade;

create unique index comments_investment_idx on public.comments (investment_id) where investment_id is not null;

-- Seul l'auteur du financement peut y rattacher un mot, sur le même projet, au premier niveau,
-- et seulement si l'option est active. Le lien ne se pose qu'à la création.
create or replace function public.comments_investment_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.investment_id is distinct from old.investment_id then
      raise exception 'Le financement d''un commentaire ne peut pas être modifié.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.investment_id is null then
    return new;
  end if;
  if not (select funding_comments_enabled from public.app_settings where id) then
    raise exception 'Les mots de financement sont désactivés.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.investments i
    where i.id = new.investment_id and i.investor_id = new.author_id and i.project_id = new.project_id
  ) then
    raise exception 'Ce financement n''est pas le tien ou concerne un autre projet.' using errcode = '42501';
  end if;
  if new.parent_id is not null or new.post_id is not null then
    raise exception 'Un mot de financement est un commentaire du projet, pas une réponse.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger comments_investment_guard
  before insert or update on public.comments
  for each row execute function public.comments_investment_guard();
