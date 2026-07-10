-- Schedule the weekly cognitive digest (C4 / #28, v3.2). Closes the last
-- unscheduled v3 cron: /api/cron/cognitive-digest exists and works, but without
-- a schedule the weekly digest never fires (STATUS.md §2, marked 🔴).
--
-- pg_cron → pg_net → the route, reading app_url + cron_secret from
-- public.app_settings (the table from 20260623150000, used because
-- ALTER DATABASE SET is denied on Supabase). Mirrors 20260626140000 exactly.
--
-- Cadence: Mondays 06:00 UTC — after v3-recompute-insights (05:15) and
-- v3-evaluate-commitments (05:45), so the improvement delta and the week's
-- kept/broken commitments are fresh. The service dedupes per ISO week
-- (cognitive-digest-service.ts), so a re-run within the same week is a no-op.
--
-- Idempotent: unschedule-then-schedule so re-running is safe.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-cognitive-digest') then
    perform cron.unschedule('v3-cognitive-digest');
  end if;
end $$;

select cron.schedule(
  'v3-cognitive-digest',
  '0 6 * * 1',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/cognitive-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb
  );
  $cron$
);
