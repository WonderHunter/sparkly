-- =============================================================================
-- Agents IA, phases 3 et 4 : équipe pédagogique (contraintes, financement, modération)
-- Les actions sensibles (financer, modifier ou retirer un financement, masquer, rétablir,
-- publier un brouillon) se font en deux temps : l'outil renvoie un récapitulatif et un code ;
-- l'agent doit rappeler l'outil avec exactement les mêmes paramètres et ce code.
-- =============================================================================

create table public.agent_confirmations (
  hash text primary key,                       -- empreinte SHA-256 du code
  connection_id uuid not null references public.agent_connections (id) on delete cascade,
  tool text not null,
  payload_hash text not null,                  -- empreinte des paramètres exacts de l'action
  summary text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index agent_confirmations_connection_idx on public.agent_confirmations (connection_id, created_at desc);

alter table public.agent_confirmations enable row level security;
revoke all on public.agent_confirmations from anon, authenticated;

