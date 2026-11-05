-- Notifications de commentaires (trigger comments_notify, RLS, mark_notifications_read).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

-- Neon Pusher (1001) : alice 0002 (owner), bastien 0003, chloé 0004. dylan 0005 n'en fait pas partie.

-- 1. dylan commente le projet : les 3 membres sont notifiés, pas lui.
select pg_temp.login('00000000-0000-4000-a000-000000000005');
insert into public.comments (id, project_id, author_id, body)
values ('c0000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001',
        '00000000-0000-4000-a000-000000000005', 'Trop bien ce coin pusher !');
select pg_temp.su();

select results_eq(
  $$ select user_id::text from public.notifications
     where comment_id = 'c0000000-0000-4000-a000-000000000001' and kind = 'comment' order by user_id $$,
  $$ values ('00000000-0000-4000-a000-000000000002'), ('00000000-0000-4000-a000-000000000003'), ('00000000-0000-4000-a000-000000000004') $$,
  'un commentaire notifie chaque membre du projet');
select is(
  (select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-000000000005'),
  0, 'l''auteur du commentaire n''est pas notifié');

-- 2. bastien (membre) répond à dylan : dylan reçoit « reply », alice et chloé « comment », pas bastien.
select pg_temp.login('00000000-0000-4000-a000-000000000003');
insert into public.comments (id, project_id, author_id, parent_id, body)
values ('c0000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001',
        '00000000-0000-4000-a000-000000000003', 'c0000000-0000-4000-a000-000000000001', 'Merci !');
select pg_temp.su();

select is(
  (select kind from public.notifications
   where comment_id = 'c0000000-0000-4000-a000-000000000002' and user_id = '00000000-0000-4000-a000-000000000005'),
  'reply', 'l''auteur du commentaire parent reçoit une réponse');
select is(
  (select count(*)::int from public.notifications where comment_id = 'c0000000-0000-4000-a000-000000000002'),
  3, 'une réponse : le parent + les 2 autres membres, sans doublon');
select is(
  (select count(*)::int from public.notifications
   where comment_id = 'c0000000-0000-4000-a000-000000000002' and user_id = '00000000-0000-4000-a000-000000000003'),
  0, 'celui qui répond n''est pas notifié');

-- 3. Chacun ne lit que ses notifications.
select pg_temp.login('00000000-0000-4000-a000-000000000004');
select is(
  (select count(*)::int from public.notifications
   where comment_id in ('c0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000002')),
  2, 'chloé ne voit que ses 2 notifications');
select is(
  (select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-000000000002'),
  0, 'chloé ne voit pas celles d''alice');

-- 4. Pas d'écriture directe, mais la fonction marque comme lu.
select throws_ok(
  $$ insert into public.notifications (user_id, kind, project_id, comment_id)
     values ('00000000-0000-4000-a000-000000000004', 'comment', '10000000-0000-4000-a000-000000000001',
             'c0000000-0000-4000-a000-000000000001') $$,
  '42501', null, 'impossible de créer une notification à la main');

select public.mark_notifications_read();
select is(
  (select count(*)::int from public.notifications where read_at is null),
  0, 'mark_notifications_read() marque tout comme lu');

select pg_temp.su();
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-4000-a000-000000000002' and read_at is null
     and comment_id in ('c0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000002')),
  2, 'les notifications des autres restent non lues');

select * from finish();
rollback;
