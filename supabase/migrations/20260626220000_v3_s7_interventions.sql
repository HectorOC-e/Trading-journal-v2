-- Sprint 7 (v3.1) — Coach v3 II: Intervention (E11, C1 / FREEZE §9).
-- The in-the-moment intervention: a deterministic decision returned by the
-- trade mutation (fast-path), shown as an overlay, and answered by the trader.
-- `outcome` feeds expectedImpact learning (EV10) later. Structured/anonymizable
-- (ADR-004): trigger/severity/scores/response/outcome carry no PII. Additive, RLS.

create table if not exists public.interventions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  account_id       uuid,
  trigger          text not null,            -- revenge | oversizing | cascade | dd_approach | dd_breach
  severity         text not null,            -- warning | critical
  scores           jsonb not null default '{}'::jsonb,
  message          text not null,
  suggested_action jsonb not null default '{}'::jsonb,
  status           text not null default 'active',  -- active | responded
  response         text,                     -- accepted | dismissed
  outcome          text,                     -- protected | overridden | (learned later)
  shown_at         timestamptz not null default now(),
  responded_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists interventions_user_status_idx on public.interventions (user_id, status);
alter table public.interventions enable row level security;
drop policy if exists interventions_user on public.interventions;
create policy interventions_user on public.interventions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
