-- Notification « X t'invite à rejoindre Y » (triggers sur project_invitations et profiles).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

-- Rythme du Hall (1003, brouillon) : farid 0007 en est le chef. dylan 0005 a déjà un compte.
select pg_temp.login('00000000-0000-4000-a000-000000000007');
insert into public.project_invitations (project_id, email, role, team_title, invited_by)
values ('10000000-0000-4000-a000-000000000003', 'dylan.demo@etudiant.univ-reims.fr', 'crea', 'Sound designer',
        '00000000-0000-4000-a000-000000000007');
select pg_temp.su();

select results_eq(
  $$ select kind, actor_id::text, team_title, project_title from public.notifications
     where user_id = '00000000-0000-4000-a000-000000000005' and kind = 'invitation' $$,
  $$ values ('invitation'::text, '00000000-0000-4000-a000-000000000007'::text, 'Sound designer'::text, 'Rythme du Hall'::text) $$,
  'la personne invitée qui a un compte est notifiée, avec le rôle et le titre du projet');
select is(
  (select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-000000000007' and kind = 'invitation'),
  0, 'celui qui invite n''est pas notifié');

-- La personne invitée lit sa notification et voit le projet en brouillon qui l'invite.
select pg_temp.login('00000000-0000-4000-a000-000000000005');
select is(
  (select project_title from public.notifications where kind = 'invitation'),
  'Rythme du Hall', 'la personne invitée lit sa notification');
select is(
  (select title from public.projects where id = '10000000-0000-4000-a000-000000000003'),
  'Rythme du Hall', 'la personne invitée voit le projet en brouillon qui l''invite');
select pg_temp.login('00000000-0000-4000-a000-000000000004');
select is(
  (select count(*)::int from public.projects where id = '10000000-0000-4000-a000-000000000003'),
  0, 'un étudiant non invité ne voit toujours pas le brouillon');
select pg_temp.login('00000000-0000-4000-a000-000000000005');

-- Elle accepte : l'invitation disparaît, la notification reste (et mène au projet).
select lives_ok(
  $$ select public.accept_invitation((select id from public.project_invitations where email = 'dylan.demo@etudiant.univ-reims.fr')) $$,
  'l''invitation est acceptée');
select pg_temp.su();
select is(
  (select invitation_id from public.notifications where user_id = '00000000-0000-4000-a000-000000000005' and kind = 'invitation'),
  null, 'invitation acceptée : la notification reste, sans lien vers l''invitation');

-- Invitation d'une adresse sans compte : la notification arrive à la création du compte.
select pg_temp.login('00000000-0000-4000-a000-000000000007');
insert into public.project_invitations (project_id, email, role, invited_by)
values ('10000000-0000-4000-a000-000000000003', 'nouvelle.recrue@etudiant.univ-reims.fr', 'dev',
        '00000000-0000-4000-a000-000000000007');
select pg_temp.su();
select is((select count(*)::int from public.notifications where kind = 'invitation' and project_title = 'Rythme du Hall'), 1,
  'pas de compte, pas encore de notification');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '0000000a-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
        'nouvelle.recrue@etudiant.univ-reims.fr', now(), '{"provider":"email"}', '{}', now(), now());
select is(
  (select count(*)::int from public.notifications where user_id = '0000000a-0000-4000-a000-000000000001' and kind = 'invitation'),
  1, 'à la création du compte, l''invitation en attente devient une notification');

select * from finish();
rollback;
