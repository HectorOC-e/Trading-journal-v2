-- Sprint 0 (v3.1) — Cognitive Engine foundations.
--
-- Ships the TRANSPORT + STORAGE for the v3 cognitive layer, with no producers or
-- consumers wired yet:
--   1. domain_events — transactional outbox (ADR-001, FREEZE-D1/D6, entity E5).
--   2. insights      — persisted insights (C8, FREEZE-E6) with statistical-honesty
--                      columns (ADR-002): sample_size is always real; the Bayesian
--                      confidence/credible-interval/effect-size land in S3 and stay
--                      NULL until then.
--
-- Both tables follow the repo's standard per-user pattern: RLS enabled + a
-- `<table>_user` policy (auth.uid() = user_id). Prisma's server connection bypasses
-- RLS; the policy only closes the anon/PostgREST hole (mirrors trades_user).

-- ── 1. domain_events (outbox) ─────────────────────────────────────────────────
create table if not exists public.domain_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending',
  attempts     integer not null default 0,
  max_attempts integer not null default 5,
  dedupe_key   text,
  occurred_at  timestamptz not null default now(),
  processed_at timestamptz,
  last_error   text,
  created_at   timestamptz not null default now()
);

-- Dispatcher hot path: claim pending rows oldest-first (partial index).
create index if not exists domain_events_pending_idx
  on public.domain_events (occurred_at)
  where status = 'pending';
create index if not exists domain_events_user_idx on public.domain_events (user_id);
-- Idempotency: a non-null dedupe_key is unique per user.
create unique index if not exists domain_events_dedupe_idx
  on public.domain_events (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.domain_events enable row level security;
drop policy if exists domain_events_user on public.domain_events;
create policy domain_events_user on public.domain_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── 2. insights (persisted, C8 / FREEZE-E6) ───────────────────────────────────
create table if not exists public.insights (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  fingerprint     text not null,
  type            text not null,
  category        text not null,
  severity        text not null,
  title           text not null,
  detail          text not null,
  evidence        text not null,
  recommendation  text,
  metric          double precision,
  sample_size     integer not null default 0,
  confidence             double precision,
  credible_interval_low  double precision,
  credible_interval_high double precision,
  effect_size     double precision,
  window_from     date,
  window_to       date,
  status          text not null default 'active',
  source_detector text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  resolved_at     timestamptz
);

-- One ACTIVE row per (user, fingerprint); resolved rows are kept as history.
create unique index if not exists insights_active_fingerprint_idx
  on public.insights (user_id, fingerprint)
  where status = 'active';
create index if not exists insights_user_status_idx on public.insights (user_id, status);

alter table public.insights enable row level security;
drop policy if exists insights_user on public.insights;
create policy insights_user on public.insights
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
