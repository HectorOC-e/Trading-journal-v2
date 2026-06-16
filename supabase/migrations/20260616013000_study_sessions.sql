-- Aprendizaje SP1 — Study sessions: timed study blocks for learning resources.
-- A session is `active` while the timer runs, `completed` when finished (logs
-- duration_min + note), or `planned` for a future date. Separate from SRS reviews.
-- status/source kept as TEXT to match the codebase convention (no PG enums).
CREATE TABLE IF NOT EXISTS study_sessions (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id  UUID        NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'active',  -- active | completed | planned
  source       TEXT        NOT NULL DEFAULT 'focus',   -- focus | manual | planned
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  duration_min INTEGER,
  planned_min  INTEGER,
  note         TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_sessions_user" ON study_sessions;
CREATE POLICY "study_sessions_user" ON study_sessions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_resource ON study_sessions(resource_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_active ON study_sessions(user_id) WHERE status = 'active';
