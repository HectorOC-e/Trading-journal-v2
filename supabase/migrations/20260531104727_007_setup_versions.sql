CREATE TABLE IF NOT EXISTS setup_versions (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id   UUID        NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  version    INT         NOT NULL,
  snapshot   JSONB       NOT NULL,
  reason     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(setup_id, version)
);

ALTER TABLE setup_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "setup_versions_user" ON setup_versions
  FOR ALL TO authenticated
  USING (
    setup_id IN (
      SELECT id FROM setups WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    setup_id IN (
      SELECT id FROM setups WHERE user_id = (SELECT auth.uid())
    )
  );
