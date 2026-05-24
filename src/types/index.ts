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
export type SetupStatus = "ACTIVO" | "PAUSADO"

export interface Trade {
  id: string
  direction: TradeDirection
  symbol: string
  accountId: string
  setupId: string
  entry: number
  stop: number
  target: number
  size: number
  date: string          // ISO date
  openTime: string      // HH:MM
  session: TradeSession
  tags: TradeTag[]
  notes?: string
  screenshotUrls?: string[]
  status?: string   // OPEN | CLOSED
  // computed
  rMultiple?: number
  pnl?: number
  createdAt: string
}

export interface Account {
  id: string
  name: string
  broker: string
  type: AccountType
  initialBalance: number
  currency: string
  timezone: string
  // Prop firm rules (only when type === PROP_FIRM)
  propFirmRules?: {
    maxDrawdownPct: number
    dailyLossPct: number
    maxTradesPerDay: number
    targetPct: number
    allowedSymbols: string[]
  }
  createdAt: string
}

export interface Setup {
  id: string
  name: string
  abbreviation: string
  market: string
  direction: SetupDirection
  status: SetupStatus
  description: string
  aplusChecklist: string[]
  standardChecklist: string[]
  createdAt: string
}

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
