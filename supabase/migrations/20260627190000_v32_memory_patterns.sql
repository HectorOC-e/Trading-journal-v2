-- v3.2 E1·b — Semantic memory (E14, FREEZE §6). Patterns GENERALIZED from episodes
-- (E13) with their support episode ids. Confirmed deterministically when enough
-- episodes support them (P6 / D9 — the data confirms, never the LLM). One row per
-- (user, pattern_key), upserted by the Memory Agent. RLS.

create table if not exists public.memory_patterns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  pattern_key         text not null,
  text                text not null,
  status              text not null default 'candidate',   -- candidate | confirmed | refuted
  support_episode_ids uuid[] not null default '{}',
  confidence          double precision not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, pattern_key)
);
create index if not exists memory_patterns_user_status_idx on public.memory_patterns (user_id, status);

alter table public.memory_patterns enable row level security;
drop policy if exists memory_patterns_user on public.memory_patterns;
create policy memory_patterns_user on public.memory_patterns
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
