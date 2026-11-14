-- L'équipe pédagogique gère le panel Agents IA, supprime des projets et suspend des comptes étudiants.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- Prof Démo (0001), Alice (0002, cheffe de Neon Pusher 1001), Bastien (0003).
-- ---------------------------------------------------------------------------
-- Réglages des agents
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select lives_ok($$ select public.set_agent_settings(false, 45, array['devlog', 'financement']) $$,
  'un·e enseignant·e modifie les réglages des agents');
select results_eq(
  $$ select agents_enabled, agent_max_days, agent_disabled_scopes from public.app_settings $$,
  $$ values (false, 45, array['devlog', 'financement']::text[]) $$,
  'les réglages sont enregistrés');
select throws_ok($$ select public.set_agent_settings(true, 0, '{}') $$, '22023', null, 'durée invalide refusée');
select throws_ok($$ select public.set_agent_settings(true, 30, array['lecture']) $$, '22023', null,
  'la lecture ne se désactive pas');

-- La politique de app_settings reste réservée aux admins : le budget ne bouge pas.
update public.app_settings set teacher_annual_budget = 1 where id = true;
select isnt((select teacher_annual_budget from public.app_settings), 1,
  'un·e enseignant·e ne modifie pas les autres réglages directement');

select lives_ok($$ select * from public.admin_agent_connections() $$, 'un·e enseignant·e voit les connexions');
select lives_ok($$ select * from public.admin_agent_clients() $$, 'et les applications');

select pg_temp.login('00000000-0000-4000-a000-000000000003');
select throws_ok($$ select public.set_agent_settings(true, 30, '{}') $$, '42501', null,
  'un·e étudiant·e ne modifie pas les réglages des agents');
select throws_ok($$ select * from public.admin_agent_connections() $$, '42501', null, 'ni ne voit les connexions');

-- ---------------------------------------------------------------------------
-- Suppression de projets
-- ---------------------------------------------------------------------------
delete from public.projects where id = '10000000-0000-4000-a000-000000000001';
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select is((select count(*)::int from public.projects where id = '10000000-0000-4000-a000-000000000001'), 1,
  'un·e étudiant·e qui n''est pas chef·fe du projet ne le supprime pas');

delete from public.projects where id = '10000000-0000-4000-a000-000000000001';
select is((select count(*)::int from public.projects where id = '10000000-0000-4000-a000-000000000001'), 0,
  'un·e enseignant·e supprime un projet');

-- ---------------------------------------------------------------------------
-- Suspension
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select lives_ok($$ select public.set_user_suspended('00000000-0000-4000-a000-000000000005', true) $$,
  'un·e enseignant·e suspend un compte étudiant');
select isnt((select suspended_at from public.profiles where id = '00000000-0000-4000-a000-000000000005'), null,
  'le compte est suspendu');
select lives_ok($$ select public.set_user_suspended('00000000-0000-4000-a000-000000000005', false) $$, 'et le réactive');
select throws_ok($$ select public.set_user_suspended('00000000-0000-4000-a000-000000000008', true) $$, '42501', null,
  'mais ne suspend pas un·e admin');

-- Hors de la fonction, rien d'autre du profil étudiant n'est modifiable.
update public.profiles set display_name = 'Piraté' where id = '00000000-0000-4000-a000-000000000005';
select isnt((select display_name from public.profiles where id = '00000000-0000-4000-a000-000000000005'), 'Piraté',
  'un·e enseignant·e ne modifie pas le profil d''un·e étudiant·e');

select pg_temp.login('00000000-0000-4000-a000-000000000003');
select throws_ok($$ select public.set_user_suspended('00000000-0000-4000-a000-000000000005', true) $$, '42501', null,
  'un·e étudiant·e ne suspend personne');

select pg_temp.login('00000000-0000-4000-a000-000000000008');
select lives_ok($$ select public.set_user_suspended('00000000-0000-4000-a000-000000000001', true) $$,
  'un·e admin suspend un·e enseignant·e');

select * from finish();
rollback;
