-- Sprint 6 (v3.1) — Coach v3 I: memory + threads (C2).
-- CoachThread/CoachMessage (E17) persist the conversation (episodic layer).
-- CoachMemory (E14-ish) is SEMANTIC/IDENTITY memory with the anti-poisoning frontier
-- baked in from the first commit (ADR-003 / FREEZE-D9/P6, irreversible):
--   • The LLM may only PROPOSE → rows land as status='candidate', source='llm'.
--   • CONFIRMED memory comes from the user (or deterministic support), never written
--     by the LLM directly. Only 'confirmed' is injected into the prompt (D10 budget).
-- Memory is visible / editable / deletable by the trader (ADR-003 §3). Additive, RLS.

create table if not exists public.coach_threads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  title          text not null default 'Conversación',
  summary        text,
  created_at     timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists coach_threads_user_idx on public.coach_threads (user_id, last_message_at desc);
alter table public.coach_threads enable row level security;
drop policy if exists coach_threads_user on public.coach_threads;
create policy coach_threads_user on public.coach_threads
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.coach_threads(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null,            -- user | assistant
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists coach_messages_thread_idx on public.coach_messages (thread_id, created_at);
alter table public.coach_messages enable row level security;
drop policy if exists coach_messages_user on public.coach_messages;
create policy coach_messages_user on public.coach_messages
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.coach_memory (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  kind           text not null default 'fact',   -- fact | preference | identity
  content        text not null,
  status         text not null default 'candidate', -- candidate | confirmed | refuted
  source         text not null default 'llm',    -- llm | user | system
  confidence     double precision,
  source_thread_id uuid references public.coach_threads(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  expires_at     timestamptz
);
create index if not exists coach_memory_user_status_idx on public.coach_memory (user_id, status);
alter table public.coach_memory enable row level security;
drop policy if exists coach_memory_user on public.coach_memory;
create policy coach_memory_user on public.coach_memory
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
