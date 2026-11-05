-- No FK: retries must survive deletion of both Auth and application users.
CREATE TABLE public.account_deletion_jobs (
 user_id uuid PRIMARY KEY,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_deletion_jobs_status_next_attempt_at_idx ON public.account_deletion_jobs(status,next_attempt_at);
ALTER TABLE public.account_deletion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deletion_jobs TO service_role;
CREATE POLICY service_role_account_deletion_jobs ON public.account_deletion_jobs TO service_role USING (true) WITH CHECK (true);
SELECT cron.schedule('account-deletions', '*/5 * * * *', $cron$
 SELECT net.http_post(
  url := public.app_setting('app_url') || '/api/cron/account-deletions',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || public.app_setting('cron_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 60000
 );
$cron$);

-- Activate only after the production route is deployed. Preview/schema rollout
-- must not send jobs to a production endpoint that does not exist yet.
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='account-deletions'), active := false);

-- Existing access JWTs can outlive Auth deletion. Gate writes at Storage too,
-- including the historical direct browser uploader with shared trade paths.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE FUNCTION private.account_deletion_blocked()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
 SELECT auth.uid() IS NULL OR EXISTS (
  SELECT 1 FROM public.account_deletion_jobs WHERE user_id = auth.uid()
 );
$function$;
REVOKE ALL ON FUNCTION private.account_deletion_blocked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.account_deletion_blocked() TO authenticated;

CREATE POLICY account_deletion_blocks_storage_insert
ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images')
 OR NOT (SELECT private.account_deletion_blocked())
);
CREATE POLICY account_deletion_blocks_storage_update
ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images')
 OR NOT (SELECT private.account_deletion_blocked())
)
WITH CHECK (
 bucket_id NOT IN ('trade-screenshots','setup-images','practice-images')
 OR NOT (SELECT private.account_deletion_blocked())
);
-- service_role is deliberately outside these authenticated-only policies and
-- continues removing objects during worker cleanup (BYPASSRLS).
