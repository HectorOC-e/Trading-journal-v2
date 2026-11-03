-- Additive fields: old records and deployed clients remain compatible.
ALTER TABLE public.learning_practices
  ADD COLUMN objective text NOT NULL DEFAULT '',
  ADD COLUMN assessment text,
  ADD CONSTRAINT learning_practices_objective_length CHECK (char_length(objective) <= 1000),
  ADD CONSTRAINT learning_practices_assessment_value CHECK (assessment IS NULL OR assessment IN ('achieved', 'partial', 'repeat'));
