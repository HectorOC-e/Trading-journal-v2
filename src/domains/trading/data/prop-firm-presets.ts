// POST-6 curated prop-firm catalog (typed reference). The DB table prop_firm_presets is
// the runtime source (editable without deploy); this constant mirrors the seed for
// type-safety and tests. Keep the two in sync until a seed-from-constant job exists.

export type Phase = "PHASE_1" | "PHASE_2" | "FUNDED"
export type DrawdownModel = "FIXED" | "TRAILING"

export interface PropFirmPresetSeed {
  firm:             string
  program:          string
  phase:            Phase
  accountSize:      number | null
  ddDailyPct:       number | null
  ddTotalPct:       number | null
  ddModel:          DrawdownModel
  targetPct:        number | null
  minTradingDays:   number | null
  consistencyPct:   number | null
  noWeekendHolding: boolean
  maxTradesPerDay:  number | null
  sourceUrl:        string
}

export const FIRMS = ["FTMO", "Topstep", "MyFundedFutures"] as const

export const PROP_FIRM_PRESETS: PropFirmPresetSeed[] = [
  { firm: "FTMO", program: "Challenge", phase: "PHASE_1", accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: 10, minTradingDays: 4, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  { firm: "FTMO", program: "Challenge", phase: "PHASE_2", accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: 5,  minTradingDays: 4, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  { firm: "FTMO", program: "Challenge", phase: "FUNDED",  accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: null, minTradingDays: null, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  // Topstep states limits in DOLLARS; stored as % of the 50k account_size ($2000 trailing = 4%, $3000 target = 6%).
  { firm: "Topstep", program: "Trading Combine", phase: "PHASE_1", accountSize: 50_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: 6, minTradingDays: 2, consistencyPct: 50, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://topstep.com" },
  { firm: "Topstep", program: "Trading Combine", phase: "FUNDED",  accountSize: 50_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: null, minTradingDays: null, consistencyPct: 50, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://topstep.com" },
  // MyFundedFutures — futures, EOD TRAILING drawdown, 50% consistency (Core eval only).
  // Replaces MyFundedFX (shut down Feb 2026). Dollar limits stored as % of the 100k
  // account_size ($4000 trailing = 4%, $6000 target = 6%). Verified 2026-07-10.
  { firm: "MyFundedFutures", program: "Core", phase: "PHASE_1", accountSize: 100_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: 6, minTradingDays: 2, consistencyPct: 50, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://myfundedfutures.com" },
  { firm: "MyFundedFutures", program: "Core", phase: "FUNDED",  accountSize: 100_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: null, minTradingDays: null, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://myfundedfutures.com" },
]
