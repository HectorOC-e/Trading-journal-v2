-- Fase 1 (UI/UX redesign): named color theme + custom palette persistence.
-- Adds colorTheme ("indigo" default) and customTheme (JSON) to user_preferences.
-- Idempotent: safe to re-run.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS color_theme  TEXT NOT NULL DEFAULT 'indigo';

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS custom_theme TEXT;
