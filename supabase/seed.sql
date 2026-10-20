-- =============================================================================
-- Données de démo (développement local et tests uniquement — jamais en production)
-- =============================================================================

-- Comptes fictifs. Insérer directement dans auth.users contourne le hook Auth
-- mais déclenche handle_new_user, qui crée les profils.
create or replace function pg_temp.demo_user(p_id uuid, p_email text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$$;

select pg_temp.demo_user('00000000-0000-4000-a000-000000000001', 'prof.demo@univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000002', 'alice.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000003', 'bastien.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000004', 'chloe.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000005', 'dylan.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000006', 'emma.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000007', 'farid.demo@etudiant.univ-reims.fr');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000008', 'admin.demo@univ-reims.fr');

update public.profiles set role = 'admin', display_name = 'Admin Démo' where id = '00000000-0000-4000-a000-000000000008';
update public.profiles set display_name = 'Prof Démo', bio = 'Enseignant·e référent·e de la SAÉ jeux d''arcade.' where id = '00000000-0000-4000-a000-000000000001';
update public.profiles set display_name = 'Alice Martin', promo = 'MMI3 2026-2027', bio = 'Dev gameplay, fan de shoot''em up.' where id = '00000000-0000-4000-a000-000000000002';
update public.profiles set display_name = 'Bastien Leroy', promo = 'MMI3 2026-2027' where id = '00000000-0000-4000-a000-000000000003';
update public.profiles set display_name = 'Chloé Durand', promo = 'MMI3 2026-2027', bio = 'Graphiste et motion designer.' where id = '00000000-0000-4000-a000-000000000004';
update public.profiles set display_name = 'Dylan Petit', promo = 'MMI3 2026-2027' where id = '00000000-0000-4000-a000-000000000005';
update public.profiles set display_name = 'Emma Roux', promo = 'MMI3 2026-2027' where id = '00000000-0000-4000-a000-000000000006';
update public.profiles set display_name = 'Farid Benali', promo = 'MMI3 2026-2027' where id = '00000000-0000-4000-a000-000000000007';

-- Projets (le trigger ajoute le créateur comme owner et crée les 6 jalons).
insert into public.projects (id, slug, title, pitch, story, category_id, platform, status, created_by, game_url, video_url)
values
  ('10000000-0000-4000-a000-000000000001', 'neon-pusher', 'Neon Pusher',
   'Un coin pusher néon où chaque pièce déclenche une avalanche de lumière.',
   '<p>Neon Pusher revisite le <strong>coin pusher</strong> des fêtes foraines avec une physique exagérée et beaucoup de <em>juice</em> : chaque pièce fait vibrer l''écran, chaque chute déclenche une pluie de particules.</p><h2>Gameplay</h2><ul><li>Une partie dure 3 minutes.</li><li>La difficulté augmente avec le score.</li><li>Jouable à deux sur la borne.</li></ul>',
   (select id from public.categories where slug = 'arcade'), 'borne', 'published',
   '00000000-0000-4000-a000-000000000002', 'https://example.com/neon-pusher', 'https://www.youtube.com/watch?v=216_5nu4aVQ'),
  ('10000000-0000-4000-a000-000000000002', 'table-tempete', 'Table Tempête',
   'Quatre joueurs, une table cocktail, une tempête à dompter ensemble.',
   '<p>Un jeu coopératif en vue de dessus pour la table cocktail : chaque joueur contrôle un côté du bateau.</p>',
   (select id from public.categories where slug = 'party'), 'cocktail', 'published',
   '00000000-0000-4000-a000-000000000005', null, null),
  ('10000000-0000-4000-a000-000000000003', 'rythme-hall', 'Rythme du Hall',
   'Un jeu de rythme projeté sur la télé du hall, contrôlé avec ton téléphone.',
   '<p>Projet encore en brouillon.</p>',
   (select id from public.categories where slug = 'rythme'), 'tv', 'draft',
   '00000000-0000-4000-a000-000000000007', null, null);

insert into public.project_members (project_id, user_id, role, team_title, position) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'dev', 'Développeur Unity', 1),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000004', 'crea', 'Graphiste', 2),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000006', 'crea', 'Game designer', 1);

update public.project_members set team_title = 'Lead dev' where user_id = '00000000-0000-4000-a000-000000000002';

-- Avancée des jalons.
update public.milestones set status = 'done'
  where project_id = '10000000-0000-4000-a000-000000000001' and position in (1, 2);
update public.milestones set status = 'in_progress'
  where project_id = '10000000-0000-4000-a000-000000000001' and position = 3;
update public.milestones set status = 'done'
  where project_id = '10000000-0000-4000-a000-000000000002' and position = 1;

-- Devlog.
insert into public.posts (project_id, author_id, title, body, status, published_at) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002',
   'Le moodboard est prêt',
   '<p>On a fixé la direction artistique : néon, synthwave et beaucoup de particules.</p>',
   'published', now() - interval '20 days'),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003',
   'Premier prototype jouable',
   '<p>La physique des pièces fonctionne. On attaque le score et la difficulté croissante.</p>',
   'published', now() - interval '6 days'),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000005',
   'Concept validé',
   '<p>Le prof a validé le concept coopératif à 4 joueurs.</p>',
   'published', now() - interval '3 days');

insert into public.faqs (project_id, question, answer, position) values
  ('10000000-0000-4000-a000-000000000001', 'Combien de temps dure une partie ?', 'Trois minutes, comme une vraie borne d''arcade.', 1),
  ('10000000-0000-4000-a000-000000000001', 'Peut-on y jouer sur le web ?', 'Oui, une version WebGL sera disponible en fin de projet.', 2);

insert into public.comments (project_id, author_id, body, created_at) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000005', 'Le rendu néon est superbe, hâte de tester !', now() - interval '5 days'),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'Pensez à bien doser la difficulté sur les 30 premières secondes.', now() - interval '4 days');

insert into public.follows (user_id, project_id) values
  ('00000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002');

-- Financement fictif : le prof de démo soutient Neon Pusher (budget annuel : 120 000 €).
insert into public.investments (project_id, investor_id, amount, school_year)
values ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 6000, public.current_school_year());
