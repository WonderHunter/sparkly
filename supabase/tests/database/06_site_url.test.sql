-- Site de gestion / promotion du jeu (projects.site_url).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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

-- Neon Pusher (1001) : membre 0003. dylan (0005) n'en fait pas partie.

select has_column('public', 'projects', 'site_url', 'projects a une colonne site_url');

select pg_temp.login('00000000-0000-4000-a000-000000000003');
select lives_ok(
  $$ update public.projects set site_url = 'https://neon-pusher.example.fr'
     where id = '10000000-0000-4000-a000-000000000001' $$,
  'un membre renseigne le site du jeu');
select throws_ok(
  $$ update public.projects set site_url = 'javascript:alert(1)'
     where id = '10000000-0000-4000-a000-000000000001' $$,
  '23514', null, 'seules les adresses http(s) sont acceptées');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
update public.projects set site_url = 'https://pirate.example.fr' where id = '10000000-0000-4000-a000-000000000001';

select pg_temp.su();
select is(
  (select site_url from public.projects where id = '10000000-0000-4000-a000-000000000001'),
  'https://neon-pusher.example.fr', 'un étudiant hors du groupe ne modifie pas le site');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
select is(
  (select site_url from public.projects where slug = 'neon-pusher'),
  'https://neon-pusher.example.fr', 'le site est lisible publiquement');

select * from finish();
rollback;
