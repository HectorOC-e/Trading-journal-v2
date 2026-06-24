-- Security hardening — resolves Supabase advisor findings (2026-06-24 audit).
--
-- Root issue: 7 public tables were exposed to PostgREST with RLS DISABLED, so the public
-- `anon` key could read every user's rows (and the cron_secret in app_settings). Every
-- other table already follows the pattern "RLS enabled + a per-user policy
-- (auth.uid() = user_id)"; the app's server connection (Prisma) bypasses RLS, so enabling
-- it is safe and only closes the anon/PostgREST hole.
--
-- Fixes:
--   1. Per-user tables → enable RLS + standard `<table>_user` policy (mirrors trades_user).
--   2. app_settings (global cron config) → enable RLS with NO policy (deny anon/authenticated;
--      pg_cron runs as a BYPASSRLS role, so it keeps working). Closes the cron_secret exposure.
--   3. app_setting() → pin search_path (advisor 0011) and drop its anon/authenticated RPC grant
--      so the secret can't be read via /rpc either.

-- ── 1. Per-user tables ─────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['automations','custom_palette','monthly_goals','notification_preferences','notifications','tags']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_user', t);
    execute format('create policy %I on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_user', t);
  end loop;
end $$;

-- ── 2. app_settings — RLS on, deny by default (no policy) ────────────────────────
alter table public.app_settings enable row level security;

-- ── 3. Harden app_setting(): fixed search_path + no public/anon RPC access ────────
create or replace function public.app_setting(p_key text)
  returns text
  language sql
  stable
  set search_path = ''
as $$ select value from public.app_settings where key = p_key $$;

revoke execute on function public.app_setting(text) from public, anon, authenticated;
