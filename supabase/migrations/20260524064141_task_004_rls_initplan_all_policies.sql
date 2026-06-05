-- TASK-004: Recreate all 10 RLS policies with (select auth.uid()) InitPlan pattern
-- This prevents per-row re-evaluation of auth.uid(), improving query performance

-- 1. account_logs
DROP POLICY IF EXISTS "account_logs_user" ON public.account_logs;
CREATE POLICY "account_logs_user" ON public.account_logs FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 2. accounts
DROP POLICY IF EXISTS "accounts_user" ON public.accounts;
CREATE POLICY "accounts_user" ON public.accounts FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 3. learning_resources
DROP POLICY IF EXISTS "learning_resources_user" ON public.learning_resources;
CREATE POLICY "learning_resources_user" ON public.learning_resources FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 4. markets
DROP POLICY IF EXISTS "markets_user" ON public.markets;
CREATE POLICY "markets_user" ON public.markets FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 5. rules
DROP POLICY IF EXISTS "rules_user" ON public.rules;
CREATE POLICY "rules_user" ON public.rules FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 6. setups
DROP POLICY IF EXISTS "setups_user" ON public.setups;
CREATE POLICY "setups_user" ON public.setups FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 7. trades
DROP POLICY IF EXISTS "trades_user" ON public.trades;
CREATE POLICY "trades_user" ON public.trades FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 8. users (self only — uses id, not user_id)
DROP POLICY IF EXISTS "users_self" ON public.users;
CREATE POLICY "users_self" ON public.users FOR ALL TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 9. weekly_reviews
DROP POLICY IF EXISTS "weekly_reviews_user" ON public.weekly_reviews;
CREATE POLICY "weekly_reviews_user" ON public.weekly_reviews FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 10. withdrawals
DROP POLICY IF EXISTS "withdrawals_user" ON public.withdrawals;
CREATE POLICY "withdrawals_user" ON public.withdrawals FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
