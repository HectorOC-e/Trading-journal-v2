-- ── 1. Alter accounts table ───────────────────────────────────────────────
ALTER TABLE accounts
  DROP COLUMN IF EXISTS pf_max_drawdown_pct,
  DROP COLUMN IF EXISTS pf_daily_loss_pct,
  DROP COLUMN IF EXISTS pf_max_trades_per_day,
  DROP COLUMN IF EXISTS pf_target_pct,
  DROP COLUMN IF EXISTS pf_allowed_symbols,
  ADD COLUMN IF NOT EXISTS dd_daily_pct       DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dd_weekly_pct      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dd_monthly_pct     DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dd_total_pct       DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS target_pct         DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dd_model           TEXT DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS phase              TEXT DEFAULT 'PHASE_1',
  ADD COLUMN IF NOT EXISTS max_trades_per_day INT,
  ADD COLUMN IF NOT EXISTS allowed_symbols    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_trading_days   INT;

-- ── 2. Withdrawals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount      DECIMAL(14,2) NOT NULL,
  currency    TEXT          NOT NULL DEFAULT 'USD',
  status      TEXT          NOT NULL DEFAULT 'SOLICITADO',
  date        DATE          NOT NULL,
  note        TEXT          NOT NULL DEFAULT '',
  reference   TEXT          NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS withdrawals_user_date_idx ON withdrawals(user_id, date DESC);
CREATE INDEX IF NOT EXISTS withdrawals_account_idx   ON withdrawals(account_id);

-- ── 3. Account logs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event       TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_logs_account_idx ON account_logs(account_id, created_at DESC);

-- ── 4. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE withdrawals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY withdrawals_user  ON withdrawals  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY account_logs_user ON account_logs FOR ALL USING (auth.uid() = user_id);

-- ── 5. updated_at trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS withdrawals_updated_at ON withdrawals;
CREATE TRIGGER withdrawals_updated_at
  BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
