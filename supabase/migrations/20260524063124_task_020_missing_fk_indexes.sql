-- TASK-020: 5 missing FK indexes identified by Supabase Performance Advisor
CREATE INDEX IF NOT EXISTS rules_user_id_idx           ON public.rules(user_id);
CREATE INDEX IF NOT EXISTS setups_user_id_idx          ON public.setups(user_id);
CREATE INDEX IF NOT EXISTS trade_events_user_id_idx    ON public.trade_events(user_id);
CREATE INDEX IF NOT EXISTS trades_setup_id_idx         ON public.trades(setup_id);
CREATE INDEX IF NOT EXISTS weekly_reviews_account_id_idx ON public.weekly_reviews(account_id);
