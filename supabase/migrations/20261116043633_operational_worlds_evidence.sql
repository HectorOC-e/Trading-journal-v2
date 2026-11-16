-- Nullable temporal provenance preserves legacy uncertainty.
ALTER TABLE public.trades
  ADD COLUMN market_opened_at timestamptz(3), ADD COLUMN market_closed_at timestamptz(3),
  ADD COLUMN market_time_zone text, ADD COLUMN capture_context text,
  ADD COLUMN emotion_recorded_at timestamptz(3), ADD COLUMN emotion_reference_at timestamptz(3),
  ADD COLUMN emotion_context text,
  ADD CONSTRAINT trades_capture_context_check CHECK (capture_context IN ('LIVE','HISTORICAL')),
  ADD CONSTRAINT trades_emotion_context_check CHECK (emotion_context IN ('MARKET','PRACTICE')),
  ADD CONSTRAINT trades_market_sequence_check CHECK (market_closed_at IS NULL OR market_opened_at IS NULL OR market_closed_at >= market_opened_at),
  ADD CONSTRAINT trades_practice_emotion_mode_check CHECK (emotion_context IS DISTINCT FROM 'PRACTICE' OR (operational_mode IS NOT NULL AND operational_mode IN ('DEMO','BACKTEST'))),
  ADD CONSTRAINT trades_historical_closed_check CHECK (capture_context IS DISTINCT FROM 'HISTORICAL' OR status='CLOSED');

ALTER TABLE public.coach_threads ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
ALTER TABLE public.coach_memory ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST'));
CREATE INDEX coach_threads_user_mode_message_idx ON public.coach_threads(user_id,operational_mode,last_message_at DESC);
CREATE INDEX coach_memory_user_mode_status_idx ON public.coach_memory(user_id,operational_mode,status);

ALTER TABLE public.learning_practices
  ADD COLUMN kind text NOT NULL DEFAULT 'CONCEPT' CHECK (kind IN ('CONCEPT','EXECUTION','REVIEW')),
  ADD COLUMN operational_mode text CHECK (operational_mode IN ('REAL','DEMO','BACKTEST')),
  ADD CONSTRAINT learning_practices_kind_mode_check CHECK
    ((kind='CONCEPT' AND operational_mode IS NULL) OR (kind='REVIEW' AND operational_mode IS NOT NULL) OR (kind='EXECUTION' AND operational_mode IS NOT NULL AND operational_mode IN ('DEMO','BACKTEST')));
ALTER TABLE public.practice_feedback ADD COLUMN evidence_signature text;
CREATE UNIQUE INDEX trades_user_id_id_key ON public.trades(user_id,id);
CREATE UNIQUE INDEX learning_practices_user_id_id_key ON public.learning_practices(user_id,id);

CREATE TABLE public.practice_trade_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  practice_id uuid NOT NULL,
  trade_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('EXECUTED','REVIEWED')),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,practice_id) REFERENCES public.learning_practices(user_id,id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY(user_id,trade_id) REFERENCES public.trades(user_id,id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(practice_id,trade_id)
);
CREATE UNIQUE INDEX practice_trade_links_one_execution_idx ON public.practice_trade_links(user_id,trade_id) WHERE role='EXECUTED';
CREATE INDEX practice_trade_links_user_id_trade_id_idx ON public.practice_trade_links(user_id,trade_id);
ALTER TABLE public.practice_trade_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY practice_trade_links_owner ON public.practice_trade_links TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.practice_trade_links FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.practice_trade_links TO authenticated;
GRANT ALL ON public.practice_trade_links TO service_role;

CREATE FUNCTION public.check_practice_trade_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p public.learning_practices%ROWTYPE; t public.trades%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.learning_practices WHERE id=NEW.practice_id AND user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRACTICE_LINK_OWNER_MISMATCH' USING ERRCODE='23514'; END IF;
  SELECT * INTO t FROM public.trades WHERE id=NEW.trade_id AND user_id=NEW.user_id FOR KEY SHARE;
  IF NOT FOUND OR t.operational_mode IS NULL OR t.operational_mode IS DISTINCT FROM p.operational_mode THEN
    RAISE EXCEPTION 'PRACTICE_LINK_MODE_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF p.kind='CONCEPT' OR (p.kind='EXECUTION' AND (NEW.role<>'EXECUTED' OR p.operational_mode NOT IN ('DEMO','BACKTEST')))
    OR (p.kind='REVIEW' AND NEW.role<>'REVIEWED') THEN
    RAISE EXCEPTION 'PRACTICE_LINK_ROLE_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_practice_trade_link() FROM PUBLIC;
CREATE TRIGGER check_practice_trade_link BEFORE INSERT OR UPDATE ON public.practice_trade_links
FOR EACH ROW EXECUTE FUNCTION public.check_practice_trade_link();

CREATE FUNCTION public.protect_linked_practice_context()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.practice_trade_links l JOIN public.trades t ON t.id=l.trade_id
    WHERE l.practice_id=OLD.id AND
      (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.operational_mode IS DISTINCT FROM t.operational_mode
       OR NEW.kind='CONCEPT' OR (NEW.kind='EXECUTION' AND l.role<>'EXECUTED') OR (NEW.kind='REVIEW' AND l.role<>'REVIEWED'))
  ) THEN RAISE EXCEPTION 'LINKED_PRACTICE_CONTEXT_CHANGE_REQUIRES_UNLINK' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_linked_practice_context() FROM PUBLIC;
CREATE TRIGGER protect_linked_practice_context BEFORE UPDATE OF user_id,kind,operational_mode ON public.learning_practices
FOR EACH ROW EXECUTE FUNCTION public.protect_linked_practice_context();

CREATE FUNCTION public.invalidate_practice_link_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN
    UPDATE public.learning_practices SET version=version+1,updated_at=now() WHERE id=OLD.practice_id AND user_id=OLD.user_id;
  END IF;
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.practice_id IS DISTINCT FROM OLD.practice_id) THEN
    UPDATE public.learning_practices SET version=version+1,updated_at=now() WHERE id=NEW.practice_id AND user_id=NEW.user_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_practice_link_feedback() FROM PUBLIC;
CREATE TRIGGER invalidate_practice_link_feedback AFTER INSERT OR UPDATE OR DELETE ON public.practice_trade_links
FOR EACH ROW EXECUTE FUNCTION public.invalidate_practice_link_feedback();

CREATE FUNCTION public.invalidate_linked_trade_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.learning_practices p SET version=p.version+1,updated_at=now()
  WHERE p.user_id=OLD.user_id AND p.id IN (SELECT practice_id FROM public.practice_trade_links WHERE trade_id=OLD.id);
  IF TG_OP='UPDATE' THEN RETURN NEW; ELSE RETURN OLD; END IF;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_linked_trade_feedback() FROM PUBLIC;
CREATE TRIGGER invalidate_linked_trade_feedback BEFORE UPDATE OR DELETE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.invalidate_linked_trade_feedback();

CREATE TABLE public.review_mode_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kind text NOT NULL CHECK(kind IN ('WEEKLY','MONTHLY')), period_key text NOT NULL,
  mode text NOT NULL CHECK(mode IN ('REAL','DEMO','BACKTEST')),
  evidence_hash text NOT NULL DEFAULT '', analysis_evidence_hash text,
  metrics jsonb NOT NULL DEFAULT '{}', analysis text, analysis_at timestamptz(3),
  revision integer NOT NULL DEFAULT 0, created_at timestamptz(3) NOT NULL DEFAULT now(), updated_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE(user_id,kind,period_key,mode)
);
CREATE INDEX review_mode_snapshots_user_id_mode_idx ON public.review_mode_snapshots(user_id,mode);
ALTER TABLE public.review_mode_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_mode_snapshots_owner ON public.review_mode_snapshots TO authenticated
  USING((SELECT auth.uid())=user_id) WITH CHECK((SELECT auth.uid())=user_id);
REVOKE ALL ON public.review_mode_snapshots FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.review_mode_snapshots TO authenticated;
GRANT ALL ON public.review_mode_snapshots TO service_role;

CREATE FUNCTION public.invalidate_trade_review_snapshots()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE uid uuid; m text; d date;
BEGIN
  FOR uid,m,d IN
    SELECT OLD.user_id,OLD.operational_mode,OLD.date WHERE TG_OP<>'INSERT'
    UNION SELECT NEW.user_id,NEW.operational_mode,NEW.date WHERE TG_OP<>'DELETE'
  LOOP
    UPDATE public.review_mode_snapshots SET evidence_hash='',revision=revision+1,updated_at=now()
    WHERE user_id=uid AND mode=m AND (
      (kind='WEEKLY' AND period_key IN (to_char(date_trunc('week',d::timestamp),'YYYY-MM-DD'),to_char(date_trunc('week',d::timestamp)+interval '7 days','YYYY-MM-DD')))
      OR (kind='MONTHLY' AND period_key IN (to_char(d,'YYYY-MM'),to_char(d+interval '1 month','YYYY-MM')))
    );
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_trade_review_snapshots() FROM PUBLIC;
CREATE TRIGGER invalidate_trade_review_snapshots AFTER INSERT OR UPDATE OR DELETE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.invalidate_trade_review_snapshots();

CREATE FUNCTION public.invalidate_review_configuration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE row_data jsonb; uid uuid;
BEGIN
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  uid:=CASE WHEN TG_TABLE_NAME='users' THEN (row_data->>'id')::uuid ELSE (row_data->>'user_id')::uuid END;
  IF TG_TABLE_NAME='accounts' THEN
    UPDATE public.review_mode_snapshots SET evidence_hash='',revision=revision+1,updated_at=now()
    WHERE user_id=uid AND mode IN (
      public.operational_mode_for_type(row_data->>'type'),
      public.operational_mode_for_type(CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD)->>'type' END)
    );
  ELSE
    UPDATE public.review_mode_snapshots SET evidence_hash='',revision=revision+1,updated_at=now() WHERE user_id=uid;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_review_configuration() FROM PUBLIC;
CREATE TRIGGER invalidate_account_review_configuration AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.invalidate_review_configuration();
CREATE TRIGGER invalidate_profile_review_configuration AFTER UPDATE OF base_currency,fx_rates,timezone ON public.users
FOR EACH ROW EXECUTE FUNCTION public.invalidate_review_configuration();
CREATE TRIGGER invalidate_setup_review_configuration AFTER UPDATE OR DELETE ON public.setups
FOR EACH ROW EXECUTE FUNCTION public.invalidate_review_configuration();
CREATE TRIGGER invalidate_weekly_review_notes AFTER UPDATE OF executive_summary,what_worked,to_improve ON public.weekly_reviews
FOR EACH ROW EXECUTE FUNCTION public.invalidate_review_configuration();
CREATE TRIGGER invalidate_monthly_review_notes AFTER UPDATE OF summary,key_themes,goals_set,goals_met ON public.monthly_reviews
FOR EACH ROW EXECUTE FUNCTION public.invalidate_review_configuration();
