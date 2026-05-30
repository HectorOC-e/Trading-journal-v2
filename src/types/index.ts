// ── Router-derived types (T-I-003) ──
import type { RouterOutputs } from "@/server/trpc/root"

export type SerializedTrade   = RouterOutputs["trades"]["list"]["items"][number]
export type SerializedAccount = RouterOutputs["accounts"]["list"][number]
export type SerializedSetup   = RouterOutputs["setups"]["list"][number]
export type DashboardStats    = RouterOutputs["trades"]["dashboardStats"]

// ── AccountLog typed payloads (T-I-004) ──
export type AccountLogPayload =
  | { event: "CREATED";            initialBalance: number; currency: string; name?: string; type?: string }
  | { event: "PHASE_CHANGE";       from: string; to: string; note?: string; objectiveMet?: boolean; manualOverride?: boolean; prevRules?: Record<string, unknown>; newRules?: Record<string, unknown> | null }
  | { event: "WITHDRAWAL";         amount: number; currency: string; status?: string; withdrawalId?: string; reference?: string }
  | { event: "WITHDRAWAL_STATUS";  withdrawalId: string; status: string; reference?: string }
  | { event: "STATUS_CHANGE";      from: string; to: string; note: string }
  | { event: "NOTE";               text: string }
  | { event: "BALANCE_CORRECTION"; variance: number; note: string }

// ── Derived from design-spec modal fields and anatomy sections ──

export type MarketCategory = "FUTUROS" | "FX" | "CRIPTO" | "EQUITIES"

export interface Market {
  symbol: string
  name: string
  category: MarketCategory
  exchange: string
  tickSize: string
  pointValue: string
  currency: string
  sessions: string[]
  description: string
  isWatchlisted: boolean
}

export type TradeDirection = "LONG" | "SHORT"
export type TradeSession = "London" | "New York" | "Asia" | "London Close"
export type TradeTag = "A+" | "A" | "B" | "Plan" | "Off-plan" | "Impulsivo" | "BE"
export type AccountType = "PERSONAL" | "PROP_FIRM" | "DEMO_PERSONAL" | "DEMO_PROP" | "BACKTEST" | "QA"
export type AccountStatus = "ACTIVE" | "PAUSED" | "INACTIVE" | "LOST"
export type RulesSeverity = "CRÍTICA" | "MENOR" | "INFORMACIÓN"
export type ResourceType = "LIBRO" | "VIDEO" | "NOTA" | "BACKTEST" | "PODCAST" | "DRILL" | "HERRAMIENTA"
export type SetupDirection = "LONG" | "SHORT" | "AMBAS"
export type SetupStatus = "ACTIVO" | "PAUSADO" | "EN_PRUEBA" | "DESCARTADO"

// Backwards-compat aliases — the RouterOutputs-derived types above are the source of truth
export type Trade   = SerializedTrade
export type Account = SerializedAccount
export type Setup   = SerializedSetup

export type ResourceStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "IN_REVIEW"
  | "MASTERED"
  | "ABANDONED"

export interface LearningResource {
  id: string
  title: string
  type: ResourceType
  author: string
  source: "Propio" | "Externa" | string
  date: string
  notes: string
  tags: string[]
  markedForReview: boolean
  progressPct?: number | null
  createdAt: string
  updatedAt: string
  // Fields added in TASK-L003
  status: ResourceStatus
  progressType?: string | null
  totalUnits?: number | null
  currentUnits?: number | null
  avgScore?: number | null
  nextReviewAt?: string | null
  reviewInterval?: number | null
  isFavorite: boolean
  rating?: number | null
  completedAt?: string | null
  // Fields added in TASK-L013
  linkedSetups?: { id: string; name: string }[]
  // Fields added in TASK-L019
  archiveReason?: string | null
  // Fields added in TASK-L020
  lastReviewAt?: string | null
}

export interface Rule {
  id: string
  name: string
  description: string
  severity: RulesSeverity
  isSystem: boolean     // true = AUTO badge, false = CUSTOM
  enabled: boolean
  violationsThisMonth: number
}

export interface WeeklyReview {
  id: string
  accountId: string
  weekLabel: string     // "Sem. 20"
  weekRange: string     // "14–20 may 2026"
  // Auto-generated summary
  tradeCount: number
  netPnl: number
  winRate: number
  disciplineScore: number
  // Written sections
  executiveSummary: string
  whatWorked: string
  toImprove: string
  status: "draft" | "submitted"
  createdAt: string
}

export interface KpiCard {
  label: string
  value: string | number
  sub?: string
  trend?: "up" | "down" | "neutral"
  mono?: boolean        // use JetBrains Mono for value
}
