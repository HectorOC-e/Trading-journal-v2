-- Epic 1: event-sourced notifications + per-category preferences.
-- Replaces the derived (no-table) notification list. See
-- docs/superpowers/specs/2026-06-16-notifications-system-design.md

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        text NOT NULL,
  type        text NOT NULL,
  priority    text NOT NULL,
  category    text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  params      jsonb NOT NULL DEFAULT '{}'::jsonb,
  href        text,
  actions     jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel     text NOT NULL DEFAULT 'in_app',
  dedupe_key  text,
  group_key   text,
  source_id   text,
  read_at     timestamptz,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, read_at);

-- Dedupe: at most one live row per (user, dedupe_key) when a key is set.
-- Partial unique index (Prisma can't express this; emitNotification upserts on it).
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe
  ON notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- ── notification_preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     text NOT NULL,
  channels     text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  min_priority text NOT NULL DEFAULT 'P3',
  muted        boolean NOT NULL DEFAULT false,
  quiet_start  text,
  quiet_end    text,
  timezone     text NOT NULL DEFAULT 'America/New_York',
  UNIQUE (user_id, category)
);
