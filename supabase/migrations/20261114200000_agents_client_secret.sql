-- =============================================================================
-- Agents IA : applications enregistrées avec un secret (RFC 7591, client_secret_post / client_secret_basic).
-- Certaines applications s'enregistrent comme « confidentielles » : on leur remet un secret (dont seule
-- l'empreinte est gardée) et on le vérifie au point de jeton. PKCE reste obligatoire pour toutes.
-- =============================================================================
alter table public.agent_clients
  add column token_endpoint_auth_method text not null default 'none'
    check (token_endpoint_auth_method in ('none', 'client_secret_post', 'client_secret_basic')),
  add column secret_hash text,
  add constraint agent_clients_secret_check check ((token_endpoint_auth_method = 'none') = (secret_hash is null));
