
-- 1. Add new account type values (extend the type column — stored as text)
-- No enum in Postgres for these, they're stored as text strings

-- 2. Add status field to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS status_note TEXT NOT NULL DEFAULT '';

-- 3. Add phase_rules_snapshot for tracking rules per phase on PHASE_CHANGE
-- Already captured via account_logs.payload (JSON) — no schema change needed

-- 4. Add promoted_manually flag support in account_logs payload
-- Already captured via account_logs.payload (JSON) — no schema change needed

-- 5. Update existing accounts: set status = 'ACTIVE' for all
UPDATE accounts SET status = 'ACTIVE' WHERE status IS NULL OR status = '';

-- 6. Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('status', 'status_note', 'type');
