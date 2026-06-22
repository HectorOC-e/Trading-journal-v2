-- Reviews · AI analysis layer.
-- Adds persisted AI-generated analysis to weekly and monthly reviews.
-- See docs/superpowers/specs/2026-06-22-reviews-reports-email-cron-pdf-design.md
--
-- Idempotent: additive nullable columns, safe to replay on a fresh or existing DB.

ALTER TABLE weekly_reviews
  ADD COLUMN IF NOT EXISTS ai_analysis    text,
  ADD COLUMN IF NOT EXISTS ai_analysis_at timestamptz;

ALTER TABLE monthly_reviews
  ADD COLUMN IF NOT EXISTS ai_analysis    text,
  ADD COLUMN IF NOT EXISTS ai_analysis_at timestamptz;
