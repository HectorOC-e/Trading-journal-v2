-- ── HALLAZGO 1B — Account risk-limit lock ───────────────────────────────────
-- Adds lock state to accounts. When a configured loss limit (daily/weekly/monthly)
-- is reached, the account is locked: no new trades or imports until manually unlocked.
-- All columns have safe defaults, so existing rows are unaffected.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS locked      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locked_at   TIMESTAMP(3);
