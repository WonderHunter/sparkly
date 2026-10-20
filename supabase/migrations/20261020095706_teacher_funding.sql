-- =============================================================================
-- Financement fictif par les enseignant·es et limite de projets par étudiant·e.
--
-- - Chaque prof dispose d'un budget annuel (120 000 € par défaut) remis à zéro à
--   chaque année universitaire (septembre -> août).
-- - Un projet a un objectif commun (10 000 € par défaut), dépassable.
-- - Un financement est modifiable ou retirable tant que le projet n'est pas terminé.
-- - Le nombre de projets qu'un·e étudiant·e peut créer ou rejoindre par année est
--   réglable par l'admin (NULL = illimité).
-- L'argent est fictif : aucune transaction réelle.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Réglages
-- -----------------------------------------------------------------------------
alter table public.app_settings
  add column teacher_annual_budget integer not null default 120000 check (teacher_annual_budget >= 0),
  add column funding_goal integer not null default 10000 check (funding_goal > 0),
  add column max_projects_per_student integer check (max_projects_per_student is null or max_projects_per_student >= 1);

-- -----------------------------------------------------------------------------
-- Année universitaire : septembre -> août (« 2026-2027 »)
-- -----------------------------------------------------------------------------
create or replace function public.school_year_of(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when extract(month from p_date) >= 9
      then extract(year from p_date)::int || '-' || (extract(year from p_date)::int + 1)
    else (extract(year from p_date)::int - 1) || '-' || extract(year from p_date)::int
  end;
$$;

create or replace function public.current_school_year()
returns text
language sql
stable
set search_path = ''
as $$
  select public.school_year_of((now() at time zone 'Europe/Paris')::date);
$$;

-- -----------------------------------------------------------------------------
-- Limite de projets par étudiant·e et par année universitaire
-- -----------------------------------------------------------------------------
create or replace function public.project_members_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_year text;
  v_count integer;
begin
  select max_projects_per_student into v_limit from public.app_settings where id;
  if v_limit is null then
    return new;
  end if;
  -- La limite ne concerne que les comptes étudiants.
  if not exists (select 1 from public.profiles where id = new.user_id and role = 'student') then
    return new;
  end if;

  select public.school_year_of(starts_on) into v_year from public.projects where id = new.project_id;
  select count(*) into v_count
    from public.project_members m
    join public.projects p on p.id = m.project_id
    where m.user_id = new.user_id
      and m.project_id <> new.project_id
      and public.school_year_of(p.starts_on) = v_year;

  if v_count >= v_limit then
    raise exception 'Limite atteinte : % projet(s) maximum par étudiant·e pour l''année %.', v_limit, v_year
      using errcode = 'SP001';
  end if;
  return new;
end;
$$;

create trigger project_members_limit before insert on public.project_members
  for each row execute function public.project_members_limit();

-- -----------------------------------------------------------------------------
-- Financements
-- -----------------------------------------------------------------------------
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  investor_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 10000000),
  school_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un prof a un seul financement (modifiable) par projet et par année.
  unique (project_id, investor_id, school_year)
);
create index investments_project_idx on public.investments (project_id);
create index investments_investor_idx on public.investments (investor_id, school_year);

create trigger investments_updated_at before update on public.investments
  for each row execute function public.set_updated_at();

-- Un projet peut être financé tant qu'il est publié et pas encore terminé.
create or replace function public.project_is_fundable(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects
    where id = p_project
      and status = 'published'
      and ends_on >= (now() at time zone 'Europe/Paris')::date
  );
$$;

create or replace function public.investments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget integer;
  v_spent integer;
begin
  if tg_op = 'INSERT' then
    new.school_year := public.current_school_year();
  else
    -- Seul le montant est modifiable.
    new.school_year := old.school_year;
    new.project_id := old.project_id;
    new.investor_id := old.investor_id;
  end if;

  -- Appels depuis l'application (utilisateur connecté) : règles métier complètes.
  -- Même un admin doit avoir le rôle enseignant pour financer.
  if auth.uid() is not null then
    if public.current_role_name() is distinct from 'teacher' then
      raise exception 'Seul·es les enseignant·es peuvent financer un projet.' using errcode = 'SP003';
    end if;
    if not public.project_is_fundable(new.project_id) then
      raise exception 'Ce projet ne peut plus être financé (terminé ou non publié).' using errcode = 'SP003';
    end if;
  end if;

  -- Le budget annuel s'applique à tout le monde (y compris seed et service).
  select teacher_annual_budget into v_budget from public.app_settings where id;
  select coalesce(sum(amount), 0) into v_spent
    from public.investments
    where investor_id = new.investor_id
      and school_year = new.school_year
      and id <> new.id;
  if v_spent + new.amount > v_budget then
    raise exception 'Budget insuffisant : il te reste % € pour l''année %.', greatest(v_budget - v_spent, 0), new.school_year
      using errcode = 'SP002';
  end if;

  return new;
end;
$$;

create trigger investments_guard before insert or update on public.investments
  for each row execute function public.investments_guard();

alter table public.investments enable row level security;

-- Montants et noms publics (choix pédagogique), pour les projets visibles.
create policy "financements: lecture" on public.investments for select
  using (public.can_view_project(project_id));
create policy "financements: créer" on public.investments for insert to authenticated
  with check (investor_id = auth.uid() and public.is_active_user());
create policy "financements: modifier" on public.investments for update to authenticated
  using (investor_id = auth.uid() and public.is_active_user() and public.project_is_fundable(project_id))
  with check (investor_id = auth.uid());
create policy "financements: retirer" on public.investments for delete to authenticated
  using (
    public.is_admin()
    or (investor_id = auth.uid() and public.is_active_user() and public.project_is_fundable(project_id))
  );

-- -----------------------------------------------------------------------------
-- Cartes projet : montant financé et nombre de financeurs
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
  (select count(*) from public.investments i where i.project_id = p.id)::int as backers_count
from public.projects p
left join public.categories c on c.id = p.category_id;
