-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
