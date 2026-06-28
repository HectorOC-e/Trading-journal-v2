-- v3.2 E1·c — Identity memory (E15, FREEZE §6). One structured, user-editable record
-- per user that calibrates the coach's TONE/FOCUS/STYLE. Distinct from semantic
-- patterns (data-derived) — this is who the trader says they are. RLS.

create table if not exists public.memory_identity (
  user_id    uuid primary key references public.users(id) on delete cascade,
  tone       text,        -- how the trader wants the coach to talk (e.g. directo / de apoyo / técnico)
  focus      text,        -- current focus / goal (e.g. reducir overtrading)
  summary    text,        -- structured self-description
  updated_at timestamptz not null default now()
);

alter table public.memory_identity enable row level security;
drop policy if exists memory_identity_user on public.memory_identity;
create policy memory_identity_user on public.memory_identity
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
