-- Schedule the daily Aprendizaje email digest.
--
-- pg_cron ticks hourly and POSTs to the Next.js endpoint /api/cron/learning-digest;
-- the endpoint itself gates each user by their LOCAL hour (DIGEST_HOUR = 19), so an
-- hourly tick covers every timezone with a single job.
--
-- Requires pg_cron + pg_net (enabled in 20260529025100_enable_pg_cron_pg_net.sql).
--
-- ── One-time setup (run once in the Supabase SQL editor / via psql as superuser) ──
-- Reuses the existing `app.cron_secret` database setting (already set for the edge
-- function crons) and adds `app.app_url` for the Next app base URL:
--   ALTER DATABASE postgres SET app.app_url = 'https://<app-domain>';
--   -- app.cron_secret must already equal the Next app's CRON_SECRET env.
-- Settings are read at run time, so rotating the URL/secret needs no new migration.

-- Idempotent: drop a previous version of the job before (re)creating it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'learning-digest-hourly') then
    perform cron.unschedule('learning-digest-hourly');
  end if;
end $$;

select cron.schedule(
  'learning-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := current_setting('app.app_url', true) || '/api/cron/learning-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
