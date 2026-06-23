-- Reviews/Learning cron · attempt to set the public app URL DB setting.
--
-- NOTE: On Supabase the `postgres` role is NOT a true superuser, so
-- `ALTER DATABASE ... SET app.app_url` raises "permission denied to set parameter"
-- (SQLSTATE 42501) — in CI replay AND in prod migrate-deploy. We therefore make this
-- a SAFE no-op when the privilege is missing, so it never breaks the migration run.
--
-- The cron's app_url/cron_secret can't live in a custom GUC on Supabase. Follow-up:
-- move them to a settings table (e.g. private.app_settings) read by the pg_cron jobs,
-- or Supabase Vault. Until then the digest cron stays inactive (it also needs a
-- verified Resend domain + EMAIL_FROM). Manual "Enviar por correo" is unaffected.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET app.app_url = %L', current_database(), 'https://tjournalx.com');
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'app.app_url not set (insufficient privilege on Supabase); configure cron settings out-of-band';
END $$;
