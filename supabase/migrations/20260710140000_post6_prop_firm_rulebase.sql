-- POST-6 — Prop-firm rulebase (moat). A curated, GLOBAL catalog of firm/program/phase
-- rules (prop_firm_presets) + the Account columns the new rule types need.
-- The catalog is reference data: any authenticated user may READ it; only service-role
-- writes (base for a future admin panel). Accounts SNAPSHOT preset values (see plan §3),
-- so editing the catalog never mutates a live challenge.

-- 1) Catalog table (global reference data — no user_id)
create table if not exists public.prop_firm_presets (
  id                 uuid primary key default gen_random_uuid(),
  firm               text not null,
  program            text not null,
  phase              text not null,                 -- PHASE_1 | PHASE_2 | FUNDED
  account_size       numeric(14,2),
  dd_daily_pct       numeric(5,2),
  dd_total_pct       numeric(5,2),
  dd_model           text not null default 'FIXED', -- FIXED | TRAILING
  target_pct         numeric(5,2),
  min_trading_days   int,
  consistency_pct    numeric(5,2),
  no_weekend_holding boolean not null default false,
  max_trades_per_day int,
  source_url         text not null default '',
  verified_at        date,
  version            int not null default 1,
  enabled            boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (firm, program, phase)
);

alter table public.prop_firm_presets enable row level security;
-- Global reference data: authenticated users READ only; service-role bypasses RLS to write.
drop policy if exists prop_firm_presets_read on public.prop_firm_presets;
create policy prop_firm_presets_read on public.prop_firm_presets
  for select to authenticated using (true);

-- 2) New Account columns for the rule types that had no home yet
alter table public.accounts
  add column if not exists consistency_pct    numeric(5,2),
  add column if not exists no_weekend_holding boolean not null default false,
  add column if not exists enforce_mode       text    not null default 'WARN', -- WARN | ENFORCE
  add column if not exists preset_id          uuid;

-- 3) Seed the 3 anchor firms. Numbers verified 2026-07-10 against each firm's
-- official rules (see source_url). ON CONFLICT keeps re-runs idempotent
-- (replay-from-scratch in CI); it also means an already-seeded DB keeps its
-- existing rows — re-verify data there if the numbers below changed.
insert into public.prop_firm_presets
  (firm, program, phase, account_size, dd_daily_pct, dd_total_pct, dd_model, target_pct,
   min_trading_days, consistency_pct, no_weekend_holding, max_trades_per_day, source_url, verified_at)
values
  -- FTMO — forex, 2-phase + funded, FIXED drawdown   (ftmo.com/en/trading-objectives, 2026-07-10)
  ('FTMO','Challenge','PHASE_1',100000, 5, 10,'FIXED',10, 4, null,false,null,'https://ftmo.com', '2026-07-10'),
  ('FTMO','Challenge','PHASE_2',100000, 5, 10,'FIXED', 5, 4, null,false,null,'https://ftmo.com', '2026-07-10'),
  ('FTMO','Challenge','FUNDED', 100000, 5, 10,'FIXED', null,null,null,false,null,'https://ftmo.com', '2026-07-10'),
  -- Topstep — futures, TRAILING drawdown, consistency   (topstep.com, 2026-07-10)
  -- Topstep states limits in DOLLARS; stored as % of the 50k account_size ($2000 trailing = 4%, $3000 target = 6%).
  ('Topstep','Trading Combine','PHASE_1',50000, null, 4,'TRAILING',6, 2, 50,false,null,'https://topstep.com', '2026-07-10'),
  ('Topstep','Trading Combine','FUNDED', 50000, null, 4,'TRAILING',null,null, 50,false,null,'https://topstep.com', '2026-07-10'),
  -- MyFundedFutures — futures, EOD TRAILING drawdown, 50% consistency (Core eval only).
  -- Replaces MyFundedFX (shut down Feb 2026). Dollars as % of 100k ($4000 trailing = 4%, $6000 target = 6%).  (myfundedfutures.com, 2026-07-10)
  ('MyFundedFutures','Core','PHASE_1',100000, null, 4,'TRAILING',6, 2, 50,false,null,'https://myfundedfutures.com', '2026-07-10'),
  ('MyFundedFutures','Core','FUNDED', 100000, null, 4,'TRAILING',null,null,null,false,null,'https://myfundedfutures.com', '2026-07-10')
on conflict (firm, program, phase) do nothing;
