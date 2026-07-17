-- Reconcile the migration history with the schema production actually has.
--
-- Production and schema.prisma agree; supabase/migrations/ does not. A database
-- rebuilt from this repo was missing the resource_reviews table entirely plus 18
-- columns, so the app could not run against a fresh stack (`prisma.user.create`
-- fails: column `onboarding_completed` does not exist). Nobody noticed because
-- nobody rebuilds from zero, and the CI gate meant to catch exactly this could
-- not fail (see ci.yml).
--
-- Every statement is IF NOT EXISTS: a NO-OP against production, which already has
-- all of it, and a catch-up for any fresh database. Column types, defaults,
-- nullability, indexes, FKs and the RLS policy below were read back out of
-- production, not guessed.

-- ── users ────────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists discipline_goal      integer,
  add column if not exists weekly_pnl_goal      numeric,
  add column if not exists weekly_trades_goal   integer;

-- ── accounts ─────────────────────────────────────────────────────────────────
alter table public.accounts
  add column if not exists locked      boolean not null default false,
  add column if not exists lock_reason text    not null default '',
  add column if not exists locked_at   timestamp;

-- ── trades ───────────────────────────────────────────────────────────────────
alter table public.trades
  add column if not exists plan_notes varchar;

-- ── learning_resources ───────────────────────────────────────────────────────
alter table public.learning_resources
  add column if not exists status          text not null default 'PENDING',
  add column if not exists progress_type   text,
  add column if not exists total_units     integer,
  add column if not exists current_units   integer,
  add column if not exists avg_score       numeric,
  add column if not exists next_review_at  date,
  add column if not exists review_interval integer,
  add column if not exists is_favorite     boolean not null default false,
  add column if not exists rating          integer,
  add column if not exists completed_at    timestamptz;

-- ── resource_reviews ─────────────────────────────────────────────────────────
create table if not exists public.resource_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  resource_id    uuid not null references public.learning_resources(id) on delete cascade,
  learned        text not null default '',
  how_to_apply   text not null default '',
  insights       text[] not null default '{}'::text[],
  rating         integer not null default 0,
  mastery_level  integer not null default 1,
  review_type    text not null default 'manual',
  next_review_at date not null,
  created_at     timestamptz not null default now()
);

create index if not exists resource_reviews_user_date_idx on public.resource_reviews (user_id, next_review_at);
create index if not exists resource_reviews_resource_idx  on public.resource_reviews (resource_id);

alter table public.resource_reviews enable row level security;

-- Per-user isolation, matching the policy live in production.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'resource_reviews' and policyname = 'resource_reviews_user'
  ) then
    create policy resource_reviews_user on public.resource_reviews
      for all using ((select auth.uid()) = user_id);
  end if;
end
$$;
