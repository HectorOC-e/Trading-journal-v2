-- v3.2 E1·a — Episodic memory (E13, FREEZE §6). Append-only record of salient
-- moments the coach can recall (hybrid: structured filter + kNN + salience). The
-- embedding column mirrors trades.notes_embedding (pgvector, managed via raw SQL;
-- not in the prisma model). RLS per-user. Anti-poisoning untouched: episodes are
-- evidence (append-only, never edited), distinct from semantic/identity memory.

create table if not exists public.memory_episodes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  event_type  text not null,                 -- intervention | commitment_broken | checkin_red | commitment_kept | streak | trade_emotional | manual
  content     text not null,
  salience    double precision not null default 0.5,
  source_id   uuid,                           -- optional ref (trade/intervention/commitment) — generic, no FK
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists memory_episodes_user_occurred_idx on public.memory_episodes (user_id, occurred_at desc);

-- pgvector embedding (1536, mirrors trades.notes_embedding); written via ::vector.
alter table public.memory_episodes add column if not exists embedding vector(1536);
create index if not exists idx_memory_episodes_embedding
  on public.memory_episodes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.memory_episodes enable row level security;
drop policy if exists memory_episodes_user on public.memory_episodes;
create policy memory_episodes_user on public.memory_episodes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
