-- Publication d'un brouillon par l'équipe pédagogique.
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

-- Rythme du Hall (1003) : brouillon de gabriel (0007). dylan = 0005 (étudiant hors projet), prof = 0001.

select pg_temp.login('00000000-0000-4000-a000-000000000005');
update public.projects set status = 'published' where id = '10000000-0000-4000-a000-000000000003';
select pg_temp.su();
select is(
  (select status::text from public.projects where id = '10000000-0000-4000-a000-000000000003'),
  'draft', 'un étudiant hors du groupe ne publie pas le brouillon d''un autre');

select pg_temp.login('00000000-0000-4000-a000-000000000001');
select is(public.can_view_project('10000000-0000-4000-a000-000000000003'), true, 'un prof voit les brouillons');
select lives_ok(
  $$ update public.projects set status = 'published' where id = '10000000-0000-4000-a000-000000000003' $$,
  'un prof publie un brouillon');

select pg_temp.su();
select is(
  (select status::text from public.projects where id = '10000000-0000-4000-a000-000000000003'),
  'published', 'le brouillon est publié');
select isnt(
  (select published_at from public.projects where id = '10000000-0000-4000-a000-000000000003'),
  null, 'la date de publication est renseignée');

select * from finish();
rollback;
