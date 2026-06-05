-- Enable RLS on the implicit M2M join table (A = learning_resource_id, B = setup_id)
ALTER TABLE public."_ResourceSetups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "_ResourceSetups_select" ON public."_ResourceSetups"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM learning_resources WHERE id = "A" AND user_id = auth.uid())
  );

CREATE POLICY "_ResourceSetups_insert" ON public."_ResourceSetups"
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM learning_resources WHERE id = "A" AND user_id = auth.uid())
    AND
    EXISTS (SELECT 1 FROM setups WHERE id = "B" AND user_id = auth.uid())
  );

CREATE POLICY "_ResourceSetups_delete" ON public."_ResourceSetups"
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM learning_resources WHERE id = "A" AND user_id = auth.uid())
  );

-- Drop the duplicate unique index (primary key already enforces uniqueness)
DROP INDEX IF EXISTS public."_ResourceSetups_AB_unique";
