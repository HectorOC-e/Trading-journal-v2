// ── Router-derived types (T-I-003) ──
import type { RouterOutputs } from "@/server/trpc/root"

export type SerializedTrade        = RouterOutputs["trades"]["list"]["items"][number]
export type SerializedAccount      = RouterOutputs["accounts"]["list"][number]
export type SerializedSetup        = RouterOutputs["setups"]["list"][number]
export type SerializedLearningResource = RouterOutputs["learningResources"]["list"][number]
export type DashboardStats         = RouterOutputs["trades"]["dashboardStats"]

// ── AccountLog typed payloads (T-I-004) ──
export type AccountLogPayload =
  | { event: "CREATED";            initialBalance: number; currency: string; name?: string; type?: string }
  | { event: "PHASE_CHANGE";       from: string; to: string; note?: string; objectiveMet?: boolean; manualOverride?: boolean; prevRules?: Record<string, number | null>; newRules?: Record<string, number | string | boolean | string[] | null> | null }
  | { event: "WITHDRAWAL";         amount: number; currency: string; status?: string; withdrawalId?: string; reference?: string }
  | { event: "WITHDRAWAL_STATUS";  withdrawalId: string; status: string; reference?: string }
  | { event: "STATUS_CHANGE";      from: string; to: string; note: string }
  | { event: "NOTE";               text: string }
  | { event: "BALANCE_CORRECTION"; variance: number; note: string }
  | { event: "LOCKED";             reason: string; limitPct?: number; currentPct?: number; auto: boolean }
  | { event: "UNLOCKED";           note: string }

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

// Shared violation tag list — must match tags used in RegisterTradeModal (T-V-001 risk mitigation)
export const VIOLATION_TAGS = ["Impulsivo", "Off-plan", "Revanche"] as const
export type ViolationTag = typeof VIOLATION_TAGS[number]
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

// TD-014: Derived from RouterOutputs with narrowed enum types for component safety.
export type LearningResource = Omit<SerializedLearningResource, "type" | "status"> & {
  type:   ResourceType
  status: ResourceStatus
}

export interface Rule {
  id: string
  name: string
  description: string
  severity: RulesSeverity
  isSystem: boolean     // true = AUTO badge, false = CUSTOM
  enabled: boolean
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
