-- Fix: point the cron app_url at the canonical WWW host.
--
-- The apex `https://tjournalx.com` 308-redirects to `https://www.tjournalx.com`.
-- pg_net follows the redirect but DROPS the Authorization header on the cross-host
-- hop (standard client behavior), so every cron's net.http_post arrived at www
-- WITHOUT the Bearer → 401. This silently broke ALL scheduled jobs (the digests and
-- the new v3 jobs): net.http_post returns a request id ("succeeded"), but the actual
-- HTTP response was 401 (visible only in net._http_response).
--
-- Verified: posting directly to the www host with the same app_settings.cron_secret
-- returns 200. Fix = store the final host so no redirect (and no header strip) occurs.
-- Idempotent.

update public.app_settings
   set value = 'https://www.tjournalx.com', updated_at = now()
 where key = 'app_url';
