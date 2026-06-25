-- Sprint 1 (v3.1) — Unify Rule + Automation into one `rules` model (C6).
--
-- NON-DESTRUCTIVE / reversible-until-verified (FREEZE-D8/D9/P9, gate G2):
--   1. Extend `rules` with the executable fields (mode/trigger/conditions/actions/…).
--   2. Backfill `rules` from `automations` (each automation → a unified rule row,
--      mode='enforce' iff it has a BLOCK action — mirrors classifyMode()). Idempotent
--      via source_automation_id, so replay-from-zero is safe.
--   3. `automations` is LEFT INTACT and the engine keeps enforcing off it. The
--      enforcement cutover to `rules` is a SEPARATE, verified step (G2) — this
--      migration must not change runtime blocking behaviour.
--
-- Existing descriptive `rules` rows get mode='warn' (the column default): a
-- descriptive rule has no executable semantics, so it can only warn.

-- ── 1. Extend rules with the unified/executable fields ────────────────────────
alter table public.rules add column if not exists mode text not null default 'warn';
alter table public.rules add column if not exists trigger text;
alter table public.rules add column if not exists conditions jsonb not null default '{}'::jsonb;
alter table public.rules add column if not exists actions jsonb not null default '[]'::jsonb;
alter table public.rules add column if not exists priority integer not null default 0;
alter table public.rules add column if not exists category text not null default '';
alter table public.rules add column if not exists last_fired_at timestamptz;
alter table public.rules add column if not exists source_automation_id uuid;
alter table public.rules add column if not exists source_commitment_id uuid;
alter table public.rules add column if not exists source_insight_id uuid;

create index if not exists rules_user_idx on public.rules (user_id);
create index if not exists rules_source_automation_idx
  on public.rules (source_automation_id)
  where source_automation_id is not null;

-- ── 2. Backfill rules from automations (idempotent, non-destructive) ──────────
-- mode = enforce iff the automation has a BLOCK action (jsonb containment).
insert into public.rules (
  id, user_id, name, description, severity, is_system, enabled,
  mode, trigger, conditions, actions, priority, category, last_fired_at,
  source_automation_id, created_at, updated_at
)
select
  gen_random_uuid(),
  a.user_id,
  a.name,
  a.description,
  case when a.actions @> '[{"type":"BLOCK"}]'::jsonb then 'CRÍTICA' else 'MEDIA' end,
  a.is_system,
  a.enabled,
  case when a.actions @> '[{"type":"BLOCK"}]'::jsonb then 'enforce' else 'warn' end,
  a.trigger,
  a.conditions,
  a.actions,
  a.priority,
  a.category,
  a.last_fired_at,
  a.id,
  a.created_at,
  a.updated_at
from public.automations a
where not exists (
  select 1 from public.rules r where r.source_automation_id = a.id
);

-- NOTE: `automations` is intentionally NOT dropped. The engine continues to read it
-- until the enforcement cutover is verified (gate G2). RLS on `rules` is unchanged
-- (the table already had its per-user policy from the original schema).
