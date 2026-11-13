-- =============================================================================
-- Agents IA, phase 2 : écriture des étudiant·es (projet, devlog, commentaires)
-- - mention « via <application> » sur les actualités et commentaires écrits par un agent ;
-- - l'admin peut désactiver une permission pour tout le monde (ex. devlog rédigé par une IA).
-- =============================================================================

-- Permissions désactivées par l'admin : retirées de toutes les connexions, immédiatement.
alter table public.app_settings
  add column agent_disabled_scopes text[] not null default '{}'
    check (agent_disabled_scopes <@ array['projet', 'devlog', 'commentaires', 'contraintes', 'financement', 'moderation']);
grant select (agent_disabled_scopes) on public.app_settings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Mention « via un agent »
-- -----------------------------------------------------------------------------
alter table public.posts add column via_agent text check (char_length(via_agent) <= 80);
alter table public.comments add column via_agent text check (char_length(via_agent) <= 80);

-- Le serveur MCP pose `sparkly.agent` (nom de l'application) dans la transaction « en tant que »
-- la personne. Personne ne peut l'écrire via l'API : la valeur envoyée est toujours écrasée.
-- Une modification humaine garde la mention ; une modification par un agent la pose.
create or replace function public.mark_via_agent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_agent text := nullif(left(current_setting('sparkly.agent', true), 80), '');
begin
  if tg_op = 'INSERT' then
    new.via_agent := v_agent;
  else
    new.via_agent := coalesce(v_agent, old.via_agent);
  end if;
  return new;
end;
$$;

create trigger posts_via_agent before insert or update on public.posts
  for each row execute function public.mark_via_agent();
create trigger comments_via_agent before insert or update on public.comments
  for each row execute function public.mark_via_agent();

-- -----------------------------------------------------------------------------
-- Clés d'API : pas de permission désactivée par l'admin
-- -----------------------------------------------------------------------------
create or replace function public.create_agent_api_key(
  p_name text, p_scopes text[], p_expires_at timestamptz, p_key_hash text, p_key_prefix text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Compte suspendu.' using errcode = '42501';
  end if;
  if not (select agents_enabled from public.app_settings where id) then
    raise exception 'Les agents IA sont désactivés par l''équipe pédagogique.' using errcode = '42501';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  if p_scopes is null or cardinality(p_scopes) = 0 or not (p_scopes <@ public.agent_allowed_scopes(v_role))
     or p_scopes && (select agent_disabled_scopes from public.app_settings where id) then
    raise exception 'Permissions non autorisées pour ton rôle.' using errcode = '42501';
  end if;
  if p_expires_at <= now() + interval '1 hour' or p_expires_at > public.agent_expiry_cap(p_scopes) then
    raise exception 'Durée de validité hors limites.' using errcode = '22023';
  end if;
  insert into public.agent_connections (user_id, kind, name, scopes, key_prefix, expires_at)
  values (auth.uid(), 'api_key', p_name, p_scopes, p_key_prefix, p_expires_at)
  returning id into v_id;
  insert into public.agent_tokens (hash, connection_id, kind, expires_at)
  values (p_key_hash, v_id, 'api_key', p_expires_at);
  return v_id;
end;
$$;
