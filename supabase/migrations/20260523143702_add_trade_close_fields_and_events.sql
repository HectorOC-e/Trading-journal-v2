
-- Add new fields to trades
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS status       TEXT    NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS close_price  NUMERIC(16,5),
  ADD COLUMN IF NOT EXISTS close_time   TEXT,
  ADD COLUMN IF NOT EXISTS commission   NUMERIC(10,2);

-- New trade_events table
CREATE TABLE IF NOT EXISTS trade_events (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  trade_id  UUID        NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  type      TEXT        NOT NULL,
  price     NUMERIC(16,5),
  contracts NUMERIC(12,4),
  notes     TEXT        NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_events_trade_id_idx ON trade_events(trade_id);
