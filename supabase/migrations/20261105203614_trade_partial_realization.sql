-- Nullable markers deliberately preserve existing history. Old partial/scale events
-- do not carry a trustworthy pre-event size/entry/commission baseline; do not invent
-- realized P&L or rewrite historical trades. Financial writes on such histories
-- require explicit review. Ordinary legacy trades initialize snapshots on next write.
ALTER TABLE public.trades
  ADD COLUMN realized_pnl numeric(14,2),
  ADD COLUMN original_size numeric(12,4),
  ADD COLUMN original_risk_money numeric(14,2);
ALTER TABLE public.trade_events ADD COLUMN realized_pnl numeric(14,2);
COMMENT ON COLUMN public.trades.realized_pnl IS 'Gross cumulative realized portions; NULL marks legacy accounting';
COMMENT ON COLUMN public.trade_events.realized_pnl IS 'Net realized delta at event timestamp; NULL for legacy/non-financial events';
