-- Agents IA, phase 2 : mention « via <application> » posée par la base, permissions désactivées par l'admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('sparkly.agent', '', true);
end;
$$;
create or replace function pg_temp.su() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('sparkly.agent', '', true);
end;
$$;

-- Alice (0002) est cheffe de Neon Pusher (1001, publié).
-- ---------------------------------------------------------------------------
-- Mention « via »
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select set_config('sparkly.agent', 'Claude', true);
insert into public.posts (project_id, author_id, title, body, status)
values ('10000000-0000-4000-a000-000000000001', auth.uid(), 'Écrit par un agent', '<p>Texte</p>', 'published');
insert into public.comments (project_id, author_id, body)
values ('10000000-0000-4000-a000-000000000001', auth.uid(), 'Commentaire par un agent');

select is((select via_agent from public.posts where title = 'Écrit par un agent'), 'Claude',
  'une actualité écrite par un agent porte le nom de l''application');
select is((select via_agent from public.comments where body = 'Commentaire par un agent'), 'Claude',
  'un commentaire aussi');

-- Depuis le site (pas d'agent) : impossible de poser ou d'effacer la mention soi-même.
select pg_temp.login('00000000-0000-4000-a000-000000000002');
insert into public.posts (project_id, author_id, title, body, via_agent)
values ('10000000-0000-4000-a000-000000000001', auth.uid(), 'Écrit à la main', '<p>Texte</p>', 'Faux agent');
select is((select via_agent from public.posts where title = 'Écrit à la main'), null,
  'on ne peut pas se faire passer pour un agent');
update public.posts set via_agent = null, body = '<p>Retouché à la main</p>' where title = 'Écrit par un agent';
select is((select via_agent from public.posts where title = 'Écrit par un agent'), 'Claude',
  'retoucher à la main garde la mention, et on ne peut pas l''effacer');
update public.comments set via_agent = null where body = 'Commentaire par un agent';
select is((select via_agent from public.comments where body = 'Commentaire par un agent'), 'Claude',
  'idem pour un commentaire');

-- Un agent qui retouche une actualité écrite à la main pose la mention.
select set_config('sparkly.agent', 'Cursor', true);
update public.posts set title = 'Écrit à la main, relu' where title = 'Écrit à la main';
select is((select via_agent from public.posts where title = 'Écrit à la main, relu'), 'Cursor',
  'une retouche par un agent pose la mention');

-- La RLS s'applique toujours : pas d'actualité dans le projet d'un autre groupe.
select throws_ok(
  $$ insert into public.posts (project_id, author_id, title, body) values ('10000000-0000-4000-a000-000000000002', auth.uid(), 'Intrus', '') $$,
  '42501', null, 'un agent n''écrit pas dans le projet d''un autre groupe');

-- ---------------------------------------------------------------------------
-- Permissions désactivées par l'admin
-- ---------------------------------------------------------------------------
select pg_temp.su();
update public.app_settings set agent_disabled_scopes = array['devlog'] where id;
select pg_temp.login('00000000-0000-4000-a000-000000000002');
select is((select agent_disabled_scopes from public.app_settings where id), array['devlog'],
  'tout le monde voit quelles permissions sont désactivées');
select throws_ok(
  $$ select public.create_agent_api_key('Devlog', array['lecture', 'devlog'], now() + interval '7 days', repeat('a', 64), 'spk_aaaaaaaa') $$,
  '42501', null, 'une clé ne peut pas recevoir une permission désactivée');
select lives_ok(
  $$ select public.create_agent_api_key('Projet', array['lecture', 'projet'], now() + interval '7 days', repeat('b', 64), 'spk_bbbbbbbb') $$,
  'les autres permissions restent possibles');

select * from finish();
rollback;
