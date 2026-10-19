-- Tests pgTAP des règles métier et de la RLS (lancés par `supabase test db`).
-- S'appuient sur les données de supabase/seed.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(30);

-- Helpers : se mettre dans la peau d'un utilisateur.
create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;
create or replace function pg_temp.su() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Identifiants du seed
\set prof    '''00000000-0000-4000-a000-000000000001'''
\set alice   '''00000000-0000-4000-a000-000000000002'''
\set bastien '''00000000-0000-4000-a000-000000000003'''
\set dylan   '''00000000-0000-4000-a000-000000000005'''
\set farid   '''00000000-0000-4000-a000-000000000007'''
\set admin   '''00000000-0000-4000-a000-000000000008'''
\set neon    '''10000000-0000-4000-a000-000000000001'''
\set tempete '''10000000-0000-4000-a000-000000000002'''
\set rythme  '''10000000-0000-4000-a000-000000000003'''

-- ---------------------------------------------------------------------------
-- Comptes et domaines
-- ---------------------------------------------------------------------------
select is(
  public.hook_before_user_created('{"user":{"email":"pirate@gmail.com"}}'::jsonb) -> 'error' ->> 'http_code',
  '403', 'le hook refuse un domaine externe');
select is(
  public.hook_before_user_created('{"user":{"email":"x@faux.univ-reims.fr"}}'::jsonb) -> 'error' ->> 'http_code',
  '403', 'le hook refuse un sous-domaine non listé');
select is(
  public.hook_before_user_created('{"user":{"email":"Nouvel.Etudiant@Etudiant.Univ-Reims.fr"}}'::jsonb),
  '{}'::jsonb, 'le hook accepte une adresse étudiante (casse ignorée)');
select is((select role::text from public.profiles where id = :prof), 'teacher',
  'une adresse @univ-reims.fr devient prof');
select is((select role::text from public.profiles where id = :alice), 'student',
  'une adresse @etudiant.univ-reims.fr devient étudiante');

-- ---------------------------------------------------------------------------
-- Lecture publique
-- ---------------------------------------------------------------------------
select pg_temp.anon();
select is((select count(*)::int from public.projects), 2, 'un visiteur ne voit que les projets publiés');
select is((select count(*)::int from public.project_cards where slug = 'rythme-hall'), 0,
  'un brouillon n''apparaît pas dans les cartes publiques');
select is((select count(*)::int from public.milestones where project_id = :rythme), 0,
  'les jalons d''un brouillon sont invisibles');
select is((select posts_count from public.project_cards where id = :neon), 2,
  'les cartes comptent les devlogs publiés');

select pg_temp.login(:farid);
select is((select count(*)::int from public.projects where id = :rythme), 1,
  'un membre voit son propre brouillon');

select pg_temp.login(:prof);
select is((select count(*)::int from public.projects), 3, 'un prof voit tous les projets');

-- ---------------------------------------------------------------------------
-- Avancée et jalons
-- ---------------------------------------------------------------------------
select pg_temp.su();
select is((select progress from public.projects where id = :neon), 38::smallint,
  'avancée = 8 + 17 + 25/2 = 38 %');
select is((select count(*)::int from public.milestones where project_id = :rythme), 6,
  'un projet reçoit les 6 jalons par défaut');

select pg_temp.login(:bastien);
update public.milestones set status = 'done' where project_id = :neon and position = 3;
select is((select progress from public.projects where id = :neon), 50::smallint,
  'terminer un jalon met à jour l''avancée');
update public.projects set progress = 99 where id = :neon;
select is((select progress from public.projects where id = :neon), 50::smallint,
  'l''avancée ne peut pas être forcée par un client');

-- ---------------------------------------------------------------------------
-- Droits d'édition
-- ---------------------------------------------------------------------------
select pg_temp.login(:bastien);
update public.projects set title = 'Piraté' where id = :tempete;
select pg_temp.su();
select is((select title from public.projects where id = :tempete), 'Table Tempête',
  'un étudiant ne modifie pas le projet d''un autre groupe');

select pg_temp.login(:bastien);
select lives_ok(
  $$ insert into public.projects (slug, title, created_by) values ('second-projet', 'Second', '00000000-0000-4000-a000-000000000003') $$,
  'un étudiant déjà membre peut créer un second projet');

select throws_ok(
  $$ update public.projects set status = 'hidden' where id = '10000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'un étudiant ne peut pas masquer son projet');

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000003' $$,
  '42501', null, 'un étudiant ne peut pas se promouvoir admin');

select pg_temp.login(:prof);
update public.projects set status = 'hidden' where id = :tempete;
select pg_temp.anon();
select is((select count(*)::int from public.projects where id = :tempete), 0,
  'un prof peut masquer un projet, qui disparaît du public');
select pg_temp.su();
update public.projects set status = 'published' where id = :tempete;

-- ---------------------------------------------------------------------------
-- Devlog
-- ---------------------------------------------------------------------------
select pg_temp.login(:bastien);
insert into public.posts (project_id, author_id, title, status)
  values (:neon, :bastien, 'Brouillon', 'draft');
select is((select number from public.posts where title = 'Brouillon'), null,
  'un brouillon n''a pas de numéro');
update public.posts set status = 'published' where title = 'Brouillon';
select is((select number from public.posts where title = 'Brouillon'), 3,
  'la publication attribue « Mise à jour n°3 »');

select pg_temp.anon();
select is((select count(*)::int from public.posts where project_id = :neon), 3,
  'le public voit les devlogs publiés');

-- ---------------------------------------------------------------------------
-- Commentaires
-- ---------------------------------------------------------------------------
select pg_temp.login(:dylan);
select lives_ok(
  $$ insert into public.comments (project_id, author_id, body) values ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005', 'Bravo !') $$,
  'un étudiant commente un projet publié');
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body) values ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000005', 'Hello') $$,
  '42501', null, 'impossible de commenter un brouillon');
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body) values ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'Usurpation') $$,
  '42501', null, 'impossible de commenter au nom de quelqu''un d''autre');

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
select pg_temp.su();
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000099', 'authenticated', 'authenticated',
  'gaelle.test@etudiant.univ-reims.fr', '{}', '{}', now(), now(), '', '', '', '');

select pg_temp.login(:alice);
select throws_ok(
  $$ insert into public.project_invitations (project_id, email, invited_by) values ('10000000-0000-4000-a000-000000000001', 'externe@gmail.com', '00000000-0000-4000-a000-000000000002') $$,
  '42501', null, 'on ne peut pas inviter une adresse hors université');
insert into public.project_invitations (project_id, email, role, team_title, invited_by)
  values (:neon, 'gaelle.test@etudiant.univ-reims.fr', 'crea', 'Sound designer', :alice);

select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is(
  public.accept_invitation((select id from public.project_invitations where email = 'gaelle.test@etudiant.univ-reims.fr')),
  :neon::uuid, 'l''invitée accepte et rejoint le projet');
select is((select team_title from public.project_members where user_id = '00000000-0000-4000-a000-000000000099'),
  'Sound designer', 'son rôle dans l''équipe est repris de l''invitation');

-- ---------------------------------------------------------------------------
-- Suspension
-- ---------------------------------------------------------------------------
select pg_temp.login(:admin);
update public.profiles set suspended_at = now() where id = :dylan;
select pg_temp.login(:dylan);
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body) values ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005', 'Encore moi') $$,
  '42501', null, 'un compte suspendu ne peut plus commenter');

select * from finish();
rollback;
