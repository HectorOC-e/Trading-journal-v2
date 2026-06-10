-- Persist the last broker balance + timestamp captured by "Sincronizar balance".
-- Equity stays derived (initial + P&L + adjustments); these columns are for
-- display ("última sincronización") and journal-vs-broker comparison.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS last_synced_balance DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS last_synced_at      TIMESTAMPTZ;
