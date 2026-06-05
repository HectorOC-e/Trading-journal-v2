ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS expected_wr        DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS expected_avg_r     DECIMAL(5,3),
  ADD COLUMN IF NOT EXISTS min_r              DECIMAL(5,3),
  ADD COLUMN IF NOT EXISTS max_r              DECIMAL(5,3),
  ADD COLUMN IF NOT EXISTS edge_updated_at    TIMESTAMPTZ;
