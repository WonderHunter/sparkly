-- Agents IA : tables privées, clés d'API, durée bornée, révocation, écrans admin, rappel d'expiration.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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

-- 0002 Alice (étudiante), 0003 Bastien (étudiant), 0001 Prof (enseignant), 0008 Admin.
-- ---------------------------------------------------------------------------
-- Tables : jamais lisibles directement, ni connecté ni anonyme
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select throws_ok($$ select * from public.agent_tokens $$, '42501', null, 'un compte ne lit pas les empreintes de jetons');
select throws_ok($$ select * from public.agent_connections $$, '42501', null, 'ni la table des connexions');
select throws_ok($$ insert into public.agent_audit (user_id, tool, ok) values (auth.uid(), 'x', true) $$, '42501', null,
  'ni n''écrit dans le journal');
select pg_temp.su();
set local role anon;
select throws_ok($$ select * from public.agent_codes $$, '42501', null, 'un visiteur ne lit pas les codes d''autorisation');
select throws_ok($$ select public.my_agent_connections() $$, '42501', null, 'ni n''appelle les fonctions des agents');
select pg_temp.su();

-- ---------------------------------------------------------------------------
-- Clés d'API : permissions du rôle, durée bornée
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select lives_ok(
  $$ select public.create_agent_api_key('Mon script', array['lecture'], now() + interval '30 days', repeat('a', 64), 'spk_aaaaaaaa') $$,
  'une étudiante crée une clé en lecture pour 30 jours');
select throws_ok(
  $$ select public.create_agent_api_key('Trop', array['financement'], now() + interval '7 days', repeat('b', 64), 'spk_bbbbbbbb') $$,
  '42501', null, 'une étudiante ne peut pas accorder le financement');
select throws_ok(
  $$ select public.create_agent_api_key('Infinie', array['lecture'], now() + interval '400 days', repeat('c', 64), 'spk_cccccccc') $$,
  '22023', null, 'une clé ne peut pas dépasser la durée maximale');
select throws_ok(
  $$ select public.create_agent_api_key('Passée', array['lecture'], now() - interval '1 day', repeat('d', 64), 'spk_dddddddd') $$,
  '22023', null, 'ni expirer dans le passé');
select is((select count(*)::int from public.my_agent_connections()), 1, 'elle voit sa clé dans ses réglages');
select is((select key_prefix from public.my_agent_connections()), 'spk_aaaaaaaa', 'seul le début de la clé est conservé');

-- Durée : jamais au-delà du 31 août ; 30 jours au plus avec financement ou modération.
select pg_temp.su();
update public.app_settings set agent_max_days = 366 where id;
select is(
  public.agent_expiry_cap(array['lecture']),
  make_timestamptz(split_part(public.current_school_year(), '-', 2)::int, 8, 31, 23, 59, 59, 'Europe/Paris'),
  'jamais au-delà du 31 août de l''année universitaire');
select ok(public.agent_expiry_cap(array['lecture', 'financement']) <= now() + interval '30 days',
  'avec le financement : 30 jours au plus');
update public.app_settings set agent_max_days = 90 where id;

-- Un enseignant accorde le financement, mais pour 30 jours au plus.
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select throws_ok(
  $$ select public.create_agent_api_key('Prof', array['lecture', 'financement'], now() + interval '60 days', repeat('e', 64), 'spk_eeeeeeee') $$,
  '22023', null, 'un enseignant ne donne pas le financement pour 60 jours');
select lives_ok(
  $$ select public.create_agent_api_key('Prof', array['lecture', 'financement'], now() + interval '20 days', repeat('f', 64), 'spk_ffffffff') $$,
  'mais pour 20 jours, oui');

-- ---------------------------------------------------------------------------
-- Prolonger, raccourcir, révoquer
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select throws_ok(
  $$ select public.set_agent_connection_expiry((select id from public.my_agent_connections()), now() + interval '400 days') $$,
  '22023', null, 'prolonger au-delà du plafond est refusé');
select lives_ok(
  $$ select public.set_agent_connection_expiry((select id from public.my_agent_connections()), now() + interval '3 days') $$,
  'raccourcir sa clé à 3 jours');
select pg_temp.su();
select ok(
  (select t.expires_at < now() + interval '4 days' from public.agent_tokens t where t.hash = repeat('a', 64)),
  'la clé elle-même suit la nouvelle date');

-- Identifiant de la clé d'Alice, accessible aux autres comptes pour tenter de la toucher.
create temp table alice_key on commit drop as
  select id from public.agent_connections where user_id = '00000000-0000-4000-a000-000000000002';
grant select on alice_key to authenticated;

-- Bastien ne touche pas à la clé d'Alice, ni ne voit son journal.
select pg_temp.login('00000000-0000-4000-a000-000000000003');
select throws_ok($$ select public.revoke_agent_connection((select id from alice_key)) $$, 'P0002', null,
  'un autre étudiant ne révoque pas la clé d''Alice');
select throws_ok(
  $$ select public.set_agent_connection_expiry((select id from alice_key), now() + interval '2 days') $$, 'P0002', null,
  'ni ne change sa durée');

-- ---------------------------------------------------------------------------
-- Écrans admin : réservés aux admins
-- ---------------------------------------------------------------------------
select throws_ok($$ select * from public.admin_agent_connections() $$, '42501', null, 'un étudiant n''ouvre pas l''écran admin');
select pg_temp.login('00000000-0000-4000-a000-000000000008');
select is((select count(*)::int from public.admin_agent_connections() where user_id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002')), 2, 'l''admin voit les connexions de tout le monde');
select lives_ok($$ select public.revoke_agent_connection((select id from alice_key)) $$, 'l''admin révoque la clé d''Alice');

-- ---------------------------------------------------------------------------
-- Rappel « ton accès expire bientôt » : une seule fois par connexion
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
select public.set_agent_connection_expiry(
  (select id from public.my_agent_connections() where revoked_at is null), now() + interval '5 days');
select public.agent_expiry_reminders();
select public.agent_expiry_reminders();
select results_eq(
  $$ select kind, agent_name, project_id from public.notifications where kind = 'agent_expiring' $$,
  $$ values ('agent_expiring'::text, 'Prof'::text, null::uuid) $$,
  'l''enseignant reçoit un seul rappel pour son accès qui expire dans 5 jours');

select * from finish();
rollback;
