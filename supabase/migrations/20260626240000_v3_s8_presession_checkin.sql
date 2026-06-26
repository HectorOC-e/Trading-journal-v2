-- Sprint 8 (v3.1) — Psicología v3: PreSessionCheckin (E12, C7/#30).
-- A deliberate pre-session go/no-go: mood/energy/sleep (1–5) → verdict. A red
-- verdict recommends not trading. Structured/anonymizable (ADR-004). Additive, RLS.

create table if not exists public.pre_session_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  date        date not null,
  session     text,
  mood        int not null,
  energy      int not null,
  sleep       int not null,
  score       double precision not null,
  verdict     text not null,            -- go | caution | no_go
  reasons     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists pre_session_checkins_user_date_idx on public.pre_session_checkins (user_id, date desc);
alter table public.pre_session_checkins enable row level security;
drop policy if exists pre_session_checkins_user on public.pre_session_checkins;
create policy pre_session_checkins_user on public.pre_session_checkins
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
