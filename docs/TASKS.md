# TASKS — Trading Journal v2

> **Version:** 2.0 — restructured 2026-05-30  
> **Source documents:** ASSESSMENT_2026.md · IMPLEMENTATION_ROADMAP.md · ARCHITECTURE.md · DOMAIN_MAP.md  
> **Branch:** `claude/epic-darwin-1XZTX`

---

## Reference

### Status

| Symbol | Meaning |
|---|---|
| `[ ]` | Pending |
| `[/]` | In progress |
| `[x]` | Done |
| `[!]` | Blocked — see Dependencies |

### Priority

| Label | Meaning |
|---|---|
| **P0** | Production risk — worsens with every new trade logged; fix first |
| **P1** | Product correctness — wrong behavior or silent data bug today |
| **P2** | Architecture quality — enables future work, reduces ongoing friction |
| **P3** | Enhancement — valuable but not blocking any other work |

### Complexity

| Label | Files changed | LOC delta | Elapsed |
|---|---|---|---|
| **S** | 1–4 | < 200 | 1–2 days |
| **M** | 4–10 | 200–700 | 3–7 days |
| **L** | 10–20 | 700–2000 | 1–3 weeks |
| **XL** | 20+ | 2000+ | 3–6 weeks |

### Domain tags

`[TRADING]` `[LEARNING]` `[ANALYTICS]` `[FINANCE]` `[PSYCHOLOGY]` `[INFRA]` `[AI]` `[INTEGRATION]` `[SETUP]` `[AUTOMATION]`

---

# PHASE I — Architecture Stabilization

**Tier:** Immediate (Weeks 1–3)  
**Theme:** Fix the three failure modes that compound with every new trade logged.  
**Must complete before:** All other phases. Phase II depends on I-001.

---

## Domain: Analytics

---

### T-I-001 · Server-side dashboard analytics procedure

**Domain:** `[ANALYTICS]` `[TRADING]`  
**Priority:** P0 — scalability crisis  
**Complexity:** L  
**Status:** `[x]`

#### Description

Create `trades.dashboardStats` in `src/server/trpc/routers/trades.ts` — a single tRPC query that returns all dashboard metrics pre-computed. It accepts optional `{ accountId?, from?, to? }` input and returns:

```typescript
type DashboardStats = {
  kpis: {
    total:            number
    wins:             number
    losses:           number
    be:               number
    winRate:          number         // 0–100
    avgR:             number
    netPnl:           number
    pnlMonth:         number
    pnlToday:         number
    expectancyR:      number
    expectancyDollar: number
    profitFactor:     number
    sharpeRatio:      number | null
    bestDay:          { date: string; pnl: number } | null
    worstDay:         { date: string; pnl: number } | null
    tradeStreak:      { count: number; isWin: boolean } | null
  }
  equityCurve:    { date: string; balance: number; accountId: string }[]
  pnlByDate:      { date: string; pnl: number; accountId: string }[]   // last 90 days
  pnlBySymbol:    { symbol: string; pnl: number; trades: number; winRate: number }[]
  sessionStats:   { session: string; trades: number; winRate: number; avgR: number }[]
  hourStats:      { hour: number; trades: number; winRate: number; avgR: number }[]
  setupStats: {
    setupId:    string; name: string; abbr: string; color: string
    trades:     number; winRate: number; avgR: number; cumR: number
    netPnl:     number; equityCurve: number[]
  }[]
  sessionMatrix:  { setupId: string; session: string; trades: number; winRate: number | null }[]
  directionStats: {
    setupId:    string
    longCount:  number; longWr:  number; longAvgR:  number
    shortCount: number; shortWr: number; shortAvgR: number
  }[]
  propFirmStatus: {
    accountId:    string; name: string
    ddPctUsed:    number; dailyLossPct: number
    tradesUsed:   number; tradesMax:    number
    status:       "OK" | "ALERTA"
  }[]
}
```

Implementation uses `calcExpectancyR`, `calcSharpeRatio`, `calcProfitFactor` from `formulas.ts`. `pnlByDate` is capped at last 90 days. `equityCurve` built by sorting trades by date and accumulating P&L from `account.initialBalance`.

#### Motivation

`dashboard/page.tsx` currently fetches ALL trades with full account + setup + event includes (no pagination), then computes 18+ analytics derivations in `useMemo` on the client. At 500 trades the page noticeably lags; at 1000+ trades it freezes. The `trades.stats` procedure that already computes overlapping metrics is not used by any page. Moving analytics to the server keeps computation time O(n) on fast server hardware, returns compact aggregates (not raw arrays), and eliminates the need for every client to independently re-implement formulas.

#### Architectural Rationale

Establishes the pattern that pages are renderers, not calculators. All subsequent analytics work (Phase IV service extraction) composes on top of the logic first proven here. The returned type becomes the stable contract between dashboard UI and server.

#### Dependencies

- None external
- Internal: T-I-002 (pagination) should be completed in the same PR so `trades.list` is never again called by the dashboard

#### Risks

| Risk | Mitigation |
|---|---|
| `equityCurve` with multiple accounts needs per-account starting balance — easy to get wrong | Test against known multi-account scenarios before removing client computation |
| `propFirmStatus.ddPctUsed` uses peak-drawdown calculation — subtle off-by-one in sort order | Sort trades by `(date ASC, createdAt ASC)` before accumulating; test with interleaved account trades |
| Removing client useMemo removes a check that was implicitly validating data shape | Run both server and client computations in parallel during a transition period; compare outputs before switching |

#### Acceptance Criteria

- [x] `trpc.trades.dashboardStats.useQuery()` is callable from the dashboard with no TypeScript errors
- [x] All 4 dashboard tabs render correctly using only `dashboardStats` data — no `trpc.trades.list` call remains in `dashboard/page.tsx`
- [ ] Load time for a user with 500 mock trades is under 300ms (server round-trip only)
- [x] `pnlByDate` array length never exceeds 90 entries regardless of trade history depth
- [x] `propFirmStatus` reflects today's actual closed trades, not all-time trades
- [x] Existing `trades.stats` procedure is preserved (other code may use it)

---

### T-I-002 · Cursor pagination for `trades.list`

**Domain:** `[TRADING]`  
**Priority:** P0 — scalability  
**Complexity:** S  
**Status:** `[x]`

#### Description

Extend `trades.list` input schema:
```typescript
.input(z.object({
  accountId: z.string().uuid().optional(),
  setupId:   z.string().uuid().optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
  limit:     z.number().int().min(1).max(200).default(50),
  cursor:    z.string().uuid().optional(),   // id of last trade on previous page
}).optional())
```

Query uses keyset pagination on `(date DESC, id DESC)`:
```typescript
where: {
  ...(cursor ? { OR: [
    { date: { lt: cursorTrade.date } },
    { date: cursorTrade.date, id: { lt: cursor } },
  ]} : {}),
}
orderBy: [{ date: "desc" }, { id: "desc" }]
take: limit + 1   // fetch one extra to determine hasNextPage
```

Return shape: `{ items: SerializedTrade[]; nextCursor: string | null }`.

The `/trades` page adds a "Load more" button that passes `nextCursor` to the next query.

#### Motivation

`trades.list` currently returns every trade with full nested includes (account, setup, events). At 500 trades × ~2KB/trade this is a 1MB payload before a single row renders. Pagination ensures the trade table is responsive regardless of account age.

#### Architectural Rationale

Establishes the cursor pagination pattern once. Future paginated endpoints (learning resources, account logs) follow the same `{ items, nextCursor }` convention.

#### Dependencies

- T-I-001 should be done concurrently (dashboard stops using `trades.list` entirely)

#### Risks

| Risk | Mitigation |
|---|---|
| Keyset pagination breaks if trades on the same date have ambiguous ordering | Use `(date DESC, id DESC)` composite key — UUID v4 ids provide stable secondary sort |
| Pages that filter by date range (`from`/`to`) may not work well with cursor | Cursor is only relevant when no date range is set; filtered queries return bounded results anyway |

#### Acceptance Criteria

- [x] `trades.list` with `limit: 50` returns exactly 50 trades plus `nextCursor`
- [x] Calling with `cursor: nextCursor` returns the next 50 without duplicates or gaps
- [x] `nextCursor` is `null` when no more trades exist
- [x] `/trades` page shows a "Cargar más" button when `nextCursor` is non-null
- [x] Existing `accountId`, `setupId`, `from`, `to` filters work with pagination
- [x] No regressions in `/reviews` page (uses date-range-filtered `trades.list`)

---

## Domain: Type System

---

### T-I-003 · Replace hand-maintained types with RouterOutputs

**Domain:** `[INFRA]`  
**Priority:** P1 — silent correctness risk  
**Complexity:** M  
**Status:** `[x]`

#### Description

`src/types/index.ts` defines `Trade`, `Account`, `Setup` interfaces manually. These drift from the actual tRPC return types, causing `as unknown as` double casts in `dashboard/page.tsx` and `cuentas/page.tsx`.

Replace all types that originate from tRPC with derived types:

```typescript
// src/types/index.ts — new pattern
import type { RouterOutputs } from "@/server/trpc/root"

export type SerializedTrade   = RouterOutputs["trades"]["list"]["items"][number]
export type SerializedAccount = RouterOutputs["accounts"]["list"][number]
export type SerializedSetup   = RouterOutputs["setups"]["list"][number]
export type DashboardStats    = RouterOutputs["trades"]["dashboardStats"]

// Keep in types/index.ts — UI-only, not from tRPC:
export type TradeTag     = "A+" | "A" | "B" | "Plan" | "Off-plan" | "Impulsivo" | "BE" | "Revanche"
export type TradeSession = "London" | "New York" | "Asia" | "London Close"
export type MarketCategory = "FUTUROS" | "FX" | "CRIPTO" | "EQUITIES"
```

After this change, run `tsc --noEmit`. Fix every type error revealed — do not introduce new casts to suppress them. This will surface real shape mismatches that existed silently.

Specific fixes required:
- `SetupStatus` in `types/index.ts`: add `EN_PRUEBA` and `DESCARTADO` (schema has 4 values; types.ts has 2)
- `Account.propFirmRules` nested object: this does not exist on `SerializedAccount`; remove it and reference flat fields
- Local `Trade` type in `dashboard/page.tsx` (lines 156–186): delete; use `SerializedTrade`
- Local `AccountRow` type in `dashboard/page.tsx`: delete; use `SerializedAccount`

#### Motivation

The `as unknown as Trade[]` cast at line 1732 of `dashboard/page.tsx` is a typed void. TypeScript cannot warn when a schema change breaks the dashboard because the cast swallows the error. Every schema migration carries invisible risk until this is fixed.

#### Architectural Rationale

`RouterOutputs` is derived directly from the router's return type. When a serializer changes, the type changes automatically. This is the correct single source of truth for data shapes that flow through tRPC.

#### Dependencies

- T-I-001 (dashboard's `DashboardStats` type only exists after `dashboardStats` procedure is created)

#### Risks

| Risk | Mitigation |
|---|---|
| Fixing revealed errors is time-consuming if many pages depend on incorrect types | Fix in a focused branch; resolve one file at a time |
| `SerializedTrade` includes Decimal fields as numbers — make sure downstream comparisons still work | They already coerce to numbers in `serializeTrade()`; no change needed |

#### Acceptance Criteria

- [x] `npx tsc --noEmit` passes with 0 errors after the change
- [ ] Zero occurrences of `as unknown as` in any `.tsx` or `.ts` file under `src/` — `aprendizaje/page.tsx` has pre-existing casts (T-II-004); `mock-data/index.ts` uses casts for prototype data
- [x] `SetupStatus` in `types/index.ts` includes all 4 enum values
- [x] `Account` type does not contain `propFirmRules` nested object
- [x] All pages that previously used local `Trade`/`Account` type definitions import from `types/index.ts`

---

### T-I-004 · Type `AccountLog.payload` field

**Domain:** `[INFRA]` `[FINANCE]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

`AccountLog.payload` is currently `Json {}` (untyped). Callers that create AccountLog entries pass different shapes per event type with no TypeScript validation.

Define a discriminated union and use it wherever AccountLog is created or read:

```typescript
// src/types/index.ts
export type AccountLogPayload =
  | { event: "CREATED";        initialBalance: number; currency: string }
  | { event: "PHASE_CHANGE";   from: string; to: string }
  | { event: "WITHDRAWAL";     amount: number; currency: string; reference?: string }
  | { event: "STATUS_CHANGE";  from: string; to: string; note: string }
  | { event: "NOTE";           text: string }
  | { event: "BALANCE_CORRECTION"; variance: number; note: string }
```

Cast `payload` to `AccountLogPayload` when reading; use the type when writing.

#### Motivation

The `cuentas/page.tsx` account history timeline renders AccountLog entries. Without typed payloads, the rendering code accesses `payload.from`, `payload.amount`, etc. with raw object indexing and no IDE completion or compile-time safety.

#### Architectural Rationale

Typed event payloads are the first step toward a full event-sourced account model (Phase IX automation depends on reading AccountLog events reliably).

#### Dependencies

- None

#### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing DB rows have payloads that don't match the new union | Low | Add a default catch-all branch in the discriminated union |

#### Acceptance Criteria

- [x] `AccountLogPayload` discriminated union defined in `types/index.ts`
- [x] All `accountLog.create` calls pass a payload matching the union
- [x] `cuentas/page.tsx` timeline render uses typed field access with no raw index notation
- [x] `tsc --noEmit` passes

---

## Domain: Trading (Prop Firm Enforcement)

---

### T-I-005 · Enforce prop firm constraints in `trades.create`

**Domain:** `[TRADING]`  
**Priority:** P0 — data integrity  
**Complexity:** M  
**Status:** `[x]`

#### Description

In `trades.create`, after loading the account, add a validation block when `account.type === "PROP_FIRM"`:

```typescript
// 1. Daily loss limit
if (account.ddDailyPct) {
  const todayTrades = await ctx.prisma.trade.findMany({
    where: { accountId, userId, date: today, status: "CLOSED" },
    select: { pnl: true }
  })
  const todayLoss = todayTrades.reduce((s, t) => s + Math.min(0, Number(t.pnl ?? 0)), 0)
  const todayLossPct = Math.abs(todayLoss) / Number(account.initialBalance) * 100
  if (todayLossPct >= Number(account.ddDailyPct)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_DAILY_LOSS_LIMIT" })
  }
}

// 2. Max trades per day
if (account.maxTradesPerDay) {
  const todayCount = await ctx.prisma.trade.count({
    where: { accountId, userId, date: today }
  })
  if (todayCount >= account.maxTradesPerDay) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_MAX_TRADES" })
  }
}

// 3. Allowed symbols
if (account.allowedSymbols.length > 0 && !account.allowedSymbols.includes(input.symbol)) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_SYMBOL_NOT_ALLOWED" })
}
```

`RegisterTradeModal` maps these error codes to user-readable messages:
- `PROP_FIRM_DAILY_LOSS_LIMIT` → "Has alcanzado el límite de pérdida diaria para esta cuenta."
- `PROP_FIRM_MAX_TRADES` → "Has alcanzado el máximo de trades diarios para esta cuenta."
- `PROP_FIRM_SYMBOL_NOT_ALLOWED` → "Este símbolo no está permitido en esta cuenta."

#### Motivation

Prop firm accounts carry real financial consequences (FTMO, MyForexFunds, etc. charge for challenge resets). The schema stores these limits but they are only visualized, never enforced. A user logging trades on a PROP_FIRM account can silently exceed all constraints with no system resistance.

#### Architectural Rationale

Business rule enforcement belongs at the mutation boundary, not in display logic. The server is the single enforcement point — it is the only layer that cannot be bypassed by a UI bug or a direct tRPC call.

#### Dependencies

- None. This is self-contained.
- Future: T-III-002 (PropFirmGuard service) will extract this logic into a testable service; the router will call the service instead.

#### Risks

| Risk | Mitigation |
|---|---|
| `account.allowedSymbols` may have mixed case (e.g. `"XAUUSD"` vs `"xauusd"`) | Normalize to uppercase on comparison |
| Non-PROP_FIRM accounts must not be affected | Gate entire block on `account.type === "PROP_FIRM"` strictly |
| DEMO_PROP accounts: should they also be enforced? | Apply enforcement to `DEMO_PROP` as well — it prepares users for real challenges |

#### Acceptance Criteria

- [x] Creating a PROP_FIRM trade that would exceed `ddDailyPct` returns a 400 error with message `PROP_FIRM_DAILY_LOSS_LIMIT`
- [x] Creating a trade when `todayCount >= maxTradesPerDay` returns `PROP_FIRM_MAX_TRADES`
- [x] Creating a trade with a symbol not in `allowedSymbols` (when `allowedSymbols.length > 0`) returns `PROP_FIRM_SYMBOL_NOT_ALLOWED`
- [x] PERSONAL accounts are unaffected — same `trades.create` call succeeds
- [x] `RegisterTradeModal` displays the correct Spanish error message from the error code
- [ ] Tests in `prop-firm-guard.test.ts` cover: at limit, over limit, empty allowedSymbols (passes), non-prop firm account (passes) — deferred to T-III-002

---

### T-I-006 · Auto-transition account to INACTIVE on total drawdown breach

**Domain:** `[TRADING]` `[FINANCE]`  
**Priority:** P1  
**Complexity:** S  
**Status:** `[x]`

#### Description

At the end of `trades.close`, after updating the trade record, for PROP_FIRM accounts:

```typescript
if (account.type === "PROP_FIRM" && account.ddTotalPct) {
  const allTrades = await ctx.prisma.trade.findMany({
    where:  { accountId, userId, status: "CLOSED" },
    select: { pnl: true, date: true },
    orderBy: { date: "asc" }
  })
  const maxDd = computeMaxDrawdown(allTrades.map(t => Number(t.pnl ?? 0)))
  const ddPct  = maxDd / Number(account.initialBalance) * 100

  if (ddPct >= Number(account.ddTotalPct)) {
    await ctx.prisma.account.update({
      where: { id: accountId },
      data:  { status: "INACTIVE", statusNote: `Drawdown máximo alcanzado: ${ddPct.toFixed(2)}%` }
    })
    await ctx.prisma.accountLog.create({
      data: {
        userId, accountId,
        event:   "STATUS_CHANGE",
        payload: { event: "STATUS_CHANGE", from: "ACTIVE", to: "INACTIVE",
                   note: `Drawdown máximo alcanzado: ${ddPct.toFixed(2)}%` }
      }
    })
    // Signal to client that account was auto-deactivated
    return { ...serializedTrade, __accountDeactivated: true }
  }
}
```

Client checks `__accountDeactivated` and shows a prominent alert banner.

#### Motivation

When a prop firm account blows its total drawdown limit, it is no longer tradeable. Detecting this at close time and auto-transitioning state prevents the trader from inadvertently logging more trades on a dead account.

#### Architectural Rationale

Account lifecycle events belong in the Finance domain. Using `AccountLog` for this preserves the audit trail — the transition is traceable to the specific trade that caused it.

#### Dependencies

- T-I-004 (AccountLogPayload type — needed to type the STATUS_CHANGE payload correctly)

#### Risks

| Risk | Mitigation |
|---|---|
| `computeMaxDrawdown` needs to be shared with T-I-001 (dashboard also computes it) | Extract to `formulas.ts` before implementing both tasks |

#### Acceptance Criteria

- [x] Closing a PROP_FIRM trade that pushes total drawdown past `ddTotalPct` transitions account status to `INACTIVE`
- [x] An `AccountLog` event of type `STATUS_CHANGE` is created with the drawdown percentage in the payload
- [x] The `trades.close` response includes a flag indicating the account was deactivated (`{ trade, accountDeactivated }`)
- [x] The client displays a banner informing the user (dismissable alert in `/trades` page)
- [x] PERSONAL accounts are unaffected

---

# PHASE II — Dashboard Modularization

**Tier:** Immediate (Weeks 3–5)  
**Theme:** Extract structure without changing behaviour. Establish the file layout all other pages will follow.  
**Depends on:** Phase I-001 (server analytics must exist before tabs become pure renderers)

---

## Domain: UI / Layout

---

### T-II-001 · Extract dashboard tab components

**Domain:** `[ANALYTICS]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Split the four inline tab functions from `dashboard/page.tsx` into individual files:

```
src/app/dashboard/
  page.tsx                  ← ~80 LOC: DashboardStats query + tab routing
  tabs/
    tab-portfolio.tsx       ← KPI grid, donut, bar chart, accounts table
    tab-operador.tsx        ← equity hero, equity curve, symbol/session/hour tables
    tab-disciplina.tsx      ← behavioral stats, tag breakdown, rule violations
    tab-playbook.tsx        ← setup cards, session matrix, direction performance table
  components/
    prop-firm-rules.tsx     ← PropFirmRules widget (extracted from tab-portfolio)
    chart-tooltip.tsx       ← ChartTooltip component (shared by all tabs)
    card.tsx                ← Card wrapper component (shared by all tabs)
```

Each tab component receives `DashboardStats` as its sole data prop. No `useMemo` analytics — only presentation logic.

#### Motivation

A 1746-LOC single file is untestable and slow to navigate. Any change to a single tab (e.g., adding a new chart to TabPlaybook) requires loading and parsing the entire file. Extraction makes each tab independently reviewable and snapshot-testable.

#### Architectural Rationale

Mirrors the established pattern in `src/components/trades/` (register-trade-modal, edit-trade-modal, trade-detail-panel as separate files). Dashboard becomes the second domain to follow this structure.

#### Dependencies

- T-I-001 (tabs receive `DashboardStats` props; this type only exists after the procedure is created)
- T-I-003 (type contracts must be repaired before tab props are typed correctly)

#### Risks

| Risk | Mitigation |
|---|---|
| Shared state (e.g., `selectedAccountId` in TabOperador) needs to live somewhere if tabs share it | Lift to `page.tsx` as a URL search param or local state; pass as prop |

#### Acceptance Criteria

- [x] `dashboard/page.tsx` is ≤ 100 LOC
- [x] Each tab is a separate file that can be read and understood independently
- [x] `prop-firm-rules.tsx` and `chart-tooltip.tsx` have no inline data logic
- [x] No TypeScript errors
- [x] Dashboard functionality is visually identical after extraction

---

### T-II-002 · Create `use-dashboard-stats` hook

**Domain:** `[ANALYTICS]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

```typescript
// src/app/dashboard/hooks/use-dashboard-stats.ts
export function useDashboardStats(accountId?: string) {
  const query = trpc.trades.dashboardStats.useQuery(
    accountId ? { accountId } : undefined,
    { staleTime: 60_000 }   // 1-minute cache — dashboard doesn't need real-time
  )
  return {
    stats:     query.data,
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  }
}
```

`page.tsx` calls only this hook; it does not call `trpc` directly.

#### Motivation

Isolates the tRPC call from the page component. If the procedure name or input changes, only the hook changes. Tests can mock `use-dashboard-stats` without mocking tRPC internals.

#### Architectural Rationale

The hook pattern — one custom hook per domain-level data dependency per page — is the standard abstraction between tRPC and React UI code.

#### Dependencies

- T-I-001, T-II-001

#### Risks

- None significant.

#### Acceptance Criteria

- [x] `dashboard/page.tsx` calls `useDashboardStats()` and does not import `trpc` directly
- [x] Hook returns typed `DashboardStats | undefined` during loading
- [x] `staleTime: 60_000` prevents re-fetch on every tab switch

---

### T-II-003 · Add `loading.tsx` and `error.tsx` to protected routes

**Domain:** `[INFRA]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Add `loading.tsx` and `error.tsx` to the four highest-traffic routes: `/dashboard`, `/aprendizaje`, `/trades`, `/cuentas`.

**loading.tsx pattern:**
```tsx
// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div>
      <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {Array(8).fill(null).map((_, i) => (
          <div key={i} className="h-20 rounded-[var(--radius)] bg-[var(--panel-2)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

**error.tsx pattern:**
```tsx
// src/app/dashboard/error.tsx
"use client"
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm text-[var(--ink-2)]">No se pudo cargar el dashboard.</p>
      <p className="text-xs text-[var(--ink-3)] font-mono">{error.message}</p>
      <button onClick={reset} className="text-xs text-[var(--accent)] underline">Reintentar</button>
    </div>
  )
}
```

#### Motivation

Currently, a tRPC error on any page renders a blank white screen with no recovery path. A 10-second load shows no feedback. Both are regressions in perceived quality.

#### Architectural Rationale

Next.js App Router's segment-level `loading.tsx` and `error.tsx` are the framework's built-in solution. They require no custom state machine and compose correctly with Suspense boundaries.

#### Dependencies

- None.

#### Risks

- None significant.

#### Acceptance Criteria

- [x] `/dashboard`, `/aprendizaje`, `/trades`, `/cuentas` each have `loading.tsx` and `error.tsx`
- [x] Loading state shows a skeleton that matches the page's approximate layout (not a generic spinner)
- [x] Error state has a "Reintentar" button that calls `reset()`
- [x] No blank white screen on simulated network error

---

### T-II-004 · Extract modals from `/aprendizaje/page.tsx`

**Domain:** `[LEARNING]`  
**Priority:** P2  
**Complexity:** L  
**Status:** `[x]`

#### Description

`aprendizaje/page.tsx` is 1647 LOC with 5 modals inline. Extract:

```
src/app/aprendizaje/
  page.tsx                        ← ~150 LOC: data queries + modal state + grid
  modals/
    add-resource-modal.tsx         ← add/edit resource form (~750 LOC)
    session-review-modal.tsx       ← batch review dialog (~180 LOC)
    impact-modal.tsx               ← SetupImpactModal (~70 LOC)
    link-setup-modal.tsx           ← LinkSetupModal (~45 LOC)
  hooks/
    use-resource-actions.ts        ← modal open/close state + selectedResource
```

`use-resource-actions.ts`:
```typescript
export function useResourceActions() {
  const [addModalOpen, setAddModalOpen]   = useState(false)
  const [editingResource, setEditingResource] = useState<SerializedResource | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [impactResource, setImpactResource]   = useState<SerializedResource | null>(null)
  const [linkResource, setLinkResource]       = useState<SerializedResource | null>(null)
  return { addModalOpen, setAddModalOpen, editingResource, setEditingResource, ... }
}
```

#### Motivation

The five inline modals in `aprendizaje/page.tsx` each contain form state, validation logic, and mutation calls. A bug in the link-setup modal requires navigating 1647 lines. The add-resource form alone is ~750 LOC and cannot be reviewed in isolation.

#### Architectural Rationale

Follows the established `components/trades/` pattern already in the codebase. After this change, the learning domain has the same structural quality as the trading domain.

#### Dependencies

- T-I-003 (type repair ensures extracted modals use `SerializedResource`, not locally defined types)

#### Risks

| Risk | Mitigation |
|---|---|
| Shared state between page and modals (e.g., `selectedResource` drives both the grid highlight and the drawer) | Pass through `useResourceActions` hook; keep state co-located in the hook |

#### Acceptance Criteria

- [x] `aprendizaje/page.tsx` is ≤ 200 LOC
- [x] Each modal file is under 300 LOC and has a single clear responsibility
- [x] `use-resource-actions.ts` encapsulates all modal open/close state
- [x] All existing functionality works identically after extraction
- [x] No TypeScript errors

---

### T-II-005 · Extract modals from `/cuentas/page.tsx`

**Domain:** `[FINANCE]`  
**Priority:** P2  
**Complexity:** L  
**Status:** `[x]`

#### Description

`cuentas/page.tsx` is 1634 LOC. Extract:

```
src/app/cuentas/
  page.tsx                     ← ~150 LOC
  modals/
    create-account-modal.tsx
    edit-account-modal.tsx
    change-status-modal.tsx    ← includes status note for LOST, phase change
    phase-change-modal.tsx
  components/
    account-card.tsx           ← AccountCard component (already a named function; extract to file)
    account-stats.tsx          ← TradeStats computation helpers
  hooks/
    use-account-actions.ts
```

#### Motivation

Account modals contain phase validation logic, prop firm field visibility logic, and status-change workflows. Each is independently complex. Co-location in one file makes it difficult to trace a bug in phase change handling.

#### Architectural Rationale

Consistent with the extraction pattern established in Phase II.

#### Dependencies

- T-I-003

#### Risks

- Same as T-II-004.

#### Acceptance Criteria

- [x] `cuentas/page.tsx` is ≤ 200 LOC
- [x] `AccountCard` renders identically after extraction
- [x] Prop firm fields (phase, dd model, allowed symbols) display correctly in the edit modal
- [x] No TypeScript errors

---

### T-II-006 · Extract modals from `/reviews/page.tsx`

**Domain:** `[PSYCHOLOGY]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

`reviews/page.tsx` is 1159 LOC. Extract:

```
src/app/reviews/
  page.tsx                    ← ~120 LOC
  modals/
    create-review-modal.tsx   ← week selection + form fields
    edit-review-modal.tsx     ← same form, edit mode
    delete-confirm-modal.tsx  ← simple confirmation
  hooks/
    use-review-actions.ts
```

#### Motivation

The weekly review form contains computed-date logic (weekStart/weekEnd from a selected Monday), discipline score display, and three rich text areas. It warrants its own file.

#### Dependencies

- T-I-003

#### Acceptance Criteria

- [x] `reviews/page.tsx` is ≤ 150 LOC
- [x] Week date selection logic is fully encapsulated in `create-review-modal.tsx`
- [x] All existing review CRUD functionality works

---

# PHASE III — Domain Extraction

**Tier:** Medium-term (Months 2–3)  
**Theme:** Move business logic out of tRPC routers into pure, testable domain service functions.  
**Depends on:** Phase I (type repair must be complete before service function signatures are stable)

---

## Domain: Trading

---

### T-III-001 · Extract `TradeService` from trades router

**Domain:** `[TRADING]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/domains/trading/services/trade-service.ts` with pure functions:

```typescript
export function computeClosedTradePnl(
  direction: "LONG" | "SHORT",
  entry:      number,
  closePrice: number,
  size:       number,
  commission: number,
): { rawPnl: number; netPnl: number }

export function computeRMultiple(
  netPnl:    number,
  entry:     number,
  stop:      number,
  size:      number,
): number | null   // null when stop distance is 0

export function computeScaleInAvgEntry(
  existingEntry:   number,
  existingSize:    number,
  addedPrice:      number,
  addedContracts:  number,
): number
```

All three functions are currently inlined in the `close` and `addEvent` procedures. Extract them; update the router to call the service.

#### Motivation

`computeClosedTradePnl` has a direction-dependent sign — a sign error for SHORT trades would produce silently incorrect P&L for the entire account. `computeScaleInAvgEntry` uses a weighted mean formula that must be verified. Neither can currently be unit-tested without mocking an entire tRPC context.

#### Architectural Rationale

Pure functions in a service file are the most testable unit in the system. This is the trading domain's equivalent of `formulas.ts` for financial math.

#### Dependencies

- T-I-003 (type repair)

#### Risks

| Risk | Mitigation |
|---|---|
| Router refactor breaks if service function signature differs from inline formula | Implement service functions first; write tests; only then replace inline code |

#### Acceptance Criteria

- [x] `trade-service.ts` exists with the three exported functions
- [x] `trades.ts` router calls service functions — no inline P&L or avg-entry math
- [x] Tests pass for LONG and SHORT P&L, zero-stop R-multiple, scale-in weighted average
- [x] `tsc --noEmit` passes

---

### T-III-002 · Extract `PropFirmGuard` service

**Domain:** `[TRADING]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Create `src/domains/trading/services/prop-firm-guard.ts` with pure validation functions:

```typescript
export type PropFirmViolation =
  | { type: "DAILY_LOSS_LIMIT";    limitPct: number; currentPct: number }
  | { type: "MAX_TRADES";          limit: number;    current:    number }
  | { type: "SYMBOL_NOT_ALLOWED";  symbol: string;   allowed:    string[] }

export function checkDailyLossLimit(
  todayLoss:      number,
  initialBalance: number,
  ddDailyPct:     number,
): PropFirmViolation | null

export function checkTradeCountLimit(
  todayCount:      number,
  maxTradesPerDay: number,
): PropFirmViolation | null

export function checkSymbolAllowlist(
  symbol:         string,
  allowedSymbols: string[],
): PropFirmViolation | null
```

Refactor T-I-005 to call these functions instead of having inline logic in the router.

#### Motivation

The validation logic from T-I-005 was implemented inline in the router for speed. This task elevates it to a testable service, making the guard logic verifiable independently of the tRPC context.

#### Architectural Rationale

`PropFirmGuard` is the canonical place for all prop firm constraint logic. Future additions (weekly drawdown checks, min trading days, overnight position rules) are added here and automatically inherit test coverage.

#### Dependencies

- T-I-005 (must implement enforcement first; then extract to service)

#### Risks

- None significant. Pure refactor with test coverage.

#### Acceptance Criteria

- [x] All three guard functions are pure (no Prisma, no tRPC)
- [x] Tests cover: at-limit (no violation), over-limit (violation), empty allowedSymbols (no violation), case-insensitive symbol match
- [x] `trades.create` router calls guard functions and maps `PropFirmViolation` to `TRPCError`

---

### T-III-003 · Extract `AccountService` from accounts router

**Domain:** `[TRADING]` `[FINANCE]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/domains/trading/services/account-service.ts`:

```typescript
export function computeRunningBalance(
  initialBalance: number,
  trades:         { pnl: number | null; date: string }[],
): number

export function computeMaxDrawdown(
  pnlSequence: number[],   // ordered by date ascending
): number   // absolute dollar drawdown from peak

export function computeEquityCurve(
  initialBalance: number,
  trades:         { pnl: number | null; date: string }[],
): { date: string; balance: number }[]
```

`computeMaxDrawdown` is currently duplicated in `dashboard/page.tsx` TabPortfolio twice (once for `propAccounts`, once for `accountsWithStats`). `computeEquityCurve` is in `TabOperador`. Both move to this service and are reused by `trades.dashboardStats` (T-I-001).

#### Motivation

The drawdown loop has subtle semantics: it tracks the peak of cumulative P&L, not the peak balance. Getting this wrong produces visually plausible but numerically incorrect drawdown percentages.

#### Dependencies

- T-I-001 (dashboardStats reuses computeMaxDrawdown and computeEquityCurve)

#### Acceptance Criteria

- [x] `computeMaxDrawdown([100, -50, 200, -150, 100])` returns `150` (peak 300, trough 150)
- [x] `computeEquityCurve` returns chronologically sorted points starting at `initialBalance`
- [x] `trades.dashboardStats` uses these functions instead of inline loops
- [x] `dashboard/page.tsx` no longer contains drawdown loop logic

---

## Domain: Learning

---

### T-III-004 · Extract `ReviewScheduler` service

**Domain:** `[LEARNING]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Create `src/domains/learning/services/review-scheduler.ts`:

```typescript
export function calcNextReviewAt(
  reviewInterval: number,
  masteryLevel:   1 | 2 | 3 | 4 | 5,
): Date

export function computeProgressPct(
  currentUnits: number,
  totalUnits:   number | null,
): number | null

export function computeResourceStatus(
  currentUnits: number,
  totalUnits:   number | null,
): "PENDING" | "IN_PROGRESS" | "COMPLETED"
```

These functions are currently inlined in `learning-resources.ts` router. Extract them; update the router to call the service.

#### Motivation

`calcNextReviewAt` contains the core spaced-repetition logic. It is currently inlined in a mutation procedure and untestable without a full tRPC context. Any change to the mastery scaling factors (masteryLevel ≤ 2 → half interval, ≥ 4 → 1.5×) must be manually verified by inspecting DB records.

#### Architectural Rationale

The review scheduler is also needed by the `weekly-learning-summary` edge function. Once extracted to a pure function, a shared package or a Deno-compatible copy can be maintained. Currently, the edge function has to re-implement the same logic independently.

#### Dependencies

- None

#### Risks

- None. Pure refactor.

#### Acceptance Criteria

- [x] `calcNextReviewAt(7, 1)` returns a Date 4 days from now (ceil(7/2))
- [x] `calcNextReviewAt(7, 3)` returns a Date 7 days from now
- [x] `calcNextReviewAt(7, 5)` returns a Date 11 days from now (round(7×1.5))
- [x] `calcNextReviewAt(1, 1)` returns a Date 1 day from now (floor(1/2) = 0, clamped to 1)
- [x] Router delegates to service function; no inline interval math remains in the router

---

### T-III-005 · Extract `StreakService`

**Domain:** `[LEARNING]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Create `src/domains/learning/services/streak-service.ts`:

```typescript
export function computeNewStreak(
  lastReviewDate: Date | null,
  currentStreak:  number,
  today:          Date,   // injected for testability
): { newStreak: number; lastReviewDate: Date }
```

Currently this logic is inlined inside the `createReview` transaction. The `isSameDay`/`isConsecutive` computation uses `lastReviewDate.getTime()` comparisons that are sensitive to timezone and time-of-day. Extracting makes all edge cases testable.

#### Motivation

The streak is a vanity metric that users check daily. An off-by-one error in the date comparison would silently reset streaks — a trust-breaking UX regression.

#### Acceptance Criteria

- [x] Same day (two reviews on 2026-05-30): streak unchanged
- [x] Consecutive day (review on 05-29, review on 05-30): streak + 1
- [x] Gap of 2 days (review on 05-28, review on 05-30): streak resets to 1
- [x] First review ever (lastReviewDate = null): streak = 1
- [x] Router `createReview` calls service function; no inline date math remains

---

### T-III-006 · Extract `DecayDetector` service

**Domain:** `[LEARNING]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Create `src/domains/learning/services/decay-detector.ts`:

```typescript
type ResourceForDecay = {
  id:             string
  status:         string
  nextReviewAt:   Date | null
  reviewInterval: number | null
}

export function detectDecayedResources(
  resources: ResourceForDecay[],
  today:     Date,
): string[]   // array of resource ids that should transition to IN_REVIEW
```

Currently inlined in the `stats` query. The `(todayStart.getTime() - nextReviewAt.getTime()) > interval * 2 * DAY_MS` formula is embedded in a filter that runs during a read query — a surprising side effect.

#### Motivation

Decay detection is a write operation (it triggers `updateMany`) living inside a query procedure. Extracting the detection function makes the side-effect explicit and testable in isolation.

#### Dependencies

- None

#### Acceptance Criteria

- [x] Resource with status MASTERED, overdue by `reviewInterval × 2 + 1` days: returned in decayed set
- [x] Resource with status MASTERED, overdue by `reviewInterval × 2 - 1` days: not returned
- [x] Resource with status MASTERED, null nextReviewAt: not returned
- [x] Resource with status IN_REVIEW (not MASTERED): not returned
- [x] Router `stats` calls service; `updateMany` follows if decayed set is non-empty

---

## Domain: Tests

---

### T-III-007 · Test suite for trading domain services

**Domain:** `[TRADING]`  
**Priority:** P1 — critical path correctness  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/__tests__/services/trading/trade-service.test.ts`:

```typescript
describe("computeClosedTradePnl", () => {
  it("LONG: (closePrice - entry) × size - commission")
  it("SHORT: (entry - closePrice) × size - commission")
  it("commission exceeds gross profit → negative netPnl")
  it("LONG at loss: negative netPnl")
  it("SHORT at loss: negative netPnl")
})

describe("computeRMultiple", () => {
  it("positive R on profitable LONG")
  it("negative R on losing LONG")
  it("zero stop distance → returns null")
  it("R value consistent with P&L / risk-per-unit")
})

describe("computeScaleInAvgEntry", () => {
  it("equal sizes → simple average of prices")
  it("double size added → weighted toward new price")
  it("zero existing size → returns new price")
})
```

Create `src/__tests__/services/trading/prop-firm-guard.test.ts` with cases from T-III-002 acceptance criteria.

Create `src/__tests__/services/trading/account-service.test.ts`:
```typescript
describe("computeMaxDrawdown", () => {
  it("monotonically increasing → 0 drawdown")
  it("one drawdown then recovery → correct peak-to-trough")
  it("multiple drawdowns → returns maximum")
  it("empty sequence → 0")
})
```

#### Motivation

P&L and R-multiple are the financial facts of the platform. A sign error for SHORT trades produces wrong results on half of all trades. These calculations have never been tested. This is the highest-correctness-risk gap in the entire codebase.

#### Dependencies

- T-III-001, T-III-002, T-III-003 (services must be extracted before they can be tested independently)

#### Acceptance Criteria

- [x] All test cases pass with `pnpm vitest`
- [x] 100% branch coverage on `computeClosedTradePnl`, `computeRMultiple`, `checkDailyLossLimit`, `computeMaxDrawdown`

---

### T-III-008 · Test suite for learning domain services

**Domain:** `[LEARNING]`  
**Priority:** P1  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/__tests__/services/learning/review-scheduler.test.ts`:
```typescript
describe("calcNextReviewAt", () => {
  it("masteryLevel 1 with interval 7 → 4 days")
  it("masteryLevel 1 with interval 1 → 1 day (clamped)")
  it("masteryLevel 3 with interval 14 → 14 days (no scaling)")
  it("masteryLevel 5 with interval 7 → 11 days (×1.5 rounded)")
  it("masteryLevel 4 with interval 30 → 45 days")
})
```

Create `src/__tests__/services/learning/streak-service.test.ts` and `decay-detector.test.ts` per T-III-005 and T-III-006 acceptance criteria.

Add to `src/lib/formulas.test.ts`:
```typescript
describe("getISOWeekKey edge cases", () => {
  it("2024-12-30 → 2025-W01 (boundary year)")
  it("2025-01-01 → 2025-W01")
  it("2026-12-28 → 2026-W53 or 2027-W01 (verify against ISO 8601)")
})
```

#### Dependencies

- T-III-004, T-III-005, T-III-006

#### Acceptance Criteria

- [x] All test cases pass
- [x] `getISOWeekKey` boundary tests match known ISO 8601 week numbers
- [x] 100% branch coverage on the three learning services

---

# PHASE IV — Centralized Analytics

**Tier:** Medium-term (Months 3–4)  
**Theme:** Single source of truth for every metric. One computation path; multiple consumers.  
**Depends on:** Phase III (services must exist to be composed)

---

## Domain: Analytics

---

### T-IV-001 · Create `DashboardAnalyticsService`

**Domain:** `[ANALYTICS]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/domains/analytics/services/dashboard-analytics.ts`. Extract the aggregation functions currently inline in the `dashboardStats` procedure (T-I-001) into pure functions:

```typescript
export function buildKpis(trades: MinimalTrade[]): KpiSummary
export function buildEquityCurve(trades: MinimalTrade[], accounts: AccountBalance[]): EquityCurvePoint[]
export function buildPnlByDate(trades: MinimalTrade[], windowDays: number): PnlByDatePoint[]
export function buildSessionStats(trades: MinimalTrade[]): SessionStat[]
export function buildHourStats(trades: MinimalTrade[]): HourStat[]
export function buildPnlBySymbol(trades: MinimalTrade[], limit: number): SymbolStat[]
export function buildPropFirmStatus(accounts: AccountWithLimits[], todayTrades: MinimalTrade[]): PropFirmStatus[]
```

The router calls these functions and passes the results directly to the client. No analytics logic remains inline in the router.

#### Motivation

The functions in `dashboardStats` are currently tested only through an end-to-end tRPC call. Extracting them enables unit tests over pure inputs — much faster and more granular than integration tests.

#### Architectural Rationale

`DashboardAnalyticsService` is the first consumer of `AccountService.computeEquityCurve` and `computeMaxDrawdown` from T-III-003. It validates the service composition pattern established in Phase III.

#### Dependencies

- T-I-001 (procedure must exist first)
- T-III-001, T-III-003

#### Acceptance Criteria

- [x] All 8 functions are pure (no Prisma, no tRPC)
- [x] `trades.dashboardStats` router delegates entirely to service functions
- [x] T-III-007-style tests added for `buildKpis` and `buildEquityCurve`

---

### T-IV-002 · Create `SetupAnalyticsService`

**Domain:** `[ANALYTICS]` `[TRADING]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/domains/analytics/services/setup-analytics.ts` and a new `setups.performanceStats` tRPC procedure:

```typescript
export function computeSetupStats(
  setupId: string,
  trades:  MinimalTrade[],
): SetupStats

export function computeSessionMatrix(
  setups:  { id: string; name: string; abbr: string; color: string }[],
  trades:  MinimalTrade[],
): SessionMatrixRow[]

export function computeDirectionBreakdown(
  setupId: string,
  trades:  MinimalTrade[],
): DirectionStats
```

New tRPC procedure:
```typescript
// setups.ts
performanceStats: protectedProcedure
  .input(z.object({ setupId: z.string().uuid().optional(), period: PeriodEnum.optional() }))
  .query(async ({ ctx, input }) => { ... })
```

This is the standalone endpoint that `TabPlaybook` uses instead of client-side `useMemo`.

#### Motivation

Setup win rate is currently computed in a `useMemo` inside `TabPlaybook` from the full raw trade list. It is also partially duplicated in `learningResources.resourceImpactRanking`. A single canonical service function ends the duplication.

#### Dependencies

- T-III-001 (TradeService provides P&L helpers used in win-rate calculation)

#### Acceptance Criteria

- [x] `setups.performanceStats` procedure returns correctly computed stats for a given setup
- [x] `TabPlaybook` uses `setups.performanceStats` instead of `useMemo`
- [x] `resourceImpactRanking` reuses `SetupAnalyticsService.computeSetupStats` for its win-rate calculation

---

### T-IV-003 · Period-selectable chart data

**Domain:** `[ANALYTICS]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

Extend `trades.dashboardStats` (or add a companion `trades.equityCurve` procedure) with a `period` input:

```typescript
const PeriodEnum = z.enum(["1M", "3M", "6M", "1Y", "ALL"])

// Grain mapping:
// 1M, 3M  → daily aggregation
// 6M, 1Y  → weekly aggregation
// ALL     → monthly aggregation
```

The dashboard UI gains a period selector (FilterBar-style toggle). The equity curve and P&L charts re-fetch with the new period.

#### Motivation

Currently `pnlByDate` is hard-capped at 90 days. Users with multi-year account history cannot see their full equity curve. Conversely, users with 2 weeks of history see an almost-empty chart. A period selector serves both cohorts.

#### Dependencies

- T-IV-001

#### Acceptance Criteria

- [x] Period selector renders in `TabPortfolio` and `TabOperador`
- [x] Selecting "1Y" refetches and renders 52 weekly data points
- [x] Selecting "ALL" renders monthly aggregates (1 bar per month)
- [x] Loading state is shown during refetch

---

### T-IV-004 · Materialized analytics cache (optional)

**Domain:** `[ANALYTICS]` `[INFRA]`  
**Priority:** P3  
**Complexity:** L  
**Status:** `[x]`

#### Description

Add a `trade_stats_cache` table for users whose analytics query exceeds 500ms P99:

```sql
CREATE TABLE trade_stats_cache (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id  UUID,                -- null = portfolio-wide
  period      TEXT NOT NULL,       -- 'all' | '2026-W20' | '2026-05'
  stats_json  JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'), period)
);
```

Cache is invalidated on `trades.close`, `trades.create`, `trades.delete`. On next `dashboardStats` call: if cache for the requested period is younger than 5 minutes, return cached value; otherwise recompute and store.

**Gate behind feature flag — only implement when P99 analytics latency exceeds 500ms for real users.**

#### Motivation

For users with 2000+ trades, even a server-side aggregation query can take 1–2 seconds. The materialized cache makes analytics O(1) for any period that hasn't changed since last computation.

#### Dependencies

- T-IV-001

#### Acceptance Criteria

- [x] Cache hit returns in < 10ms
- [x] Cache miss recomputes and stores; subsequent hit returns cached value
- [x] Closing a trade invalidates the cache for `period = "all"` and the current month/week period

---

# PHASE V — Psychology Systems

**Tier:** Medium-term (Months 3–5)  
**Theme:** Close the behavioral feedback loop. Automate what the "active coach" platform claims to do.  
**Depends on:** Phase III-001 (behavior analytics uses trade data from TradeService)

---

## Domain: Psychology / Reflection

---

### T-V-001 · Rule violation auto-counting from trade tags

**Domain:** `[PSYCHOLOGY]` `[TRADING]`  
**Priority:** P1 — product integrity  
**Complexity:** S  
**Status:** `[x]`

#### Description

Add a `ruleViolationStats` query to `trades.ts`:

```typescript
ruleViolationStats: protectedProcedure
  .input(z.object({
    from: z.string().optional(),
    to:   z.string().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    const VIOLATION_TAGS = ["Impulsivo", "Off-plan", "Revanche"]
    const trades = await ctx.prisma.trade.findMany({
      where: {
        userId: ctx.userId,
        tags:   { hasSome: VIOLATION_TAGS },
        ...(input?.from || input?.to ? {
          date: {
            ...(input?.from && { gte: new Date(input.from) }),
            ...(input?.to   && { lte: new Date(input.to)   }),
          }
        } : {}),
      },
      select: { tags: true, date: true }
    })

    const byTag = VIOLATION_TAGS.reduce((acc, tag) => ({
      ...acc,
      [tag]: trades.filter(t => (t.tags as string[]).includes(tag)).length
    }), {} as Record<string, number>)

    return {
      total: trades.length,
      byTag,
      byMonth: groupByMonth(trades),
    }
  })
```

`TabDisciplina` replaces the `Rule.violationsThisMonth` static field display with this live query.

**Separate decision:** Deprecate `Rule.violationsThisMonth` field and remove it from the schema in a later migration once this query is fully adopted.

#### Motivation

`Rule.violationsThisMonth` has been `0` on every record since the platform launched. The discipline tab in the dashboard shows `0` violations for every rule. This makes the entire psychology system produce no signal. A computed query from actual trade tags fixes this immediately without a migration.

#### Architectural Rationale

Computed-on-demand is preferable to materialized for infrequently-read data. Violation stats are read only when the discipline tab is active or a weekly review is opened.

#### Dependencies

- None

#### Risks

| Risk | Mitigation |
|---|---|
| `VIOLATION_TAGS` list is hardcoded — must match tags used in RegisterTradeModal | Extract to a shared constant in `types/index.ts` |

#### Acceptance Criteria

- [x] `trpc.trades.ruleViolationStats.useQuery()` returns correct counts for a user with known tagged trades
- [x] `TabDisciplina` renders violation counts from this query, not from `Rule.violationsThisMonth`
- [x] Monthly breakdown renders a chart of violation count per month

---

### T-V-002 · Computed `disciplineScore` in weekly review

**Domain:** `[PSYCHOLOGY]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Add `weeklyReviews.computedDisciplineScore` query:

```typescript
computedDisciplineScore: protectedProcedure
  .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
  .query(async ({ ctx, input }) => {
    const [trades, reviews, pendingReviews] = await Promise.all([
      // trades in window
      ctx.prisma.trade.findMany({ where: { userId, date: { gte, lte }, status: "CLOSED" } }),
      // resource reviews done in window
      ctx.prisma.resourceReview.findMany({ where: { userId, createdAt: { gte, lte } } }),
      // pending reviews at window start
      ctx.prisma.learningResource.count({ where: { userId, nextReviewAt: { lte: weekStart }, status: { notIn: ["ABANDONED", "MASTERED"] } } }),
    ])

    const VIOLATION_TAGS  = ["Impulsivo", "Off-plan", "Revanche"]
    const violatingTrades = trades.filter(t => (t.tags as string[]).some(tag => VIOLATION_TAGS.includes(tag)))
    const execution  = trades.length > 0 ? ((trades.length - violatingTrades.length) / trades.length) : 1
    const learning   = pendingReviews > 0 ? Math.min(1, reviews.length / pendingReviews) : 1
    const adherence  = violatingTrades.length === 0 ? 1 : Math.max(0, 1 - (violatingTrades.length / trades.length))

    return {
      score:     Math.round(execution * 50 + learning * 30 + adherence * 20),
      breakdown: {
        execution:  Math.round(execution * 50),
        learning:   Math.round(learning * 30),
        adherence:  Math.round(adherence * 20),
      },
      detail: {
        tradeCount:       trades.length,
        violatingTrades:  violatingTrades.length,
        reviewsDone:      reviews.length,
        pendingReviews,
      }
    }
  })
```

In the weekly review create/edit modal, call this query for the selected week. Pre-fill `disciplineScore` with the computed value; allow manual override. Show the breakdown (`Ejecución: 40/50 · Aprendizaje: 22/30 · Reglas: 14/20`).

#### Motivation

`disciplineScore` is currently a blank text box that defaults to 0. Traders don't fill it in because they don't know what number to enter. A computed suggestion with visible breakdown makes the score meaningful and adoption immediate.

#### Architectural Rationale

The formula is intentionally transparent: traders can see exactly why they scored 72/100. Transparency builds trust. The manual override preserves the trader's judgment as the final input.

#### Dependencies

- T-V-001 (violation tag logic is reused)

#### Acceptance Criteria

- [x] `computedDisciplineScore` returns correct values for a week with known trades and reviews
- [x] Weekly review create/edit modal shows pre-filled score + breakdown
- [x] Trader can increment or decrement the score before saving
- [x] Score breakdown is visible (not just the final number)

---

### T-V-003 · Pre-trade A+ checklist tracking

**Domain:** `[PSYCHOLOGY]` `[TRADING]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

**Schema migration:**
```sql
CREATE TABLE trade_checklist_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id      UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  setup_id      UUID REFERENCES setups(id) ON DELETE SET NULL,
  items_checked TEXT[] NOT NULL DEFAULT '{}',
  items_total   INT   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trade_id)
);
ALTER TABLE trade_checklist_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_user" ON trade_checklist_results FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

**Prisma model:**
```prisma
model TradeChecklistResult {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  tradeId      String   @unique @map("trade_id") @db.Uuid
  setupId      String?  @map("setup_id") @db.Uuid
  itemsChecked String[] @map("items_checked")
  itemsTotal   Int      @map("items_total")
  createdAt    DateTime @default(now()) @map("created_at")
  trade        Trade    @relation(fields: [tradeId], references: [id], onDelete: Cascade)
  @@map("trade_checklist_results")
}
```

**UI change (`register-trade-modal.tsx`):**
When a setup is selected, display `setup.aplusChecklist` items as checkboxes in a collapsible section. On form submit, save checklist results alongside the trade. Auto-tag trade as `A+` if all items are checked.

**New tRPC procedure:**
```typescript
trades.saveChecklistResult({ tradeId, itemsChecked })
```

**Analytics:**
`SetupAnalyticsService.computeSetupStats` gains a new field: `aplusComplianceRate` = trades with all items checked / trades with a checklist present. Replaces the current A+ tag proxy.

#### Motivation

The A+ rate in `TabPlaybook` currently measures trades tagged "A+" — a manual tag. There's no way to know if the trader went through the setup checklist before tagging it. This task captures actual checklist execution, making the A+ metric quantifiably meaningful.

#### Dependencies

- T-II-004 (modal extraction should be done before adding UI to the add-resource modal)
- T-IV-002 (SetupAnalyticsService must be updated to use the new compliance data)

#### Acceptance Criteria

- [x] Migration applied; `trade_checklist_results` table exists with RLS
- [x] Prisma schema regenerated; `TradeChecklistResult` model available
- [x] When a setup is selected in RegisterTradeModal, its `aplusChecklist` items render as checkboxes
- [x] Completing all items auto-tags the trade `A+`; unchecking any item removes the auto-tag
- [x] `SetupAnalyticsService` returns `aplusComplianceRate` for each setup with a checklist

---

### T-V-004 · Session mood and energy tracking

**Domain:** `[PSYCHOLOGY]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

**Schema migration:**
```sql
CREATE TABLE trading_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  session      TEXT NOT NULL,
  pre_mood     SMALLINT CHECK (pre_mood BETWEEN 1 AND 5),
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, session)
);
```

**UI:** An optional "Log session state" floating button in the `/trades` page header. A popover with two slider controls (mood 1–5, energy 1–5) and an optional notes field. Non-intrusive — the user is never blocked from logging a trade by this.

**Analytics:** Add to `TabDisciplina`: correlation table showing average win rate grouped by `pre_mood` bucket (1–2, 3, 4–5). Message: "Rindes mejor cuando tu estado de ánimo es ≥4 (62% WR vs 41% cuando < 3)."

#### Motivation

Mood tracking with trade outcome correlation provides the trader with evidence-based guidance on when to trade and when to step back. The data is only meaningful after 30+ sessions — this is a long-tail feature that pays off over months.

#### Dependencies

- T-V-001 (behavioral analytics pattern already established)

#### Acceptance Criteria

- [x] `trading_sessions` table created with RLS
- [x] "Log sesión" button visible but non-intrusive in trades page
- [x] Saving a session records mood + energy for the given date + session slot
- [x] `TabDisciplina` shows mood vs. win rate correlation when ≥ 10 sessions with mood data exist

---

# PHASE VI — AI Infrastructure

**Tier:** Long-term (Months 5–8)  
**Theme:** Surface patterns from the trader's own data that they cannot see themselves.  
**Depends on:** Phase III, IV, V

---

## Domain: AI

---

### T-VI-001 · `buildTraderContext` — analytics adapter for AI

**Domain:** `[AI]` `[ANALYTICS]`  
**Priority:** P3  
**Complexity:** S  
**Status:** `[x]`

#### Description

Create `src/domains/analytics/ai-context.ts`:

```typescript
export async function buildTraderContext(
  userId:  string,
  prisma:  PrismaClient,
  window?: { from: Date; to: Date },
): Promise<TraderContext> {
  const [performance, behavior, learning, recentTrades, patterns] = await Promise.all([
    getPerformanceSummary(userId, prisma, window),
    getBehaviorSummary(userId, prisma, window),
    getLearningSummary(userId, prisma, window),
    getRecentTrades(userId, prisma, 30),
    detectPatterns(userId, prisma, window),
  ])
  return { performance, behavior, learning, recentTrades, patterns }
}
```

This is the RAG context builder for the Claude AI Coach (T-VI-003). It is deterministic and privacy-preserving — data never leaves the server.

#### Dependencies

- T-IV-001, T-IV-002, T-V-001

#### Acceptance Criteria

- [x] `buildTraderContext` returns a typed `TraderContext` object
- [x] Function is callable from a Next.js API route without tRPC
- [ ] All sub-functions are independently testable with mock Prisma data

---

### T-VI-002 · Behavioral pattern detection engine

**Domain:** `[AI]` `[PSYCHOLOGY]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

Create `src/domains/analytics/services/pattern-detector.ts`:

```typescript
type DetectedPattern = {
  id:          string
  title:       string
  description: string
  confidence:  "high" | "medium" | "low"
  evidence:    string   // "Based on 23 trades over 3 months"
  actionable:  string   // "Consider a 10-minute break rule after 2 consecutive losses"
}

export function detectPatterns(trades: MinimalTrade[]): DetectedPattern[] {
  return [
    detectRevengeTradingPattern(trades),    // Impulsivo tag after a loss
    detectOversizingAfterLoss(trades),      // size > 2× avg when preceded by loss
    detectFridayBias(trades),               // Friday WR vs weekly avg
    detectOvertradingAfterWinStreak(trades),// trade count spike after 3+ wins
    detectSessionFatigue(trades),           // WR decline in trades ≥ 4th of day
  ].filter((p): p is DetectedPattern => p !== null)
}
```

Patterns surface in `TabDisciplina` as an "Insights" section. No LLM required — these are deterministic statistical tests.

#### Dependencies

- T-III-001

#### Acceptance Criteria

- [x] Each detector returns `null` when insufficient data (< 20 trades)
- [x] `detectRevengeTradingPattern` fires when ≥30% of trades tagged Impulsivo follow a losing trade
- [x] Patterns display in `TabDisciplina` with confidence label and evidence string

---

### T-VI-003 · Claude AI Coach chat interface

**Domain:** `[AI]`  
**Priority:** P3  
**Complexity:** L  
**Status:** `[x]`

#### Description

**New API route:** `src/app/api/ai-coach/route.ts` (POST, streaming)

```typescript
// System prompt template:
const systemPrompt = `
You are a trading performance coach reviewing a specific trader's journal data.
Their data for the past 30 days:

PERFORMANCE SUMMARY:
${formatPerformance(context.performance)}

BEHAVIORAL PATTERNS DETECTED:
${formatPatterns(context.patterns)}

RECENT 30 TRADES:
${formatTrades(context.recentTrades)}

PENDING LEARNING REVIEWS: ${context.learning.pendingReviews} resources

---
Rules:
1. Answer ONLY based on the data provided above.
2. Do NOT give generic trading advice not supported by their specific data.
3. If you cannot answer from the data, say so.
4. Keep responses under 200 words.
`
```

**UI:** A floating chat button in the app shell (bottom-right). Opens a drawer with a conversational interface. Powered by `claude-sonnet-4-6` with streaming via the Anthropic SDK.

**Privacy model:** Context is built server-side from the user's own DB. Nothing is persisted by the AI provider beyond the request.

#### Dependencies

- T-VI-001 (context builder)
- T-VI-002 (patterns feed into context)
- External: Claude API key in environment

#### Acceptance Criteria

- [x] Chat interface renders in a drawer accessible from all pages
- [x] Server builds `TraderContext` before every call
- [x] Responses stream token-by-token
- [x] If API key is not configured, chat shows "Configuración pendiente" gracefully
- [x] No trade data is stored in any AI provider's logs (verify by inspecting request body)

---

### T-VI-004 · Trade note semantic search (pgvector)

**Domain:** `[AI]`  
**Priority:** P3  
**Complexity:** L  
**Status:** `[/]`

#### Description

Enable `pgvector` extension on Supabase. Add embedding column to `trades`:

```sql
ALTER TABLE trades ADD COLUMN notes_embedding VECTOR(1536);
CREATE INDEX ON trades USING ivfflat (notes_embedding vector_cosine_ops) WITH (lists = 100);
```

On `trades.create` and `trades.update` when `notes` changes: embed `notes` text and store the vector.

New tRPC procedure:
```typescript
trades.semanticSearch({ query: string, limit?: number })
→ { trades: SerializedTrade[]; similarity: number[] }
```

Uses cosine similarity via `<=>` operator.

#### Motivation

A user with 500 trades cannot find "the trade where I noted I was uncertain about the S/R level" without exact keyword search. Semantic search enables retrieval by meaning.

#### Dependencies

- T-VI-001

#### Acceptance Criteria

- [x] `pgvector` extension enabled on Supabase project
- [ ] New trades get their notes embedded asynchronously (does not block `trades.create` response)
- [ ] `trades.semanticSearch("uncertain about entry")` returns trades with semantically similar notes
- [ ] Search results are scoped to the authenticated user's trades only

---

# PHASE VII — Integrations

**Tier:** Long-term (Months 6–9)  
**Theme:** Reduce trade-logging friction through structured data import.  
**Depends on:** Phase I (T-I-003 type repair ensures imports produce correctly typed objects)

---

## Domain: Integration

---

### T-VII-001 · MT4/MT5 CSV trade import

**Domain:** `[INTEGRATION]` `[TRADING]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

New API route: `POST /api/import/mt4` (multipart/form-data).

**Parser (pure function):**
```typescript
// src/domains/trading/services/mt4-parser.ts
export function parseMt4Statement(csv: string): {
  rows:     ParsedTrade[]
  warnings: string[]
}

type ParsedTrade = {
  ticket:    string     // idempotency key
  openTime:  string
  type:      "buy" | "sell"
  size:      number
  symbol:    string
  openPrice: number
  sl:        number
  tp:        number
  closeTime: string
  closePrice:number
  commission:number
  profit:    number
}
```

**Import flow:**
1. Parse CSV → `ParsedTrade[]`
2. Check for existing trades with matching `(symbol, openTime, size)` hash → mark as duplicate, skip
3. Return dry-run diff: `{ toCreate: ParsedTrade[]; skipped: number; warnings: string[] }`
4. On `confirm: true`: create Trade + TradeEvent (OPEN at openTime, CLOSE at closeTime) for each row in a single transaction

#### Motivation

Manually logging 50 historical trades to backfill an account takes 2+ hours and is the most cited barrier to adoption for experienced traders. CSV import removes this friction entirely.

#### Architectural Rationale

The parser is pure (no DB access). The router applies the import using the existing Trade service. Clean separation: parsing and persistence are independent concerns.

#### Dependencies

- T-I-003 (type repair)

#### Risks

| Risk | Mitigation |
|---|---|
| MT4 CSV format varies by broker | Detect format version from header row; fail with helpful error if unrecognized |
| Large files (5000+ trades) cause timeout on Vercel Edge | Process in batches of 100; return progress stream |

#### Acceptance Criteria

- [x] Parsing a valid MT4 CSV returns correctly typed `ParsedTrade[]`
- [x] Duplicate detection skips trades that already exist (by ticker hash)
- [x] Dry-run returns the count of trades to create and any warnings before committing
- [x] A confirmed import creates Trade + TradeEvent records and is visible in `/trades`
- [x] RLS prevents importing trades to an account owned by another user

---

### T-VII-002 · Balance reconciliation

**Domain:** `[FINANCE]`  
**Priority:** P3  
**Complexity:** S  
**Status:** `[x]`

#### Description

Add a "Sincronizar balance" button in the `/cuentas` account detail view. Clicking it prompts for the current actual broker balance. On submit:

```typescript
// accounts.ts router
syncBalance: protectedProcedure
  .input(z.object({ accountId: z.string().uuid(), actualBalance: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const account       = await ctx.prisma.account.findUniqueOrThrow(...)
    const computedBalance = await computeRunningBalance(account, ctx.prisma)
    const variance      = input.actualBalance - computedBalance

    await ctx.prisma.accountLog.create({
      data: {
        userId: ctx.userId, accountId: input.accountId,
        event:   "BALANCE_CORRECTION",
        payload: { event: "BALANCE_CORRECTION", variance, note: "Manual sync" }
      }
    })
    return { computedBalance, actualBalance: input.actualBalance, variance }
  })
```

The `/cuentas` page shows variance as a KPI: "Diferencia no explicada: $-12.40 (swaps/comisiones)".

#### Motivation

Swap fees, broker commissions not logged as trades, and weekend charges create a growing gap between the platform's computed balance and the actual broker balance. Without reconciliation, the equity curve diverges from reality over months.

#### Dependencies

- T-III-003 (`computeRunningBalance` from AccountService)
- T-I-004 (typed AccountLog payload)

#### Acceptance Criteria

- [x] "Sincronizar balance" button appears on account cards
- [x] Entering an actual balance creates a `BALANCE_CORRECTION` log entry
- [x] The variance is displayed in the account card as "Diferencia: $X"
- [x] Historical corrections accumulate correctly (multiple corrections per account are summed)

---

### T-VII-003 · Trade screenshot storage

**Domain:** `[INTEGRATION]` `[TRADING]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

**Supabase Storage:**
```sql
-- Bucket: trade-screenshots
-- Folder: {userId}/{tradeId}/
-- Policy: authenticated users can read/write only their own userId prefix
```

**UI:** In `RegisterTradeModal` and `EditTradeModal`, add a drag-drop zone:
```tsx
<label className="border-2 border-dashed border-[var(--line)] rounded-[var(--radius-sm)] p-4 text-center cursor-pointer">
  <input type="file" accept="image/*" multiple hidden onChange={handleUpload} />
  <p className="text-xs text-[var(--ink-3)]">Arrastra capturas de pantalla aquí</p>
</label>
```

Upload to `trade-screenshots/{userId}/{tradeId}/{filename}`. Append public URL to `Trade.screenshotUrls[]`.

**Display:** `trade-detail-panel.tsx` renders thumbnails with a lightbox on click.

#### Motivation

`Trade.screenshotUrls[]` has been in the schema since the beginning. The UI has no upload mechanism. Screenshots are the most requested missing feature for post-session review.

#### Dependencies

- T-II-004 (modal extraction — screenshots go in the extracted modal, not the monolith page)

#### Acceptance Criteria

- [x] Supabase Storage bucket `trade-screenshots` created with per-user RLS policy
- [x] Drag-drop upload works in RegisterTradeModal and EditTradeModal
- [x] Files are stored under `{userId}/{tradeId}/` path
- [x] Trade detail panel shows thumbnail grid with lightbox
- [x] Deleting a trade deletes its screenshots from Storage (via DB trigger or mutation cleanup)

---

### T-VII-004 · cTrader CSV import

**Domain:** `[INTEGRATION]` `[TRADING]`  
**Priority:** P3  
**Complexity:** S  
**Status:** `[/]`

#### Description

Same architecture as T-VII-001. Add `src/domains/trading/services/ctrader-parser.ts` with the cTrader column mapping. The import route detects format from CSV header and dispatches to the correct parser.

cTrader key columns: `Position ID`, `Symbol`, `Direction`, `Volume`, `Entry Price`, `Close Price`, `Gross Profit`, `Commission`, `Open time`, `Close time`.

#### Dependencies

- T-VII-001 (import route infrastructure must exist)

#### Acceptance Criteria

- [x] cTrader CSV parses correctly with LONG/SHORT direction mapping
- [x] Gross Profit + Commission → netPnl in the Trade record
- [ ] Duplicate detection uses `Position ID` as the idempotency key

---

# PHASE VIII — Setup Engine

**Tier:** Long-term (Months 7–11)  
**Theme:** Elevate Setup from a trade label to a quantified, versioned trading instrument.  
**Depends on:** Phase III, IV

---

## Domain: Setup / Trading

---

### T-VIII-001 · Setup performance stats server-side procedure

**Domain:** `[SETUP]` `[ANALYTICS]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

New tRPC procedure: `setups.performanceStats`

```typescript
.input(z.object({
  setupId: z.string().uuid().optional(),
  period:  PeriodEnum.optional(),
}))
.query(async ({ ctx, input }) => { ... })
```

Returns per-setup aggregates currently computed in `TabPlaybook` via `useMemo`:
- `trades`, `winRate`, `avgR`, `expectancyR`, `profitFactor`
- `maxConsecutiveLosses`, `avgHoldTimeMinutes`
- `bestSession`, `bestDayOfWeek`
- `equityCurve: number[]`, `weeklyBreakdown`

`TabPlaybook` switches from client `useMemo` to this procedure. The `resourceImpactRanking` win-rate calculation reuses the same service functions.

#### Motivation

Setup stats are currently the largest client-side computation in `TabPlaybook`. A 20-setup user with 1000 trades runs O(n×s) grouping on every tab switch. Server-side computation runs once per cache TTL.

#### Dependencies

- T-IV-002 (SetupAnalyticsService)

#### Acceptance Criteria

- [x] `setups.performanceStats` returns identical values to the current client-side useMemo computation for a known dataset
- [x] `TabPlaybook` uses the procedure; no setup analytics `useMemo` remains
- [x] `resourceImpactRanking` reuses `SetupAnalyticsService.computeSetupStats`

---

### T-VIII-002 · Setup edge definition (expected WR / R targets)

**Domain:** `[SETUP]`  
**Priority:** P3  
**Complexity:** S  
**Status:** `[x]`

#### Description

**Schema migration:**
```sql
ALTER TABLE setups
  ADD COLUMN expected_wr       DECIMAL(5,2),
  ADD COLUMN expected_avg_r    DECIMAL(5,3),
  ADD COLUMN min_r             DECIMAL(5,3),
  ADD COLUMN max_r             DECIMAL(5,3),
  ADD COLUMN edge_updated_at   TIMESTAMPTZ;
```

**UI:** In setup edit modal, add an optional "Definir edge esperado" section:
- Expected win rate (%)
- Expected average R
- Minimum acceptable R per trade

**Dashboard display:** Setup cards in `TabPlaybook` show: actual WR vs. expected WR with color coding:
- Green: within 5pp of expected
- Amber: 5–10pp below expected
- Red: > 10pp below expected

#### Motivation

Without a defined expected edge, a setup's performance has no benchmark. A trader cannot tell if 55% WR is good or bad without knowing they expected 60%. Defining the edge makes performance tracking comparative, not absolute.

#### Dependencies

- T-VIII-001

#### Acceptance Criteria

- [x] Migration applied; setup edit modal shows optional edge fields
- [x] `setups.performanceStats` returns `expectedWr` and `expectedAvgR` alongside actual values
- [x] Setup cards apply color coding based on divergence from expected WR

---

### T-VIII-003 · Data-driven setup lifecycle suggestions

**Domain:** `[SETUP]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

Add `setups.lifecycleCheck` query that evaluates each active setup against configurable rules:

```typescript
type LifecycleSuggestion = {
  setupId:    string
  setupName:  string
  suggestion: "PAUSE" | "REVIEW_EDGE" | "REACTIVATE" | null
  reason:     string
  evidence:   string   // "WR dropped from 62% to 44% over last 20 trades"
}
```

Default rules:
- WR < (expectedWr - 10pp) for last 20+ trades → suggest PAUSE
- WR > (expectedWr + 10pp) for last 20+ trades → suggest REVIEW_EDGE (edge may have grown)
- No trades in 30 days → suggest PAUSE
- 3+ consecutive losses → flag "Losing streak"

Suggestions appear as amber banners in `TabPlaybook` and the `/playbook` page. Max one suggestion per setup per week (debounced). Trader can dismiss permanently.

#### Dependencies

- T-VIII-001, T-VIII-002

#### Acceptance Criteria

- [x] Suggestion for a setup with actual WR 15pp below expected (with 25+ trades) correctly fires "PAUSE"
- [x] No suggestion fires with < 20 trades (insufficient evidence)
- [x] Dismissed suggestions do not reappear for 7 days
- [x] The evidence string cites the number of trades and the time period analyzed

---

### T-VIII-004 · Setup versioning on condition changes

**Domain:** `[SETUP]`  
**Priority:** P3  
**Complexity:** L  
**Status:** `[x]`

#### Description

**Schema migration:**
```sql
CREATE TABLE setup_versions (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id  UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  version   INT  NOT NULL,
  snapshot  JSONB NOT NULL,    -- full setup fields at this point in time
  reason    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(setup_id, version)
);
```

**Trigger condition:** When `setups.update` modifies `aplusChecklist`, `standardChecklist`, `conditions` (if added), or `direction`, create a new version snapshot before applying the update.

**Analytics:** `setups.performanceStats` gains a `versionId?` input. If specified, scopes trades to those logged after the version's `created_at`. Default (no versionId): all trades from current version only.

#### Motivation

A setup evolved over time is not the same strategy. Analyzing a setup's total history after a significant condition change conflates two different edge hypotheses. Versioning lets the trader ask "how has THIS version of the setup performed?" — not the aggregate across all historical variants.

#### Dependencies

- T-VIII-001, T-VIII-002

#### Acceptance Criteria

- [x] `setup_versions` table created; Prisma model available
- [x] Editing `aplusChecklist` creates a new version snapshot before applying the edit
- [x] `setups.performanceStats({ setupId, versionId })` scopes analysis to trades after that version's `created_at`
- [x] Setup detail view shows version history with date and reason

---

# PHASE IX — Automation

**Tier:** Long-term (Months 9–13)  
**Theme:** Reduce manual cognitive overhead. The platform should notify, pre-fill, and monitor without needing the trader to initiate.  
**Depends on:** Phase V, VI, VIII

---

## Domain: Automation

---

### T-IX-001 · Proactive decay notifications (edge function)

**Domain:** `[AUTOMATION]` `[LEARNING]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Add a new edge function invocation type to `weekly-learning-summary`: `type=decay`.

Triggered daily at 08:00 UTC via pg_cron:
```sql
SELECT cron.schedule('decay-check', '0 8 * * *',
  $$SELECT net.http_post(
    url := '{SUPABASE_FUNCTION_URL}/weekly-learning-summary',
    body := '{"type":"decay"}'::jsonb,
    headers := '{"Authorization":"Bearer {CRON_SECRET}"}'::jsonb
  )$$
);
```

For each user with `email_notifications = true`:
1. Find MASTERED resources where `(now - nextReviewAt) > reviewInterval × 2`
2. Skip if already sent a decay email in the last 7 days (check `email_log`)
3. Send email listing the decayed resources with their `nextReviewAt` date

**Email template:**
```
Subject: 3 recursos "Dominado" necesitan revisión

Hola {name},

Llevas más de {days} días sin repasar estos recursos:
• {title1} — vencía el {date}
• {title2} — vencía el {date}

El olvido es normal. Vuelve hoy para mantener tu ventaja.
```

#### Motivation

Currently, decay is only detected when the user loads `/aprendizaje`. A user on a 2-week trading trip returns to find 10 resources decayed without any prior warning. A daily proactive notification catches this while there's still time to prevent decay.

#### Architectural Rationale

Reuses the existing edge function structure, idempotence table, and timezone-aware sending. Adds a new `type` without altering any existing code path.

#### Dependencies

- T-III-006 (DecayDetector logic should be used to identify candidates; edge function imports a copy if needed)

#### Acceptance Criteria

- [x] Edge function `type=decay` sends emails for users with decayed MASTERED resources
- [x] Idempotence: same user does not receive more than one decay email per 7-day window
- [x] Email lists up to 5 decayed resources with dates
- [x] pg_cron schedule fires daily at 08:00 UTC

---

### T-IX-002 · Performance digest in weekly email

**Domain:** `[AUTOMATION]` `[ANALYTICS]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

Extend the existing `weekly-learning-summary` edge function (type=weekly) with a trading performance section:

```typescript
// Fetch from Supabase directly (edge function cannot use tRPC)
const weekTrades = await supabase
  .from("trades")
  .select("pnl, r_multiple, setup_id, tags")
  .eq("user_id", userId)
  .eq("status", "CLOSED")
  .gte("date", weekStartISO)
  .lt("date", weekEndISO)

const tradeCount = weekTrades.data?.length ?? 0
const netPnl     = weekTrades.data?.reduce((s, t) => s + (t.pnl ?? 0), 0) ?? 0
const wins       = weekTrades.data?.filter(t => (t.pnl ?? 0) > 0).length ?? 0
const winRate    = tradeCount > 0 ? Math.round(wins / tradeCount * 100) : null
```

Added email section:
```html
<h3>📈 Tu semana de trading</h3>
<p>${tradeCount} trades · ${netPnl >= 0 ? "+" : ""}$${netPnl.toFixed(0)} · ${winRate ?? "—"}% WR</p>
```

If `tradeCount === 0`, the section reads: "Sin trades registrados esta semana."

#### Dependencies

- T-IX-001 (edge function infrastructure established)
- T-VI-002 (if behavioral pattern is detected for the week, include it in the email)

#### Acceptance Criteria

- [x] Weekly email includes trading performance section when `tradeCount > 0`
- [x] Net P&L sign is correct (+ for positive weeks)
- [x] Section is omitted gracefully when no trades exist for the week
- [x] Section respects `email_notifications = false` (already handled by existing fan-out)

---

### T-IX-003 · Prop firm account health monitor

**Domain:** `[AUTOMATION]` `[TRADING]`  
**Priority:** P2  
**Complexity:** M  
**Status:** `[x]`

#### Description

Add a new edge function invocation type: `type=prop_firm_health`.

Triggered daily after market close (e.g., 22:00 UTC):

```typescript
// For each PROP_FIRM account with status = ACTIVE:
const todayTrades = await supabase.from("trades")
  .select("pnl, date").eq("account_id", accountId).eq("date", today).eq("status", "CLOSED")

const todayLoss = todayTrades.data?.reduce((s, t) => s + Math.min(0, t.pnl ?? 0), 0) ?? 0
const todayLossPct = Math.abs(todayLoss) / initialBalance * 100
const dailyLimitPct = account.dd_daily_pct ?? 0

if (dailyLimitPct > 0 && todayLossPct >= dailyLimitPct * 0.8) {
  // Send "approaching daily limit" alert
}
```

**Email:**
```
Subject: ⚠️ Alerta: cerca del límite diario — {accountName}

Hola {name},

Tu cuenta {accountName} ha utilizado el {pct}% de su límite de pérdida diaria
({loss} de {limit}).

Revisa si debes seguir operando hoy.
```

#### Dependencies

- T-I-005 (prop firm enforcement must be in place before monitoring matters)

#### Acceptance Criteria

- [ ] Alert fires when daily loss reaches 80% of `ddDailyPct`
- [ ] Alert fires when total drawdown reaches 90% of `ddTotalPct`
- [ ] Idempotence: at most 1 alert per account per day per alert type
- [ ] No alert for accounts with `status != ACTIVE` or `type != PROP_FIRM`

---

### T-IX-004 · Weekly review auto pre-fill

**Domain:** `[AUTOMATION]` `[PSYCHOLOGY]`  
**Priority:** P3  
**Complexity:** M  
**Status:** `[x]`

#### Description

When the user opens the "New weekly review" modal for a given week, pre-populate all numeric fields from actual data:

```typescript
weeklyReviews.prefill: protectedProcedure
  .input(z.object({ accountId: z.string().uuid(), weekStart: z.string() }))
  .query(async ({ ctx, input }) => {
    const [trades, reviewCount, computedScore] = await Promise.all([
      // trades in week window for account
      // resource reviews done in window
      // disciplineScore from T-V-002 formula
    ])
    return {
      tradeCount:      trades.length,
      netPnl:          trades.reduce(...),
      winRate:         ...,
      disciplineScore: computedScore.score,
      disciplineBreakdown: computedScore.breakdown,
      suggestedWhatWorked:  topSetupThisWeek?.name ?? "",
      suggestedToImprove:   worstSetupThisWeek?.name ?? "",
    }
  })
```

Pre-filled values are shown as editable defaults. The trader writes narrative over the scaffolding — not into a blank form.

#### Dependencies

- T-V-002 (computed discipline score)
- T-IV-002 (setup analytics for top/worst setup)

#### Acceptance Criteria

- [x] Opening "New weekly review" shows pre-filled trade count, P&L, win rate, discipline score
- [x] Pre-filled values match actual trade data for the selected week
- [x] All pre-filled fields are editable before saving
- [x] Opening the modal for a week with no trades shows 0s (not empty)

---

### T-IX-005 · Monthly rule violation reset (housekeeping)

**Domain:** `[AUTOMATION]` `[PSYCHOLOGY]`  
**Priority:** P2  
**Complexity:** S  
**Status:** `[x]`

#### Description

**Option A (preferred):** Remove `Rule.violationsThisMonth` field entirely. Replace with `trades.ruleViolationStats` computed query (T-V-001). No reset logic needed.

**Option B (if field retained):** Add pg_cron job:
```sql
SELECT cron.schedule(
  'reset-rule-violations',
  '0 0 1 * *',
  $$UPDATE rules SET violations_this_month = 0$$
);
```

#### Dependencies

- T-V-001 (must be implemented first to confirm computed approach works)

#### Acceptance Criteria

- [x] **Option A:** `violations_this_month` column removed from schema; `TabDisciplina` uses `ruleViolationStats` query
- **Option B:** pg_cron job exists and fires on the 1st of each month

---

# Appendix — Dependency Graph

```
T-I-001 (dashboardStats)
  ├── T-I-002 (pagination) [parallel]
  ├── T-I-003 (type repair) [after I-001]
  ├── T-II-001 (tab extraction) [after I-001]
  │    └── T-II-002 (hook) [after II-001]
  ├── T-II-004 (aprendizaje extraction) [after I-003]
  ├── T-II-005 (cuentas extraction) [after I-003]
  └── T-II-006 (reviews extraction) [after I-003]

T-I-005 (prop firm enforcement)
  └── T-III-002 (PropFirmGuard service) [refactor of I-005]
       └── T-III-007 (trading tests) [after III-002]

T-III-001 (TradeService)
  ├── T-III-007 (trading tests)
  ├── T-III-003 (AccountService)
  │    └── T-IV-001 (DashboardAnalytics)
  │         └── T-IV-002 (SetupAnalytics)
  │              └── T-VIII-001 (setup perf stats)
  │                   ├── T-VIII-002 (edge definition)
  │                   ├── T-VIII-003 (lifecycle suggestions)
  │                   └── T-VIII-004 (versioning)
  └── T-VI-002 (pattern detection)

T-III-004 (ReviewScheduler)
  └── T-III-008 (learning tests)

T-III-005 (StreakService)
  └── T-III-008

T-III-006 (DecayDetector)
  ├── T-III-008
  └── T-IX-001 (decay notifications)

T-V-001 (rule violations)
  ├── T-V-002 (discipline score)
  │    ├── T-IX-004 (review pre-fill)
  │    └── T-IX-002 (weekly email digest)
  └── T-IX-005 (monthly reset)

T-VI-001 (AI context builder)
  ├── T-VI-003 (Claude coach) [needs I-001, III, IV]
  └── T-VI-004 (embeddings)
```

---

# Appendix — Progress Metrics

| Metric | Baseline | After Phase II | After Phase IV | After Phase VI |
|---|---|---|---|---|
| Dashboard P99 load (500 trades) | ~1500ms | ~150ms | ~100ms | ~100ms |
| Dashboard page LOC | 1746 | ~80 | ~80 | ~80 |
| Largest page file LOC | 1746 | ~400 | ~200 | ~200 |
| Service test coverage | 0% | 0% | 80%+ | 80%+ |
| `as unknown as` casts | 3 | 0 | 0 | 0 |
| Analytics computed in 2+ places | 18 | 4 | 0 | 0 |
| Violations auto-counted | ❌ | ❌ | ❌ | ✅ |
| Discipline score from data | ❌ | ❌ | ❌ | ✅ |
| Prop firm limits enforced | ❌ | ✅ | ✅ | ✅ |
| AI features available | 0 | 0 | 0 | 3 |
