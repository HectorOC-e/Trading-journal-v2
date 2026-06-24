-- Fix the dead digest crons: pg_cron can't read app.app_url / app.cron_secret on
-- Supabase because ALTER DATABASE SET requires a true superuser (denied even as the
-- `postgres` role), so current_setting(...) returned NULL and net.http_post never fired.
-- Store the two values in a table the cron SQL can SELECT, and re-point both digest
-- jobs at it. This supersedes the current_setting-based schedules from
-- 20260619120000 (learning) and 20260622140000 (reviews) without editing history.

-- ── Settings table ────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- Seed the public app URL (safe to commit). The cron secret must be set OUT OF BAND
-- (never commit it). After this migration, run once in the Supabase SQL editor:
--   update public.app_settings set value = '<your CRON_SECRET>' where key = 'cron_secret';
insert into public.app_settings (key, value) values ('app_url', 'https://tjournalx.com')
  on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('cron_secret', '')
  on conflict (key) do nothing;

-- Stable reader so the cron job SQL stays terse.
create or replace function public.app_setting(p_key text)
  returns text language sql stable as
$$ select value from public.app_settings where key = p_key $$;

-- ── Re-schedule both hourly digests to read url + secret from the table ─────────
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reviews-digest-hourly') then
    perform cron.unschedule('reviews-digest-hourly');
  end if;
  if exists (select 1 from cron.job where jobname = 'learning-digest-hourly') then
    perform cron.unschedule('learning-digest-hourly');
  end if;
end $$;

select cron.schedule(
  'reviews-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/reviews-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

select cron.schedule(
  'learning-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/learning-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
