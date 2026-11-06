-- Contraintes de la SAÉ : listes, conversion des anciens genres, droits (profs/admins seulement).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

-- Listes de départ.
select is((select count(*)::int from public.categories), 9, '9 types de jeu');
select is((select count(*)::int from public.characters), 17, '17 personnages');
select is((select count(*)::int from public.emotions), 15, '15 émotions');
select is(
  (select count(*)::int from public.categories where slug in ('action', 'arcade', 'puzzle', 'shoot', 'party', 'autre')),
  0, 'les anciens genres sans équivalent ont disparu');

-- Neon Pusher (1001) : alice 0002 (owner). Prof Démo 0001, dylan 0005.
-- Un membre du groupe ne peut pas changer ses contraintes, même par l'API.
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select throws_ok(
  $$ update public.projects set emotion_id = (select id from public.emotions where slug = 'rage')
     where id = '10000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'un étudiant ne change pas l''émotion imposée');
select lives_ok(
  $$ update public.projects set pitch = 'Nouvelle accroche' where id = '10000000-0000-4000-a000-000000000001' $$,
  'le groupe modifie toujours le reste de son projet');
select throws_ok(
  $$ select public.set_project_constraints('10000000-0000-4000-a000-000000000001', null, null, null) $$,
  '42501', null, 'un étudiant ne peut pas appeler set_project_constraints');

-- Un prof fixe les trois contraintes, sans être membre du projet.
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select lives_ok(
  $$ select public.set_project_constraints(
       '10000000-0000-4000-a000-000000000001',
       (select id from public.categories where slug = 'plateforme'),
       (select id from public.characters where slug = 'bougie'),
       (select id from public.emotions where slug = 'apaisement')) $$,
  'un prof fixe les contraintes');
select results_eq(
  $$ select category_slug, character_slug, emotion_slug from public.project_cards where id = '10000000-0000-4000-a000-000000000001' $$,
  $$ values ('plateforme'::text, 'bougie'::text, 'apaisement'::text) $$,
  'les cartes projet exposent les trois contraintes');

-- Retirer une entrée d'une liste remet les projets à « à définir ».
select pg_temp.login('00000000-0000-4000-a000-000000000008');
delete from public.characters where slug = 'bougie';
select pg_temp.su();
select is(
  (select character_id from public.projects where id = '10000000-0000-4000-a000-000000000001'),
  null, 'personnage retiré de la liste : le projet repasse à « à définir »');

-- Seul l'admin gère les listes.
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select throws_ok(
  $$ insert into public.emotions (slug, name) values ('nostalgie', 'Nostalgie') $$,
  '42501', null, 'un prof ne modifie pas les listes');

select * from finish();
rollback;
