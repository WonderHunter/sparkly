-- Site de gestion / promotion du jeu (scores, actus, réglages), affiché dans un encart sur la page projet.
alter table public.projects
  add column site_url text
  constraint projects_site_url_http check (site_url is null or site_url ~* '^https?://\S+$');

comment on column public.projects.site_url is 'Site de gestion / promotion du jeu tenu par le groupe.';
