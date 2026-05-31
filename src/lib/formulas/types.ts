/**
 * TypeScript Type Definitions for Financial Formulas
 * Single source of truth for all KPI calculations and analytics outputs.
 * Derived from target-architecture.md §3.1–3.2
 *
 * Usage:
 *   import { calcWinRate, DisciplineBreakdown, KpiSummary } from '@/lib/formulas'
 */

/**
 * Input parameters for discipline score calculation.
 * Data sourced from trade behavioral tags and rule tracking.
 */
export interface DisciplineParams {
  totalTrades: number
  taggedViolations: number // Trades tagged with FOMO, Off-plan, Impulsivo, Revenge, etc.
  pendingReviews: number // Learning resources due for SRS review
  completedReviews: number // Learning resources completed
  totalEnabledRules: number // Total rules trader has enabled
  violatedRules: number // Rules trader violated in period
}

/**
 * Output from discipline score calculation.
 * All scores are 0–100 (percentage).
 * Sub-scores are decimal (unrounded); total is rounded integer.
 */
export interface DisciplineBreakdown {
  score: number // Total discipline score (0–100, rounded integer)
  executionScore: number // Execution score (0–50, decimal)
  learningScore: number // Learning score (0–30, decimal)
  adherenceScore: number // Rule adherence score (0–20, decimal)
}

/**
 * Win rate output.
 * Percentage format (0–100).
 */
export interface WinRateOutput {
  percentage: number // 0–100 (e.g., 65.5 means 65.5%, not 0.655)
  count: number // Number of wins
  total: number // Total trades
}

/**
 * Risk/reward metrics from a trade or portfolio.
 */
export interface RiskRewardMetrics {
  rMultiple: number | null // R multiple of single trade (can be null if zero risk distance)
  avgR: number // Average R across trades (can be negative)
  expectancyR: number // Expected value in R terms
}

/**
 * KPI summary for dashboard display.
 * All numeric values are decimal (not string-formatted).
 * UI layer handles formatting (rounding, currency symbols, etc.).
 */
export interface KpiSummary {
  totalTrades: number
  winRate: number // 0–100 (percentage)
  netPnl: number // Raw dollar amount
  avgR: number // Average R multiple
  profitFactor: number // Ratio of wins to losses (0–999)
  expectancyR: number // Expected R (can be negative)
  sharpeRatio: number | null // Sharpe ratio (null if < 2 trades or zero std dev)
  maxDrawdownPct: number // 0–100 (percentage)
  disciplineScore: DisciplineBreakdown
}

/**
 * Single point on equity curve.
 * Used for charting cumulative P&L over time.
 */
export interface EquityPoint {
  date: string // ISO date string
  equity: number // Cumulative P&L at this point
  trades: number // Count of trades by this date
}

/**
 * Daily P&L aggregation.
 * Used for daily return series and heat map charts.
 */
export interface DailyPnl {
  date: string // ISO date string
  pnl: number // Total P&L for this day
  trades: number // Count of trades closed this day
  winRate: number // Win rate for this day (0–100)
}

/**
 * Symbol-level P&L breakdown.
 * Used for per-symbol performance analysis.
 */
export interface SymbolPnl {
  symbol: string
  trades: number
  winRate: number // 0–100
  netPnl: number
  avgR: number
  profitFactor: number
}

/**
 * Session-level statistics.
 * Grouped by trading session (London, New York, Asia).
 */
export interface SessionStats {
  session: string // "London" | "New York" | "Asia"
  trades: number
  winRate: number // 0–100
  netPnl: number
  avgR: number
  profitFactor: number
}

/**
 * Hourly P&L aggregation.
 * Used for time-of-day analysis heatmaps.
 */
export interface HourStats {
  hour: number // 0–23 UTC
  trades: number
  winRate: number // 0–100
  avgPnl: number
  avgR: number
}

/**
 * Setup-level performance metrics.
 */
export interface SetupStats {
  setupId: string
  setupLabel: string
  trades: number
  winRate: number // 0–100
  netPnl: number
  avgR: number
  profitFactor: number
  sharpeRatio: number | null
}

/**
 * Psychology statistics from trade emotions and confidence.
 */
export interface PsychologyStats {
  emotionDistribution: EmotionCount[]
  emotionWinRates: EmotionWinRate[]
  fomoTrades: number // Count of fomoFlag=true
  revengeTrades: number // Count of revengeFlag=true
  avgConfidenceByOutcome: ConfidenceOutcome
  confidenceCalibration: CalibrationPoint[]
  sessionMoodCorrelation: MoodCorrelation[]
}

export interface EmotionCount {
  emotion: string // "CALM", "CONFIDENT", "ANXIOUS", "FOMO", "REVENGE", "OVERCONFIDENT", "NEUTRAL"
  count: number
}

export interface EmotionWinRate {
  emotion: string
  trades: number
  winRate: number // 0–100
  avgR: number
}

export interface ConfidenceOutcome {
  avgConfidenceWins: number // 1–5
  avgConfidenceLosses: number // 1–5
}

export interface CalibrationPoint {
  confidenceLevel: number // 1–5
  tradesCount: number
  actualWinRate: number // 0–100
  expectedWinRate: number // confidenceLevel * 20%
}

export interface MoodCorrelation {
  mood: string // Pre-session mood from TradingSessionLog
  tradeCount: number
  avgPnl: number
  winRate: number // 0–100
}

/**
 * Rolling win rate metric.
 * Sliding window (e.g., 20-trade window) to detect performance trends.
 */
export interface RollingWinRate {
  tradeIndex: number // Position in trade history
  winRate: number // 0–100
  date: string // ISO date string
}

/**
 * Time-of-day heatmap data.
 * Used for charting P&L or win rate by session × hour.
 */
export interface TimeOfDayMatrix {
  sessions: string[] // ["London", "New York", "Asia"]
  hours: number[] // 0–23 UTC
  data: number[][] // [session][hour] = avg P&L or win rate
}

export type PsychCorrelation = "FOMO" | "REVENGE" | "OVERCONFIDENCE" | "FEAR" | "FATIGUE"

/**
 * Detected behavioral or performance pattern.
 */
export interface DetectedPattern {
  id: string
  label: string
  description: string
  severity: "info" | "warning" | "critical"
  tradeIds?: string[] // Trades that triggered this pattern
  psychCorr?: PsychCorrelation // Emotion state that co-occurs
}

/**
 * Full analytics aggregation output.
 * Serves as contract for routers and domain services.
 * All computations done server-side; client receives pre-aggregated data.
 */
export interface AnalyticsOutput {
  kpis: KpiSummary
  equityCurve: EquityPoint[]
  pnlByDate: DailyPnl[]
  pnlBySymbol: SymbolPnl[]
  sessionStats: SessionStats[]
  hourStats: HourStats[]
  setupStats: SetupStats[]
  psychologyStats?: PsychologyStats
  rollingWinRate: RollingWinRate[]
  timeOfDayMatrix: TimeOfDayMatrix
  patterns: DetectedPattern[]
  propFirmStatus?: PropFirmStatus
}

/**
 * Prop firm phase tracking.
 * Optional; included only if user has active prop firm account.
 */
export interface PropFirmStatus {
  phaseName: string
  objective: string
  objectiveMet: boolean
  progressPct: number // 0–100
  daysRemaining: number | null
}

/**
 * Input parameters for analytics engine.
 */
export interface AnalyticsInput {
  userId: string
  accountId?: string
  from?: Date
  to?: Date
  period?: "week" | "month" | "quarter" | "year" | "all"
}

/**
 * Cached analytics state.
 * Tracks when analytics were last computed for cache invalidation.
 */
export interface AnalyticsCache {
  userId: string
  period: string // "week", "month", etc.
  accountId?: string
  data: AnalyticsOutput
  computedAt: Date
}

/**
 * AI usage tracking for cost visibility and rate limiting.
 */
export interface AiUsageLog {
  id: string
  userId: string
  feature: "coach" | "summary" | "embedding"
  provider: "anthropic" | "openrouter" | "openai"
  model: string
  inputTokens: number
  outputTokens: number
  costUsdMicro: number // Integer millionths of $1
  createdAt: Date
}

/**
 * Trade for KPI computation.
 * Minimal shape to avoid tight coupling to Prisma Trade model.
 */
export interface TradeForKpi {
  id: string
  pnl: number | null
  rMultiple: number | null
  direction: "LONG" | "SHORT"
  entry: number
  stop: number
  closePrice: number
  emotionPre?: string
  emotionPost?: string
  setupConfidence?: number
  fomoFlag?: boolean
  revengeFlag?: boolean
  closedAt?: Date
}

/**
 * Complete formula input: array of trades.
 * Used by analytics service to compute all KPIs.
 */
export interface FormulasInput {
  trades: TradeForKpi[]
  initBal: number // Initial account balance (for drawdown %)
}
