-- Keep the legacy job name and its existing destination/auth command unchanged.
-- Activate after deploying the runner that checks the user's local HH:mm.
SELECT cron.alter_job(jobid, schedule := '* * * * *')
FROM cron.job
WHERE jobname = 'learning-digest-hourly';
