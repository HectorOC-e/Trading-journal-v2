-- Legacy derived data remains unclassified; only new, attributed data is actionable.
ALTER TABLE public.rules ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.trading_sessions ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.insights ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.commitments ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.rule_suggestions ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.interventions ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.pre_session_checkins ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.improvement_scores ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.trading_sessions DROP CONSTRAINT IF EXISTS trading_sessions_user_id_date_session_key;
DROP INDEX IF EXISTS public.trading_sessions_user_id_date_session_key;
CREATE UNIQUE INDEX trading_sessions_user_id_date_session_operational_mode_key ON public.trading_sessions(user_id,date,session,operational_mode);
ALTER TABLE public.improvement_scores DROP CONSTRAINT IF EXISTS improvement_scores_user_id_date_key;
DROP INDEX IF EXISTS public.improvement_scores_user_id_date_key;
CREATE UNIQUE INDEX improvement_scores_user_id_date_operational_mode_key ON public.improvement_scores(user_id,date,operational_mode);
CREATE INDEX insights_user_mode_status_idx ON public.insights(user_id,operational_mode,status);
CREATE INDEX commitments_user_mode_status_idx ON public.commitments(user_id,operational_mode,status);
CREATE INDEX rule_suggestions_user_mode_status_idx ON public.rule_suggestions(user_id,operational_mode,status);
CREATE INDEX interventions_user_mode_status_idx ON public.interventions(user_id,operational_mode,status);
