CREATE TABLE IF NOT EXISTS user_ai_configs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT         NOT NULL,
  api_key_enc TEXT         NOT NULL,
  model       TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  last_tested TIMESTAMP(3),
  error_log   TEXT,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS user_ai_configs_user_id_provider_key
  ON user_ai_configs (user_id, provider);

CREATE INDEX IF NOT EXISTS user_ai_configs_user_id_idx
  ON user_ai_configs (user_id);
