-- Financement fictif par les enseignant·es et limite de projets par étudiant·e.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;
create or replace function pg_temp.su() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- prof = 0001 (enseignant, 6 000 € déjà investis sur Neon Pusher par le seed)
-- dylan = 0005 (étudiant), admin = 0008 (admin), bastien = 0003 (étudiant, membre de Neon Pusher)
-- neon = 1001 (publié), tempete = 1002 (publié), rythme = 1003 (brouillon)

-- ---------------------------------------------------------------------------
-- Année universitaire
-- ---------------------------------------------------------------------------
select is(public.school_year_of('2027-08-31'), '2026-2027', 'le 31 août appartient encore à l''année en cours');
select is(public.school_year_of('2027-09-01'), '2027-2028', 'l''année universitaire bascule le 1er septembre');

-- ---------------------------------------------------------------------------
-- Qui peut financer quoi
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select lives_ok(
  $$ insert into public.investments (project_id, investor_id, amount, school_year)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 5000, 'ignoré') $$,
  'un prof finance un projet publié en cours');
select is(
  (select school_year from public.investments where project_id = '10000000-0000-4000-a000-000000000002'),
  public.current_school_year(), 'l''année universitaire est fixée par la base, pas par le client');
select lives_ok(
  $$ insert into public.investments (project_id, investor_id, amount, school_year)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 1000, '2026-2027') $$,
  'un prof peut financer plusieurs fois le même projet');
select is(
  (select backers_count from public.project_cards where id = '10000000-0000-4000-a000-000000000002'),
  1, 'deux financements de la même personne : un seul financeur');
delete from public.investments where project_id = '10000000-0000-4000-a000-000000000002' and amount = 1000;
select throws_ok(
  $$ insert into public.investments (project_id, investor_id, amount, school_year)
     values ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 1000, '2026-2027') $$,
  'SP003', null, 'impossible de financer un brouillon');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
select throws_ok(
  $$ insert into public.investments (project_id, investor_id, amount, school_year)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000005', 1000, '2026-2027') $$,
  'SP003', null, 'un étudiant ne peut pas financer');

select pg_temp.login('00000000-0000-4000-a000-000000000008');
select throws_ok(
  $$ insert into public.investments (project_id, investor_id, amount, school_year)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000008', 1000, '2026-2027') $$,
  'SP003', null, 'un admin sans rôle enseignant ne peut pas financer');

-- ---------------------------------------------------------------------------
-- Budget annuel (120 000 €) : 6 000 € (Neon) + 5 000 € (Tempête) déjà engagés
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select throws_ok(
  $$ update public.investments set amount = 115000 where project_id = '10000000-0000-4000-a000-000000000002' $$,
  'SP002', null, 'impossible de dépasser son budget annuel');
update public.investments set amount = 114000 where project_id = '10000000-0000-4000-a000-000000000002';
select is(
  (select amount from public.investments where project_id = '10000000-0000-4000-a000-000000000002'),
  114000, 'on peut engager tout son budget, au centime près');
select is(
  (select funded_amount from public.project_cards where id = '10000000-0000-4000-a000-000000000002'),
  114000, 'les cartes projet affichent le montant financé (objectif dépassable)');
select is(
  (select backers_count from public.project_cards where id = '10000000-0000-4000-a000-000000000002'),
  1, 'les cartes projet comptent les financeurs');

-- ---------------------------------------------------------------------------
-- Retrait
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000005');
delete from public.investments where project_id = '10000000-0000-4000-a000-000000000002';
select pg_temp.su();
select is((select count(*)::int from public.investments where project_id = '10000000-0000-4000-a000-000000000002'), 1,
  'un étudiant ne peut pas retirer le financement d''un prof');

select pg_temp.login('00000000-0000-4000-a000-000000000001');
delete from public.investments where project_id = '10000000-0000-4000-a000-000000000002';
select pg_temp.su();
select is((select count(*)::int from public.investments where project_id = '10000000-0000-4000-a000-000000000002'), 0,
  'un prof peut retirer son financement tant que le projet court');

-- ---------------------------------------------------------------------------
-- Limite de projets par étudiant·e et par année
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000008');
update public.app_settings set max_projects_per_student = 1 where id;

select pg_temp.login('00000000-0000-4000-a000-000000000003');
select throws_ok(
  $$ insert into public.projects (slug, title, created_by) values ('projet-en-trop', 'En trop', '00000000-0000-4000-a000-000000000003') $$,
  'SP001', null, 'un étudiant au maximum ne peut pas créer un projet de plus');

select pg_temp.login('00000000-0000-4000-a000-000000000001');
select lives_ok(
  $$ insert into public.projects (slug, title, created_by) values ('projet-prof', 'Projet prof', '00000000-0000-4000-a000-000000000001') $$,
  'la limite ne s''applique pas aux enseignant·es');

select pg_temp.login('00000000-0000-4000-a000-000000000008');
update public.app_settings set max_projects_per_student = null where id;
select pg_temp.login('00000000-0000-4000-a000-000000000003');
select lives_ok(
  $$ insert into public.projects (slug, title, created_by) values ('projet-libre', 'Libre', '00000000-0000-4000-a000-000000000003') $$,
  'sans limite, l''étudiant peut créer un autre projet');

select * from finish();
rollback;
