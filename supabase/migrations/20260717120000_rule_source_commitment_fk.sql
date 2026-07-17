-- S1/DT-4: add the missing FK on rules.source_commitment_id → commitments(id).
-- The column existed as a bare uuid (provenance for Behavior-Engine rules sourced
-- from a commitment) since Commitment did not exist at S1. Commitment exists since
-- S4, so the FK can be added. ON DELETE SET NULL: deleting a commitment must not
-- delete the rule it once sourced, just drop the provenance link.

-- Defensive: null out any dangling refs before the constraint (today the column is
-- unpopulated — rules-from-commitments (OI-4.1) is unbuilt — so this is a no-op).
UPDATE rules
   SET source_commitment_id = NULL
 WHERE source_commitment_id IS NOT NULL
   AND source_commitment_id NOT IN (SELECT id FROM commitments);

CREATE INDEX IF NOT EXISTS rules_source_commitment_id_idx
  ON rules (source_commitment_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rules_source_commitment_id_fkey'
  ) THEN
    ALTER TABLE rules
      ADD CONSTRAINT rules_source_commitment_id_fkey
      FOREIGN KEY (source_commitment_id) REFERENCES commitments (id) ON DELETE SET NULL;
  END IF;
END $$;
