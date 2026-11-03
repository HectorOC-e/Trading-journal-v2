ALTER TABLE public.users
  ADD COLUMN learning_reminder_time text NOT NULL DEFAULT '19:00',
  ADD CONSTRAINT users_learning_reminder_time_format CHECK (learning_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
