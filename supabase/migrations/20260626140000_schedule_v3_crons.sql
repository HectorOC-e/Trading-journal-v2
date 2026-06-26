-- Schedule the v3 background jobs (pg_cron → pg_net → /api/cron/*), reading
-- app_url + cron_secret from public.app_settings (the table introduced in
-- 20260623150000 because ALTER DATABASE SET is denied on Supabase). Mirrors the
-- existing digest schedules.
--
-- Jobs:
--   • dispatch-events       — drain the domain-event outbox to its consumers.
--                             Frequent so commitment.*/insight.* don't pile up.
--   • recompute-insights    — persist deterministic insights (C8). Without this,
--                             behavior.openInsights is empty in prod (no insights).
--   • evaluate-commitments  — verify commitments whose window has closed (S4 loop).
--
-- Idempotent: unschedule-then-schedule so re-running is safe.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-dispatch-events')      then perform cron.unschedule('v3-dispatch-events');      end if;
  if exists (select 1 from cron.job where jobname = 'v3-recompute-insights')   then perform cron.unschedule('v3-recompute-insights');   end if;
  if exists (select 1 from cron.job where jobname = 'v3-evaluate-commitments') then perform cron.unschedule('v3-evaluate-commitments'); end if;
end $$;

-- Drain the outbox every 5 minutes.
select cron.schedule(
  'v3-dispatch-events',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/dispatch-events',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb
  );
  $cron$
);

-- Recompute + historize insights daily (05:15 UTC).
select cron.schedule(
  'v3-recompute-insights',
  '15 5 * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/recompute-insights',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb
  );
  $cron$
);

-- Verify window-closed commitments daily (05:45 UTC, after recompute).
select cron.schedule(
  'v3-evaluate-commitments',
  '45 5 * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/evaluate-commitments',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb
  );
  $cron$
);
