# Target Architecture — Trading Journal v2
> Vision: 6-month target state. Last Updated: 2026-05-31

---

## 1. Executive Summary

### Most Impactful Shifts vs Today

- **Formula centralization eliminates silent data divergence.** Eight separate win-rate implementations, three discipline-score implementations, and two Sharpe implementations (with different std-dev methods) produce contradictory metrics on the same screen. The target replaces all of them with a single `src/lib/formulas/` module. This is the prerequisite for every analytics and AI improvement.

- **Profile backend unlocks seven blocked features.** `src/app/perfil/page.tsx` is entirely disconnected from the backend — 0 of 14 fields are persisted. Once `src/server/trpc/routers/users.ts` is implemented, timezone propagates to session classification, baseCurrency to P&L display, language to i18n, and five personalization features (UserPreferences, AI config, accent color, goals, custom tags) become buildable.

- **Per-user AI configuration replaces server-wide env vars.** The current architecture shares one API key across all users with no cost tracking, no model selection, and no per-user override. The target introduces `UserAiConfig` with AES-256-GCM key encryption, per-feature model registry, token cost tracking via `AiUsageLog`, and a connectivity test UI.

- **Psychology fields complete the behavioral tracking loop.** Trade-level psychology (emotionPre, emotionPost, setupConfidence, psychNotes) combined with the existing session-level `TradingSessionLog` enables correlation analytics between emotional state and trade outcomes — the highest-value missing feature across 124 tracked features.

- **Service layer extraction makes business logic testable and reusable.** Critical logic currently embedded in 924-line `trades.ts` and 680-line `learning-resources.ts` routers is extracted to `domains/` services. Routers become thin orchestration under 200 lines. This enables testing, edge-function reuse, and future cron-job scheduling.

### Design Principles

1. **Single source of truth** — every formula, every enum, every type has one canonical location. Duplication is a bug.
2. **Domain services own business logic** — routers validate input and authorize; services compute and persist; pure functions are stateless and unit-testable.
3. **Progressive disclosure** — complex features (AI config, psychology, import) expose a simple surface first and reveal depth on demand.
4. **Server-aggregated analytics** — no client-side KPI computation over unbounded data arrays. All aggregation happens in `domains/analytics/` before the response crosses the network.
5. **Graceful degradation** — every AI feature has a defined non-AI fallback. Every missing configuration shows a clear empty state, not a silent failure.
6. **Schema as contract** — every column that exists in the database must exist in `schema.prisma`. Off-schema tables (`notes_embedding`, `email_log`) are a deployment risk eliminated in Phase X.

### Key Constraints

- **Framework:** Next.js App Router (edge middleware, Node.js API routes and pages). No Pages Router.
- **API layer:** tRPC v11 with TanStack Query client. No REST endpoints for domain data.
- **ORM:** Prisma 7 with PrismaPg adapter. No Supabase client for data queries; Supabase client for Auth only.
- **Database:** Supabase PostgreSQL with pgvector extension. All tables have RLS enabled.
- **Auth:** Supabase Auth with JWT middleware. Service role key server-side only.
- **No mobile native app.** PWA + responsive web is the mobile strategy.
- **Single-tenant by default.** Multi-user organization management is an explicit non-goal.

---

## 2. System Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER                                        │
│                                                                         │
│  Page Component (~150 LOC)                                              │
│  ├── Domain hooks (useTradeAnalytics, usePsychologyStats)               │
│  ├── UI components (lazy-loaded modals, panels)                         │
│  └── tRPC client (TanStack Query, optimistic updates)                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / WebSocket
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER (Vercel)                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Middleware (edge runtime)                                  │        │
│  │  • JWT validation via Supabase SSR                          │        │
│  │  • userId injected as x-user-id header (TD-019 fix)         │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │  tRPC Router     │  │  Route Handlers  │  │  Server Components │    │
│  │  /api/trpc/*     │  │  /api/ai-coach   │  │  (layout, pages)   │    │
│  │                  │  │  /api/ai-embed   │  │                    │    │
│  │  Auth + Input    │  │  /api/import/*   │  │                    │    │
│  │  validation      │  │  /api/ai-test    │  │                    │    │
│  │  only            │  │  /api/upload/*   │  │                    │    │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────────────┘    │
│           │                     │                                       │
│  ┌────────▼─────────────────────▼───────────────────────────────┐       │
│  │                    DOMAIN SERVICES (src/domains/)             │       │
│  │                                                               │       │
│  │  trading/           analytics/          ai/                   │       │
│  │  ├─ account-service ├─ dashboard-svc    ├─ coach-service      │       │
│  │  ├─ trade-service   ├─ analytics-cache  ├─ embedding-service  │       │
│  │  ├─ psychology-svc  ├─ pattern-detector └─ summary-service    │       │
│  │  └─ prop-firm-guard └─ trading-sessions                       │       │
│  │                                                               │       │
│  │  reviews/           playbooks/          learning/             │       │
│  │  └─ review-service  └─ setup-service    ├─ streak-service     │       │
│  │                                         ├─ review-scheduler   │       │
│  │                                         └─ decay-detector     │       │
│  └────────────────────────────┬──────────────────────────────────┘       │
│                               │                                         │
│  ┌────────────────────────────▼──────────────────────────────────┐       │
│  │                    PURE FUNCTIONS (src/lib/)                   │       │
│  │                                                               │       │
│  │  formulas/          ai/                 theme/                │       │
│  │  ├─ index.ts        ├─ config.ts        ├─ tokens.ts          │       │
│  │  ├─ win-rate.ts     ├─ chat.ts          └─ css-vars.ts        │       │
│  │  ├─ drawdown.ts     ├─ embeddings.ts                          │       │
│  │  ├─ discipline.ts   ├─ models.ts (NEW)                        │       │
│  │  ├─ risk.ts         └─ key-encryption.ts (NEW)                │       │
│  │  └─ performance.ts                                            │       │
│  └────────────────────────────┬──────────────────────────────────┘       │
└──────────────────────────────┬┘────────────────────────────────────────-─┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        SUPABASE PLATFORM                                │
│                                                                         │
│  PostgreSQL                  Edge Functions            Storage          │
│  ├─ 18 Prisma models         ├─ weekly-learning-summary ├─ trade-scrnshts│
│  ├─ pgvector (embeddings)    └─ embed-worker (NEW)      └─ setup-images  │
│  ├─ RLS on all tables                                                   │
│  └─ pg_cron schedules                                                   │
│                                                                         │
│  Auth (JWT)                  Resend (email)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Descriptions

| Layer | Location | Responsibility |
|---|---|---|
| **Presentation** | `src/app/` | Page layout, tab wiring, route params. Target: ~150 LOC per page. No business logic, no inline analytics. |
| **Application** | `src/server/trpc/routers/` | Auth check, input parsing (Zod), orchestration. Calls domain services. Target: <200 LOC per router. |
| **Domain** | `src/domains/` | Business logic, aggregation, behavioral rules. Independently testable. No HTTP concerns. |
| **Infrastructure** | `src/lib/` | Pure functions, AI provider abstraction, Prisma singleton, Supabase clients. No domain knowledge. |

### Cross-Cutting Concerns

| Concern | Current State | Target State |
|---|---|---|
| **Auth** | `supabase.auth.getUser()` on every tRPC request (TD-019) | JWT decoded in middleware; `userId` from `x-user-id` header in tRPC context |
| **Logging** | `console.error` scattered | Structured logger (`src/lib/logger.ts`) with `{ userId, procedure, durationMs, error }` shape |
| **Error handling** | Mix of `throw new Error()` and `TRPCError` | All domain errors as `TRPCError` with typed codes; error boundaries on every page |
| **Caching** | `TradeStatsCache` feature-flagged off | Enabled in production; extended to analytics sub-queries |
| **Rate limiting** | None | `src/lib/ai/rate-limit.ts` on all AI endpoints via `AiUsageLog` time-window queries |

---

## 3. Module Architecture

### 3.1 Formula Engine (`lib/formulas/`)

**Target:** Single canonical implementation for every financial formula. Zero duplication across 8 win-rate sites, 3 discipline-score sites, and 2 Sharpe sites.

#### File Structure

```
src/lib/formulas/
  index.ts          ← barrel: re-exports everything; all callers import from here
  win-rate.ts       ← isWin, calcWinRate
  drawdown.ts       ← computeMaxDrawdown, calcDrawdownPct (moved from account-service.ts)
  discipline.ts     ← calcDisciplineScore, DisciplineParams, DisciplineBreakdown
  risk.ts           ← calcRMultiple, calcAvgR, calcExpectancyR
  performance.ts    ← calcSharpeRatio, calcProfitFactor, calcNetPnl
```

The existing `src/lib/formulas.ts` becomes a redirect shim until all callers are updated, then is deleted.

#### Formula Contracts

```typescript
// src/lib/formulas/win-rate.ts

export function isWin(trade: { pnl: number | null }): boolean {
  return (trade.pnl ?? 0) > 0
}

export function calcWinRate(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}
```

```typescript
// src/lib/formulas/drawdown.ts

export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0, peak = 0, maxDd = 0
  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

export function calcDrawdownPct(maxDdDollar: number, initBal: number): number {
  return initBal > 0 ? (maxDdDollar / initBal) * 100 : 0
}
```

```typescript
// src/lib/formulas/discipline.ts

export interface DisciplineParams {
  totalTrades:       number
  taggedViolations:  number   // trades with behavioral tags (FOMO, Off-plan, Impulsivo, etc.)
  pendingReviews:    number   // learning resources due for SRS review
  completedReviews:  number
  totalEnabledRules: number
  violatedRules:     number
}

export interface DisciplineBreakdown {
  score:          number   // 0–100 (rounded integer)
  executionScore: number   // 0–50
  learningScore:  number   // 0–30
  adherenceScore: number   // 0–20
}

export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown {
  const { totalTrades, taggedViolations, pendingReviews,
          completedReviews, totalEnabledRules, violatedRules } = params
  const executionScore = totalTrades > 0
    ? ((totalTrades - taggedViolations) / totalTrades) * 50 : 50
  const learningScore  = pendingReviews > 0
    ? (completedReviews / pendingReviews) * 30 : 30
  const adherenceScore = totalEnabledRules > 0
    ? ((totalEnabledRules - violatedRules) / totalEnabledRules) * 20 : 20
  return {
    score:          Math.round(executionScore + learningScore + adherenceScore),
    executionScore, learningScore, adherenceScore,
  }
}
```

```typescript
// src/lib/formulas/risk.ts

export function calcRMultiple(
  direction:  "LONG" | "SHORT",
  entry:      number,
  stop:       number,
  closePrice: number,
): number | null {
  const riskDistance = Math.abs(entry - stop)
  if (riskDistance === 0) return null
  return direction === "LONG"
    ? (closePrice - entry) / riskDistance
    : (entry - closePrice) / riskDistance
}

export function calcAvgR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter(t => t.rMultiple != null)
  if (withR.length === 0) return 0
  return withR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / withR.length
}

export function calcExpectancyR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter(t => t.rMultiple != null)
  if (withR.length === 0) return 0
  const wins   = withR.filter(t => (t.rMultiple ?? 0) > 0)
  const losses = withR.filter(t => (t.rMultiple ?? 0) <= 0)
  const wr     = wins.length / withR.length
  const avgWinR  = wins.length   > 0 ? wins.reduce((s, t)   => s + (t.rMultiple ?? 0), 0) / wins.length   : 0
  const avgLossR = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / losses.length) : 1
  return wr * avgWinR - (1 - wr) * avgLossR
}
```

```typescript
// src/lib/formulas/performance.ts

export function calcSharpeRatio(rMultiples: number[]): number | null {
  if (rMultiples.length < 2) return null
  const mean = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
  // Bessel-corrected sample std dev (n-1 denominator)
  const variance = rMultiples.reduce((a, b) => a + (b - mean) ** 2, 0) / (rMultiples.length - 1)
  const std = Math.sqrt(variance)
  return std > 0 ? mean / std : null
}

export function calcProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0 && grossWin > 0) return 999
  if (grossWin === 0) return 0
  return grossWin / Math.abs(grossLoss)
}
```

#### Duplication Removal Map

| Formula | Sites to Update | File:Line |
|---|---|---|
| Win Rate | 9 sites | `dashboard-analytics.ts:101`, `trades.ts:736`, `weekly-reviews.ts:205`, `weekly-reviews.ts:271`, `create-review-modal.tsx:99`, `trading-sessions.ts:94`, `learning-resources.ts:447`, `use-account-stats.ts:39`, `trades/page.tsx:125` |
| Discipline Score | 3 sites | `weekly-reviews.ts` (computedDisciplineScore), `weekly-reviews.ts` (prefill duplicate), `create-review-modal.tsx:103` |
| Sharpe Ratio | 2 sites | `formulas.ts:42` (keep, rename to performance.ts), `ai-context.ts:185` (replace inline) |
| drawdown | 3 sites | `account-service.ts:1` (move to drawdown.ts), `use-account-stats.ts:50` (replace with computeMaxDrawdown) |
| rMultiple | 2 sites | `trade-service.ts` (use calcRMultiple), `import/mt4/route.ts` (add calcRMultiple call — TD-007) |

#### Unit Test Coverage Requirement: 100%

Every exported function in `src/lib/formulas/` must have a corresponding test in `src/__tests__/lib/formulas/`:

| Test File | Formula | Key Scenarios |
|---|---|---|
| `win-rate.test.ts` | `isWin`, `calcWinRate` | pnl > 0 wins; pnl = 0 loses; rMultiple > 0 but pnl < 0; empty set → 0 |
| `drawdown.test.ts` | `computeMaxDrawdown`, `calcDrawdownPct` | No trades; monotonic gain; monotonic loss; recovery to new ATH; multiple drawdowns |
| `discipline.test.ts` | `calcDisciplineScore` | Perfect score (50+30+20); zero trades; all violations; mixed; rounding |
| `risk.test.ts` | `calcRMultiple`, `calcAvgR`, `calcExpectancyR` | LONG profit; SHORT profit; zero stop distance → null; no R data → 0 |
| `performance.test.ts` | `calcSharpeRatio`, `calcProfitFactor` | n < 2 → null; all same → null; positive mean; no losses → 999 |

---

### 3.2 Analytics Engine (`domains/analytics/`)

**Target:** Streaming, cached, account-scoped analytics pipeline. All KPIs computed server-side regardless of trade history size. New rolling metrics and expanded pattern detection.

#### Service Interface

```typescript
// src/domains/analytics/services/analytics-service.ts (NEW — unified entry point)

export interface AnalyticsInput {
  userId:    string
  accountId?: string
  from?:     Date
  to?:       Date
  period?:   "week" | "month" | "quarter" | "year" | "all"
}

export interface AnalyticsOutput {
  kpis:            KpiSummary
  equityCurve:     EquityPoint[]
  pnlByDate:       DailyPnl[]
  pnlBySymbol:     SymbolPnl[]
  sessionStats:    SessionStats[]
  hourStats:       HourStats[]
  setupStats:      SetupStats[]
  psychologyStats: PsychologyStats    // NEW — Phase XII
  rollingWinRate:  RollingWinRate[]   // NEW — 20-trade rolling window
  timeOfDayMatrix: TimeOfDayMatrix    // NEW — heat map data
  patterns:        DetectedPattern[]
  propFirmStatus?: PropFirmStatus
}

export interface KpiSummary {
  totalTrades:    number
  winRate:        number
  netPnl:         number
  avgR:           number
  profitFactor:   number
  expectancyR:    number
  sharpeRatio:    number | null
  maxDrawdownPct: number
  disciplineScore: DisciplineBreakdown
}
```

#### Cache Strategy

The existing `TradeStatsCache` table (keyed by `(userId, period)`) is extended:

```typescript
// src/domains/analytics/services/analytics-cache.ts

// Cache key includes accountId to support per-account filtering
type CacheKey = { userId: string; period: string; accountId?: string }

// TTL: 5 minutes enforced at application layer (computedAt + 5min > now)
// Enable in production: ANALYTICS_CACHE_ENABLED=true
// Cache invalidation: upsert on every trades.create / trades.close mutation
```

#### Pattern Detector Expansion

Current 5 patterns → target 8 patterns (in `src/domains/analytics/services/pattern-detector.ts`):

| Pattern | Current | Detection Rule |
|---|---|---|
| Time-of-day degradation | Yes | Win rate before 8AM < overall WR - 15pp |
| Day-of-week oversizing | Yes | Avg size on day X > overall avg size × 1.3 |
| Revenge trading sequence | Yes | Loss followed by >avg-size trade within 30 min |
| Win streak complacency | Yes | Win rate drops after streak ≥ 3 |
| Drawdown recovery FOMO | Yes | Oversizing detected after drawdown > 2% |
| **Emotion-outcome correlation** | NEW | ANXIOUS/REVENGE emotion → WR < 40% |
| **Session fatigue** | NEW | P&L degrades hour-over-hour within same session |
| **Setup abandonment** | NEW | Setup used < 3 times then dropped; signals poor fit |

New correlation added to pattern output:
```typescript
export interface DetectedPattern {
  id:          string
  label:       string
  description: string
  severity:    "info" | "warning" | "critical"
  tradeIds?:   string[]          // trades that triggered this pattern
  psychCorr?:  PsychCorrelation  // NEW — emotion state that co-occurs
}
```

#### New Metrics

```typescript
// Rolling win rate (20-trade window)
export interface RollingWinRate {
  tradeIndex: number
  winRate:    number
  date:       string
}

// Time-of-day P&L matrix (for heat map chart)
export interface TimeOfDayMatrix {
  sessions: string[]         // ["London", "New York", "Asia"]
  hours:    number[]         // 0–23 UTC
  data:     number[][]       // [session][hour] = avg P&L or win rate
}
```

#### tRPC API

```typescript
// src/server/trpc/routers/analytics.ts (NEW ROUTER)

analytics: router({
  dashboardStats: protectedProcedure
    .input(z.object({
      period:    z.enum(["week", "month", "quarter", "year", "all"]).default("all"),
      accountId: z.string().uuid().optional(),
      from:      z.string().datetime().optional(),
      to:        z.string().datetime().optional(),
    }))
    .query(...)
    // Replaces trades.dashboardStats (which remains for backward compat during migration)

  rollingMetrics: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional(), window: z.number().default(20) }))
    .query(...)

  psychologyCorrelations: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .query(...)

  patterns: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .query(...)
})
```

---

### 3.3 AI System (`lib/ai/` + `domains/ai/`)

**Target:** Per-user configurable multi-provider AI with encrypted key storage, per-feature model routing, cost tracking, and reliable embedding pipeline.

#### Model Registry (`src/lib/ai/models.ts` — NEW)

```typescript
export interface AiModel {
  id:              string
  label:           string
  provider:        "anthropic" | "openrouter" | "openai"
  tier:            "premium" | "standard" | "fast"
  costPer1kTokens: number
  features:        ("chat" | "embedding" | "summary")[]
  contextWindow:   number
}

export const AI_MODELS: AiModel[] = [
  {
    id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Recomendado)",
    provider: "anthropic", tier: "standard", costPer1kTokens: 0.003,
    features: ["chat", "summary"], contextWindow: 200_000,
  },
  {
    id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (Rápido)",
    provider: "anthropic", tier: "fast", costPer1kTokens: 0.00025,
    features: ["chat", "summary"], contextWindow: 200_000,
  },
  {
    id: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5 (Máxima calidad)",
    provider: "openrouter", tier: "premium", costPer1kTokens: 0.015,
    features: ["chat", "summary"], contextWindow: 200_000,
  },
  {
    id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)",
    provider: "openrouter", tier: "standard", costPer1kTokens: 0.005,
    features: ["chat", "summary"], contextWindow: 128_000,
  },
  {
    id: "openai/text-embedding-3-small", label: "text-embedding-3-small",
    provider: "openrouter", tier: "fast", costPer1kTokens: 0.00002,
    features: ["embedding"], contextWindow: 8_191,
  },
]

export const COACH_MODELS    = AI_MODELS.filter(m => m.features.includes("chat"))
export const SUMMARY_MODELS  = AI_MODELS.filter(m => m.features.includes("summary"))
export const EMBEDDING_MODELS = AI_MODELS.filter(m => m.features.includes("embedding"))

// Feature router — resolves effective model for a feature given user config
export function resolveModel(
  feature: "coach" | "embedding" | "summary",
  userConfig: Pick<UserAiConfig, "coachModel" | "embeddingModel" | "summaryModel"> | null,
): string {
  if (feature === "coach"     && userConfig?.coachModel)     return userConfig.coachModel
  if (feature === "embedding" && userConfig?.embeddingModel) return userConfig.embeddingModel
  if (feature === "summary"   && userConfig?.summaryModel)   return userConfig.summaryModel
  // System defaults
  if (feature === "coach")     return process.env.AI_COACH_MODEL     ?? "claude-sonnet-4-6"
  if (feature === "embedding") return process.env.EMBEDDING_MODEL    ?? "openai/text-embedding-3-small"
  return                               process.env.WEEKLY_SUMMARY_MODEL ?? "claude-haiku-4-5"
}
```

#### Key Encryption (`src/lib/ai/key-encryption.ts` — NEW)

```typescript
// AES-256-GCM encryption for stored API keys.
// AI_KEY_ENCRYPTION_KEY must be a 32-byte hex string in environment.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_HEX   = process.env.AI_KEY_ENCRYPTION_KEY ?? ""

export function encryptApiKey(plaintext: string): string {
  const key = Buffer.from(KEY_HEX, "hex")
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":")
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":")
  const key = Buffer.from(KEY_HEX, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8")
}

// Keys must NEVER appear in logs or error messages.
// Rotate AI_KEY_ENCRYPTION_KEY by re-encrypting all UserAiConfig rows.
```

#### Updated Provider Resolution (`src/lib/ai/config.ts` additions)

```typescript
// New function: resolves key for a specific user, with env-var fallback
export async function getProviderKeyForUser(
  provider: AiProvider,
  userId:   string,
  prisma:   PrismaClient,
): Promise<string> {
  const userConfig = await prisma.userAiConfig.findUnique({
    where:  { userId },
    select: { anthropicKeyEnc: true, openrouterKeyEnc: true, openaiKeyEnc: true },
  })
  const encKey = { anthropic: userConfig?.anthropicKeyEnc,
                   openrouter: userConfig?.openrouterKeyEnc,
                   openai:    userConfig?.openaiKeyEnc }[provider]
  if (encKey) return decryptApiKey(encKey)
  return getProviderKey(provider)
}
```

#### Domain Services (NEW)

```typescript
// src/domains/ai/services/coach-service.ts
// Extracted from src/app/api/ai-coach/route.ts
// Handles: context building, streaming, abort, token tracking

export class CoachService {
  async streamResponse(opts: {
    userId:     string
    messages:   ChatMessage[]
    userConfig: UserAiConfig | null
    signal?:    AbortSignal
  }): Promise<ReadableStream<Uint8Array>>

  async buildContext(userId: string, prisma: PrismaClient): Promise<TraderContext>
  // Caches context for 5 minutes per userId (in-memory Map or TradeStatsCache extension)
}
```

```typescript
// src/domains/ai/services/embedding-service.ts
// Target: DB-webhook-triggered reliable embedding (replaces fire-and-forget)

export class EmbeddingService {
  async embedTrade(tradeId: string, notes: string, userId: string): Promise<void>
  async reembedAll(userId: string): Promise<{ processed: number; errors: number }>
  async semanticSearch(userId: string, query: string, limit?: number): Promise<TradeSearchResult[]>
}
```

```typescript
// src/domains/ai/services/summary-service.ts
// Extracted from src/server/trpc/routers/weekly-reviews.ts:generateSummary

export class SummaryService {
  async generateWeeklyReviewSummary(opts: {
    review:     WeeklyReviewData
    trades:     TradeSummary[]
    userConfig: UserAiConfig | null
  }): Promise<string>  // throws TRPCError on failure — not HTTP 200
}
```

#### New tRPC Endpoints

```typescript
// src/server/trpc/routers/ai-config.ts (NEW)

aiConfig: router({
  get:            protectedProcedure.query(...)        // masked keys (last 4 chars only)
  update:         protectedProcedure.input(z.object({
                    preferredProvider:   z.enum(["system","anthropic","openrouter","openai"]).optional(),
                    anthropicKey:        z.string().max(200).optional(),
                    openrouterKey:       z.string().max(200).optional(),
                    openaiKey:           z.string().max(200).optional(),
                    coachModel:          z.string().optional(),
                    summaryModel:        z.string().optional(),
                    embeddingModel:      z.string().optional(),
                    aiCoachEnabled:      z.boolean().optional(),
                    embeddingsEnabled:   z.boolean().optional(),
                  })).mutation(...)
  testConnection: protectedProcedure.query(...)
  // Sends 5-token probe; returns { status, provider, model, latencyMs }
  getUsage:       protectedProcedure
                    .input(z.object({ period: z.enum(["month", "all"]).default("month") }))
                    .query(...)
  models:         protectedProcedure.query(...)        // returns AI_MODELS catalog
})
```

New route handler: `src/app/api/ai-test/route.ts` — connectivity test (see `ai-architecture.md` §6 for full implementation).

#### Embedding Pipeline Improvement (TD-020)

Current fire-and-forget `scheduleEmbedding()` in `trades.ts` replaced by:

1. **Supabase DB webhook** on `trades` table UPDATE (notes changed) → triggers `supabase/functions/embed-worker/`
2. Edge function calls `/api/ai-embed` (or calls embedding API directly)
3. Updates `notes_embedding` column via `$executeRaw`
4. Adds `TradeEmbedding` model to `schema.prisma` (resolving TD-010)

---

### 3.4 Profile & Settings (`app/perfil/` + `server/trpc/routers/users.ts`)

**Target:** Fully functional profile page where all 14 existing User fields are read/written, and all saved settings propagate app-wide.

#### Current Gap (TD-003)
`src/app/perfil/page.tsx` uses `useState` with hardcoded defaults. Zero tRPC calls. Profile-to-app propagation: 0/14.

#### New tRPC Router (`src/server/trpc/routers/users.ts`)

```typescript
users: router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } })
    // Returns: id, email, name, timezone, baseCurrency, language,
    //          weeklyGoalMinutes, emailNotifications, currentStreak, bestStreak
  }),

  updateProfile: protectedProcedure.input(z.object({
    name:                z.string().min(1).max(100).optional(),
    timezone:            z.string().optional(),      // IANA timezone string
    baseCurrency:        z.string().length(3).optional(),
    language:            z.enum(["es", "en"]).optional(),
    weeklyGoalMinutes:   z.number().int().min(0).max(10080).optional(),
    weeklyTradesGoal:    z.number().int().min(0).optional(),
    weeklyPnlGoal:       z.number().optional(),
    disciplineGoal:      z.number().int().min(0).max(100).optional(),
    emailNotifications:  z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
  })).mutation(...),

  updateAiConfig: protectedProcedure
    .input(/* same as aiConfig.update above */)
    .mutation(...),

  updatePreferences: protectedProcedure
    .input(z.object({
      theme:       z.enum(["light", "dark", "system"]).optional(),
      accentHue:   z.number().int().min(0).max(360).nullable().optional(),
      colorScheme: z.enum(["default", "deuteranopia", "protanopia", "mono"]).optional(),
      defaultTab:  z.string().optional(),
      kpiOrder:    z.string().array().optional(),
      kpiHidden:   z.string().array().optional(),
      defaultGrain: z.string().optional(),
      tableDensity: z.enum(["compact", "comfortable"]).optional(),
      dateFormat:   z.string().optional(),
      numberLocale: z.string().optional(),
    })).mutation(...),

  changePassword: protectedProcedure.input(z.object({
    currentPassword: z.string().min(6),
    newPassword:     z.string().min(8),
  })).mutation(...),

  exportData: protectedProcedure.query(...)
  // Returns JSON blob of all user data (GDPR-equivalent)

  deleteAccount: protectedProcedure.input(z.object({
    confirmation: z.literal("DELETE MY ACCOUNT"),
  })).mutation(...)
  // Deletes all user data in cascade; signs out
})
```

#### Setting Propagation

| Setting | Propagates To | Mechanism |
|---|---|---|
| `timezone` | Session classification in `trade-service.ts`, all date displays | Server-side read from User model; passed to `classifySession()` |
| `baseCurrency` | P&L number formatting throughout app | Context provider `CurrencyProvider` reads from `users.getProfile` |
| `language` | UI strings | `next-intl` or `i18next` language key set from User.language in layout |
| `accentHue` | CSS `--accent-hue` variable | Server component in `layout.tsx` renders `<style>` tag |
| `theme` | Dark/Light/System class on `<html>` | `UserPreferences.theme` read server-side in layout |
| `emailNotifications` | Edge function email sending | Read in `weekly-learning-summary` edge function |

#### Settings Page Sections

```
/perfil — Settings page sections:
  ├── General (name, timezone, language, baseCurrency, goals)
  ├── Apariencia (theme, accent color, colorblind mode, table density)
  ├── Dashboard (defaultTab, kpiOrder, kpiHidden, defaultGrain)
  ├── Inteligencia Artificial (keys, models, feature toggles, usage)
  ├── Notificaciones (email toggles per notification type, timing)
  └── Datos (export data, delete account)
```

---

### 3.5 Psychology System (New Module)

**Target:** Full psychological tracking integrated into trades and analytics. Correlation between emotional state and trade outcomes surfaced in dashboard and weekly reviews.

#### Trade Model Additions (see Section 4 for full Prisma syntax)

```
emotionPre        — CALM | CONFIDENT | ANXIOUS | FOMO | REVENGE | OVERCONFIDENT | NEUTRAL
emotionPost       — same enum
setupConfidence   — 1–5 integer
psychNotes        — free text
fomoFlag          — Boolean (structured, replaces free-form tag)
revengeFlag       — Boolean (structured, replaces free-form tag)
executionQuality  — 1–5 integer
```

These appear as a collapsible "Psicología (opcional)" section in `register-trade-modal.tsx` and `edit-trade-modal.tsx`.

#### Psychology Service

```typescript
// src/domains/analytics/services/psychology-service.ts (NEW)

export interface PsychologyStats {
  emotionDistribution: EmotionCount[]       // count per emotion
  emotionWinRates:     EmotionWinRate[]     // win rate per emotionPre value
  fomoTrades:          number               // count of fomoFlag=true
  revengeTrades:       number               // count of revengeFlag=true
  avgConfidenceByOutcome: ConfidenceOutcome // avg setupConfidence for wins vs losses
  confidenceCalibration: CalibrationPoint[] // expected vs actual WR by confidence level
  sessionMoodCorrelation: MoodCorrelation[] // links TradingSessionLog.preMood to trade outcomes
}

export interface EmotionWinRate {
  emotion: string
  trades:  number
  winRate: number
  avgR:    number
}

export interface CalibrationPoint {
  confidenceLevel: number   // 1–5
  tradesCount:     number
  actualWinRate:   number
  expectedWinRate: number   // confidence * 20%
}
```

#### Dashboard Widgets

New widgets in `tab-disciplina.tsx`:
1. **Emotion heatmap** — calendar view colored by emotionPre value
2. **FOMO cost tracker** — total P&L of fomoFlag=true trades (usually negative)
3. **Confidence calibration chart** — scatter: confidence level vs actual win rate
4. **Mood-outcome scatter** — preMood (TradingSessionLog) vs session P&L

#### tRPC Router

```typescript
// src/server/trpc/routers/psychology.ts (NEW)

psychology: router({
  summary: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      from:      z.string().datetime().optional(),
      to:        z.string().datetime().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return psychologyService.computeStats(ctx.userId, input)
    }),

  correlations: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .query(...),

  trends: protectedProcedure
    .input(z.object({ weeks: z.number().int().min(4).max(52).default(12) }))
    .query(...),
    // Returns emotion distribution and win rates week-over-week
})
```

#### Weekly Review Integration

`weeklyReviews.prefill` extended to include psychology summary for the week:
- Count of FOMO and revenge trades
- Dominant emotion (mode of emotionPre)
- Confidence calibration score
- Recommended reflection prompts based on patterns

---

### 3.6 Reviews System (`app/reviews/`)

**Target:** Full CRUD for weekly reviews with auto-save drafts, AI streaming preview, monthly aggregates, and review templates.

#### Current Gaps

- `weeklyReviews.update` exists in `src/server/trpc/routers/weekly-reviews.ts` but is never called from the frontend (TASK-031)
- No "Continue editing" for drafts
- AI summary error returns HTTP 200 (TD-028)
- No filtering on the reviews list (TASK-048)

#### Review Status State Machine

```
draft ──► in-progress ──► submitted
  └────────────────────────►
     (auto-save promotes to in-progress)
```

New status `in-progress` added to `WeeklyReview.status` enum (migration `012_review_status.sql`).

#### Edit Flow

`ReviewDetailPanel` receives an Edit button → opens `NuevaReviewModal` in edit mode:

```typescript
// src/components/modals/review-modal.tsx

interface ReviewModalProps {
  mode:     "create" | "edit"
  review?:  WeeklyReview   // required when mode="edit"
  onClose:  () => void
}

// Auto-save: debounced 30s using useDebouncedCallback
// Calls weeklyReviews.update (mutation) on every field change
// Shows "Guardado hace X minutos" timestamp
```

#### AI Summary Streaming

Replace mutation-result approach with streaming preview:

```typescript
// In review modal — AI summary section
// streams tokens as user waits; no full-page reload

const { data: stream } = useStream("/api/ai/weekly-review-summary", {
  body: { reviewId, tradeIds },
  enabled: !!reviewId,
})
```

#### Monthly Review

New procedure `weeklyReviews.createMonthly`:
- Aggregates 4 weekly reviews for a calendar month
- Computes: total trades, net P&L, avg discipline score, dominant patterns, most-used setup
- AI summary: 1-paragraph monthly narrative
- Schema: `MonthlyReview` model (see Section 4)

#### Review Templates

```typescript
// Template selection added to review creation step 1
type ReviewTemplate = "performance" | "discipline" | "psychology" | "blank"

// Each template pre-populates different prefill focus:
// performance:  emphasizes P&L, R-multiples, setup stats
// discipline:   emphasizes rule violations, FOMO/revenge counts, learning
// psychology:   emphasizes emotion distribution, confidence calibration
// blank:        standard free-form (current behavior)
```

#### tRPC (target state)

```typescript
weeklyReviews: router({
  list:           // exists — add filtering (from, to, status, accountId, disciplineRange)
  get:            // exists
  create:         // exists
  update:         // exists — wire to frontend (TASK-031)
  delete:         // exists — add UI button
  prefill:        // exists — extend with psychology summary
  generateSummary: // exists — fix: throw TRPCError instead of returning {error} (TD-028)
  createMonthly:  // NEW
  listMonthly:    // NEW
})
```

---

### 3.7 Playbooks / Setups (`app/playbook/`)

**Target:** Living strategy documentation with performance tracking, setup health scoring, pre-trade checklists, and import/export.

#### Setup Comparison View

```typescript
// src/server/trpc/routers/setups.ts — new procedure

setups.compare: protectedProcedure
  .input(z.object({ setupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Returns: SetupVersion[] sorted by version ASC
    // Each version: snapshot fields + computed metrics for trades in that version's time range
    // Client renders a side-by-side table: v1 WR vs v2 WR vs v3 WR, etc.
  })
```

#### Setup Health Score

```typescript
// src/domains/playbooks/services/setup-service.ts (NEW)

export interface SetupHealth {
  setupId:          string
  healthScore:      number   // 0–100
  expectedWr:       number
  actualWr:         number
  wrDeviation:      number   // actualWr - expectedWr
  expectedAvgR:     number
  actualAvgR:       number
  rDeviation:       number
  tradeCount:       number
  minSampleReached: boolean  // need ≥ 10 trades for valid health score
  verdict:          "on_track" | "underperforming" | "outperforming" | "insufficient_data"
}

export function computeSetupHealth(setup: SetupWithEdge, trades: Trade[]): SetupHealth
```

```typescript
// tRPC
setups.healthScore: protectedProcedure
  .input(z.object({ setupId: z.string().uuid() }))
  .query(...)

setups.compare: protectedProcedure
  .input(z.object({ setupId: z.string().uuid() }))
  .query(...)

setups.exportJson: protectedProcedure
  .input(z.object({ setupId: z.string().uuid() }))
  .query(...)
  // Returns JSON-serializable Setup with versions, checklist items, edge definition

setups.importJson: protectedProcedure
  .input(z.object({ json: z.string() }))
  .mutation(...)
  // Validates JSON shape, creates Setup + SetupVersion records
```

#### Pre-Trade Checklist (New Model)

Currently `TradeChecklistResult` stores which checklist items from the setup were checked. The target adds `SetupChecklist` for user-defined per-setup checklists separate from `aplusChecklist[]` / `standardChecklist[]` string arrays:

```prisma
model SetupChecklist {
  id        String   @id @default(uuid()) @db.Uuid
  setupId   String   @map("setup_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  label     String
  type      String   @default("standard")  // "aplus" | "standard"
  required  Boolean  @default(true)
  order     Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")

  setup Setup @relation(fields: [setupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([setupId])
  @@map("setup_checklists")
}
```

This replaces the current `aplusChecklist String[]` and `standardChecklist String[]` fields with a proper relational model that supports ordering, required flags, and independent management without versioning the entire setup.

**Migration strategy:** On Phase XIV, populate `SetupChecklist` rows from existing `aplusChecklist[]` and `standardChecklist[]` arrays, then deprecate the array columns.

---

### 3.8 Personalization System

**Target:** Comprehensive theming and layout customization persisted per-user in DB, applied server-side to prevent flash of wrong theme.

#### CSS Variable Architecture

The existing `src/app/globals.css` token set is extended:

```css
/* src/app/globals.css — additions for user customization */
:root {
  --accent-hue:    264;      /* OKLCH hue 0–360; overridable per user */
  --accent-chroma: 0.16;
  --accent-l:      58%;
  --accent: oklch(var(--accent-l) var(--accent-chroma) var(--accent-hue));

  --win-hue:  152;            /* green — overridden in colorblind mode */
  --loss-hue:  27;            /* red — overridden in colorblind mode */
}

.colorblind-deu  { --win-hue: 228; --loss-hue: 45; }
.colorblind-mono { --win-hue: 200; --loss-hue: 0; }
```

Application in `src/app/layout.tsx` (server component):

```typescript
const prefs = await getUserPreferences(userId)  // server-side read
const accentStyle = prefs?.accentHue != null
  ? `--accent-hue: ${prefs.accentHue}` : undefined
const colorSchemeClass = prefs?.colorScheme !== "default"
  ? `colorblind-${prefs.colorScheme}` : undefined
```

#### Theme Token File (`src/lib/theme/tokens.ts` — NEW)

```typescript
export const DEFAULT_PREFERENCES = {
  theme:       "system",
  accentHue:   264,
  colorScheme: "default",
  defaultTab:  "portfolio",
  kpiOrder:    [],
  kpiHidden:   [],
  defaultGrain: "daily",
  tableDensity: "comfortable",
  dateFormat:   "DD/MM/YYYY",
  numberLocale: "es-HN",
} satisfies UserPreferences
```

#### Dashboard Layout Customization

KPI ordering and visibility stored in `UserPreferences.kpiOrder` and `UserPreferences.kpiHidden`:

```typescript
// src/app/dashboard/components/kpi-strip.tsx

const orderedKpis = useKpiOrder(allKpis, preferences.kpiOrder, preferences.kpiHidden)
// allKpis: ["winRate", "netPnl", "avgR", "profitFactor", "sharpe", "maxDD", "discipline"]
// kpiOrder: user-defined order (drag-and-drop via @dnd-kit/sortable)
// kpiHidden: KPI IDs to exclude from display
```

---

### 3.9 Mobile & Responsive

**Target:** Full-functionality on all screen sizes. PWA install-to-homescreen. Mobile-optimized trade entry.

#### PWA Setup

```
src/app/
  manifest.ts   (Next.js manifest route — generates /manifest.webmanifest)
  sw.ts         (service worker — Workbox via next-pwa or custom)
```

```typescript
// src/app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trading Journal",
    short_name: "TJ",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "oklch(58% 0.16 264)",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
```

#### Mobile Trade Entry Quick-Sheet

New component `src/components/mobile/quick-add-sheet.tsx`:
- Bottom sheet triggered from FAB (floating action button) on mobile
- 3-tap flow: symbol → direction → P&L
- Expands to full form on "Más detalles"
- `inputmode="decimal"` on all numeric inputs (TASK-041)

#### Touch Gesture Improvements

- Swipe-left on detail panels (TradeDetailPanel, ReviewDetailPanel) to dismiss (replaces close button on mobile)
- Pull-to-refresh on trade list and account cards
- Recharts `<Tooltip trigger="click">` for chart tooltips on touch devices
- Chart pinch-zoom via `recharts-zoom` or custom touch handler

#### Breakpoint Strategy

```
< 375px: xs — single column, FAB quick-add, no side panels
375–767px: sm — standard mobile
768–1023px: md — tablet — side panel as drawer
≥ 1024px: lg — desktop — side panel as rail
```

---

### 3.10 Import System

**Target:** Multi-broker import with dedup, preview, and R-multiple calculation.

#### Unified Import Service

```typescript
// src/domains/trading/services/import-service.ts (NEW)

export interface CanonicalTrade {
  symbol:      string
  direction:   "LONG" | "SHORT"
  entry:       number
  stop:        number
  closePrice:  number
  size:        number
  openTime:    string
  closeTime:   string
  pnl:         number
  commission:  number
  rMultiple:   number | null
  importTicket: string
  broker:      string
}

export abstract class BrokerParser {
  abstract parse(csv: string): CanonicalTrade[]
  abstract detect(headers: string[]): boolean
}

export class Mt4Parser    extends BrokerParser { ... }
export class Mt5Parser    extends BrokerParser { ... }   // NEW
export class CTraderParser extends BrokerParser { ... }  // exists (re-file)
export class TradovateParser extends BrokerParser { ... } // NEW
export class IbkrParser   extends BrokerParser { ... }   // NEW

export class ImportService {
  private parsers = [new Mt4Parser(), new Mt5Parser(), new CTraderParser(), new TradovateParser(), new IbkrParser()]

  detectBroker(csv: string): BrokerParser | null
  preview(csv: string, accountId: string, userId: string): Promise<ImportPreview>
  confirm(previewId: string, userId: string): Promise<ImportResult>
}
```

#### Duplicate Detection (3-tier)

```typescript
// Priority 1: importTicket match (exact — broker ticket number)
// Priority 2: (symbol, openTime, size) composite key match
// Priority 3: SHA-256 hash of (symbol, direction, entry, closePrice, pnl, openTime)

export function computeTradeHash(trade: CanonicalTrade): string {
  const key = [trade.symbol, trade.direction, trade.entry, trade.closePrice, trade.pnl, trade.openTime].join("|")
  return createHash("sha256").update(key).digest("hex")
}
```

#### Import Preview

```typescript
// tRPC procedure: imports.preview
// Returns ImportPreview before committing any rows

export interface ImportPreview {
  previewId:  string                // temporary ID stored in memory or Redis TTL=10min
  broker:     string
  newTrades:  CanonicalTrade[]      // trades not in DB
  duplicates: DuplicateTrade[]      // trades already in DB
  errors:     ImportRowError[]      // rows that couldn't be parsed
  summary:    { total: number; new: number; duplicate: number; errors: number }
}
```

```typescript
// tRPC procedures

imports: router({
  preview: protectedProcedure
    .input(z.object({
      csv:       z.string().max(10_000_000),  // 10MB limit
      accountId: z.string().uuid(),
      broker:    z.enum(["auto", "mt4", "mt5", "ctrader", "tradovate", "ibkr"]).default("auto"),
    }))
    .mutation(...),

  confirm: protectedProcedure
    .input(z.object({
      previewId: z.string(),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(...),

  history: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .query(...),
  // Returns list of past imports with: date, broker, count, errors
})
```

---

## 4. Data Model Target State

Complete Prisma schema additions and changes. All new models follow existing conventions: `@id @default(uuid()) @db.Uuid`, `@map("snake_case")` on all fields, `@@map("table_name")`.

### 4.1 User Model Additions

```prisma
model User {
  // ... existing fields ...

  // ── New fields (Phase XI) ─────────────────────────────────────────────
  weeklyTradesGoal     Int?     @map("weekly_trades_goal")
  weeklyPnlGoal        Decimal? @map("weekly_pnl_goal") @db.Decimal(14, 2)
  disciplineGoal       Int?     @map("discipline_goal")       // 0–100
  onboardingCompleted  Boolean  @default(false) @map("onboarding_completed")

  // ── Relations to new models ───────────────────────────────────────────
  aiConfig             UserAiConfig?
  preferences          UserPreferences?
  aiUsageLogs          AiUsageLog[]
  monthlyReviews       MonthlyReview[]
  setupChecklists      SetupChecklist[]
  tradeEmbeddings      TradeEmbedding[]
  emailLogs            EmailLog[]
}
```

### 4.2 New `UserAiConfig` Model

```prisma
// ── USER AI CONFIGURATION ─────────────────────────────────────────────────────
// Per-user AI provider preferences and AES-256-GCM encrypted API keys.
// Keys are NEVER returned to client in plaintext. Masked (last 4 chars) only.
// "system" provider = use server env vars. Empty model string = system default.
// ─────────────────────────────────────────────────────────────────────────────
model UserAiConfig {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @unique @map("user_id") @db.Uuid

  // Provider preference
  preferredProvider   String    @default("system")  @map("preferred_provider")
  // "system" | "anthropic" | "openrouter" | "openai"

  // Encrypted API keys (null = use system env var)
  anthropicKeyEnc     String?   @map("anthropic_key_enc")
  openrouterKeyEnc    String?   @map("openrouter_key_enc")
  openaiKeyEnc        String?   @map("openai_key_enc")

  // Model overrides (empty string = system default)
  coachModel          String    @default("") @map("coach_model")
  embeddingModel      String    @default("") @map("embedding_model")
  summaryModel        String    @default("") @map("summary_model")

  // Feature toggles
  aiCoachEnabled      Boolean   @default(true)  @map("ai_coach_enabled")
  embeddingsEnabled   Boolean   @default(false) @map("embeddings_enabled")

  // Aggregate usage tracking (detail in AiUsageLog)
  totalTokensUsed     Int       @default(0)      @map("total_tokens_used")
  lastUsedAt          DateTime? @map("last_used_at")

  createdAt           DateTime  @default(now())  @map("created_at")
  updatedAt           DateTime  @updatedAt       @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_ai_configs")
}
```

### 4.3 New `UserPreferences` Model

```prisma
// ── USER PREFERENCES ──────────────────────────────────────────────────────────
// UI personalization settings. 1:1 with User. Upserted on first save.
// All fields have safe defaults (fallback to DEFAULT_PREFERENCES in code).
// ─────────────────────────────────────────────────────────────────────────────
model UserPreferences {
  userId              String    @id @map("user_id") @db.Uuid

  // Theme
  theme               String    @default("system")       // "light" | "dark" | "system"
  accentHue           Int?      @map("accent_hue")       // 0–360 OKLCH hue
  colorScheme         String    @default("default")      @map("color_scheme")
  // "default" | "deuteranopia" | "protanopia" | "mono"

  // Dashboard
  defaultTab          String    @default("portfolio")    @map("default_tab")
  kpiOrder            String[]  @default([])             @map("kpi_order")
  kpiHidden           String[]  @default([])             @map("kpi_hidden")
  defaultGrain        String    @default("daily")        @map("default_grain")
  dashboardLayout     Json      @default("{}")           @map("dashboard_layout")
  // { widgetGrid: [...], showGoals: boolean, ... }

  // Display density
  tableDensity        String    @default("comfortable")  @map("table_density")
  // "compact" | "comfortable"

  // Locale
  dateFormat          String    @default("DD/MM/YYYY")   @map("date_format")
  numberLocale        String    @default("es-HN")        @map("number_locale")

  // Notification preferences (persisted here; edge function reads them)
  notifyWeeklyReview  Boolean   @default(true)           @map("notify_weekly_review")
  notifyDrawdownAlert Boolean   @default(false)          @map("notify_drawdown_alert")
  notifyPropFirmHealth Boolean  @default(true)           @map("notify_prop_firm_health")
  notifyRuleViolation Boolean   @default(true)           @map("notify_rule_violation")
  drawdownAlertPct    Decimal?  @map("drawdown_alert_pct") @db.Decimal(5, 2)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

### 4.4 New `AiUsageLog` Model

```prisma
// ── AI USAGE LOG ──────────────────────────────────────────────────────────────
// Per-request token tracking for cost visibility and rate limiting.
// costUsdMicro stored as integer millionths of $1 (e.g., $0.003 → 3000).
// ─────────────────────────────────────────────────────────────────────────────
model AiUsageLog {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  feature      String    // "coach" | "summary" | "embedding"
  provider     String    // "anthropic" | "openrouter" | "openai"
  model        String
  inputTokens  Int       @map("input_tokens")
  outputTokens Int       @map("output_tokens")
  costUsdMicro Int       @map("cost_usd_micro")
  createdAt    DateTime  @default(now())  @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("ai_usage_logs")
}
```

### 4.5 Trade Model Additions

```prisma
model Trade {
  // ... existing fields ...

  // ── Psychology fields (Phase XI — TASK-034) ───────────────────────────
  emotionPre          String?   @map("emotion_pre")
  // "CALM" | "CONFIDENT" | "ANXIOUS" | "FOMO" | "REVENGE" | "OVERCONFIDENT" | "NEUTRAL"
  emotionPost         String?   @map("emotion_post")  // same enum
  setupConfidence     Int?      @map("setup_confidence")   // 1–5
  executionQuality    Int?      @map("execution_quality")  // 1–5
  fomoFlag            Boolean   @default(false) @map("fomo_flag")
  revengeFlag         Boolean   @default(false) @map("revenge_flag")
  psychNotes          String?   @map("psych_notes")

  // ... existing relations ...
}
```

### 4.6 New `TradeEmbedding` Model (resolves TD-010)

```prisma
// ── TRADE EMBEDDING ───────────────────────────────────────────────────────────
// Brings notes_embedding (currently off-schema raw SQL) into Prisma schema.
// The actual vector column is managed via raw SQL migration (pgvector).
// This model represents the metadata; vector column added separately.
// ─────────────────────────────────────────────────────────────────────────────
model TradeEmbedding {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  tradeId      String    @unique @map("trade_id") @db.Uuid
  model        String    // embedding model used (e.g., "openai/text-embedding-3-small")
  notesHash    String    @map("notes_hash")   // SHA-256 of notes text; detect staleness
  embeddedAt   DateTime  @default(now())      @map("embedded_at")

  user  User  @relation(fields: [userId],  references: [id], onDelete: Cascade)
  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("trade_embeddings")
}
```

### 4.7 New `EmailLog` Model (resolves TD-010)

```prisma
// ── EMAIL LOG ─────────────────────────────────────────────────────────────────
// Idempotency table used by weekly-learning-summary edge function.
// Currently off-schema (raw SQL). UNIQUE constraint enforces one email per
// (user, type, week) tuple.
// ─────────────────────────────────────────────────────────────────────────────
model EmailLog {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  emailType String    @map("email_type")  // "weekly" | "inactivity" | "decay" | "prop_firm_health"
  weekKey   String    @map("week_key")    // ISO week key e.g. "2026-W22"
  sentAt    DateTime  @default(now())     @map("sent_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, emailType, weekKey])
  @@map("email_logs")
}
```

### 4.8 New `MonthlyReview` Model

```prisma
// ── MONTHLY REVIEW ────────────────────────────────────────────────────────────
// Aggregate of ~4 weekly reviews for a calendar month.
// Created on demand via weeklyReviews.createMonthly procedure.
// ─────────────────────────────────────────────────────────────────────────────
model MonthlyReview {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  accountId        String?   @map("account_id") @db.Uuid
  monthLabel       String    @map("month_label")        // "2026-05"
  monthStart       DateTime  @map("month_start") @db.Date
  monthEnd         DateTime  @map("month_end")   @db.Date
  tradeCount       Int       @default(0)         @map("trade_count")
  netPnl           Decimal   @default(0)         @map("net_pnl") @db.Decimal(14, 2)
  winRate          Decimal   @default(0)         @map("win_rate") @db.Decimal(5, 2)
  avgDisciplineScore Int     @default(0)         @map("avg_discipline_score")
  executiveSummary String    @default("")        @map("executive_summary")
  topPattern       String    @default("")        @map("top_pattern")
  weeklyReviewIds  String[]  @map("weekly_review_ids") @db.Uuid
  status           String    @default("draft")
  createdAt        DateTime  @default(now())     @map("created_at")
  updatedAt        DateTime  @updatedAt          @map("updated_at")

  user    User     @relation(fields: [userId],    references: [id], onDelete: Cascade)
  account Account? @relation(fields: [accountId], references: [id], onDelete: SetNull)

  @@unique([userId, monthLabel])
  @@index([userId, monthStart(sort: Desc)])
  @@map("monthly_reviews")
}
```

### 4.9 New `SetupChecklist` Model

```prisma
// ── SETUP CHECKLIST ───────────────────────────────────────────────────────────
// Replaces aplusChecklist String[] and standardChecklist String[] on Setup.
// Enables ordering, required flag, and independent management.
// Migration: populate from existing array fields in Phase XIV.
// ─────────────────────────────────────────────────────────────────────────────
model SetupChecklist {
  id        String    @id @default(uuid()) @db.Uuid
  setupId   String    @map("setup_id") @db.Uuid
  userId    String    @map("user_id")  @db.Uuid
  label     String
  type      String    @default("standard")  // "aplus" | "standard"
  required  Boolean   @default(true)
  order     Int       @default(0)
  createdAt DateTime  @default(now()) @map("created_at")

  setup Setup @relation(fields: [setupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId],  references: [id], onDelete: Cascade)

  @@index([setupId, order])
  @@map("setup_checklists")
}
```

---

## 5. Service Layer Design

### Target Directory Structure

```
src/
├── domains/
│   ├── analytics/
│   │   ├── services/
│   │   │   ├── analytics-service.ts      (NEW — unified entry point)
│   │   │   ├── dashboard-analytics.ts    (exists — keep, called by analytics-service)
│   │   │   ├── analytics-cache.ts        (exists — keep)
│   │   │   ├── pattern-detector.ts       (exists — extend to 8 patterns)
│   │   │   ├── psychology-service.ts     (NEW)
│   │   │   ├── setup-analytics.ts        (exists — keep)
│   │   │   └── trading-sessions.ts       (exists — fix isWin usage)
│   │   └── ai-context.ts                (exists — fix Sharpe, add caching)
│   ├── ai/
│   │   └── services/
│   │       ├── coach-service.ts          (NEW — extract from api/ai-coach/route.ts)
│   │       ├── embedding-service.ts      (NEW — extract from api/ai-embed/route.ts)
│   │       └── summary-service.ts        (NEW — extract from routers/weekly-reviews.ts)
│   ├── learning/
│   │   └── services/
│   │       ├── decay-detector.ts         (exists — keep)
│   │       ├── review-scheduler.ts       (exists — keep)
│   │       └── streak-service.ts         (exists — keep)
│   ├── playbooks/
│   │   └── services/
│   │       └── setup-service.ts          (NEW — health score, compare, import/export)
│   ├── reviews/
│   │   └── services/
│   │       └── review-service.ts         (NEW — aggregate, prefill, template)
│   └── trading/
│       ├── services/
│       │   ├── account-service.ts        (exists — computeMaxDrawdown moves to lib/formulas/drawdown.ts)
│       │   ├── trade-service.ts          (exists — use calcRMultiple from lib/formulas)
│       │   ├── import-service.ts         (NEW — unified multi-broker import)
│       │   ├── psychology-service.ts     → moved to domains/analytics/services/
│       │   └── prop-firm-guard.ts        (exists — wire to trades.create mutation)
│       ├── csv-import.ts                 (exists — superseded by import-service; keep as Mt4Parser)
│       ├── mt4-parser.ts                 (exists — becomes class extending BrokerParser)
│       └── mt5-parser.ts                 (NEW)
├── lib/
│   ├── formulas/
│   │   ├── index.ts                      (NEW — barrel export)
│   │   ├── win-rate.ts                   (NEW)
│   │   ├── drawdown.ts                   (NEW — absorbs account-service computeMaxDrawdown)
│   │   ├── discipline.ts                 (NEW)
│   │   ├── risk.ts                       (NEW)
│   │   └── performance.ts               (NEW)
│   ├── ai/
│   │   ├── config.ts                     (exists — add getProviderKeyForUser)
│   │   ├── chat.ts                       (exists — add onUsage callback)
│   │   ├── embeddings.ts                 (exists — keep)
│   │   ├── models.ts                     (NEW — AI_MODELS catalog + resolveModel)
│   │   ├── key-encryption.ts             (NEW — AES-256-GCM)
│   │   └── rate-limit.ts                 (NEW — AiUsageLog time-window check)
│   ├── theme/
│   │   ├── tokens.ts                     (NEW — DEFAULT_PREFERENCES, CSS var names)
│   │   └── css-vars.ts                   (NEW — server-side style string builder)
│   ├── logger.ts                         (NEW — structured logging)
│   ├── prisma.ts                         (exists — keep)
│   ├── supabase/                         (exists — keep)
│   ├── formulas.ts                       (exists — becomes shim → delete in Phase XIV)
│   └── utils.ts                          (exists — keep)
└── server/
    └── trpc/
        ├── root.ts                       (add new routers: analytics, aiConfig, psychology, imports)
        ├── init.ts                       (update: read userId from x-user-id header, not auth.getUser)
        └── routers/
            ├── trades.ts                 (exists — extract business logic → trade-service.ts; target <200 LOC)
            ├── accounts.ts               (exists — wire prop-firm-guard; fix TRPCError)
            ├── weekly-reviews.ts         (exists — extract summary → summary-service; wire update to UI)
            ├── setups.ts                 (exists — add compare, healthScore, exportJson, importJson)
            ├── learning-resources.ts     (exists — fix N+1, fix CQRS violation)
            ├── analytics.ts              (NEW — replaces trades.dashboardStats in router)
            ├── users.ts                  (NEW — getProfile, updateProfile, updatePreferences, etc.)
            ├── ai-config.ts              (NEW — get, update, testConnection, getUsage, models)
            ├── psychology.ts             (NEW — summary, correlations, trends)
            ├── imports.ts                (NEW — preview, confirm, history)
            ├── rules.ts                  (exists — keep)
            ├── markets.ts                (exists — keep)
            ├── withdrawals.ts            (exists — keep)
            ├── account-logs.ts           (exists — add cursor pagination)
            └── trading-sessions.ts       (exists — fix isWin usage)
```

---

## 6. API Surface (tRPC Routers)

### Complete Target tRPC Procedure Table

| Router | Procedure | Type | Status | Notes |
|---|---|---|---|---|
| `trades` | `list` | query | exists | add psychology fields to output |
| `trades` | `create` | mutation | exists | wire prop-firm-guard; create TradeEmbedding via DB webhook instead |
| `trades` | `update` | mutation | exists | psychology fields in input |
| `trades` | `close` | mutation | exists | keep |
| `trades` | `delete` | mutation | exists | keep |
| `trades` | `dashboardStats` | query | exists → migrate | migrate callers to `analytics.dashboardStats`; mark deprecated |
| `trades` | `stats` | query | exists | dead code — remove after audit (TD-015) |
| `trades` | `semanticSearch` | query | exists | wire to UI (search box in trades page) |
| `trades` | `addEvent` | mutation | exists | keep |
| `accounts` | `list` | query | exists | keep |
| `accounts` | `create` | mutation | exists | keep |
| `accounts` | `update` | mutation | exists | keep |
| `accounts` | `changeStatus` | mutation | exists | fix: use TRPCError (TASK-003) |
| `accounts` | `promotePhase` | mutation | exists | fix: objectiveMet comparison (TASK-002) |
| `accounts` | `delete` | mutation | exists | keep |
| `analytics` | `dashboardStats` | query | NEW | replaces `trades.dashboardStats` |
| `analytics` | `rollingMetrics` | query | NEW | 20-trade rolling win rate |
| `analytics` | `psychologyCorrelations` | query | NEW | emotion → outcome data |
| `analytics` | `patterns` | query | NEW | 8-pattern detector output |
| `users` | `getProfile` | query | NEW (was broken) | all User fields |
| `users` | `updateProfile` | mutation | NEW (was broken) | persist all 14+ fields |
| `users` | `updatePreferences` | mutation | NEW | UserPreferences upsert |
| `users` | `updateAiConfig` | mutation | NEW | delegates to aiConfig.update |
| `users` | `changePassword` | mutation | NEW | Supabase Auth call |
| `users` | `exportData` | query | NEW | JSON blob of all user data |
| `users` | `deleteAccount` | mutation | NEW | cascade delete + sign out |
| `aiConfig` | `get` | query | NEW | masked keys |
| `aiConfig` | `update` | mutation | NEW | encrypt keys before save |
| `aiConfig` | `testConnection` | query | NEW | 5-token probe |
| `aiConfig` | `getUsage` | query | NEW | monthly/all-time tokens + cost |
| `aiConfig` | `models` | query | NEW | AI_MODELS catalog |
| `psychology` | `summary` | query | NEW | EmotionDistribution, WinRate by emotion |
| `psychology` | `correlations` | query | NEW | emotion × outcome matrix |
| `psychology` | `trends` | query | NEW | week-over-week emotion data |
| `weeklyReviews` | `list` | query | exists | add filters: from, to, status, accountId |
| `weeklyReviews` | `get` | query | exists | keep |
| `weeklyReviews` | `create` | mutation | exists | add template param |
| `weeklyReviews` | `update` | mutation | exists → wire | called from frontend (TASK-031) |
| `weeklyReviews` | `delete` | mutation | exists → wire | add UI button |
| `weeklyReviews` | `prefill` | mutation | exists | extend with psychology summary |
| `weeklyReviews` | `generateSummary` | mutation | broken → fix | throw TRPCError on failure (TD-028) |
| `weeklyReviews` | `createMonthly` | mutation | NEW | aggregate 4 weekly reviews |
| `weeklyReviews` | `listMonthly` | query | NEW | |
| `setups` | `list` | query | exists | keep |
| `setups` | `create` | mutation | exists | keep |
| `setups` | `update` | mutation | exists | keep |
| `setups` | `delete` | mutation | exists | keep |
| `setups` | `lifecycleCheck` | query | exists | fix: include setups with null expectedWr |
| `setups` | `compare` | query | NEW | version comparison |
| `setups` | `healthScore` | query | NEW | expected vs actual WR/R |
| `setups` | `exportJson` | query | NEW | JSON export |
| `setups` | `importJson` | mutation | NEW | JSON import |
| `imports` | `preview` | mutation | NEW | multi-broker CSV preview |
| `imports` | `confirm` | mutation | NEW | commit after preview |
| `imports` | `history` | query | NEW | past imports list |
| `learningResources` | `list` | query | exists | fix: use RouterOutputs type |
| `learningResources` | `stats` | query | exists | fix CQRS violation (TASK-038) |
| `learningResources` | `processDecayTransitions` | mutation | NEW | replaces side-effect in stats |
| `learningResources` | `resourceImpactRanking` | query | exists | fix N+1 (TASK-039) |
| `rules` | `list` | query | exists | keep |
| `rules` | `create` | mutation | exists | keep |
| `rules` | `update` | mutation | exists | keep |
| `rules` | `delete` | mutation | exists | keep |
| `markets` | `list` | query | exists | fix: type market:any (TASK-023) |
| `markets` | `create` | mutation | exists | keep |
| `markets` | `update` | mutation | exists | keep |
| `markets` | `delete` | mutation | exists | keep |
| `withdrawals` | `list` | query | exists | fix: type amount:any (TASK-023) |
| `withdrawals` | `create` | mutation | exists | keep |
| `withdrawals` | `update` | mutation | exists | keep |
| `withdrawals` | `delete` | mutation | exists | keep |
| `accountLogs` | `list` | query | exists | add cursor pagination (TASK-020) |
| `tradingSessions` | `list` | query | exists | keep |
| `tradingSessions` | `upsert` | mutation | exists | keep |

**Total procedures: ~65 (currently ~45 implemented, ~20 new)**

---

## 7. Migrations Required

All migrations run via `supabase db push` against a branch first, then merged to production. Naming convention: `YYYYMMDD_NNN_description.sql`.

### Migration 010 — User AI Config

```sql
-- 20260601_010_user_ai_config.sql
CREATE TABLE user_ai_configs (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_provider  TEXT         NOT NULL DEFAULT 'system',
  anthropic_key_enc   TEXT,
  openrouter_key_enc  TEXT,
  openai_key_enc      TEXT,
  coach_model         TEXT         NOT NULL DEFAULT '',
  embedding_model     TEXT         NOT NULL DEFAULT '',
  summary_model       TEXT         NOT NULL DEFAULT '',
  ai_coach_enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
  embeddings_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  total_tokens_used   INTEGER      NOT NULL DEFAULT 0,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE user_ai_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_ai_configs_own" ON user_ai_configs
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_user_ai_configs_user ON user_ai_configs(user_id);
```

### Migration 011 — User Preferences

```sql
-- 20260601_011_user_preferences.sql
CREATE TABLE user_preferences (
  user_id              UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme                TEXT         NOT NULL DEFAULT 'system',
  accent_hue           INTEGER,
  color_scheme         TEXT         NOT NULL DEFAULT 'default',
  default_tab          TEXT         NOT NULL DEFAULT 'portfolio',
  kpi_order            TEXT[]       NOT NULL DEFAULT '{}',
  kpi_hidden           TEXT[]       NOT NULL DEFAULT '{}',
  default_grain        TEXT         NOT NULL DEFAULT 'daily',
  dashboard_layout     JSONB        NOT NULL DEFAULT '{}',
  table_density        TEXT         NOT NULL DEFAULT 'comfortable',
  date_format          TEXT         NOT NULL DEFAULT 'DD/MM/YYYY',
  number_locale        TEXT         NOT NULL DEFAULT 'es-HN',
  notify_weekly_review    BOOLEAN   NOT NULL DEFAULT TRUE,
  notify_drawdown_alert   BOOLEAN   NOT NULL DEFAULT FALSE,
  notify_prop_firm_health BOOLEAN   NOT NULL DEFAULT TRUE,
  notify_rule_violation   BOOLEAN   NOT NULL DEFAULT TRUE,
  drawdown_alert_pct   NUMERIC(5,2)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_own" ON user_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id);
```

### Migration 012 — Trade Psychology Fields

```sql
-- 20260608_012_trade_psychology.sql
ALTER TABLE trades
  ADD COLUMN emotion_pre      TEXT,
  ADD COLUMN emotion_post     TEXT,
  ADD COLUMN setup_confidence INTEGER CHECK (setup_confidence BETWEEN 1 AND 5),
  ADD COLUMN execution_quality INTEGER CHECK (execution_quality BETWEEN 1 AND 5),
  ADD COLUMN fomo_flag        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN revenge_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN psych_notes      TEXT;

COMMENT ON COLUMN trades.emotion_pre  IS 'CALM | CONFIDENT | ANXIOUS | FOMO | REVENGE | OVERCONFIDENT | NEUTRAL';
COMMENT ON COLUMN trades.emotion_post IS 'CALM | CONFIDENT | ANXIOUS | FOMO | REVENGE | OVERCONFIDENT | NEUTRAL';

CREATE INDEX idx_trades_emotion_pre ON trades(user_id, emotion_pre)
  WHERE emotion_pre IS NOT NULL;
CREATE INDEX idx_trades_fomo ON trades(user_id, fomo_flag)
  WHERE fomo_flag = TRUE;
```

### Migration 013 — User Profile Extended Fields

```sql
-- 20260608_013_user_profile_fields.sql
ALTER TABLE users
  ADD COLUMN weekly_trades_goal    INTEGER,
  ADD COLUMN weekly_pnl_goal       NUMERIC(14, 2),
  ADD COLUMN discipline_goal       INTEGER CHECK (discipline_goal BETWEEN 0 AND 100),
  ADD COLUMN onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE;
```

### Migration 014 — Setup Checklist Model

```sql
-- 20260615_014_setup_checklist.sql
CREATE TABLE setup_checklists (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id   UUID         NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  user_id    UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  label      TEXT         NOT NULL,
  type       TEXT         NOT NULL DEFAULT 'standard',  -- 'aplus' | 'standard'
  required   BOOLEAN      NOT NULL DEFAULT TRUE,
  "order"    INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE setup_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setup_checklists_own" ON setup_checklists
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_setup_checklists_setup ON setup_checklists(setup_id, "order");
```

### Migration 015 — AI Usage Log

```sql
-- 20260615_015_ai_usage_log.sql
CREATE TABLE ai_usage_logs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature        TEXT         NOT NULL,   -- 'coach' | 'summary' | 'embedding'
  provider       TEXT         NOT NULL,   -- 'anthropic' | 'openrouter' | 'openai'
  model          TEXT         NOT NULL,
  input_tokens   INTEGER      NOT NULL,
  output_tokens  INTEGER      NOT NULL,
  cost_usd_micro INTEGER      NOT NULL,   -- millionths of $1
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_logs_own" ON ai_usage_logs
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
```

### Migration 016 — Formalize Off-Schema Tables (resolves TD-010)

```sql
-- 20260622_016_schema_sync.sql

-- email_log already exists in DB; this migration adds nothing to DB
-- but creates the Prisma model (see schema.prisma EmailLog model above)
-- This migration is a no-op in SQL; its purpose is schema.prisma alignment.

-- trade_embeddings: new table replacing raw notes_embedding column pattern
CREATE TABLE IF NOT EXISTS trade_embeddings (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  trade_id    UUID         NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  model       TEXT         NOT NULL,
  notes_hash  TEXT         NOT NULL,
  embedded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE trade_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trade_embeddings_own" ON trade_embeddings
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Rename existing email_log to email_logs for Prisma @@map consistency
-- (Run only if existing table is named email_log; check first)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'email_log') THEN
    ALTER TABLE email_log RENAME TO email_logs;
  END IF;
END $$;

-- Add missing id column if email_logs was created without one
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'email_logs' AND column_name = 'id') THEN
    ALTER TABLE email_logs ADD COLUMN id UUID DEFAULT gen_random_uuid();
    ALTER TABLE email_logs ADD PRIMARY KEY (id);
  END IF;
END $$;
```

### Migration 017 — Weekly Review Status Extension

```sql
-- 20260622_017_review_status.sql
-- Add 'in-progress' as valid status for WeeklyReview
-- No schema change needed (status is TEXT) — just document the new valid value.
-- Add check constraint to validate status values:

ALTER TABLE weekly_reviews
  ADD CONSTRAINT weekly_reviews_status_check
  CHECK (status IN ('draft', 'in-progress', 'submitted'));

-- Monthly reviews table
CREATE TABLE monthly_reviews (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  account_id            UUID         REFERENCES accounts(id)  ON DELETE SET NULL,
  month_label           TEXT         NOT NULL,
  month_start           DATE         NOT NULL,
  month_end             DATE         NOT NULL,
  trade_count           INTEGER      NOT NULL DEFAULT 0,
  net_pnl               NUMERIC(14, 2) NOT NULL DEFAULT 0,
  win_rate              NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  avg_discipline_score  INTEGER      NOT NULL DEFAULT 0,
  executive_summary     TEXT         NOT NULL DEFAULT '',
  top_pattern           TEXT         NOT NULL DEFAULT '',
  weekly_review_ids     UUID[]       NOT NULL DEFAULT '{}',
  status                TEXT         NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month_label)
);

ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_reviews_own" ON monthly_reviews
  FOR ALL USING ((SELECT auth.uid()) = user_id);
```

---

## 8. Non-Functional Requirements

### Performance Targets

| Metric | Current | Target | Measurement |
|---|---|---|---|
| P95 page load (dashboard, 500 trades) | ~1500ms | <300ms | Vercel Analytics |
| P95 page load (dashboard, 1000+ trades) | ~4000ms+ | <500ms | Vercel Analytics |
| tRPC query (analytics.dashboardStats) | ~300ms | <500ms | tRPC telemetry |
| tRPC query (paginated trades.list) | ~150ms | <200ms | tRPC telemetry |
| AI coach first token | ~800ms | <1500ms | SSE timing |
| Trade entry form submission | ~400ms | <600ms | User timing |
| Account cards load (100 trades) | ~1200ms | <200ms | Lighthouse |

### Security Requirements

- **AI keys:** Encrypted at rest (AES-256-GCM). Never returned in plaintext. Never logged. `AI_KEY_ENCRYPTION_KEY` is a required environment variable when per-user keys are enabled.
- **Upload validation:** All Storage uploads go through server-side Route Handler with MIME type whitelist (image/jpeg, image/png, image/webp) and 5MB max size (TASK-017).
- **CRON_SECRET:** Edge function rejects with 401 if env var is absent or empty string (TASK-016).
- **Rate limiting:** AI endpoints limited to 20 coach messages/hour, 100 embeddings/day, 10 summaries/day per user. Implemented via `AiUsageLog` time-window query or Upstash Redis.
- **RLS:** All new tables (`user_ai_configs`, `user_preferences`, `ai_usage_logs`, `setup_checklists`, `trade_embeddings`, `email_logs`, `monthly_reviews`) must have RLS enabled with `(SELECT auth.uid()) = user_id` policy.
- **No PII in AI context:** `buildTraderContext()` must never include trade notes, account names, or broker names in AI provider payloads.

### Reliability Requirements

- **AI unavailable:** All AI features degrade gracefully. `isAnyKeyConfigured()` returns false → features hidden. Coach drawer shows "AI no configurada" with link to settings.
- **Embedding failure:** DB-webhook approach replaces fire-and-forget. Embedding worker has retry with exponential backoff (max 3 attempts). Failed embeddings logged in `TradeEmbedding` with `embeddedAt = null`.
- **Offline trade entry:** Service worker caches the trade entry form shell. Queued trades sync on reconnect (Phase XIV PWA scope).
- **Database unavailable:** Error boundaries on all pages with `reset()` recovery (not `window.location.reload()` — TASK-044).

### Testing Requirements

| Area | Target Coverage | Test Type |
|---|---|---|
| `src/lib/formulas/` | 100% | Vitest unit |
| Domain services (`src/domains/`) | 80% | Vitest unit with Prisma mocks |
| tRPC routers | 60% (happy path + auth) | Vitest integration |
| Critical UI flows | Smoke tested | Playwright e2e |
| Formula regression | 100% of formulas listed in §3.1 | Vitest unit |

Critical e2e smoke tests (TASK-025):
1. Login → create account → register trade → close trade → view dashboard KPIs
2. Create weekly review → generate AI summary → submit
3. Import CSV → verify trade count and R-multiples
4. Configure AI key in profile → test connection

### Observability

```typescript
// src/lib/logger.ts (NEW)
export interface LogEntry {
  level:       "info" | "warn" | "error"
  message:     string
  userId?:     string
  procedure?:  string
  durationMs?: number
  error?:      string
  traceId?:    string
}

export function log(entry: LogEntry): void {
  // Development: console.log
  // Production: JSON to stdout (Vercel captures to log drain)
  console.log(JSON.stringify(entry))
}
```

Error boundaries on every page: `src/app/*/error.tsx` using Next.js App Router `error.tsx` convention with `reset()` callback, not `window.location.reload()` (TASK-044).

---

## 9. Migration Path (Current → Target)

### Phase X — Stability & Formula Centralization [Weeks 1–2]

**What changes:**
- Create `src/lib/formulas/` directory with 5 sub-modules (non-breaking refactor)
- `src/lib/formulas.ts` becomes a re-export shim
- Fix 9 win-rate sites, 3 discipline-score sites, 2 Sharpe sites
- Fix security: CRON_SECRET bypass, Storage upload validation
- Fix data bugs: rMultiple on import, phase promotion hardcoded, KPI pagination

**What breaks:** Nothing. All changes are replacements of inline code with function calls returning identical values.

**Migration strategy:** Create formulas module first. Update one site at a time. Run unit tests after each site. Verify formula test coverage reaches 100%.

**Verification:** Run `grep -r "rMultiple > 0\|disciplinedCount / total" src/` returns 0 matches. `grep -r "computeMaxDrawdown\|isWin\|calcWinRate" src/domains src/server` returns only single import call sites.

### Phase XI — Profile Backend + AI Config + UserPreferences [Weeks 3–7]

**What changes:**
- `src/server/trpc/routers/users.ts` (new file — 5+ procedures)
- `src/app/perfil/page.tsx` refactored to call tRPC procedures (all 14 fields wired)
- Migrations 010, 011, 013 applied
- `src/server/trpc/routers/ai-config.ts` (new file)
- `src/lib/ai/key-encryption.ts` (new file)
- `src/lib/ai/models.ts` (new file)
- `src/lib/ai/config.ts` extended with `getProviderKeyForUser`
- `UserPreferences` DB table created; `preferences` router added to root.ts
- Toast notification system (Sonner) wired to all mutations

**What breaks:** None. All changes are additive or replace broken behavior.

**Migration strategy:**
1. Apply migrations on Supabase branch
2. Implement tRPC router (backend first, frontend second)
3. Connect profile page fields one section at a time
4. Smoke test: save profile, reload page, verify values persist

**Verification:** Profile propagation score: 14/14. `AI_KEY_ENCRYPTION_KEY` documented in `.env.example`. Connectivity test returns `{ status: "connected" }`.

### Phase XII — Psychology Fields + Reviews CRUD [Weeks 8–10]

**What changes:**
- Migration 012: psychology columns on trades table
- `src/server/trpc/routers/psychology.ts` (new router)
- Psychology section in `register-trade-modal.tsx` and `edit-trade-modal.tsx`
- `src/domains/analytics/services/psychology-service.ts` (new service)
- `weeklyReviews.update` wired to `ReviewDetailPanel` edit button
- Draft auto-save (30s debounce) in review modal
- Review status `in-progress` added
- Review list filtering (from, to, status, accountId)
- `generateSummary` fixed to throw `TRPCError` (TD-028)

**What breaks:** Review status constraint — existing reviews only have `draft` or `submitted`. Migration 017 adds CHECK constraint; verify all existing rows are compliant before applying.

**Migration strategy:**
1. Run `SELECT DISTINCT status FROM weekly_reviews;` — confirm only `draft`, `submitted` exist
2. Apply migration 017
3. Update all new review creates to use new status machine

**Verification:** Psychology fields appear in trade form. Edit review → save → reload shows updated content. FOMO cost shown in discipline tab.

### Phase XIII — AI Improvements + Streaming + Cost Tracking [Weeks 11–14]

**What changes:**
- Migration 015: `ai_usage_logs` table
- `src/domains/ai/services/` directory with 3 service files
- `streamChat` extended with `onUsage` callback
- `getProviderKeyForUser` wired in all AI route handlers
- Trader context caching (5-minute in-memory per userId)
- Rate limiting on AI endpoints via `AiUsageLog` time-window
- Embedding pipeline: Supabase DB webhook → `supabase/functions/embed-worker/`
- Migration 016: `trade_embeddings` table, `email_logs` rename

**What breaks:**
- Fire-and-forget `scheduleEmbedding()` in `trades.ts` removed. Existing embeddings remain valid. New trades get embeddings via webhook (slight latency increase for first embedding vs previous fire-and-forget, but now reliable).
- `getCoachModel()` updated to `claude-sonnet-4-6` — slight behavior change in AI coach responses.

**Migration strategy:**
1. Deploy DB webhook in Supabase before removing `scheduleEmbedding()`
2. Run batch re-embedding job for trades with `notes != ""` but no `TradeEmbedding` row
3. Update model IDs (TASK-032) in same PR as embedding pipeline change

### Phase XIV — Mobile/PWA + Personalization [Weeks 15–18]

**What changes:**
- `src/app/manifest.ts` + service worker (PWA)
- `src/components/mobile/quick-add-sheet.tsx`
- Accent color picker + colorblind mode (TASK-046)
- Goal setting dashboard widget (TASK-050)
- Custom tags management (TASK-051)
- Onboarding checklist widget (TASK-052)
- `inputmode="decimal"` on all numeric inputs (TASK-041)
- Skeleton screens and empty states (TASK-042, TASK-043)
- Type safety cleanup: eliminate all `as never` casts (TASK-013, TASK-014)

**What breaks:** None. Additive changes only.

### Phase XV — Playbooks 2.0 + Import Improvements [Weeks 19–22]

**What changes:**
- Migration 014: `setup_checklists` table
- `src/domains/playbooks/services/setup-service.ts`
- Setup comparison view, health score, JSON import/export
- Migration for `monthly_reviews` table (Migration 017 already includes this)
- `src/domains/trading/services/import-service.ts` (unified multi-broker)
- MT5 and Tradovate parser implementations
- Import preview UI (diff view before committing)
- CI/CD: GitHub Actions with lint + typecheck + unit tests (TASK-025)
- `ANALYTICS_CACHE_ENABLED=true` in production (TASK-021)

**What breaks:** Import endpoint URL changes from `/api/import/mt4` to handled by `imports.preview` + `imports.confirm` tRPC procedures. Old endpoint remains as backward-compat shim.

---

## 10. Open Questions & Decisions

### OQ-001: Auth Strategy for tRPC Context (TD-019)

**Problem:** Every tRPC request calls `supabase.auth.getUser()` — one auth API round-trip per request.

**Option A:** Pass `userId` from middleware as `x-user-id` header. `createTRPCContext` reads header directly. Zero auth API calls per request. **Risk:** Header spoofing if middleware is bypassed (requires route-level defense).

**Option B:** Cache Supabase user object in-memory keyed by JWT hash with 60-second TTL. Reduces auth calls by ~95%. **Risk:** Stale user object after revocation.

**Recommendation:** Option A. Next.js middleware runs before all routes; `x-user-id` cannot be set by client. Add `if (process.env.NODE_ENV === "production" && !req.headers.get("x-user-id")) return unauthorized()` guard in router context.

**Decision needed by:** Phase XI implementation.

---

### OQ-002: Analytics Cache Storage Backend

**Problem:** `TradeStatsCache` is a PostgreSQL table. For 1000+ concurrent users, cache reads compete with cache writes and analytics queries on the same DB.

**Option A:** Keep PostgreSQL `trade_stats_cache` table. Simple, no additional infrastructure. Current TTL enforcement works. **Risk:** DB contention at scale.

**Option B:** Upstash Redis (serverless-compatible). Sub-millisecond reads. Automatic TTL. **Cost:** ~$0.20/100k requests.

**Recommendation:** Option A for current scale (single-tenant). Revisit if analytics queries exceed 500ms median consistently.

---

### OQ-003: Embedding Pipeline Reliability

**Problem:** Current fire-and-forget `scheduleEmbedding()` may silently fail in Vercel serverless (TD-020).

**Option A:** Supabase DB webhook on `trades` UPDATE → triggers `supabase/functions/embed-worker/`. Most reliable. Already supported by Supabase.

**Option B:** Upstash QStash (message queue). Retry logic built-in. Adds new infrastructure dependency.

**Option C:** Supabase pg_cron job polling for trades with `notes != ""` but no embedding. Simple. Latency up to 1 minute.

**Recommendation:** Option A. DB webhooks are already available in Supabase and require no additional dependencies. Implement embed-worker as a new edge function.

---

### OQ-004: Review Auto-Save Persistence

**Problem:** Auto-save implementation options differ in complexity and race conditions.

**Option A:** Debounced `weeklyReviews.update` mutation every 30 seconds. Simple. May create many DB writes. Race condition if user submits before debounce fires.

**Option B:** Draft stored in `localStorage` with periodic sync. Works offline. Requires reconciliation on conflict.

**Option C:** Optimistic update in TanStack Query cache, explicit background sync every 30s, single flush on modal close.

**Recommendation:** Option A for Phase XII. The mutation is idempotent and 30s debounce is reasonable. Add `updatedAt` timestamp to review card to show last-saved time. Address race condition by calling mutation synchronously on "Submit" click (bypass debounce).

---

### OQ-005: Psychology Emotion Enum — String vs DB Enum

**Problem:** `emotionPre` and `emotionPost` are stored as `String?` in Prisma schema (TEXT in PostgreSQL). Enum enforcement is application-level only.

**Option A:** Keep as `String?`. Application-level validation via Zod enum. Flexible for future additions. No migration needed for new values.

**Option B:** PostgreSQL ENUM type. Strong DB-level validation. Adding new values requires `ALTER TYPE ... ADD VALUE`.

**Recommendation:** Option A. Trading journals are highly personal; users may need custom emotion labels in future. Zod enum validation at the tRPC input layer provides sufficient safety without DB migration overhead for new values.

---

### OQ-006: SetupChecklist Migration Strategy

**Problem:** Current `aplusChecklist String[]` and `standardChecklist String[]` on Setup contain checklist text as arrays. Migration to `SetupChecklist` relational model requires data migration.

**Option A:** Migrate immediately — populate `SetupChecklist` rows from existing arrays, then remove array columns. Single migration, clean schema. **Risk:** Requires data migration with potential for data loss if arrays have irregular formatting.

**Option B:** Dual-write — keep array columns, add `SetupChecklist` table, populate from arrays lazily on first setup edit. Remove arrays in Phase XV+1. **Risk:** Schema inconsistency during transition.

**Recommendation:** Option B. The `SetupChecklist` model is introduced in Phase XIV and populated lazily. Array columns are deprecated (marked with comment `@deprecated`) but not removed until all rows have been migrated. SQL script verifies 0 rows remain with non-empty arrays before removal migration.

---

### OQ-007: Monthly Review — Derived vs Stored

**Problem:** Monthly review stats (tradeCount, netPnl, winRate, avgDisciplineScore) can be computed from 4 weekly reviews. Should they be stored or computed on demand?

**Option A:** Stored in `monthly_reviews` table (proposed). Created by `weeklyReviews.createMonthly` mutation. Stale if weekly reviews are edited after monthly is created.

**Option B:** Computed on demand from `WeeklyReview` rows. Always fresh. No storage needed for stats fields.

**Recommendation:** Hybrid — store the AI-generated `executiveSummary` and `topPattern` (expensive to regenerate), compute stats fields on demand from weekly review records. `MonthlyReview` model keeps summary/narrative fields but drops stats columns in final schema.

---

### OQ-008: i18n Implementation Strategy

**Problem:** `User.language` exists in schema and is toggled in UI but never persisted or applied. The app has Spanish strings hardcoded throughout.

**Option A:** `next-intl` — official Next.js App Router i18n solution. Supports server components. Translation keys in JSON files per locale.

**Option B:** Remain Spanish-only. Remove language toggle. Simplify scope.

**Option C:** Minimal i18n — translate only UI labels, not error messages. Use `next-intl` with `es` (default) and `en` bundles.

**Recommendation:** Option C for Phase XIV. The product is Spanish-first; full i18n is a 3-4 week effort. Start with the infrastructure (`next-intl`) and move the most visible strings in Phase XIV, continuing in Phase XV. The language toggle in profile should be saved to DB even if it only changes the locale of number/date formatting in Phase XI.

---

*This document is the authoritative target architecture for Trading Journal v2 as of 2026-05-31. It should be updated at the start of each phase to reflect decisions made and design changes discovered during implementation. All new architectural decisions should be recorded in the Open Questions section until resolved, then moved to an ADR entry in `docs/architecture.md`.*
