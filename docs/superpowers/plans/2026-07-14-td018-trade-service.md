# TD-018 — Trade Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer la orquestación inline de `src/server/trpc/routers/trades.ts` (1146 LOC) a un
service layer en `src/server/services/trades/`, dejando el router como validación zod + delegación,
sin cambio de comportamiento.

**Architecture:** Refactor conservador de "mover, no reescribir". La lógica de **cálculo** ya vive
en `domains/` (dashboard-analytics, risk-enforcement, trade-service puro, rules engine) — TD-018
estaba sobre-estimado en ese eje. Lo que se extrae es la **orquestación I/O** (pipeline de
dashboardStats, workflow de guards de create, close, embeddings, serializadores), siguiendo el
patrón existente de `src/server/services/behavior/commitment-service.ts` ("I/O shell: load data,
run pure logic, persist"). Los servicios reciben `(prisma, userId, input)`; los throws
(`TRPCError`/`AppError`) se mueven tal cual — comportamiento idéntico byte a byte donde sea posible.

**Tech Stack:** TypeScript, tRPC v11, Prisma (cliente generado en `@/lib/generated/prisma/client`),
vitest. Binarios vía `./node_modules/.bin/` desde `src/`. Node 24 (nvm).

## Global Constraints

- Refactor **behavior-preserving**: cero cambios en schemas zod, formas de salida, mensajes de error
  ni orden de efectos. `RouterOutputs` no debe cambiar (así `src/types/index.ts` L4 sigue derivando
  `SerializedTrade` intacto).
- Las referencias de líneas son sobre `src/server/trpc/routers/trades.ts` @ commit `a28df30`.
- Sustituciones mecánicas al mover cuerpos: `ctx.prisma` → `prisma`, `ctx.userId` → `userId`,
  `ctx.supabase` → `supabase` (solo delete). Nada más cambia dentro de los cuerpos.
- Tras cada task: tests del router en verde (`./node_modules/.bin/vitest run __tests__/routers/trades.test.ts`
  desde `src/`) + commit. Suite COMPLETA + tsc + eslint solo en el task final (gate de push).
- Tipo prisma en servicios: `import type { PrismaClient } from "@/lib/generated/prisma/client"`
  (patrón commitment-service).
- Rama: `feat/td-018-trade-service` desde `origin/main`. El usuario mergea el PR; no mergear a main.

---

### Task 0: Rama

- [ ] **Step 1:** `git checkout -b feat/td-018-trade-service origin/main`

### Task 1: Serializers

**Files:**
- Create: `src/server/services/trades/serializers.ts`
- Modify: `src/server/trpc/routers/trades.ts` (borrar L115-176, ajustar imports)

**Interfaces:**
- Produces: `serializeAccount(a: RawAccount)`, `serializeTrade(t: RawTrade)`,
  `type SerializedTrade = ReturnType<typeof serializeTrade>`, `type RawTrade`, `type RawAccount`.

- [ ] **Step 1:** Crear `src/server/services/trades/serializers.ts` con este esqueleto; los cuerpos
  de `serializeAccount` y `serializeTrade` se mueven VERBATIM de trades.ts L120-174:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Trade serializers (TD-018) — Prisma Decimal/Date → JSON-safe client shapes.
// Shared by the trades router and trade services. Output shape is the public
// tRPC contract (types/index.ts derives SerializedTrade from RouterOutputs).
// ─────────────────────────────────────────────────────────────────────────────
import type { Prisma } from "@/lib/generated/prisma/client"

export type RawAccount = Prisma.AccountGetPayload<Record<string, never>>
export type RawTrade   = Prisma.TradeGetPayload<{
  include: { account: true; setup: true; events: true }
}>

export function serializeAccount(a: RawAccount) { /* body = trades.ts L121-138 verbatim */ }
export function serializeTrade(t: RawTrade) { /* body = trades.ts L142-173 verbatim */ }
export type SerializedTrade = ReturnType<typeof serializeTrade>
```

- [ ] **Step 2:** En trades.ts: borrar L115-176 (tipos + funciones + export type), añadir
  `import { serializeTrade } from "@/server/services/trades/serializers"` y conservar el export
  público con `export type { SerializedTrade } from "@/server/services/trades/serializers"`.
- [ ] **Step 3:** `./node_modules/.bin/vitest run __tests__/routers/trades.test.ts` desde `src/` → PASS.
- [ ] **Step 4:** Commit `refactor(td-018): serializers de trade a server/services/trades`.

### Task 2: Embedding service

**Files:**
- Create: `src/server/services/trades/embedding-service.ts`
- Modify: `src/server/trpc/routers/trades.ts` (borrar L36-54; reducir `semanticSearch` L1071-1109 y
  `backfillEmbeddings` L1114-1145 a delegación)

**Interfaces:**
- Consumes: `serializeTrade` (Task 1).
- Produces:
  - `scheduleEmbedding(prisma: PrismaClient, userId: string, tradeId: string, notes: string): void`
  - `semanticSearch(prisma, userId, input: { query: string; limit: number })` → mismo shape que hoy
  - `backfillEmbeddings(prisma, userId, limit: number)` → `{ embedded, failed, remaining, error? }`

- [ ] **Step 1:** Crear `embedding-service.ts`: header de imports
  (`embedText` de `@/lib/ai/embeddings`, `resolveEmbeddingCall` de `@/lib/ai/resolve-provider`,
  `serializeTrade` de `./serializers`, `PrismaClient` type). Mover VERBATIM: cuerpo de
  `scheduleEmbedding` (L37-54, firma nueva con `prisma` primero), cuerpo del query de
  `semanticSearch` (L1077-1108) y de `backfillEmbeddings` (L1117-1144).
- [ ] **Step 2:** En el router: `semanticSearch`/`backfillEmbeddings` quedan como
  `.query(({ ctx, input }) => semanticSearch(ctx.prisma, ctx.userId, { query: input.query, limit: input.limit }))`
  y `.mutation(({ ctx, input }) => backfillEmbeddings(ctx.prisma, ctx.userId, input?.limit ?? 200))`.
  Los 2 call-sites de `scheduleEmbedding` (create L691, update L772) pasan a
  `scheduleEmbedding(ctx.prisma, ctx.userId, trade.id, input.notes ?? "")`.
- [ ] **Step 3:** vitest router → PASS. Commit `refactor(td-018): embedding-service (schedule/search/backfill)`.

### Task 3: Dashboard service + primer test de orquestación

**Files:**
- Create: `src/server/services/trades/dashboard-service.ts`
- Test: `src/__tests__/services/trades/dashboard-service.test.ts` (NUEVO — hoy la orquestación tiene 0 tests)
- Modify: `src/server/trpc/routers/trades.ts` (borrar L56-109 tipo + L245-495 cuerpo)

**Interfaces:**
- Produces:
  - `type DashboardStatsInput = { accountId?: string; from?: string; to?: string; period?: "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"; includePractice?: boolean }`
  - `getDashboardStats(prisma: PrismaClient, userId: string, input: DashboardStatsInput | undefined): Promise<DashboardOutput>`
  - `type DashboardOutput` (movido de L56-109).

- [ ] **Step 1 (test primero):** Crear `src/__tests__/services/trades/dashboard-service.test.ts`.
  Cubre la lógica inline más arriesgada: la partición practice (financiero excluye
  DEMO_PERSONAL/DEMO_PROP/BACKTEST por defecto; discipline las cuenta; una cuenta explícita gana):

```ts
import { describe, it, expect, vi } from "vitest"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"

vi.mock("@/domains/analytics/services/analytics-cache", () => ({
  isCacheEnabled: vi.fn().mockReturnValue(false),
  getCachedStats: vi.fn(), setCachedStats: vi.fn(), invalidateCache: vi.fn(),
}))

const USER = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const REAL = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"
const DEMO = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4"

function acct(id: string, type: string) {
  return {
    id, name: type, type, status: "ACTIVE", currency: "USD",
    initialBalance: 10000, ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null,
    ddTotalPct: null, ddModel: null, maxTradesPerDay: null, allowedSymbols: [],
    maxLeverage: null, targetLeverage: null, consistencyPct: null, targetPct: null,
    minTradingDays: null, noWeekendHolding: false,
  }
}
function tradeRow(accountId: string, pnl: number) {
  return {
    id: `t-${accountId}`, accountId, symbol: "MNQ", direction: "LONG",
    session: "New York", openTime: "09:30", closeTime: "10:00",
    pnl, rMultiple: 1, tags: [], date: new Date("2026-07-10"),
    setupId: null, entry: 100, stop: 99, target: 102, size: 1,
  }
}
function mockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "UTC" }),
      findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: null }),
    },
    account: { findMany: vi.fn().mockResolvedValue([acct(REAL, "PERSONAL"), acct(DEMO, "DEMO_PERSONAL")]) },
    trade: {
      findMany: vi.fn()
        .mockResolvedValueOnce([tradeRow(REAL, 100), tradeRow(DEMO, 500)]) // closed
        .mockResolvedValueOnce([])                                          // open
        .mockResolvedValueOnce([]),                                         // today
    },
    setup: { findMany: vi.fn().mockResolvedValue([]) },
    tradeChecklistResult: { findMany: vi.fn().mockResolvedValue([]) },
    market: { findMany: vi.fn().mockResolvedValue([]) },
  } as never
}

describe("getDashboardStats — practice partition", () => {
  it("excludes practice accounts from financial stats by default, keeps them in discipline", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, undefined)
    expect(out.accountStats.map(s => s.accountId)).toEqual([REAL])
    expect(out.recentTrades).toHaveLength(1)
    expect(out.recentTrades[0].pnl).toBe(100)
    // discipline es conductual: ve los trades de las 2 cuentas
    expect(out.discipline.rDistribution.reduce((n, b) => n + b.count, 0)).toBe(2)
  })

  it("includes practice accounts when includePractice=true", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, { includePractice: true })
    expect(out.accountStats.map(s => s.accountId).sort()).toEqual([REAL, DEMO].sort())
    expect(out.recentTrades).toHaveLength(2)
  })
})
```

  Nota: si algún assert de shape falla por semántica de builder (p. ej. `rDistribution` con
  rMultiple=1 cae en otro bucket), ajustar el ASSERT al comportamiento actual observado — el test
  documenta el comportamiento existente, nunca se cambia el servicio para complacer al test.

- [ ] **Step 2:** Correrlo → FAIL (módulo no existe).
- [ ] **Step 3:** Crear `dashboard-service.ts`: mover VERBATIM el tipo `DashboardOutput` (L56-109) y
  el cuerpo del query (L245-494) dentro de
  `export async function getDashboardStats(prisma: PrismaClient, userId: string, input?: DashboardStatsInput): Promise<DashboardOutput>`.
  Imports que migran del router: `dashboard-analytics` (builders + tipos), `setup-analytics`,
  `isPracticeType`, `parsePointValue`, `analytics-cache`, `fx`, `datetime/local`.
- [ ] **Step 4:** Router: `dashboardStats` queda `.query(({ ctx, input }) => getDashboardStats(ctx.prisma, ctx.userId, input))`
  (el schema zod NO se toca).
- [ ] **Step 5:** Test nuevo PASS + vitest router PASS. Commit
  `refactor(td-018): dashboard-service + test de partición practice`.

### Task 4: Read service (list / violaciones / emoción / patrones)

**Files:**
- Create: `src/server/services/trades/trade-read-service.ts`
- Modify: `src/server/trpc/routers/trades.ts` (cuerpos de `list` L188-232, `ruleViolationStats`
  L942-971, `emotionFeedback` L1022-1032, `patternInsights` L1037-1067)

**Interfaces:**
- Consumes: `serializeTrade` (Task 1).
- Produces (mismas formas de retorno que hoy):
  - `listTrades(prisma, userId, input?: { accountId?: string; setupId?: string; from?: string; to?: string; limit?: number; cursor?: string })` → `{ items, nextCursor }`
  - `getRuleViolationStats(prisma, userId, input?: { from?: string; to?: string })` → `{ total, byTag, byMonth }`
  - `getEmotionFeedback(prisma, userId, emotion: string)`
  - `getPatternInsights(prisma, userId)`

- [ ] **Step 1:** Crear el servicio moviendo los 4 cuerpos VERBATIM (imports que migran:
  `VIOLATION_TAGS` de `@/types`, `feedbackForEmotion`, `detectPatterns`, `MinimalTrade` type).
- [ ] **Step 2:** Router: cada procedure queda en una línea de delegación; schemas zod intactos.
- [ ] **Step 3:** vitest router PASS. Commit `refactor(td-018): trade-read-service`.

### Task 5: Write service — create

**Files:**
- Create: `src/server/services/trades/trade-write-service.ts`
- Modify: `src/server/trpc/routers/trades.ts` (cuerpo de `create` L532-694)

**Interfaces:**
- Consumes: `serializeTrade`, `scheduleEmbedding`.
- Produces: `createTrade(prisma: PrismaClient, userId: string, input: CreateTradeInput): Promise<SerializedTrade>`
  donde `CreateTradeInput` es el tipo TS explícito equivalente al schema zod de `create`
  (L498-531) — el router pasa el input parseado; tsc verifica compatibilidad estructural.

- [ ] **Step 1:** Crear `trade-write-service.ts` con `CreateTradeInput` (transcribir el shape del
  zod L498-531 a TS: opcionales con `?`, enums como union literals) y `createTrade` con el cuerpo
  L533-694 VERBATIM (guards 1-4, budget guard, riskPct fallback, create, ensureTagRows, post-rules,
  tradeEvent OPEN, evaluateAndLock, invalidateCache, scheduleEmbedding, evaluateRuledCommitments).
  Imports que migran: `TRPCError`, `AppError`, `assertTradeable`/`evaluateAndLock`/`EnforceableAccount`,
  `checkTradeCountLimit`/`checkSymbolAllowlist`, `evaluateBudgetGuard`, `deriveRiskPct`, `runRules`,
  `buildContext`, `ensureTagRows`, `evaluateRuledCommitmentsOnTrade`, `invalidateCache`/`isCacheEnabled`.
- [ ] **Step 2:** Router: `create` queda `.mutation(({ ctx, input }) => createTrade(ctx.prisma, ctx.userId, input))`.
- [ ] **Step 3:** vitest router PASS (los guards de lock/setup/drawdown se prueban por esta vía).
  Commit `refactor(td-018): createTrade a trade-write-service`.

### Task 6: Write service — update + close

**Files:**
- Modify: `src/server/services/trades/trade-write-service.ts` (añadir), router (cuerpos L724-773 y L787-849)

**Interfaces:**
- Produces:
  - `updateTrade(prisma, userId, input: UpdateTradeInput): Promise<SerializedTrade>` (shape del zod L698-723)
  - `closeTrade(prisma, userId, input: CloseTradeInput): Promise<{ trade: SerializedTrade; accountLocked: boolean; lockReason: string | null }>` (shape del zod L777-786)

- [ ] **Step 1:** Mover ambos cuerpos VERBATIM (imports extra: `computeClosedTradePnl`,
  `computeRMultiple`, `parsePointValue`, `runIntervention`).
- [ ] **Step 2:** Router delega; vitest router PASS. Commit
  `refactor(td-018): updateTrade/closeTrade a trade-write-service`.

### Task 7: Write service — addEvent + delete + saveChecklistResult

**Files:**
- Modify: `src/server/services/trades/trade-write-service.ts` (añadir), router (cuerpos L861-901, L916-934, L981-1014)

**Interfaces:**
- Produces:
  - `addTradeEvent(prisma, userId, input: { tradeId: string; type: "STOP_MOVE" | "TRAIL_STOP" | "TAKE_PROFIT_MOVE" | "PARTIAL_CLOSE" | "SCALE_IN" | "NOTE"; price?: number; contracts?: number; notes: string; timestamp?: string })`
  - `deleteTrade(prisma, supabase, userId, id: string)` con
    `type SupabaseServer = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>`
  - `saveTradeChecklistResult(prisma, userId, input: { tradeId: string; setupId?: string; itemsChecked: string[]; itemsTotal: number })`

- [ ] **Step 1:** Mover los 3 cuerpos VERBATIM (imports extra: `computeScaleInAvgEntry`,
  `evaluateChecklist`). `delete` recibe `ctx.supabase` como segundo parámetro.
- [ ] **Step 2:** Router delega; el stub deprecado `stats` (L904-912) se queda en el router tal cual.
- [ ] **Step 3:** vitest router PASS. Commit `refactor(td-018): addEvent/delete/saveChecklist a trade-write-service`.

### Task 8: Gates finales + docs + PR

- [ ] **Step 1:** Desde `src/`: suite COMPLETA `./node_modules/.bin/vitest run` → todo verde.
- [ ] **Step 2:** `./node_modules/.bin/tsc --noEmit` → 0 errores. `./node_modules/.bin/eslint .` → 0 errores.
- [ ] **Step 3:** Verificar el resultado del refactor: `wc -l src/server/trpc/routers/trades.ts`
  (esperado ~350-420 LOC: imports + schemas zod + delegaciones + stub `stats`).
- [ ] **Step 4:** `graphify update .` (regla del repo tras modificar código).
- [ ] **Step 5:** Docs: en `docs/STATUS.md` §3, fila TD-018 → `✅ resuelto — 2026-07-14, PR #<n>:
  orquestación extraída a src/server/services/trades/ (serializers, embedding, dashboard, read,
  write); router = zod + delegación (~<n> LOC); el cálculo ya vivía en domains/ (deuda
  sobre-estimada, como anticipaba §1)`. Entrada en `docs/CHANGELOG.md`. Actualizar el prompt de
  retoma (§6) — siguiente pieza: check de drift SQL↔Prisma.
- [ ] **Step 6:** Commit docs + push rama + `gh pr create` (base main, título
  `refactor(td-018): extrae trade services del router trades`, cuerpo con los 3 ejes
  backend/observable-en-UI/razón-de-ser). El usuario mergea.

## Self-Review

- **Cobertura:** los 14 procedures del router quedan cubiertos: list/ruleViolationStats/
  emotionFeedback/patternInsights (T4), dashboardStats (T3), create (T5), update/close (T6),
  addEvent/delete/saveChecklistResult (T7), semanticSearch/backfillEmbeddings/scheduleEmbedding
  (T2), serializers (T1). `stats` deprecado se queda a propósito.
- **Tipos:** `SerializedTrade` definido una vez en serializers (T1) y consumido por T2/T4/T5/T6;
  `PrismaClient` uniforme; `SupabaseServer` solo en delete.
- **Riesgo principal:** `dashboardStats` (sin tests previos) — mitigado con el test nuevo de T3
  escrito ANTES de mover el código.
