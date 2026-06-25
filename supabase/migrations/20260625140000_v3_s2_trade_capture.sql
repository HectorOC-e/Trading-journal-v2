-- Sprint 2 (v3.1) — Trade capture v3 (C7 / FREEZE-E1).
--
-- Additive, non-destructive. Feeds the engines that were blind in v2:
--   risk_pct  — derived % of balance risked (#27); previously only a transient form string.
--   mae_r / mfe_r — max adverse / favorable excursion in R (#35); enables exit-quality
--                   analytics in S3. Captured (manual/import) now.
--   regime    — trend | range | volatile (E5.C6); manual in v3.0.
--
-- All nullable: existing trades keep working untouched. RLS on `trades` is unchanged.

alter table public.trades add column if not exists risk_pct numeric(6,3);
alter table public.trades add column if not exists mae_r    numeric(8,3);
alter table public.trades add column if not exists mfe_r    numeric(8,3);
alter table public.trades add column if not exists regime   text;
