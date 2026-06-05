
-- Sprint 4: UserPreferences table + Trade psychology fields

-- 1. UserPreferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id       UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme         TEXT        NOT NULL DEFAULT 'system',
  accent_hue    INTEGER,
  color_scheme  TEXT        NOT NULL DEFAULT 'default',
  default_tab   TEXT        NOT NULL DEFAULT 'portfolio',
  kpi_order     TEXT[]      NOT NULL DEFAULT '{}',
  kpi_hidden    TEXT[]      NOT NULL DEFAULT '{}',
  default_grain TEXT        NOT NULL DEFAULT 'daily',
  table_density TEXT        NOT NULL DEFAULT 'comfortable',
  date_format   TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',
  number_locale TEXT        NOT NULL DEFAULT 'es-HN',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON public.user_preferences(user_id);

-- 2. Trade psychology fields
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS emotion_before    TEXT,
  ADD COLUMN IF NOT EXISTS confidence_rating INTEGER,
  ADD COLUMN IF NOT EXISTS execution_quality INTEGER,
  ADD COLUMN IF NOT EXISTS fomo_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenge_flag      BOOLEAN NOT NULL DEFAULT FALSE;
