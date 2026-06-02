# Sprint 4 Fix Report — Major Findings Resolution

**Date:** 2026-06-02  
**Source audit:** `docs/SPRINT_4_QA_REPORT.md`  
**Branch:** `claude/epic-darwin-1XZTX`  
**Test baseline before:** 362 passing / 0 failing  
**Test baseline after:** 364 passing / 0 failing (+2 regression guards)

---

## Summary

All 5 Major findings from the QA audit were resolved. No blocking findings existed. The 0 blocking / 5 major / 6 minor / 4 nitpick distribution has been reduced to 0 blocking / 0 major.

---

## Fixes Applied

### M-01 · `editing` state typed `any` in `mercados/page.tsx`

**Root cause:** TASK-023 added `MarketItem = RouterOutputs["markets"]["list"][number]` for the market cards but left the `editing` state (used to pre-populate the edit modal) as `any`. TypeScript could not validate the shape of the editing object passed to `MarketModal`.

**Fix:** Replaced `useState<any | null>` with `useState<(MarketForm & { id: string }) | null>`. The `id` field is added to `MarketForm` at the call site (`setEditing`) and required by `handleSave` when updating. Removed the `eslint-disable-next-line` suppression that was needed solely for the `any` typing.

**Files changed:** `src/app/mercados/page.tsx`

---

### M-02 · `WithdrawalRow` ignores `updating` prop — fake loading state

**Root cause:** The `WithdrawalRow` component declared `updating?: boolean` in its prop type interface but did not destructure it. A local `useState(false)` + `setTimeout(800)` created a fake optimistic spinner disconnected from the actual mutation. The parent correctly passed `updating={updateStatus.isPending}` but the prop was silently ignored.

**Fix (component):** Removed the local `updating` state. Destructured the `updating` prop with a default of `false`. Removed the `async` keyword from `handleStatus` (it was never actually async). Removed the `setTimeout(800)` hack.

**Fix (parent):** Added `updatingId: string | null` state to `RetirosPage`. On status change, `setUpdatingId(id)` is called before the mutation; it is cleared in both `onSuccess` and `onError` callbacks. Each `WithdrawalRow` receives `updating={updatingId === w.id && updateStatus.isPending}` — scoped to the specific row being updated, not all rows simultaneously.

**Files changed:** `src/app/retiros/page.tsx`

---

### M-03 · `emotionBefore: ""` empty string as null sentinel

**Root cause:** `FormState.emotionBefore` was typed `EmotionBefore | ""` and initialized to `""`. This made the empty string the "no emotion selected" value, which propagated through `handleModalSubmit`'s type signature. At the mutation call site, `form.emotionBefore || undefined` happened to convert `""` to `undefined` (falsy coercion), preventing the invalid value from reaching Zod's `z.enum()` validator. In `edit-trade-modal.tsx`, `(emotionBefore as EmotionBefore) || null` cast the empty string to `EmotionBefore` before the `||` discarded it. Both were fragile — any new consumer of `RegisterTradeFormData` or `onSave` that skipped the coercion would send an invalid enum value to the server.

**Fix — register-trade-modal.tsx:**
- `FormState.emotionBefore: EmotionBefore | ""` → `EmotionBefore | null`
- `INITIAL.emotionBefore: ""` → `null`
- Deselect button handler: `emotionBefore: ""` → `emotionBefore: null`

**Fix — edit-trade-modal.tsx:**
- `useState<EmotionBefore | "">` → `useState<EmotionBefore | null>`
- `?? ""` initializer → `?? null`
- Deselect button handler: `setEmotionBefore("")` → `setEmotionBefore(null)`
- `handleSave`: `(emotionBefore as EmotionBefore) || null` → `emotionBefore` (type is already `EmotionBefore | null`, no cast needed)

**Fix — trades/page.tsx:**
- `handleModalSubmit` signature: `emotionBefore: ... | ""` → `... | null`
- Mutation call: `form.emotionBefore || undefined` → `form.emotionBefore ?? undefined` (`null ?? undefined` = `undefined`; valid enum values pass through unchanged)

**Tests added (2):**
- `"accepts undefined emotionBefore (no emotion selected)"` — verifies server accepts `undefined`, and the empty string never appears in the mutation data
- `"rejects empty string emotionBefore"` — regression guard: confirms that if the coercion were ever removed and `""` reached the server, Zod would reject it

**Files changed:** `src/components/trades/register-trade-modal.tsx`, `src/components/trades/edit-trade-modal.tsx`, `src/app/trades/page.tsx`, `src/__tests__/routers/trades.test.ts`

---

### M-04 · Drawdown bars hardcoded to 20%/10%

**Root cause:** The account section in `TradeDetailPanel` displayed two progress bars labeled "DD máx" and "Pérd. diaria" with hardcoded `width: "20%"` and `width: "10%"` respectively. The labels below showed the correct limit values (`ddTotalPct`, `ddDailyPct`) but the bars were static decoration. The `Account` type does not carry current drawdown usage data at this component level, making it impossible to compute a meaningful fill percentage. The bars visually implied a risk level that was always the same regardless of actual account state.

**Fix:** Replaced the progress bars with styled chip badges showing the actual limit values. The display now reads "Límite DD: X%" and "Pérd. diaria: Y%" where X and Y are the real configured limits. This is honest about what data is available (limits, not current usage). When current drawdown data is made available to this component in a future sprint, a real progress bar can be added.

**Files changed:** `src/components/trades/trade-detail-panel.tsx`

---

### M-05 · Psychology fields missing from `Trade` type — unsafe `as` cast

**Root cause:** `trade-detail-panel.tsx` accessed psychology fields via an `as` cast:
```typescript
const t = trade as {
  emotionBefore?: string | null
  confidenceRating?: number | null
  executionQuality?: number | null
  fomoFlag?: boolean
  revengeFlag?: boolean
}
```
Investigation confirmed that the Prisma-generated types (`src/lib/generated/prisma/models/Trade.ts`) DO include all 5 psychology fields. The `SerializedTrade = ReturnType<typeof serializeTrade>` type in `trades.ts` uses `{ ...t, ... }` spread which carries all Prisma fields, so `RouterOutputs["trades"]["list"]["items"][number]` (= `Trade`) already includes them. The `as` cast was added as a precaution during Sprint 4 implementation but was unnecessary.

**Fix:** Removed the intermediate `const t = trade as {...}` cast. All psychology field accesses now use `trade.emotionBefore`, `trade.confidenceRating`, etc. directly. TypeScript verifies these at compile time through the `Trade` type.

**Files changed:** `src/components/trades/trade-detail-panel.tsx`

---

## Files Changed

| File | Finding | Change type |
|------|---------|-------------|
| `src/app/mercados/page.tsx` | M-01 | Type fix: `any` → `(MarketForm & { id: string }) \| null` |
| `src/app/retiros/page.tsx` | M-02 | Logic fix: per-row `updatingId` state + wired `updating` prop |
| `src/components/trades/register-trade-modal.tsx` | M-03 | Type fix: `""` sentinel → `null` |
| `src/components/trades/edit-trade-modal.tsx` | M-03 | Type fix: `""` sentinel → `null`, removed misleading cast |
| `src/app/trades/page.tsx` | M-03 | Type fix: signature + `??` coercion |
| `src/components/trades/trade-detail-panel.tsx` | M-04, M-05 | Display fix + cast removal |
| `src/__tests__/routers/trades.test.ts` | M-03 | +2 regression tests |

---

## Test Results

```
Test Files  26 passed (26)
     Tests  364 passed (364)   ← was 362
  Duration  ~5.5s
```

New tests added:
- `trades.create — emotionBefore null-sentinel contract (M-03)` (2 tests)
  - Accepts `undefined` emotionBefore (no emotion selected)
  - Rejects empty string emotionBefore (regression guard for removed coercion)

---

## Findings Status After Fixes

| Severity | Before | After |
|----------|--------|-------|
| Blocking | 0 | 0 |
| Major    | 5 | 0 ✅ |
| Minor    | 6 | 6 (deferred to next sprint) |
| Nitpick  | 4 | 4 (deferred) |

Minor findings (m-01 through m-06) remain open and are tracked in `docs/SPRINT_4_QA_REPORT.md`. They do not affect correctness or data integrity — only UX polish and code quality.

---

*Fix report for branch `claude/epic-darwin-1XZTX`, 2026-06-02.*
