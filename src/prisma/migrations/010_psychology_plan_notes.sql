-- ── Sprint 4 (TASK-034) + Sprint 7 (TASK-074) backfill migration ────────────
-- Adds psychology fields and planNotes to trades table.
-- All new columns are nullable or have defaults, so existing rows are safe.

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS emotion_before    TEXT,
  ADD COLUMN IF NOT EXISTS confidence_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS execution_quality SMALLINT,
  ADD COLUMN IF NOT EXISTS fomo_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenge_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_notes        VARCHAR(500);
