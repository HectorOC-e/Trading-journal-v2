-- Additive provenance for actions derived from a weekly review. Legacy rows stay NULL.
ALTER TABLE public.commitments ADD COLUMN review_source jsonb;
ALTER TABLE public.study_sessions ADD COLUMN review_source jsonb;
ALTER TABLE public.learning_practices
  ADD COLUMN review_source jsonb,
  ADD COLUMN planned_session_id uuid;

-- One completed practice per plan; deleting a plan preserves its practice history.
CREATE UNIQUE INDEX learning_practices_planned_session_id_key
  ON public.learning_practices (planned_session_id);
ALTER TABLE public.learning_practices
  ADD CONSTRAINT learning_practices_planned_session_id_fkey
  FOREIGN KEY (planned_session_id) REFERENCES public.study_sessions(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
