-- T-V-004: Session mood and energy tracking
CREATE TABLE IF NOT EXISTS trading_sessions (
  id           UUID     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE     NOT NULL,
  session      TEXT     NOT NULL,
  pre_mood     SMALLINT CHECK (pre_mood BETWEEN 1 AND 5),
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  notes        TEXT     NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, session)
);

ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_user" ON trading_sessions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_user ON trading_sessions(user_id);
