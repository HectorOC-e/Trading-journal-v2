-- Sprint 5 (v3.1) — Behavior Engine II: RuleSuggestion (E10).
-- "Activar regla anti-X" at a critical insight: a proposed enforce rule the user
-- accepts or dismisses. Additive; RLS per-user. (linkRule reuses the existing
-- `rules` table; only the suggestion needs storage.)

create table if not exists public.rule_suggestions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  insight_id    uuid references public.insights(id) on delete set null,
  proposed_rule jsonb not null,            -- { name, trigger, conditions, actions, mode } — no PII
  reason        text not null default '',
  status        text not null default 'pending', -- pending | accepted | dismissed
  rule_id       uuid references public.rules(id) on delete set null, -- the rule created on accept
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists rule_suggestions_user_status_idx on public.rule_suggestions (user_id, status);
create index if not exists rule_suggestions_insight_idx on public.rule_suggestions (insight_id);
alter table public.rule_suggestions enable row level security;
drop policy if exists rule_suggestions_user on public.rule_suggestions;
create policy rule_suggestions_user on public.rule_suggestions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
