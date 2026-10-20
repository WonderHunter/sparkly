-- Durcissement : rôles d'équipe, passage de relais, réglages admin, auteurs figés.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end;
$$;
create or replace function pg_temp.su() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Neon Pusher (1001) : alice = 0002 chef·fe, bastien = 0003 dev, chloe = 0004 créa.
-- Table Tempête (1002) : dylan = 0005 chef·fe, emma = 0006 créa. admin = 0008.

-- ---------------------------------------------------------------------------
-- Un membre ne peut pas s'attribuer plus de droits
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000003');
select throws_ok(
  $$ update public.project_members set role = 'owner'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000003' $$,
  '42501', null, 'un membre ne peut pas se nommer chef·fe');
select throws_ok(
  $$ update public.project_members set role = 'dev'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000002' $$,
  '42501', null, 'un membre ne peut pas rétrograder le ou la chef·fe');
select throws_ok(
  $$ update public.project_members set role = 'dev'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000004' $$,
  '42501', null, 'un membre ne change pas le rôle des autres');
select throws_ok(
  $$ update public.project_members set user_id = '00000000-0000-4000-a000-000000000005'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000003' $$,
  '42501', null, 'une place dans l''équipe ne se réattribue pas');
select lives_ok(
  $$ update public.project_members set team_title = 'Dev gameplay'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000003' $$,
  'un membre modifie toujours le rôle affiché');
select throws_ok(
  $$ select public.transfer_ownership('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003') $$,
  '42501', null, 'seul·e le ou la chef·fe peut passer le relais');

-- ---------------------------------------------------------------------------
-- Le ou la chef·fe gère les rôles et passe le relais
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select lives_ok(
  $$ update public.project_members set role = 'dev'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000004' $$,
  'le ou la chef·fe bascule un membre de créa à dev');
select throws_ok(
  $$ update public.project_members set role = 'owner'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000003' $$,
  '42501', null, 'pas de transmission par simple modification de ligne');
select throws_ok(
  $$ select public.transfer_ownership('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000006') $$,
  'P0002', null, 'on ne passe pas le relais à quelqu''un hors de l''équipe');
select throws_ok(
  $$ select public.transfer_ownership('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'owner') $$,
  '22023', null, 'l''ancien·ne chef·fe doit choisir dev ou créa');
select lives_ok(
  $$ select public.transfer_ownership('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'crea') $$,
  'le ou la chef·fe passe le relais à un membre');

select pg_temp.su();
select results_eq(
  $$ select user_id::text, role::text from public.project_members
     where project_id = '10000000-0000-4000-a000-000000000001' and role in ('owner', 'crea') order by role::text $$,
  $$ values ('00000000-0000-4000-a000-000000000002', 'crea'), ('00000000-0000-4000-a000-000000000003', 'owner') $$,
  'un seul chef·fe : le nouveau, l''ancien devient créa');
select is(
  (select count(*)::int from public.project_members where project_id = '10000000-0000-4000-a000-000000000001' and role = 'owner'),
  1, 'jamais deux chef·fes à la fois');

select pg_temp.login('00000000-0000-4000-a000-000000000002');
select is(public.is_owner('10000000-0000-4000-a000-000000000001'), false, 'l''ancien·ne chef·fe perd ses droits');
select throws_ok(
  $$ update public.project_members set role = 'owner'
     where project_id = '10000000-0000-4000-a000-000000000001' and user_id = '00000000-0000-4000-a000-000000000002' $$,
  '42501', null, 'l''autorisation du transfert ne survit pas à l''appel');

-- ---------------------------------------------------------------------------
-- Réglages : admin_emails réservé aux admins
-- ---------------------------------------------------------------------------
select pg_temp.anon();
select throws_ok(
  $$ select admin_emails from public.app_settings $$,
  '42501', null, 'un visiteur ne lit pas les adresses admin');
select lives_ok(
  $$ select funding_goal, school_year from public.app_settings $$,
  'les réglages publics restent lisibles');
select throws_ok(
  $$ select public.admin_bootstrap_emails() $$,
  '42501', null, 'un visiteur n''appelle pas la fonction admin');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
select throws_ok(
  $$ select public.admin_bootstrap_emails() $$,
  '42501', null, 'un étudiant n''appelle pas la fonction admin');

select pg_temp.login('00000000-0000-4000-a000-000000000008');
select lives_ok($$ select public.admin_bootstrap_emails() $$, 'un admin lit les adresses admin');

-- ---------------------------------------------------------------------------
-- Auteurs figés
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000003');
update public.posts set author_id = '00000000-0000-4000-a000-000000000003', title = 'Moodboard v2'
  where title = 'Le moodboard est prêt';
select pg_temp.su();
select is(
  (select author_id::text from public.posts where title = 'Moodboard v2'),
  '00000000-0000-4000-a000-000000000002', 'un membre modifie un devlog sans en changer l''auteur');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
update public.comments set project_id = '10000000-0000-4000-a000-000000000002'
  where author_id = '00000000-0000-4000-a000-000000000005';
select pg_temp.su();
select is(
  (select project_id::text from public.comments where author_id = '00000000-0000-4000-a000-000000000005' limit 1),
  '10000000-0000-4000-a000-000000000001', 'un commentaire ne change pas de projet');

select * from finish();
rollback;
