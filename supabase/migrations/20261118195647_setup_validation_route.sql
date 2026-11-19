-- Strategy validation route: one configurable policy per setup and an
-- append-only decision trail. Financial evidence remains derived from trades.

CREATE UNIQUE INDEX IF NOT EXISTS setups_user_id_id_key
  ON public.setups(user_id, id);

CREATE TABLE public.setup_validation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  setup_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  backtest_min_closed integer NOT NULL DEFAULT 30 CHECK (backtest_min_closed > 0),
  backtest_min_r_coverage_pct integer NOT NULL DEFAULT 80 CHECK (backtest_min_r_coverage_pct BETWEEN 0 AND 100),
  backtest_min_checklist_coverage_pct integer NOT NULL DEFAULT 70 CHECK (backtest_min_checklist_coverage_pct BETWEEN 0 AND 100),
  backtest_require_positive_expectancy boolean NOT NULL DEFAULT true,
  demo_min_closed integer NOT NULL DEFAULT 20 CHECK (demo_min_closed > 0),
  demo_min_distinct_weeks integer NOT NULL DEFAULT 4 CHECK (demo_min_distinct_weeks > 0),
  demo_min_checklist_compliance_pct integer NOT NULL DEFAULT 80 CHECK (demo_min_checklist_compliance_pct BETWEEN 0 AND 100),
  demo_require_positive_expectancy boolean NOT NULL DEFAULT true,
  real_monitor_min_closed integer NOT NULL DEFAULT 20 CHECK (real_monitor_min_closed > 0),
  real_monitor_min_distinct_weeks integer NOT NULL DEFAULT 4 CHECK (real_monitor_min_distinct_weeks > 0),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(criteria) = 'object'),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT setup_validation_policies_owned_setup_fkey
    FOREIGN KEY (user_id, setup_id) REFERENCES public.setups(user_id, id) ON DELETE CASCADE,
  CONSTRAINT setup_validation_policies_user_setup_key UNIQUE (user_id, setup_id)
);

CREATE INDEX setup_validation_policies_setup_id_idx
  ON public.setup_validation_policies(setup_id);

CREATE TABLE public.setup_validation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  setup_id uuid NOT NULL,
  from_stage text NOT NULL CHECK (from_stage IN ('HYPOTHESIS', 'BACKTEST', 'DEMO', 'REAL')),
  to_stage text NOT NULL CHECK (to_stage IN ('HYPOTHESIS', 'BACKTEST', 'DEMO', 'REAL')),
  action text NOT NULL CHECK (action IN ('PROMOTE', 'KEEP_REVIEWING', 'SUSPEND', 'RESUME', 'RETURN_TO_REVIEW')),
  mode text CHECK (mode IS NULL OR mode IN ('REAL', 'DEMO', 'BACKTEST')),
  policy_version integer NOT NULL CHECK (policy_version > 0),
  evidence_snapshot jsonb NOT NULL CHECK (jsonb_typeof(evidence_snapshot) = 'object'),
  evidence_signature varchar(128) NOT NULL CHECK (length(evidence_signature) > 0),
  note varchar(2000) NOT NULL DEFAULT '',
  exception_reason varchar(1000),
  idempotency_key uuid NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT setup_validation_decisions_owned_setup_fkey
    FOREIGN KEY (user_id, setup_id) REFERENCES public.setups(user_id, id) ON DELETE CASCADE,
  CONSTRAINT setup_validation_decisions_user_idempotency_key UNIQUE (user_id, idempotency_key)
);

CREATE INDEX setup_validation_decisions_user_setup_created_idx
  ON public.setup_validation_decisions(user_id, setup_id, created_at DESC);
CREATE INDEX setup_validation_decisions_setup_id_idx
  ON public.setup_validation_decisions(setup_id);

CREATE FUNCTION public.prevent_setup_validation_decision_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'setup validation decisions are immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER setup_validation_decisions_immutable
BEFORE UPDATE ON public.setup_validation_decisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_setup_validation_decision_update();

REVOKE ALL ON FUNCTION public.prevent_setup_validation_decision_update() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.setup_validation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_validation_decisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.setup_validation_policies FROM anon, authenticated;
REVOKE ALL ON TABLE public.setup_validation_decisions FROM anon, authenticated;
GRANT SELECT ON TABLE public.setup_validation_policies TO authenticated;
GRANT SELECT ON TABLE public.setup_validation_decisions TO authenticated;

CREATE POLICY setup_validation_policies_select_owned
  ON public.setup_validation_policies
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

CREATE POLICY setup_validation_decisions_select_owned
  ON public.setup_validation_decisions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);
