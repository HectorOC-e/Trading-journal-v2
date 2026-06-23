-- Reviews/Learning cron · set the public app URL DB setting.
-- The hourly pg_cron jobs (reviews-digest-hourly, learning-digest-hourly) POST to
--   current_setting('app.app_url') || '/api/cron/...'
-- with a 'Bearer ' || current_setting('app.cron_secret') header. Both settings were
-- empty in the DB, so the cron fired but could never reach the app.
--
-- This migration sets the PUBLIC url (safe to commit). The SECRET is set out-of-band
-- (never committed): run once in Supabase, replacing <CRON_SECRET> with the app's value:
--   ALTER DATABASE postgres SET app.cron_secret = '<CRON_SECRET>';
-- Also set NEXT_PUBLIC_APP_URL=https://tjournalx.com and a verified Resend EMAIL_FROM
-- in the Vercel env for links + multi-recipient delivery.

ALTER DATABASE postgres SET app.app_url = 'https://tjournalx.com';
