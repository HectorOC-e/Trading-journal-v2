-- Do not infer a real cohort for historical goals or inferred memories.
ALTER TABLE public.monthly_goals ADD COLUMN operational_mode text CHECK(operational_mode IN ('REAL','DEMO','BACKTEST'));
CREATE INDEX monthly_goals_user_period_mode_idx ON public.monthly_goals(user_id,year,month,operational_mode);
ALTER TABLE public.memory_episodes ADD COLUMN operational_mode text CHECK(operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.memory_patterns ADD COLUMN operational_mode text CHECK(operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.memory_patterns DROP CONSTRAINT IF EXISTS memory_patterns_user_id_pattern_key_key;
DROP INDEX IF EXISTS public.memory_patterns_user_id_pattern_key_key;
CREATE UNIQUE INDEX memory_patterns_user_id_pattern_key_operational_mode_key ON public.memory_patterns(user_id,pattern_key,operational_mode);
CREATE INDEX memory_episodes_user_mode_occurred_idx ON public.memory_episodes(user_id,operational_mode,occurred_at DESC);

CREATE FUNCTION public.invalidate_goal_review_snapshots()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE uid uuid; m text; yr integer; mon integer;
BEGIN
  FOR uid,m,yr,mon IN
    SELECT OLD.user_id,OLD.operational_mode,OLD.year,OLD.month WHERE TG_OP<>'INSERT'
    UNION SELECT NEW.user_id,NEW.operational_mode,NEW.year,NEW.month WHERE TG_OP<>'DELETE'
  LOOP
    UPDATE public.review_mode_snapshots SET evidence_hash='',revision=revision+1,updated_at=now()
    WHERE user_id=uid AND mode=m AND kind='MONTHLY' AND period_key=yr::text||'-'||lpad(mon::text,2,'0');
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_goal_review_snapshots() FROM PUBLIC;
CREATE TRIGGER invalidate_goal_review_snapshots AFTER INSERT OR UPDATE OR DELETE ON public.monthly_goals
FOR EACH ROW EXECUTE FUNCTION public.invalidate_goal_review_snapshots();
