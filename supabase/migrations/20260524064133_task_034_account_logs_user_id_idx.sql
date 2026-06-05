-- TASK-034: Missing FK index on account_logs.user_id
CREATE INDEX IF NOT EXISTS account_logs_user_id_idx ON public.account_logs(user_id);
