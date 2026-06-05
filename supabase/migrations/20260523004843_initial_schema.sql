
-- USERS (mirrors auth.users)
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY,
  email         TEXT        UNIQUE NOT NULL,
  name          TEXT        NOT NULL DEFAULT '',
  role          TEXT        NOT NULL DEFAULT 'Single-trader',
  timezone      TEXT        NOT NULL DEFAULT 'America/Tegucigalpa',
  base_currency TEXT        NOT NULL DEFAULT 'USD',
  language      TEXT        NOT NULL DEFAULT 'es',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users FOR ALL USING (auth.uid() = id);

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT          NOT NULL,
  broker              TEXT          NOT NULL,
  type                TEXT          NOT NULL DEFAULT 'PERSONAL',
  initial_balance     DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency            TEXT          NOT NULL DEFAULT 'USD',
  timezone            TEXT          NOT NULL DEFAULT 'America/New_York',
  dd_daily_pct        DECIMAL(5,2),
  dd_weekly_pct       DECIMAL(5,2),
  dd_monthly_pct      DECIMAL(5,2),
  dd_total_pct        DECIMAL(5,2),
  target_pct          DECIMAL(5,2),
  dd_model            TEXT          DEFAULT 'FIXED',
  phase               TEXT          DEFAULT 'PHASE_1',
  max_trades_per_day  INT,
  allowed_symbols     TEXT[]        DEFAULT '{}',
  min_trading_days    INT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_user ON accounts FOR ALL USING (auth.uid() = user_id);

-- WITHDRAWALS
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
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY withdrawals_user ON withdrawals FOR ALL USING (auth.uid() = user_id);

-- ACCOUNT LOGS
CREATE TABLE IF NOT EXISTS account_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event       TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_logs_account_idx ON account_logs(account_id, created_at DESC);
ALTER TABLE account_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_logs_user ON account_logs FOR ALL USING (auth.uid() = user_id);

-- SETUPS
CREATE TABLE IF NOT EXISTS setups (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  abbreviation        TEXT        NOT NULL,
  market              TEXT        NOT NULL DEFAULT '',
  direction           TEXT        NOT NULL DEFAULT 'AMBAS',
  status              TEXT        NOT NULL DEFAULT 'ACTIVO',
  description         TEXT        NOT NULL DEFAULT '',
  aplus_checklist     TEXT[]      NOT NULL DEFAULT '{}',
  standard_checklist  TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
CREATE POLICY setups_user ON setups FOR ALL USING (auth.uid() = user_id);

-- TRADES
CREATE TABLE IF NOT EXISTS trades (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  setup_id        UUID          REFERENCES setups(id) ON DELETE SET NULL,
  direction       TEXT          NOT NULL,
  symbol          TEXT          NOT NULL,
  entry           DECIMAL(16,5) NOT NULL,
  stop            DECIMAL(16,5) NOT NULL,
  target          DECIMAL(16,5) NOT NULL,
  size            DECIMAL(12,4) NOT NULL,
  date            DATE          NOT NULL,
  open_time       TEXT          NOT NULL DEFAULT '',
  session         TEXT          NOT NULL DEFAULT '',
  tags            TEXT[]        NOT NULL DEFAULT '{}',
  notes           TEXT          NOT NULL DEFAULT '',
  screenshot_urls TEXT[]        NOT NULL DEFAULT '{}',
  r_multiple      DECIMAL(8,3),
  pnl             DECIMAL(14,2),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trades_user_date_idx ON trades(user_id, date DESC);
CREATE INDEX IF NOT EXISTS trades_account_idx   ON trades(account_id);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY trades_user ON trades FOR ALL USING (auth.uid() = user_id);

-- RULES
CREATE TABLE IF NOT EXISTS rules (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  description           TEXT        NOT NULL DEFAULT '',
  severity              TEXT        NOT NULL DEFAULT 'CRÍTICA',
  is_system             BOOLEAN     NOT NULL DEFAULT FALSE,
  enabled               BOOLEAN     NOT NULL DEFAULT TRUE,
  violations_this_month INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rules_user ON rules FOR ALL USING (auth.uid() = user_id);

-- WEEKLY REVIEWS
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id        UUID          REFERENCES accounts(id) ON DELETE SET NULL,
  week_label        TEXT          NOT NULL,
  week_range        TEXT          NOT NULL,
  week_start        DATE          NOT NULL,
  week_end          DATE          NOT NULL,
  trade_count       INT           NOT NULL DEFAULT 0,
  net_pnl           DECIMAL(14,2) NOT NULL DEFAULT 0,
  win_rate          DECIMAL(5,2)  NOT NULL DEFAULT 0,
  discipline_score  INT           NOT NULL DEFAULT 0,
  executive_summary TEXT          NOT NULL DEFAULT '',
  what_worked       TEXT          NOT NULL DEFAULT '',
  to_improve        TEXT          NOT NULL DEFAULT '',
  status            TEXT          NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weekly_reviews_user_idx ON weekly_reviews(user_id, week_start DESC);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_reviews_user ON weekly_reviews FOR ALL USING (auth.uid() = user_id);

-- LEARNING RESOURCES
CREATE TABLE IF NOT EXISTS learning_resources (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  type             TEXT        NOT NULL,
  author           TEXT        NOT NULL DEFAULT '',
  source           TEXT        NOT NULL DEFAULT '',
  date             DATE        NOT NULL,
  notes            TEXT        NOT NULL DEFAULT '',
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  marked_for_review BOOLEAN    NOT NULL DEFAULT FALSE,
  progress_pct     INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS learning_resources_user_idx ON learning_resources(user_id, date DESC);
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_resources_user ON learning_resources FOR ALL USING (auth.uid() = user_id);

-- MARKETS
CREATE TABLE IF NOT EXISTS markets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol         TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  category       TEXT        NOT NULL,
  exchange       TEXT        NOT NULL DEFAULT '',
  tick_size      TEXT        NOT NULL DEFAULT '',
  point_value    TEXT        NOT NULL DEFAULT '',
  currency       TEXT        NOT NULL DEFAULT 'USD',
  sessions       TEXT[]      NOT NULL DEFAULT '{}',
  description    TEXT        NOT NULL DEFAULT '',
  is_watchlisted BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY markets_user ON markets FOR ALL USING (auth.uid() = user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Apply trigger to all tables with updated_at
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','accounts','withdrawals','setups','trades','rules','weekly_reviews','learning_resources','markets']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- Auto-create user row when someone signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users(id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
