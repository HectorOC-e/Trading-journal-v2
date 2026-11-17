-- Shared rules need explicit provenance, not absence of a now-deleted FK.
ALTER TABLE public.rules ADD COLUMN global_manual boolean NOT NULL DEFAULT false;
UPDATE public.rules SET global_manual=true
WHERE operational_mode IS NULL AND is_system=true AND source_insight_id IS NULL AND source_commitment_id IS NULL;
ALTER TABLE public.rules ADD CONSTRAINT rules_explicit_global_check CHECK
  (NOT global_manual OR (operational_mode IS NULL AND source_insight_id IS NULL AND source_commitment_id IS NULL));
