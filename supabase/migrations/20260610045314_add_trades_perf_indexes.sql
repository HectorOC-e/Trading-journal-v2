-- Performance index for the hottest read path.
--
-- dashboardStats — the heaviest resolver — filters trades by
-- user_id + status = 'CLOSED' + a date range, ordered by date. The existing
-- (user_id, date) index (trades_user_date_idx) does NOT include status, so
-- Postgres scans every trade for the user and filters status afterwards. This
-- composite lets it seek straight to the closed trades in the date window.
--
-- The existing (user_id, date) index is kept: trades.list paginates by
-- user_id + date WITHOUT a status filter, which this composite can't serve.
--
-- Pure addition (IF NOT EXISTS) — no drops, no data change.

CREATE INDEX IF NOT EXISTS trades_user_status_date_idx
  ON public.trades (user_id, status, date DESC);
