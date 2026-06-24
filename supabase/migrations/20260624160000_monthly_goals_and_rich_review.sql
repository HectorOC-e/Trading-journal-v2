-- Monthly reviews "Carta del Gestor" redesign: rich goals + structured themes + pillar scores.
--
-- Adds a monthly_goals table (rich replacement for monthly_reviews.goals_set/goals_met:
-- status + note + recurrence, AI-evaluated unless user-confirmed) and editorial/letter
-- columns on monthly_reviews. The legacy goals_set/goals_met/key_themes columns are KEPT
-- for back-compat; new code reads monthly_goals + key_themes_rich.

-- ── Rich columns on monthly_reviews ────────────────────────────────────────────
alter table public.monthly_reviews
  add column if not exists letter_title       text,
  add column if not exists key_themes_rich    jsonb,
  add column if not exists pillar_performance integer,
  add column if not exists pillar_discipline  integer,
  add column if not exists pillar_psychology  integer;

-- ── monthly_goals ──────────────────────────────────────────────────────────────
create table if not exists public.monthly_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  year           integer not null,
  month          integer not null,
  text           text not null,
  status         text not null default 'pending',  -- pending | partial | done
  note           text not null default '',
  source         text not null default 'user',     -- user | ai
  user_confirmed boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists monthly_goals_user_year_month_idx
  on public.monthly_goals (user_id, year, month);

-- ── Backfill: each goals_set[i] → a monthly_goal (done if in goals_met). User-entered,
--    so mark user_confirmed so the AI evaluator won't overwrite historical statuses. ──
insert into public.monthly_goals (user_id, year, month, text, status, source, user_confirmed, sort_order)
select mr.user_id, mr.year, mr.month, g.text,
       case when g.text = any(mr.goals_met) then 'done' else 'pending' end,
       'user', true, (g.ord - 1)::int
from public.monthly_reviews mr,
     lateral unnest(mr.goals_set) with ordinality as g(text, ord)
where coalesce(array_length(mr.goals_set, 1), 0) > 0
  and not exists (
    select 1 from public.monthly_goals mg
    where mg.user_id = mr.user_id and mg.year = mr.year and mg.month = mr.month
  );
