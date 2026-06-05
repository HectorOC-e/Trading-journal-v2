CREATE TABLE IF NOT EXISTS email_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  week_key   TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, email_type, week_key)
);

CREATE INDEX IF NOT EXISTS email_log_user_week ON email_log(user_id, week_key);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_log_own_select" ON email_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "email_log_service_insert" ON email_log
  FOR INSERT WITH CHECK (true);
