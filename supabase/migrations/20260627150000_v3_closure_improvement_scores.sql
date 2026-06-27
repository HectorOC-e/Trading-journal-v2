-- Closure B1 (v3.1) — ImprovementScore snapshot (E19). A daily row per user so
-- the North Star (#41) has a TIME SERIES ("eres mejor que hace 3 meses"), not
-- only the current value. Upserted once/day by the recompute-insights cron.
-- Additive, RLS, anonymizable (drivers structured, no PII).

create table if not exists public.improvement_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  date         date not null,
  score        double precision not null,
  discipline   double precision not null,
  expectancy   double precision not null,
  commitment   double precision not null,
  cost         double precision not null,
  drivers      jsonb not null default '[]'::jsonb,
  sample_size  int not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists improvement_scores_user_date_idx on public.improvement_scores (user_id, date desc);

alter table public.improvement_scores enable row level security;
drop policy if exists improvement_scores_user on public.improvement_scores;
create policy improvement_scores_user on public.improvement_scores
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
