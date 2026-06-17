-- Epic 3: rules/automations engine. WHEN (trigger) / IF (condition tree) / THEN
-- (actions). The hardcoded risk-enforcement stays independent; this powers
-- user-defined automations. See docs/superpowers/specs/2026-06-17-rules-engine-design.md

CREATE TABLE IF NOT EXISTS automations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  enabled       boolean NOT NULL DEFAULT true,
  priority      integer NOT NULL DEFAULT 0,
  trigger       text NOT NULL,
  conditions    jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  category      text NOT NULL DEFAULT '',
  is_system     boolean NOT NULL DEFAULT false,
  last_fired_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_user_trigger
  ON automations (user_id, trigger, enabled);
