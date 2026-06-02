-- T-V-003: Pre-trade A+ checklist tracking
CREATE TABLE IF NOT EXISTS trade_checklist_results (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id       UUID        NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  setup_id       UUID        REFERENCES setups(id) ON DELETE SET NULL,
  items_checked  TEXT[]      NOT NULL DEFAULT '{}',
  items_total    INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trade_checklist_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_user" ON trade_checklist_results FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_checklist_results_user ON trade_checklist_results(user_id);
