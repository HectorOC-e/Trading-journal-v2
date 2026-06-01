# Sprint 1 Fix Report

**Date:** 2026-06-01
**Branch:** `claude/epic-darwin-1XZTX`
**Fix commit:** `c423f63`
**QA Report:** `docs/SPRINT_1_QA_REPORT.md`
**Test result:** 232 / 232 passing (was 229 / 232 at audit time)

---

## Scope

This report documents the resolution of every finding from the Sprint 1 QA audit.
All Blocking and Major issues are **closed**. Minor and Nitpick issues were fixed in
the same commit to leave the codebase fully clean.

---

## Blocking Fixes

### B-001 — `rMultiple` computed from `sl = 0` for stop-less imports

**File:** `src/app/api/import/mt4/route.ts`
**Status:** ✅ Fixed

**Root cause confirmed:** Both parsers use `0` as the sentinel for "no stop loss recorded":
- `mt4-parser.ts:75` — `sl: parseFloat(cols[6]) || 0`
- `csv-import.ts:111` — `sl: 0` (cTrader hardcoded)

The original guard `row.sl != null` passed for `sl = 0`, causing
`calcRMultiple(dir, entry, 0, closePrice)` to compute `riskDistance = |entry - 0| = entry`
(e.g. 1.2345 for EURUSD), producing a nonsensical near-zero R multiple stored in the database.

**Before:**
```typescript
const rMultiple = (row.sl != null && row.openPrice != null && row.closePrice != null)
  ? calcRMultiple(direction, row.openPrice, row.sl, row.closePrice)
  : null
```

**After:**
```typescript
// sl=0 is the parser sentinel for "no stop loss recorded" in both MT4 and cTrader exports
const rMultiple = (row.sl != null && row.sl !== 0 && row.openPrice != null && row.closePrice != null)
  ? calcRMultiple(direction, row.openPrice, row.sl, row.closePrice)
  : null
```

**Impact of fix:** Imported trades without a stop loss now receive `rMultiple = null`
(open/unknown risk), which is the correct representation. Trades that do have a recorded
stop loss continue to compute R correctly. `avgR`, `expectancyR`, and Sharpe ratio are
no longer polluted by garbage near-zero values for this trade population.

---

## Major Fixes

### M-001 — Expectancy formula was algebraically wrong (up to 10× error)

**File:** `src/app/playbook/page.tsx`
**Status:** ✅ Fixed

**Root cause confirmed:** The Phase 3 replacement code computed:
```typescript
const wr = s.trades > 0 ? s.winRate / 100 : 0
expectancy: s.avgR * wr - (1 - wr)
```

This treats `avgR` (the arithmetic mean of **all** R multiples, including negative ones)
as if it were `avgWinR` (mean of winning R multiples only), and hardcodes `avgLossR = 1`.
The formula is not mathematically equivalent to E[R].

**Concrete counter-example (6 wins @+2R, 4 losses @−1R):**

| Metric | Value |
|---|---|
| `avgR` (correct E[R]) | **+0.80 R** |
| `s.avgR * wr − (1−wr)` (old formula) | **+0.08 R** |
| Error | **10×** |

**Proof:** `avgR = Σ(Ri) / n` is the per-trade expected value by definition. For any
trade set, `calcAvgR` and `calcExpectancyR` converge to the same result. Therefore
`expectancy = s.avgR` is both simpler and correct.

**Before:**
```typescript
const wr = s.trades > 0 ? s.winRate / 100 : 0
map[s.setupId] = {
  ...
  expectancy: s.avgR * wr - (1 - wr),
}
```

**After:**
```typescript
map[s.setupId] = {
  ...
  // avgR is the arithmetic mean of all R multiples (= E[R] per trade)
  expectancy: s.avgR,
}
```

**Impact of fix:** Setup drawer now shows correct per-trade expectancy in R units.
Users comparing setups by expectancy are no longer operating on a systematically
deflated number.

---

### M-002 — Silent image upload failure gave no user feedback

**File:** `src/app/playbook/page.tsx`
**Status:** ✅ Fixed

**Root cause confirmed:** The Phase 4 upload handler discarded non-2xx responses
without any error state update:
```typescript
const res = await fetch("/api/upload/setup-image", { method: "POST", body })
if (res.ok) {
  const json = await res.json() as { ok: boolean; url?: string }
  if (json.ok && json.url) urls.push(json.url)
}
// Non-2xx: silent. e.target.value is cleared. User sees nothing.
```

**After — complete error handling:**
```typescript
const [uploadError, setUploadError] = useState<string | null>(null)

// inside handleImageUpload:
setUploadError(null)
let failed = 0
for (const file of files) {
  const body = new FormData()
  body.append("file", file)
  try {
    const res  = await fetch("/api/upload/setup-image", { method: "POST", body })
    const json = await res.json() as { ok: boolean; url?: string; reason?: string }
    if (res.ok && json.ok && json.url) {
      urls.push(json.url)
    } else {
      const reason = json.reason === "INVALID_MIME"   ? "Tipo de archivo no permitido (usa JPG, PNG o WebP)"
                   : json.reason === "FILE_TOO_LARGE" ? "Archivo demasiado grande (máx. 5 MB)"
                   : "No se pudo subir la imagen"
      setUploadError(reason)
      failed++
    }
  } catch {
    setUploadError("Error de red al subir la imagen")
    failed++
  }
}
```

Error message rendered below the upload button:
```tsx
{uploadError && (
  <p className="text-[11px] text-[var(--loss)] mt-1">{uploadError}</p>
)}
```

**Structured reasons surfaced:**

| API `reason` | User-visible message |
|---|---|
| `INVALID_MIME` | Tipo de archivo no permitido (usa JPG, PNG o WebP) |
| `FILE_TOO_LARGE` | Archivo demasiado grande (máx. 5 MB) |
| `UPLOAD_FAILED` / other | No se pudo subir la imagen |
| Network error (fetch throws) | Error de red al subir la imagen |

---

### M-003 — `isWin` import shadowed by local boolean inside `buildKpis`

**File:** `src/domains/analytics/services/dashboard-analytics.ts`
**Status:** ✅ Fixed

**Root cause confirmed:** A local `const isWin = sorted[0].pnl > 0` (boolean) shadowed
the imported `isWin` function within the `buildKpis` function scope. Consequences:

1. The imported `isWin` function was uncallable within that scope block.
2. The streak loop used raw `t.pnl > 0` / `t.pnl < 0` comparisons instead of the
   canonical function, meaning a future change to the win criterion in `win-rate.ts`
   would silently not propagate to streak calculation.
3. TypeScript's `no-shadow` rule would flag this.

**Before:**
```typescript
const isWin = sorted[0].pnl > 0          // boolean — shadows import
for (const t of sorted) {
  if (isWin ? t.pnl > 0 : t.pnl < 0) count++  // raw comparison
```

**After:**
```typescript
const streakIsWin = isWin({ pnl: sorted[0].pnl })  // uses imported function
for (const t of sorted) {
  if (streakIsWin ? isWin({ pnl: t.pnl }) : t.pnl < 0) count++  // canonical for wins
```

**Impact of fix:** The imported `isWin` function is used consistently throughout
`buildKpis`. Any future change to the canonical win criterion automatically propagates
to streak calculation without requiring a separate update.

---

## Minor Fixes

### N-001 — `buildAccountStats` used raw `t.pnl > 0` instead of `isWin()`

**File:** `src/domains/analytics/services/dashboard-analytics.ts:177`

Phase 2 migrated `buildKpis` to `isWin()` but missed the `acctWins` line added in
Phase 3's `buildAccountStats`. Fixed to use the canonical function:

```typescript
// Before
const acctWins = at.filter(t => t.pnl > 0).length

// After
const acctWins = at.filter(t => isWin({ pnl: t.pnl })).length
```

---

### N-002 — `trading-sessions.ts` win criterion not migrated

**File:** `src/server/trpc/routers/trading-sessions.ts`

Last file in the codebase using an inline win check. Migrated to canonical `isWin()`:

```typescript
// Before
if (Number(t.pnl ?? 0) > 0) cur.wins++

// After (with import added at top)
import { isWin } from "@/lib/formulas"
if (isWin({ pnl: Number(t.pnl ?? 0) })) cur.wins++
```

---

### N-003 — `use-account-stats.ts` deleted (dead code)

**File:** `src/app/cuentas/hooks/use-account-stats.ts`

Phase 3 removed the file's only caller (`cuentas/page.tsx`) in favour of `dashboardStats`.
The 56-line hook remained on disk with its own stale win-rate and drawdown logic, creating
a re-import risk. **File deleted.** No callers remain anywhere in the codebase.

---

### N-004 — Three pre-existing test failures fixed

**Files:** `src/__tests__/routers/accounts.test.ts`, `src/__tests__/routers/withdrawals.test.ts`,
`src/__tests__/lib/formulas/discipline.test.ts`

Sprint 1 modified the corresponding production files without updating the diverged assertions.

| Test | Old assertion | Correct assertion | Root cause |
|---|---|---|---|
| `accounts > list` | `where: { userId }` (no status) | `where: { userId, status: { in: ["ACTIVE","PAUSED"] } }` | `includeInactive: false` default added to router, test not updated |
| `withdrawals > updateStatus` | `event: "STATUS_CHANGE"` | `event: "WITHDRAWAL_STATUS"` | Router uses the more specific event name; test used wrong string |
| `discipline > mixed performance` | `score: 62` | `score: 63` | `Math.round(62.5) = 63` per ES spec; test expected 62 |

---

## Nitpick Fixes

| ID | File | Change |
|---|---|---|
| NP-001 | `dashboard-analytics.ts:110` | `calcExpectancyR` call no longer passes unused `pnl` field |
| NP-002 | `api/upload/setup-image/route.ts:32` | `Math.random()` → `crypto.randomUUID()` for collision-resistant upload paths |
| NP-003 | `lib/formulas.test.ts:2` | Relative import `"./formulas"` → alias `"@/lib/formulas"` |

---

## Validation

### Test suite

```
Test Files  15 passed (15)
Tests       232 passed (232)
```

Before fix commit: **229/232** (3 pre-existing failures).
After fix commit:  **232/232** (zero failures).

### TypeScript

```
$ tsc -p tsconfig.json --noEmit
(no output — clean)
```

### Files changed in fix commit `c423f63`

| File | Change |
|---|---|
| `docs/SPRINT_1_QA_REPORT.md` | Added (306 lines) |
| `src/app/api/import/mt4/route.ts` | B-001: `sl !== 0` guard |
| `src/app/api/upload/setup-image/route.ts` | NP-002: `crypto.randomUUID()` |
| `src/app/playbook/page.tsx` | M-001: expectancy; M-002: error feedback |
| `src/domains/analytics/services/dashboard-analytics.ts` | M-003: shadow; N-001: `isWin()`; NP-001: clean mapping |
| `src/server/trpc/routers/trading-sessions.ts` | N-002: `isWin()` migration |
| `src/app/cuentas/hooks/use-account-stats.ts` | N-003: deleted |
| `src/lib/formulas.test.ts` | NP-003: alias import |
| `src/__tests__/routers/accounts.test.ts` | N-004: status filter assertion |
| `src/__tests__/routers/withdrawals.test.ts` | N-004: `WITHDRAWAL_STATUS` event |
| `src/__tests__/lib/formulas/discipline.test.ts` | N-004: `score: 63` |

---

## Updated QA Checklist

| Item | Before | After |
|---|---|---|
| `tsc --noEmit` clean | ✅ | ✅ |
| 232/232 tests passing | ❌ 229/232 | ✅ 232/232 |
| `rMultiple` null for stop-less imports | ❌ B-001 | ✅ |
| Expectancy formula correct in playbook | ❌ M-001 | ✅ |
| Upload failures surface to user | ❌ M-002 | ✅ |
| `isWin` not shadowed in `buildKpis` | ❌ M-003 | ✅ |
| `isWin()` used for `acctWins` | ❌ N-001 | ✅ |
| `trading-sessions.ts` uses `isWin()` | ❌ N-002 | ✅ |
| `use-account-stats.ts` removed | ❌ N-003 | ✅ |
| No pre-existing test failures | ❌ N-004 (3 failures) | ✅ |
| `calcExpectancyR` call clean | ❌ NP-001 | ✅ |
| Upload path uses `crypto.randomUUID()` | ❌ NP-002 | ✅ |
| `formulas.test.ts` uses alias import | ❌ NP-003 | ✅ |

---

## Open Items (Out of Sprint 1 Scope)

These were observed during audit but are not Sprint 1 regressions:

- **Rate limiting** on `/api/upload/setup-image` — authenticated users can spam uploads.
- **HTML escaping** in weekly email templates — database titles inserted into HTML without escaping.
- **`isAuthorized`** in edge function allows `Bearer ${SUPABASE_SERVICE_ROLE}` as alternative auth — intentional (Supabase's scheduler uses service role), but worth documenting explicitly in a security decision record.
