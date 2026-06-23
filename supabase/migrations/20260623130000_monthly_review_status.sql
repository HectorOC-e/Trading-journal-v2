-- Monthly reviews · draft/submitted lifecycle (parity with weekly_reviews.status).
-- Additive, idempotent.
ALTER TABLE monthly_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
