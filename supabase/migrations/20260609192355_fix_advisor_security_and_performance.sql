-- Resolves Supabase advisor findings (security + performance).
-- Applied to production via MCP; this file keeps the repo in sync so
-- `db reset` / `db push` reproduce the same state.
--
-- NOTE: the app backend talks to Postgres through Prisma (table-owner role,
-- which bypasses RLS), so enabling RLS on these tables does not affect the app;
-- it only locks down the public PostgREST API surface.

-- ── SECURITY: enable RLS + per-user policies on user-scoped tables ──
ALTER TABLE public.trade_stats_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trade_stats_cache_user ON public.trade_stats_cache;
CREATE POLICY trade_stats_cache_user ON public.trade_stats_cache
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_user ON public.user_preferences;
CREATE POLICY user_preferences_user ON public.user_preferences
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER TABLE public.user_ai_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_ai_configs_user ON public.user_ai_configs;
CREATE POLICY user_ai_configs_user ON public.user_ai_configs
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- user_ai_settings already had RLS on but no policy (deny-all). Add the standard
-- per-user policy for consistency.
DROP POLICY IF EXISTS user_ai_settings_user ON public.user_ai_settings;
CREATE POLICY user_ai_settings_user ON public.user_ai_settings
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ── SECURITY: drop the always-true public INSERT policy on email_log ──
-- email_log is written only by the weekly-summary edge function (service_role)
-- and the app (Prisma); both bypass RLS, so a public WITH CHECK (true) insert
-- policy is an unnecessary hole.
DROP POLICY IF EXISTS email_log_service_insert ON public.email_log;

-- ── SECURITY: pin the trigger function search_path ──
ALTER FUNCTION public.update_monthly_reviews_updated_at() SET search_path = '';

-- ── PERFORMANCE: wrap auth.uid() in a scalar subquery (initplan) ──
ALTER POLICY "Users can manage their own monthly reviews" ON public.monthly_reviews
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY email_log_own_select ON public.email_log
  USING (user_id = (select auth.uid()));

ALTER POLICY "_ResourceSetups_select" ON public."_ResourceSetups"
  USING (EXISTS ( SELECT 1 FROM learning_resources
                  WHERE ((learning_resources.id = "_ResourceSetups"."A")
                     AND (learning_resources.user_id = (select auth.uid())))));

ALTER POLICY "_ResourceSetups_delete" ON public."_ResourceSetups"
  USING (EXISTS ( SELECT 1 FROM learning_resources
                  WHERE ((learning_resources.id = "_ResourceSetups"."A")
                     AND (learning_resources.user_id = (select auth.uid())))));

ALTER POLICY "_ResourceSetups_insert" ON public."_ResourceSetups"
  WITH CHECK ((EXISTS ( SELECT 1 FROM learning_resources
                        WHERE ((learning_resources.id = "_ResourceSetups"."A")
                           AND (learning_resources.user_id = (select auth.uid())))))
              AND (EXISTS ( SELECT 1 FROM setups
                            WHERE ((setups.id = "_ResourceSetups"."B")
                               AND (setups.user_id = (select auth.uid()))))));

-- ── PERFORMANCE: cover the unindexed foreign key ──
CREATE INDEX IF NOT EXISTS trade_checklist_results_setup_id_idx
  ON public.trade_checklist_results (setup_id);
