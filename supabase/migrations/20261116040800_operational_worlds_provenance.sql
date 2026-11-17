-- Expand without a REAL default: unknown legacy provenance is quarantined.
ALTER TABLE public.trades ADD COLUMN operational_mode text;
ALTER TABLE public.trades ADD CONSTRAINT trades_operational_mode_check
  CHECK (operational_mode IN ('REAL', 'DEMO', 'BACKTEST', 'INTERNAL'));

CREATE FUNCTION public.operational_mode_for_type(account_type text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT CASE account_type
    WHEN 'PERSONAL' THEN 'REAL' WHEN 'PROP_FIRM' THEN 'REAL'
    WHEN 'DEMO_PERSONAL' THEN 'DEMO' WHEN 'DEMO_PROP' THEN 'DEMO'
    WHEN 'BACKTEST' THEN 'BACKTEST' WHEN 'QA' THEN 'INTERNAL'
    ELSE NULL END
$$;

-- The trigger also protects imports and writers from the previous deployment.
CREATE FUNCTION public.enforce_trade_operational_provenance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE account_owner uuid; expected_mode text;
BEGIN
  SELECT a.user_id, public.operational_mode_for_type(a.type)
    INTO account_owner, expected_mode FROM public.accounts a
    WHERE a.id = NEW.account_id FOR KEY SHARE;
  IF NOT FOUND OR account_owner IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'TRADE_ACCOUNT_OWNER_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF NEW.operational_mode IS NOT NULL AND NEW.operational_mode IS DISTINCT FROM expected_mode THEN
    RAISE EXCEPTION 'TRADE_ACCOUNT_MODE_MISMATCH' USING ERRCODE = '23514';
  END IF;
  NEW.operational_mode := expected_mode;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_trade_operational_provenance() FROM PUBLIC;
CREATE TRIGGER enforce_trade_operational_provenance
BEFORE INSERT OR UPDATE OF user_id, account_id, operational_mode ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.enforce_trade_operational_provenance();

CREATE FUNCTION public.prevent_account_history_reclassification()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF (public.operational_mode_for_type(NEW.type) IS DISTINCT FROM public.operational_mode_for_type(OLD.type)
      OR NEW.user_id IS DISTINCT FROM OLD.user_id)
    AND EXISTS (SELECT 1 FROM public.trades WHERE account_id = OLD.id) THEN
    RAISE EXCEPTION 'ACCOUNT_HISTORY_MODE_CHANGE_REQUIRES_NEW_ACCOUNT' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.prevent_account_history_reclassification() FROM PUBLIC;
CREATE TRIGGER prevent_account_history_reclassification
BEFORE UPDATE OF type, user_id ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.prevent_account_history_reclassification();

UPDATE public.trades t SET operational_mode = public.operational_mode_for_type(a.type)
FROM public.accounts a WHERE a.id = t.account_id AND a.user_id = t.user_id
AND t.operational_mode IS NULL AND public.operational_mode_for_type(a.type) IS NOT NULL;

CREATE INDEX trades_user_id_operational_mode_status_date_idx
ON public.trades (user_id, operational_mode, status, date);
