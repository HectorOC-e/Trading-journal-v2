-- Schedule the weekly/monthly trading-review email digest.
--
-- pg_cron ticks hourly and POSTs to /api/cron/reviews-digest; the endpoint gates each
-- user by their LOCAL hour (REVIEWS_HOUR = 8) and local date — Monday → weekly review
-- (previous week), day 1 → monthly review (previous month) — so one hourly job covers
-- every timezone.
--
-- Requires pg_cron + pg_net and the app.app_url / app.cron_secret DB settings already
-- configured for the learning-digest job (see 20260619120000_schedule_learning_digest.sql).

-- Idempotent: drop a previous version of the job before (re)creating it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reviews-digest-hourly') then
    perform cron.unschedule('reviews-digest-hourly');
  end if;
end $$;

select cron.schedule(
  'reviews-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := current_setting('app.app_url', true) || '/api/cron/reviews-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
