-- Agents IA, phases 3 et 4 : les codes de confirmation restent côté serveur.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-000000000001', 'role', 'authenticated')::text, true);
select throws_ok($$ select * from public.agent_confirmations $$, '42501', null,
  'un compte (même enseignant) ne lit pas les codes de confirmation');
select throws_ok($$ insert into public.agent_confirmations (hash, connection_id, tool, payload_hash, summary, expires_at)
  values ('x', gen_random_uuid(), 'financer', 'y', 'z', now()) $$, '42501', null,
  'ni n''en fabrique');

select set_config('role', 'anon', true);
select throws_ok($$ select * from public.agent_confirmations $$, '42501', null, 'un visiteur non plus');

select * from finish();
rollback;
