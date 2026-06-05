
-- Sprint 8 TASK-071: Monthly Review model
CREATE TABLE IF NOT EXISTS monthly_reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year          INTEGER     NOT NULL,
  month         INTEGER     NOT NULL CHECK (month >= 1 AND month <= 12),
  summary       TEXT        NOT NULL DEFAULT '',
  key_themes    TEXT[]      NOT NULL DEFAULT '{}',
  goals_set     TEXT[]      NOT NULL DEFAULT '{}',
  goals_met     TEXT[]      NOT NULL DEFAULT '{}',
  overall_score INTEGER     CHECK (overall_score >= 0 AND overall_score <= 100),
  weekly_ids    TEXT[]      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT monthly_reviews_user_year_month_key UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS monthly_reviews_user_year_idx ON monthly_reviews (user_id, year);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_monthly_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monthly_reviews_updated_at ON monthly_reviews;
CREATE TRIGGER monthly_reviews_updated_at
  BEFORE UPDATE ON monthly_reviews
  FOR EACH ROW EXECUTE FUNCTION update_monthly_reviews_updated_at();

-- RLS
ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own monthly reviews"
  ON monthly_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
