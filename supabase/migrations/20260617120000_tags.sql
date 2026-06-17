-- Epic 2: Tags as a first-class metadata catalog keyed by name.
-- Trades keep `tags text[]`; this table decorates those strings with
-- color/icon/category/order/displayMode. See
-- docs/superpowers/specs/2026-06-17-tags-system-design.md

CREATE TABLE IF NOT EXISTS tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  color        text NOT NULL DEFAULT '#6b7280',
  icon         text,
  description  text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT '',
  display_mode text NOT NULL DEFAULT 'icon_color',
  sort_order   integer NOT NULL DEFAULT 0,
  is_system    boolean NOT NULL DEFAULT false,
  semantic     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user ON tags (user_id);
