-- Sprint 4 (v3.1) — Behavior Engine I: the loop (C5).
-- INSIGHT → COMMITMENT → (RULE) → CHECK → REINFORCEMENT.
--
-- Entities E7/E8/E9 (ARCHITECTURE_FREEZE §5.2). All per-user with RLS. Designed
-- ANONYMIZABLE (ADR-004 / BIZ-1, Decision B): the signal lives in STRUCTURED
-- columns (metric_key, target, comparator, result, observed_value, window) with no
-- PII — a future cross-user pipeline can aggregate them without free text. The
-- `text` note is the user's own and stays per-user.
--
-- Reversible/additive: new tables only; nothing existing is touched (FREEZE-P9).

-- ── commitments (E7) ─────────────────────────────────────────────────────────
create table if not exists public.commitments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  source_insight_id  uuid references public.insights(id) on delete set null,
  text               text not null,
  metric_key         text not null,
  target             double precision not null default 0,
  comparator         text not null default '<=',   -- '<=' | '>=' | '=='
  window             text not null default 'week',  -- day | week | month
  start_at           timestamptz not null default now(),
  end_at             timestamptz not null,
  rule_id            uuid references public.rules(id) on delete set null,
  status             text not null default 'active', -- active | kept | partial | broken | expired
  created_via        text not null default 'self',   -- coach | self | review
  kept_count         integer not null default 0,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists commitments_user_status_idx on public.commitments (user_id, status);
create index if not exists commitments_source_insight_idx on public.commitments (source_insight_id);
alter table public.commitments enable row level security;
drop policy if exists commitments_user on public.commitments;
create policy commitments_user on public.commitments
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── commitment_checks (E8) ───────────────────────────────────────────────────
create table if not exists public.commitment_checks (
  id              uuid primary key default gen_random_uuid(),
  commitment_id   uuid not null references public.commitments(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  evaluated_at    timestamptz not null default now(),
  observed_value  double precision not null,
  result          text not null,            -- kept | partial | broken
  evidence        jsonb not null default '{}'::jsonb, -- { tradeIds:[], note } (no PII)
  created_at      timestamptz not null default now()
);
create index if not exists commitment_checks_commitment_idx on public.commitment_checks (commitment_id);
create index if not exists commitment_checks_user_idx on public.commitment_checks (user_id);
alter table public.commitment_checks enable row level security;
drop policy if exists commitment_checks_user on public.commitment_checks;
create policy commitment_checks_user on public.commitment_checks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── reinforcements (E9) ──────────────────────────────────────────────────────
create table if not exists public.reinforcements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  commitment_id  uuid not null references public.commitments(id) on delete cascade,
  kind           text not null,             -- positive | corrective
  visible        boolean not null default true,
  channel        text not null default 'today', -- today | coach | review
  shown_at       timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists reinforcements_user_idx on public.reinforcements (user_id);
create index if not exists reinforcements_commitment_idx on public.reinforcements (commitment_id);
alter table public.reinforcements enable row level security;
drop policy if exists reinforcements_user on public.reinforcements;
create policy reinforcements_user on public.reinforcements
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
