-- v3.2 C3 — HOY feed ignore telemetry (#36). The feed scorer (assembleTodayFeed)
-- already DEMOTES ignored signals; this is the missing PRODUCER: record when the
-- trader dismisses a signal so the feed LEARNS what they keep ignoring. Keyed by the
-- stable signal id (e.g. "insight:<id>"). RLS.

create table if not exists public.feed_ignores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  signal_key  text not null,
  count       int not null default 1,
  last_at     timestamptz not null default now(),
  unique (user_id, signal_key)
);
create index if not exists feed_ignores_user_idx on public.feed_ignores (user_id);

alter table public.feed_ignores enable row level security;
drop policy if exists feed_ignores_user on public.feed_ignores;
create policy feed_ignores_user on public.feed_ignores
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
