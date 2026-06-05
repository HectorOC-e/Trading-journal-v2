-- ── Expanded AI configuration — per-user model routing ──────────────────────
-- Global default model + global fallback + per-feature overrides + cost posture.
-- One row per user (nullable everywhere it can be); existing users get defaults
-- lazily on first save.

CREATE TABLE IF NOT EXISTS user_ai_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  default_provider  TEXT NOT NULL DEFAULT 'anthropic',
  default_model     TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  fallback_provider TEXT,
  fallback_model    TEXT,
  cost_priority     TEXT NOT NULL DEFAULT 'quality',
  feature_models    JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
