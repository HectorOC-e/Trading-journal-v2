-- Per-account leverage configuration for the trade margin/leverage calculator.
--   max_leverage    : broker/account max leverage (e.g. 30 for 1:30). Used to
--                     compute required margin (notional / max_leverage).
--   target_leverage : the user's "healthy" effective-leverage target; drives the
--                     good/warn/high band shown when sizing a trade.
-- Both nullable: when unset, the leverage panel is simply not shown.

alter table accounts
  add column if not exists max_leverage    integer,
  add column if not exists target_leverage integer;
