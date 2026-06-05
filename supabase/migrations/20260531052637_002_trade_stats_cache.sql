-- T-IV-004: Materialized analytics cache
-- Keyed by (user_id, period). account_id is reserved for per-account caching.
-- TTL is enforced at application layer (5 minutes).

CREATE TABLE IF NOT EXISTS trade_stats_cache (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period      TEXT        NOT NULL,
  account_id  UUID,
  stats_json  JSONB       NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_trade_stats_cache_user ON trade_stats_cache(user_id);
