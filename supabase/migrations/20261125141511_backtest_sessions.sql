create table public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  setup_key uuid,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'CLOSED')),
  revision integer not null default 1 check (revision > 0),
  report_number integer not null default 0 check (report_number >= 0),
  evidence_count integer not null default 0 check (evidence_count between 0 and 250),
  plan jsonb not null,
  work jsonb not null,
  work_days text[] not null default array[]::text[],
  created_at timestamptz(3) not null default now(),
  updated_at timestamptz(3) not null,
  unique (user_id, id)
);

create index backtest_sessions_user_id_updated_at_id_idx on public.backtest_sessions(user_id, updated_at desc, id);
create index backtest_sessions_user_id_setup_key_idx on public.backtest_sessions(user_id, setup_key);

create table public.backtest_session_trades (
  user_id uuid not null,
  session_id uuid not null,
  trade_id uuid not null,
  primary key (user_id, session_id, trade_id),
  foreign key (user_id, session_id) references public.backtest_sessions(user_id, id) on delete cascade on update cascade,
  foreign key (user_id, trade_id) references public.trades(user_id, id) on delete cascade on update cascade
);
create index backtest_session_trades_user_id_trade_id_idx on public.backtest_session_trades(user_id, trade_id);

create table public.backtest_session_practices (
  user_id uuid not null,
  session_id uuid not null,
  practice_id uuid not null,
  primary key (user_id, session_id, practice_id),
  foreign key (user_id, session_id) references public.backtest_sessions(user_id, id) on delete cascade on update cascade,
  foreign key (user_id, practice_id) references public.learning_practices(user_id, id) on delete cascade on update cascade
);
create index backtest_session_practices_user_id_practice_id_idx on public.backtest_session_practices(user_id, practice_id);

create table public.backtest_session_reports (
  user_id uuid not null,
  session_id uuid not null,
  number integer not null check (number > 0),
  request_id uuid not null,
  snapshot jsonb not null,
  closed_at timestamptz(3) not null default now(),
  primary key (user_id, session_id, number),
  unique (user_id, session_id, request_id),
  foreign key (user_id, session_id) references public.backtest_sessions(user_id, id) on delete cascade on update cascade
);

alter table public.backtest_sessions enable row level security;
alter table public.backtest_session_trades enable row level security;
alter table public.backtest_session_practices enable row level security;
alter table public.backtest_session_reports enable row level security;

-- The authenticated application server owns session transitions and report snapshots.
revoke all privileges on table public.backtest_sessions, public.backtest_session_trades,
  public.backtest_session_practices, public.backtest_session_reports from public, anon, authenticated;
