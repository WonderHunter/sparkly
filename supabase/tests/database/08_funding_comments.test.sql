-- Mot joint à un financement (comments.investment_id) et option admin funding_comments_enabled.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

-- Prof Démo (0001) finance Table Tempête (1002). dylan (0005) est étudiant.
select pg_temp.login('00000000-0000-4000-a000-000000000001');
insert into public.investments (id, project_id, investor_id, amount, school_year)
values ('f0000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002',
        '00000000-0000-4000-a000-000000000001', 2000, 'ignoré');

select lives_ok(
  $$ insert into public.comments (id, project_id, author_id, body, investment_id)
     values ('c0000000-0000-4000-a000-0000000000f1', '10000000-0000-4000-a000-000000000002',
             '00000000-0000-4000-a000-000000000001', 'Foncez !', 'f0000000-0000-4000-a000-000000000001') $$,
  'le prof joint un mot à son financement');
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body, investment_id)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'Encore !',
             'f0000000-0000-4000-a000-000000000001') $$,
  '23505', null, 'un seul mot par financement');
select throws_ok(
  $$ update public.comments set investment_id = null where id = 'c0000000-0000-4000-a000-0000000000f1' $$,
  '42501', null, 'le lien au financement ne se modifie pas');
select lives_ok(
  $$ update public.comments set body = 'Foncez, le pitch est top !' where id = 'c0000000-0000-4000-a000-0000000000f1' $$,
  'le prof peut reformuler son mot');

-- Un étudiant ne peut pas se servir du financement d'un prof.
select pg_temp.login('00000000-0000-4000-a000-000000000005');
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body, investment_id)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000005', 'Moi aussi',
             'f0000000-0000-4000-a000-000000000001') $$,
  '42501', null, 'impossible de rattacher un mot au financement d''un autre');

-- Option désactivée par l'admin : plus de nouveaux mots.
select pg_temp.su();
update public.app_settings set funding_comments_enabled = false where id;
select pg_temp.login('00000000-0000-4000-a000-000000000001');
insert into public.investments (id, project_id, investor_id, amount, school_year)
values ('f0000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002',
        '00000000-0000-4000-a000-000000000001', 1000, 'ignoré');
select throws_ok(
  $$ insert into public.comments (project_id, author_id, body, investment_id)
     values ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'Bravo',
             'f0000000-0000-4000-a000-000000000002') $$,
  '42501', null, 'option désactivée : pas de mot avec le financement');
select is(
  (select count(*)::int from public.investments where investor_id = '00000000-0000-4000-a000-000000000001'
     and project_id = '10000000-0000-4000-a000-000000000002'),
  2, 'les financements restent possibles sans mot');

-- Retirer le financement retire son mot.
delete from public.investments where id = 'f0000000-0000-4000-a000-000000000001';
select pg_temp.su();
select is(
  (select count(*)::int from public.comments where id = 'c0000000-0000-4000-a000-0000000000f1'),
  0, 'le mot disparaît avec son financement');

select * from finish();
rollback;
