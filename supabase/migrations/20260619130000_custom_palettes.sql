-- Theme system · full-palette redesign.
-- Adds the per-user palette library and migrates the legacy single custom theme
-- into it. See docs/superpowers/specs/2026-06-19-theme-palettes-design.md
--
-- Idempotent: CI replays every migration on a fresh DB (no custom users → no-op),
-- and on prod the backfill only matches rows whose color_theme is still the bare
-- 'custom' (after migration it becomes 'custom:<id>'), so re-running is safe.

CREATE TABLE IF NOT EXISTS custom_palette (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  config     jsonb NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_palette_user ON custom_palette (user_id);

-- Backfill: each user on the legacy accent-only custom theme gets one library
-- entry ("Mi paleta") seeded from their accent hue (falls back to indigo 264),
-- and their selection is repointed to that entry.
WITH ins AS (
  INSERT INTO custom_palette (user_id, name, config, position)
  SELECT up.user_id,
         'Mi paleta',
         jsonb_build_object('hue', COALESCE(up.accent_hue, 264)),
         0
  FROM user_preferences up
  WHERE up.color_theme = 'custom'
  RETURNING id, user_id
)
UPDATE user_preferences up
SET color_theme = 'custom:' || ins.id
FROM ins
WHERE up.user_id = ins.user_id;
