-- TASK-001: Enable RLS on trade_events + user isolation policy
ALTER TABLE public.trade_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_events_user"
  ON public.trade_events
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
