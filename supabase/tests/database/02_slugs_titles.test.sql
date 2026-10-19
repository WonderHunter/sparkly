-- Adresses personnalisées (historique, réservation) et détection des titres en double.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create or replace function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- Alice est cheffe de Neon Pusher, Dylan de Table Tempête (seed).
select pg_temp.login('00000000-0000-4000-a000-000000000005');

-- ---------------------------------------------------------------------------
-- Titres en double
-- ---------------------------------------------------------------------------
select is(public.normalize_title('  Néon   PUSHER '), 'neon pusher', 'casse, accents et espaces ignorés');
select is(
  (select count(*)::int from public.title_conflicts('neon  pusher', '10000000-0000-4000-a000-000000000002')),
  1, 'le titre « neon pusher » est déjà utilisé');
select is(
  (select slug from public.title_conflicts('Neon Pusher', null) limit 1),
  'neon-pusher', 'le slug d''un projet publié est renvoyé');
select is(
  (select slug from public.title_conflicts('Rythme du Hall', null) limit 1),
  null, 'le slug d''un brouillon n''est jamais révélé');
select is(
  (select count(*)::int from public.title_conflicts('Neon Pusher', '10000000-0000-4000-a000-000000000001')),
  0, 'un projet n''est pas en conflit avec lui-même');

-- ---------------------------------------------------------------------------
-- Changement d'adresse
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000002');
update public.projects set slug = 'neon-pusher-deluxe' where id = '10000000-0000-4000-a000-000000000001';
select is(
  (select project_id from public.project_slug_history where slug = 'neon-pusher'),
  '10000000-0000-4000-a000-000000000001'::uuid, 'l''ancienne adresse est gardée dans l''historique');

select pg_temp.login('00000000-0000-4000-a000-000000000005');
select throws_ok(
  $$ update public.projects set slug = 'neon-pusher' where id = '10000000-0000-4000-a000-000000000002' $$,
  '23505', null, 'un autre projet ne peut pas reprendre une ancienne adresse');

select pg_temp.login('00000000-0000-4000-a000-000000000002');
update public.projects set slug = 'neon-pusher' where id = '10000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from public.project_slug_history where slug = 'neon-pusher'), 0,
  'un projet peut reprendre sa propre ancienne adresse');
select is(
  (select project_id from public.project_slug_history where slug = 'neon-pusher-deluxe'),
  '10000000-0000-4000-a000-000000000001'::uuid, 'l''adresse quittée rejoint l''historique');

select * from finish();
rollback;
