/**
 * Formulas Module - Barrel Export
 *
 * Single source of truth for all financial calculations.
 * All callers import from this file exclusively.
 *
 * Usage:
 *   import { calcWinRate, isWin, DisciplineBreakdown } from '@/lib/formulas'
 */

// Win Rate
export { isWin, calcWinRate } from './win-rate'

// Drawdown
export { computeMaxDrawdown, calcDrawdownPct } from './drawdown'

// Discipline
export { calcDisciplineScore } from './discipline'
export type { DisciplineParams, DisciplineBreakdown } from './discipline'

// Risk/Reward
export { calcRMultiple, calcAvgR, calcExpectancyR } from './risk'

// Performance
export { calcSharpeRatio, calcProfitFactor, calcNetPnl } from './performance'

// Setup health
export { calcSetupHealth } from './setup'
export type { SetupHealthStatus, SetupHealthParams } from './setup'

// Utilities
export { getISOWeekKey } from './utils'

// Types
export type {
  WinRateOutput,
  RiskRewardMetrics,
  KpiSummary,
  EquityPoint,
  DailyPnl,
  SymbolPnl,
  SessionStats,
  HourStats,
  SetupStats,
  PsychologyStats,
  AnalyticsOutput,
  AnalyticsInput,
  AnalyticsCache,
  AiUsageLog,
  TradeForKpi,
  FormulasInput,
  PsychCorrelation,
} from './types'
