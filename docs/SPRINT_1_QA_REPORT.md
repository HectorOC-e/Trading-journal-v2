# Sprint 1 QA Report

**Date:** 2026-05-31
**Auditor role:** Independent Staff Engineer
**Branch:** `claude/epic-darwin-1XZTX`
**Commits in scope:** `a83aa41` → `9bdf47f` (5 commits)
**Assumption:** Implementation may be incorrect until verified.

---

## Executive Summary

Sprint 1 delivered a formula centralization module, a win-rate migration across 9 call sites, a KPI pagination fix, four security hardening items, and rMultiple computation during CSV import. The module foundation (Phase 1) and security fixes (Phase 4 — TRPCError, CRON_SECRET, parameterized SQL) are correct. However, **one blocking data-corruption bug was introduced in Phase 5** and **one major formula error was introduced in Phase 3**. Four consistency gaps from Phase 2 were also missed. No pre-existing features were broken.

---

## Issue Registry

### Blocking

#### B-001 — `rMultiple` computed from `sl = 0` for all stop-less imports

**File:** `src/app/api/import/mt4/route.ts:138–140`
**Phase:** 5 (new code)

```typescript
const rMultiple = (row.sl != null && row.openPrice != null && row.closePrice != null)
  ? calcRMultiple(direction, row.openPrice, row.sl, row.closePrice)
  : null
```

**Root cause:** Both parsers (`mt4-parser.ts:75`, `csv-import.ts:111`) return `sl = 0` when no stop loss is recorded — `parseFloat(cols[6]) || 0` and `sl: 0` hardcoded. Zero is not `null`, so the guard passes. `calcRMultiple` then computes `riskDistance = |entry - 0| = entry` (e.g. 1.2345 for a forex pair), producing an absurd per-pip R multiple that is silently stored.

**Impact:** Every imported trade without a stop loss gets a garbage rMultiple stored in the database. This corrupts avgR, expectancyR, and Sharpe ratio for any user who imports MT4 or cTrader data without stops — a common real-world case.

**Fix:**
```typescript
const rMultiple = (row.sl != null && row.sl !== 0 && row.openPrice != null && row.closePrice != null)
  ? calcRMultiple(direction, row.openPrice, row.sl, row.closePrice)
  : null
```

---

### Major

#### M-001 — Expectancy formula in `playbook/page.tsx` is algebraically wrong (10× error)

**File:** `src/app/playbook/page.tsx:1038`
**Phase:** 3 (new code replacing paginated calculation)

```typescript
expectancy: s.avgR * wr - (1 - wr),
```

Where `wr = s.winRate / 100` and `s.avgR = calcAvgR(allTradesForSetup)`.

**Root cause:** This is not the expectancy formula. It uses `avgR` (mean of all R multiples, sign-inclusive) as if it were `avgWinR` (mean of winning R multiples only), and hardcodes `avgLossR = 1`. The actual E[R] per trade is simply `avgR` itself (arithmetic mean of all R). Verified with concrete example:

| Metric | Expected | Actual (formula) |
|---|---|---|
| 6 wins @+2R, 4 losses @−1R | **0.80** | **0.08** |

**Impact:** The Setup performance drawer shows expectancy values 5–20× smaller than reality. Users comparing setups by expectancy are operating on wrong data. This is a regression introduced by Phase 3 — the previous paginated code computed this differently.

**Fix:** The server-side `SetupStats` already carries `avgR`, which *is* the per-trade expectancy in R terms (verified above). Either:
- `expectancy: s.avgR` (minimal fix, correct)
- Add `expectancyR` to `computeSetupStats()` in `setup-analytics.ts` using `calcExpectancyR` for exactness, and surface it through `dashStats.setupStats`.

---

#### M-002 — Silent image upload failure gives no user feedback

**File:** `src/app/playbook/page.tsx:660–667`
**Phase:** 4 (new code)

```typescript
const res = await fetch("/api/upload/setup-image", { method: "POST", body })
if (res.ok) {
  const json = await res.json() as { ok: boolean; url?: string }
  if (json.ok && json.url) urls.push(json.url)
}
// Non-2xx response is silently discarded
```

**Impact:** When an upload fails (MIME rejection, size limit, Supabase error, network timeout), the user sees no error. The image input resets (`e.target.value = ""`), the upload indicator clears, but the image never appears — leaving the user confused about whether to retry or whether data was lost.

**Fix:** Handle the error branch explicitly:
```typescript
if (!res.ok) {
  const json = await res.json().catch(() => ({})) as { reason?: string }
  // surface toast/alert: json.reason or generic "No se pudo subir la imagen"
} else { ... }
```

---

#### M-003 — `isWin` import shadowed by local boolean inside `buildKpis`

**File:** `src/domains/analytics/services/dashboard-analytics.ts:135`
**Phase:** 3 (modified file)

```typescript
// Line 1: import { isWin, ... } from "@/lib/formulas"
// ...inside buildKpis():
const isWin = sorted[0].pnl > 0   // boolean — shadows the imported function
for (const t of sorted) {
  if (isWin ? t.pnl > 0 : t.pnl < 0) count++  // raw pnl comparison, not isWin()
```

**Impact (functional):** The streak calculation uses `t.pnl > 0` / `t.pnl < 0` directly rather than `isWin({pnl})`. This is semantically equivalent *today*, but the shadow means any future change to the `isWin` definition in the formulas module will NOT propagate to the streak calculation — creating a silent divergence risk.

**Impact (confusion):** The local `const isWin` makes it impossible to call the imported `isWin` function in the same scope block. TypeScript's no-shadow linting rule would flag this. Any reader of this code must carefully track which `isWin` is in scope.

**Fix:** Rename the boolean flag:
```typescript
const latestIsWin = sorted[0].pnl > 0
for (const t of sorted) {
  if (latestIsWin ? isWin({ pnl: t.pnl }) : !isWin({ pnl: t.pnl }) && t.pnl < 0) count++
```
Or more clearly:
```typescript
const latestOutcome: "win" | "loss" = isWin({ pnl: sorted[0].pnl }) ? "win" : "loss"
for (const t of sorted) {
  const matches = latestOutcome === "win" ? isWin({ pnl: t.pnl }) : t.pnl < 0
  if (matches) count++; else break
}
```

---

### Minor

#### N-001 — `buildAccountStats` uses raw `t.pnl > 0` for `acctWins` instead of `isWin()`

**File:** `src/domains/analytics/services/dashboard-analytics.ts:177`
**Phase:** 3 (modified file)

```typescript
const acctWins = at.filter(t => t.pnl > 0).length   // ← Phase 2 migration missed this line
```

Phase 2 migrated `buildKpis` (line 99) to use `isWin()`. Phase 3 added `buildAccountStats` but did not apply the canonical function. `t.pnl` is typed as `number` here, so the result is currently identical — but the canonical pattern is broken.

**Fix:** `at.filter(t => isWin({ pnl: t.pnl })).length`

---

#### N-002 — `trading-sessions.ts` win criterion not migrated to `isWin()`

**File:** `src/server/trpc/routers/trading-sessions.ts:68`
**Phase:** 2 scope (file not modified in Sprint 1)

```typescript
if (Number(t.pnl ?? 0) > 0) cur.wins++
```

This file was not in the Sprint 1 migration list, but it performs win counting and win-rate calculation using inline logic rather than the canonical `isWin()`. Since `trading-sessions.ts` is not modified in Sprint 1, this is a pre-existing gap — but Sprint 1's win-rate unification goal is incomplete without it.

**Fix:** Import and use `isWin`, `calcWinRate` (already done in nearby router files).

---

#### N-003 — `use-account-stats.ts` is now dead code

**File:** `src/app/cuentas/hooks/use-account-stats.ts`
**Phase:** 3 (caller removed but file retained)

Phase 3 removed the only caller (`cuentas/page.tsx`) in favor of `dashboardStats`. The hook file still exists with its own win-rate logic and drawdown calculation. It is not imported anywhere. Dead code in a hook file risks accidental re-import in future work.

**Fix:** Delete the file. If the drawdown-from-ATH calculation it contains is needed elsewhere, extract that specific function to `account-service.ts`.

---

#### N-004 — Three pre-existing test failures not addressed by Sprint 1

**Files:** `src/__tests__/routers/accounts.test.ts`, `src/__tests__/routers/withdrawals.test.ts`, `src/__tests__/lib/formulas/discipline.test.ts`

Sprint 1 modified `accounts.ts` (Phase 4 TRPCError fix) and `discipline.ts` (Phase 1 module). Neither fix addressed the pre-existing test failures in these suites:

| Test | Failure | Root Cause |
|---|---|---|
| `accounts > list: returns accounts for userId` | Expected no `status` filter, got `status: { in: ["ACTIVE","PAUSED"] }` | Test not updated after `includeInactive` default was added to router |
| `withdrawals > updateStatus` | `accountLog.create` call count mismatch | Pre-existing mock setup mismatch |
| `discipline > calculates mixed performance correctly` | Expected `score: 62`, got `63` | Off-by-one in test assertion (rounding behavior) |

These tests fail on `main` and were not caused by Sprint 1. However, Sprint 1 made changes to `accounts.ts` and `discipline.ts` without fixing their tests, leaving CI in a persistently red state.

---

### Nitpick

#### NP-001 — `calcExpectancyR` receives an extra `pnl` field it never reads

**File:** `src/domains/analytics/services/dashboard-analytics.ts:110`

```typescript
const expectancyR = calcExpectancyR(trades.map(t => ({ rMultiple: t.rMultiple, pnl: t.pnl })))
```

`calcExpectancyR` signature is `(trades: { rMultiple: number | null }[])`. The `pnl` field is structurally valid TypeScript but is dead data in the call. Likely a copy-paste artifact from before the signature was finalized.

**Fix:** `trades.map(t => ({ rMultiple: t.rMultiple }))`

---

#### NP-002 — Upload path uses `Math.random()` instead of `crypto.randomUUID()`

**File:** `src/app/api/upload/setup-image/route.ts:32`

```typescript
const path = `setups/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
```

`Math.random()` is not cryptographically random. Two concurrent uploads from the same user at the same millisecond could produce the same path. `crypto.randomUUID()` is available in the Next.js runtime and produces collision-resistant UUIDs.

**Fix:** `const path = \`setups/${user.id}/${crypto.randomUUID()}.${ext}\``

---

#### NP-003 — `formulas.test.ts` uses a relative import instead of the `@/lib` alias

**File:** `src/lib/formulas.test.ts:2`

```typescript
import { calcExpectancyR, ... } from "./formulas"
```

All production code imports from `"@/lib/formulas"`. The test uses a relative path. Both resolve correctly since `formulas.ts` was deleted and `./formulas` now resolves to `./formulas/index.ts`. But it's inconsistent with the codebase convention.

**Fix:** `import { ... } from "@/lib/formulas"`

---

## Audit Verdicts by Scope

### Phase 1 — Formula Module Foundation ✅

`src/lib/formulas/` barrel, all 8 module files, `src/lib/formulas.ts` deletion: **PASS**. All formulas are mathematically correct. Module resolution conflict resolved correctly. Barrel exports are clean with no duplicate symbols.

### Phase 2 — Win-Rate Site Unification ⚠️ (N-001, N-002)

9 call sites migrated. Two gaps remain: `buildAccountStats` uses raw `pnl > 0` (N-001), and `trading-sessions.ts` was in scope but not touched (N-002). No functional regressions — the raw comparison is semantically equivalent to `isWin()` when pnl is a `number`. Canonical completeness is incomplete.

### Phase 3 — Analytics & KPI Correctness ❌ (B-001 pending, M-001, M-003, N-001)

KPI pagination bug is fixed correctly (dashboardStats replaces paginated list). `tradesMonth`/`tradesTotal` added to `AccountStat` and wired correctly. **However:** the `expectancy` field in playbook `SetupStats` mapping uses a wrong formula (M-001, 10× error). The `isWin` shadow in `buildKpis` creates a future-regression footgun (M-003).

### Phase 4 — Security Hardening ✅ except M-002

- **TRPCError in accounts.ts:** Correct.
- **CRON_SECRET hardening:** Correct. Empty env var now immediately rejects.
- **Parameterized vector SQL (`Prisma.sql`):** Correct. `Prisma.sql` template literals parameterize all interpolated values — the audit agent's SQL injection claim was incorrect. `${vectorStr}` becomes `$1` in the prepared statement.
- **Upload Route Handler (TASK-017):** Server-side MIME allowlist and 5 MB limit implemented correctly. **Gap:** client-side error handling is silent (M-002).

### Phase 5 — CSV Import rMultiple ❌ (B-001)

`calcRMultiple` is called correctly *when a valid stop exists*. **Blocking bug:** `sl = 0` (the parser's sentinel for "no stop") passes the `!= null` guard and produces a garbage R multiple. All trades imported without a stop loss are corrupted.

---

## Security Observations (Non-Sprint-1 Scope, Noted for Awareness)

These were not introduced by Sprint 1 but were observed during audit:

- **`isAuthorized` in edge function accepts `Bearer ${SUPABASE_SERVICE_ROLE}`** as an alternative to `CRON_SECRET`. Supabase's internal scheduler uses the service role key, so this is likely intentional. The Sprint 1 fix correctly blocks empty-CRON_SECRET bypass, so the primary vulnerability is addressed.
- **No rate limiting on `/api/upload/setup-image`**: an authenticated user can spam the endpoint. Out of scope for Sprint 1.
- **HTML in weekly email templates is unescaped**: user-supplied resource titles are inserted directly. Low practical risk (server-controlled data, not user comments), but worth sanitizing.

---

## Validation Checklist

| Item | Result |
|---|---|
| TypeScript: `tsc --noEmit` | ✅ Clean |
| Formula module barrel resolves correctly | ✅ |
| `formulas.ts` deletion does not break any import | ✅ |
| `isWin(pnl > 0)` canonical criterion applied to all migrated sites | ⚠️ 1 gap (N-001), 1 out-of-scope site (N-002) |
| KPI pagination bug fixed (dashboardStats used) | ✅ |
| `rMultiple` calculated on CSV import | ❌ B-001: `sl=0` guard missing |
| Upload validated server-side (MIME + size) | ✅ route correct; client error handling missing (M-002) |
| Parameterized SQL for vector update | ✅ `Prisma.sql` correctly parameterizes |
| CRON_SECRET bypass eliminated | ✅ |
| `TRPCError` used in accounts router | ✅ |
| Test suite: zero new failures introduced | ✅ (3 pre-existing failures unchanged) |
| `use-account-stats.ts` removed (dead code) | ❌ N-003 |
| `expectancy` in playbook SetupStats correct | ❌ M-001 (10× error) |

---

## Prioritised Fix Queue

| Priority | ID | File | Fix |
|---|---|---|---|
| P0 | B-001 | `api/import/mt4/route.ts:139` | Add `&& row.sl !== 0` to guard |
| P1 | M-001 | `app/playbook/page.tsx:1038` | Change to `expectancy: s.avgR` |
| P1 | M-002 | `app/playbook/page.tsx:661` | Add error branch to upload handler |
| P2 | M-003 | `domains/analytics/services/dashboard-analytics.ts:135` | Rename `isWin` boolean to `latestIsWin` |
| P2 | N-001 | `domains/analytics/services/dashboard-analytics.ts:177` | Use `isWin()` for `acctWins` |
| P2 | N-002 | `server/trpc/routers/trading-sessions.ts:68` | Import and use `isWin`, `calcWinRate` |
| P3 | N-003 | `app/cuentas/hooks/use-account-stats.ts` | Delete file |
| P3 | N-004 | Tests (3 files) | Update test assertions to match current behavior |
| P4 | NP-001 | `domains/analytics/services/dashboard-analytics.ts:110` | Remove `pnl` from `calcExpectancyR` mapping |
| P4 | NP-002 | `app/api/upload/setup-image/route.ts:32` | Use `crypto.randomUUID()` |
| P4 | NP-003 | `lib/formulas.test.ts:2` | Change to `@/lib/formulas` alias |
