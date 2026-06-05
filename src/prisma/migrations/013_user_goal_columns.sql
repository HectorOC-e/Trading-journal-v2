-- ── BUG#3 — Weekly Goals 500 error ──────────────────────────────────────────
-- The User goal columns exist in schema.prisma but were never added by a
-- migration (the base schema was originally pushed via `prisma db push`).
-- On environments created from migrations the `users` table lacks them, so
-- goals.set / profile.set UPDATE throws → "Error interno" (500).
-- Idempotent (IF NOT EXISTS) so it is safe whether the columns exist or not.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weekly_goal_minutes  INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS weekly_trades_goal   INTEGER,
  ADD COLUMN IF NOT EXISTS weekly_pnl_goal      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS discipline_goal      INTEGER,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
