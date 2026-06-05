# Sprint 5 QA Report

**Auditor:** Independent Staff Engineer review  
**Date:** 2026-06-03  
**Commit:** `cf02efe` (feat: implement Sprint 5)  
**Test baseline:** 378 → 389 tests (all passing)  
**TypeScript:** 0 errors after `npx tsc --noEmit`

---

## Executive Summary

Sprint 5 introduced 8 tasks across ~1,146 lines of new/modified code. The implementation is structurally sound in several areas (AES-256-GCM crypto, tRPC authorization patterns, Zod validation) but has **4 Blocking bugs** that make key features non-functional, **6 Major bugs** spanning security and data integrity, and several Minor/Nitpick issues.

| Severity | Count |
|----------|-------|
| Blocking | 4 |
| Major | 6 |
| Minor | 7 |
| Nitpick | 4 |

---

## Blocking

### B-01 · TASK-046 Incomplete — Accent/Colorblind preferences saved but never applied

**File:** `src/app/perfil/page.tsx`, `src/components/theme-provider.tsx`

The UI correctly saves `accentHue` and `colorScheme` to the database via `updatePrefsMut.mutate()`. However, nowhere in the app is the saved preference read and applied to CSS custom properties. `ThemeProvider` (`theme-provider.tsx`) only handles dark/light mode from `localStorage` — it never reads user preferences from the database and never calls `document.documentElement.style.setProperty("--accent", ...)`.

**Result:** The user selects an accent color, receives a success toast, but the color never changes. The feature appears to work but has zero visual effect.

**Fix:** In `ThemeProvider` (or a new `PreferencesProvider`), query `trpc.preferences.get` and apply:
```typescript
useEffect(() => {
  if (!prefs) return
  if (prefs.accentHue != null) {
    document.documentElement.style.setProperty("--accent", `oklch(0.6 0.2 ${prefs.accentHue})`)
  }
  if (prefs.colorScheme && prefs.colorScheme !== "default") {
    document.documentElement.setAttribute("data-colorblind", prefs.colorScheme)
  }
}, [prefs])
```

---

### B-02 · TASK-020 — Cursor pagination produces wrong results on UUID ordering

**File:** `src/server/trpc/routers/account-logs.ts`, line 18

```typescript
...(cursor ? { id: { lt: cursor } } : {}),
orderBy: { createdAt: "desc" },
```

The query orders rows by `createdAt DESC` but applies the cursor filter as `id < cursor`. Since the IDs are UUID v4 (random), their lexicographic order bears no relation to `createdAt` order. Passing a cursor will skip or duplicate rows unpredictably.

**Example:** Row A has `createdAt = 2025-01-10`, `id = "f3...`. Row B has `createdAt = 2025-01-01`, `id = "a2..."`. Row A sorts first. When the client sends cursor `"f3..."`, the filter `id < "f3..."` returns Row B — but Row B was already returned on page 1. Items are duplicated.

**Fix:** Use Prisma's native cursor-based pagination:
```typescript
const items = await ctx.prisma.accountLog.findMany({
  where:   { accountId, userId: ctx.userId },
  orderBy: { createdAt: "desc" },
  take:    limit + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
})
```

---

### B-03 · TASK-050 — Goal widget uses today's trade count for a weekly goal ring

**File:** `src/app/dashboard/tabs/tab-portfolio.tsx`, line 200  
**File:** `src/app/dashboard/components/goal-progress-widget.tsx`, line 86

```typescript
// tab-portfolio.tsx
<GoalProgressWidget kpis={kpis} weeklyTradesCount={kpis.tradesCountToday} />

// goal-progress-widget.tsx
const tradesGoalPct = weeklyTradesGoal != null && weeklyTradesGoal > 0
  ? weeklyTradesCount / weeklyTradesGoal   // weeklyTradesCount === today's trades
  : 0
```

The widget label reads "Trades semana" (weekly trades) but measures `tradesCountToday` (today's count only). A user who set a goal of 5 weekly trades and made 3 today (0 yesterday, 0 this week before today) would see 60% progress — accurate only if they trade every single day and reset the week each morning.

**Fix:** Add `tradesCountWeek` to `buildKpis` (count trades in the last 7 days) and pass that value instead.

---

### B-04 · TASK-050 — Goal widget uses monthly P&L for weekly P&L goal

**File:** `src/app/dashboard/components/goal-progress-widget.tsx`, line 87

```typescript
const pnlGoalPct = weeklyPnlGoal != null && weeklyPnlGoal > 0
  ? kpis.pnlMonth / weeklyPnlGoal    // pnlMonth = since 1st of this month
  : 0
```

`kpis.pnlMonth` accumulates from the 1st of the calendar month, not from the last 7 days. A user with a $500 weekly goal who made $400 this week but $1,200 month-to-date would see 240% progress — always inflated, always wrong at the end of the month.

**Fix:** Add `pnlWeek` to `buildKpis` (sum of PnL for trades with `date >= lastMonday`) and use it here.

---

## Major

### M-01 · Security — `_getDecryptedKey` tRPC procedure exposes plaintext API keys to any client

**File:** `src/server/trpc/routers/ai-config.ts`, lines 92–101

The `_getDecryptedKey` procedure is a `protectedProcedure` mounted on the public tRPC router. Any authenticated user can call:
```
trpc.aiConfig._getDecryptedKey.query({ provider: "anthropic" })
```
and receive their decrypted API key in plain text over the network.

The comment says _"Not exposed to the client directly"_ — but it is, because it is registered in `root.ts`. The encryption at rest (AES-256-GCM) becomes meaningless if the key can be retrieved from the network at will.

**Fix:** Remove the procedure from the tRPC router entirely. Server-side routes that need a user's key should import the decryption function directly:
```typescript
// Inside an API route (NOT tRPC):
import { decryptApiKey } from "@/lib/ai/key-encryption"
// @ts-expect-error — Sprint 5 migration pending
const config = await prisma.userAiConfig.findUnique({ ... })
const key = decryptApiKey(config.apiKeyEnc)
```

---

### M-02 · Security — Decryption error in `ai-config.list` crashes the entire list

**File:** `src/server/trpc/routers/ai-config.ts`, line 35

```typescript
maskedKey: maskApiKey(decryptApiKey(c.apiKeyEnc)),   // no try/catch
```

If any stored ciphertext is corrupted, truncated, or was encrypted with a rotated key, `decryptApiKey` throws. The exception propagates as an unhandled 500, making the entire config list fail — locking the user out of the AI config UI.

**Fix:**
```typescript
maskedKey: (() => {
  try { return maskApiKey(decryptApiKey(c.apiKeyEnc)) }
  catch { return "[key-error]" }
})(),
```

---

### M-03 · TASK-050 — Discipline ring uses hardcoded constant instead of real score

**File:** `src/app/dashboard/components/goal-progress-widget.tsx`, line 88

```typescript
const disciplinePct = disciplineGoal != null && disciplineGoal > 0
  ? Math.min(1, 80 / disciplineGoal)
  : 0
```

The literal `80` is not the user's current discipline score — it is a hardcoded placeholder. The user's real `disciplineScore` comes from weekly reviews (`weekly-reviews.ts`) but is not included in `KpiSummary`. Every user sees "80% toward their discipline goal" regardless of actual trading behaviour.

**Fix:** Either add `avgDisciplineScore` to `buildKpis` (average `disciplineScore` from reviews of the current week), or suppress the discipline ring until the data is available. Do not ship a ring that always shows a fixed value.

---

### M-04 · TASK-020 — Account history modal truncates at 20 items with no UX affordance

**File:** `src/app/cuentas/modals/account-history-modal.tsx`, line 22–23

```typescript
const { data, isLoading } = trpc.accountLogs.list.useQuery({ accountId })
const logs = data?.items ?? []
// nextCursor is returned but never used
```

The backend correctly returns `nextCursor`, but the modal silently shows at most 20 items with no "Load more" button and no indication that older history exists. Prop-firm accounts with many phase-change and balance-correction events lose their audit trail visibility.

**Fix:** Add a "Cargar más" button that fires a second query with `cursor: data.nextCursor`, then appends items. Or use `useInfiniteQuery`.

---

### M-05 · Data integrity — `planNotes` has no database-level length constraint

**File:** `src/prisma/schema.prisma`, line ~204

```prisma
planNotes  String?  @map("plan_notes")
```

The 500-character limit is enforced by Zod in the tRPC router but not by the database column. Direct SQL inserts, admin tooling, or future server actions that bypass tRPC can store unlimited text. The Zod rule alone is insufficient for a constraint that affects data integrity.

**Fix:**
```prisma
planNotes  String?  @map("plan_notes") @db.VarChar(500)
```

---

### M-06 · TASK-074 — Edit modal textarea missing `maxLength` for `planNotes`

**File:** `src/components/trades/edit-trade-modal.tsx`, the `planNotes` textarea

The register modal has `onChange={e => setForm(f => ({ ...f, planNotes: e.target.value.slice(0, 500) }))}` enforcing the limit client-side. The edit modal textarea has no equivalent `maxLength={500}` attribute. A user editing a trade can paste 5,000 characters, which passes the edit modal's client form, but will fail at the tRPC Zod validator with an unhelpful 500 error.

**Fix:** Add `maxLength={500}` to the edit modal's `planNotes` textarea. Mirror the register modal's character counter when `planNotes.length > 400`.

---

## Minor

### m-01 · Middleware sets `x-user-id` header that is never consumed

**File:** `src/middleware.ts`, line 42  
**File:** `src/server/trpc/init.ts`, line 7

```typescript
// middleware.ts
response.headers.set("x-user-id", user.id)

// init.ts — still calls getUser() independently
const { data: { user } } = await supabase.auth.getUser()
```

Every tRPC request triggers two auth lookups: once in middleware, once in `init.ts`. The comment on line 40 says "so tRPC context can skip a redundant auth.getUser() call" — but init.ts was never updated to read the header. The header is dead code that adds maintenance confusion.

**Options:** Either remove line 42, or update `init.ts` to read the header and skip the redundant Supabase call:
```typescript
const userId = request.headers.get("x-user-id")
// if userId present, skip supabase.auth.getUser()
```

---

### m-02 · `useCurrency` hook is exported but has zero callers

**File:** `src/hooks/useCurrency.ts`

`grep -rn "useCurrency" src/` returns only the hook's own definition. TASK-056 created the hook but never integrated it into any component. All currency formatting in the UI still uses inline `$${value.toFixed(2)}` strings.

**Fix:** Either integrate `useCurrency` into the trade modals / dashboard KPIs as intended, or delete the file until it is needed.

---

### m-03 · OpenRouter API key format not validated

**File:** `src/server/trpc/routers/ai-config.ts`, lines 16–19

Anthropic (`sk-ant-`) and OpenAI (`sk-`) keys are validated. OpenRouter keys have a `sk-or-v1-` prefix but any string ≥ 20 chars passes validation. Users who accidentally paste a wrong key see no format error until the live test fails.

**Fix:**
```typescript
if (provider === "openrouter" && !apiKey.startsWith("sk-or-")) 
  return "Las claves de OpenRouter empiezan con 'sk-or-'"
```

---

### m-04 · `decryptApiKey` does not validate IV length

**File:** `src/lib/ai/key-encryption.ts`, line 28

```typescript
const iv = Buffer.from(ivHex, "hex")
// No check that iv.length === 12
```

AES-256-GCM requires a 96-bit (12-byte) IV. A malformed stored ciphertext with a too-short IV would call `createDecipheriv` with a wrong-length IV, producing a Node.js error whose message could leak implementation details.

**Fix:**
```typescript
const iv = Buffer.from(ivHex, "hex")
if (iv.length !== 12) throw new Error("Invalid IV length")
```

---

### m-05 · `trade-detail-panel.tsx` uses double cast to access `planNotes`

**File:** `src/components/trades/trade-detail-panel.tsx`

```typescript
{(trade as { planNotes?: string | null }).planNotes && (
  ...
  {(trade as { planNotes?: string | null }).planNotes}
)}
```

The cast is needed because `SerializedTrade` was derived from Prisma-generated types before the `planNotes` migration runs. This is acceptable as a temporary workaround, but should be cleaned up as soon as `prisma generate` runs post-migration. Both the condition and the value reference double-cast the same field.

**Interim fix:** Extract to a variable to avoid double-cast:
```typescript
const planNotes = (trade as { planNotes?: string | null }).planNotes
{planNotes && <div>...{planNotes}</div>}
```

---

### m-06 · `ai-config.ts list` procedure decrypts keys unnecessarily on every list call

**File:** `src/server/trpc/routers/ai-config.ts`, line 34–35

`maskApiKey(decryptApiKey(c.apiKeyEnc))` decrypts every key on every list render. Since the masked key (first 8 + last 4 chars) never changes, it could be stored separately at write time and served without decryption — reducing crypto overhead and eliminating the crash risk from M-02.

**Fix (optional):** Store `maskedKey` as a separate column in `UserAiConfig`, populated at upsert time.

---

### m-07 · Dead/confusing dual state for `weeklyGoalMinutes` in `perfil/page.tsx`

**File:** `src/app/perfil/page.tsx`, lines 253 and 262

Two state variables exist:
- `weeklyGoalMinutes` (line 253) — profile-level learning minutes, used in the profile save handler (line 369)
- `weeklyGoalMinutesG` (line 262) — goals-level learning minutes, used in the goals save handler (line 411)

Both ultimately write to a field named `weeklyGoalMinutes` in the database (via different procedures: `profile.update` and `goals.set`). The duplication is confusing and may cause state divergence if one is changed without the other.

**Fix:** Audit whether `user.weeklyGoalMinutes` (profile field) and `UserGoals.weeklyGoalMinutes` are the same column. If yes, remove the duplication; one procedure should own the field. If different, rename the state variables to make the distinction clear.

---

## Nitpick

### n-01 · `AI_KEY_ENCRYPTION_SECRET` undocumented — no `.env.example` file

The repository has no `.env.example`. `AI_KEY_ENCRYPTION_SECRET` is a mandatory production secret with a strict format (64-char hex = 32 bytes). Without documentation, a developer spinning up a new environment will hit the `throw new Error("AI_KEY_ENCRYPTION_SECRET must be...")` at runtime with no guidance.

**Fix:** Create `.env.example` with:
```
AI_KEY_ENCRYPTION_SECRET=<run: openssl rand -hex 32>
```

---

### n-02 · Learning ring always shows 0% (hardcoded placeholder shipped)

**File:** `src/app/dashboard/components/goal-progress-widget.tsx`, line 90

```typescript
const learningPct = weeklyGoalMinutes != null && weeklyGoalMinutes > 0 ? 0 : 0
```

This is literally `0` regardless of the branch. The comment acknowledges it is a placeholder. Shipping a visible goal ring that permanently shows 0% is worse than hiding it.

**Fix:** Suppress the learning ring until the learning-minutes tracking query is implemented:
```typescript
// Remove the learning ring push from rings[] until data is available
if (weeklyGoalMinutes != null && learningMinutes != null) { ... }
```

---

### n-03 · Four `@ts-expect-error` comments in `ai-config.ts` due to missing `prisma generate`

**File:** `src/server/trpc/routers/ai-config.ts`

These are acceptable as a temporary workaround until the migration is applied and `prisma generate` is re-run. Tracked as technical debt.

**Action:** Run `npx prisma migrate deploy && npx prisma generate` in the deployment pipeline before the next sprint to eliminate all `@ts-expect-error` markers in ai-config, ai-test, and the test files.

---

### n-04 · Pagination test uses `id: { lt: ... }` assertion which validates the wrong behavior

**File:** `src/__tests__/routers/account-logs-pagination.test.ts`, line 70

The test asserts that `findMany` is called with `id: { lt: cursor }`, which validates the current (broken) implementation. After fixing B-02 to use Prisma cursor syntax, this test must be updated to assert the correct call shape:
```typescript
expect(findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    cursor: { id: CURSOR_ID },
    skip:   1,
  })
)
```

---

## Positive Findings

The following aspects of Sprint 5 are well implemented:

- **AES-256-GCM encryption:** Correct algorithm, random IV per encryption, GCM auth tag validated on decryption, key derived from env var with strict length check. Non-deterministic (randomized IV) as required. Tests cover roundtrip, tamper detection, and edge cases.
- **tRPC authorization patterns:** All new procedures (`aiConfig`, `accountLogs`, `goals`) use `protectedProcedure` which enforces `ctx.userId`. The `userId` is included in every where-clause (no IDOR on user-owned data).
- **Zod input validation:** `planNotes` max 500 chars, cursor is UUID-validated, limit is bounded (1–100). The 3-test Gate 3 serialization coverage is appropriate.
- **`goals.get` field selection:** Uses an explicit `select` list, ensuring no unexpected fields (e.g., password hashes) are returned if the User model grows.
- **`serializeTrade` spread:** The `...t` spread in `serializeTrade` correctly carries `planNotes` through to the response at runtime even though the TypeScript types are stale. This is a pragmatic workaround for the migration-pending state.
- **Test infrastructure:** All 3 new test files correctly use `mockPrisma` object injection (no dynamic `require()` with path aliases). The `supabase: {} as never` cast follows the established pattern.

---

## Fix Priority

| # | ID | Effort | Impact | Fix First |
|---|-----|--------|--------|-----------|
| 1 | B-02 | Low | Blocking | Cursor pagination logic (2-line fix) |
| 2 | B-03 | Medium | Blocking | Add `tradesCountWeek` to `buildKpis` |
| 3 | B-04 | Medium | Blocking | Add `pnlWeek` to `buildKpis` |
| 4 | B-01 | Medium | Blocking | Apply preferences to CSS in ThemeProvider |
| 5 | M-01 | Low | Security | Remove `_getDecryptedKey` from tRPC router |
| 6 | M-02 | Low | Reliability | Wrap decryptApiKey in try/catch in list |
| 7 | M-03 | Low | UX | Add "Cargar más" to account history modal |
| 8 | M-04 | Low | Data integrity | Add `@db.VarChar(500)` to planNotes |
| 9 | M-05 | Low | UX | Add maxLength to edit modal planNotes textarea |
| 10 | M-06 | Low | UX | Hide discipline ring or replace hardcoded 80 |

---

## Checklist Before Merging to Main

- [ ] B-01: `accentHue`/`colorScheme` applied to CSS in ThemeProvider
- [ ] B-02: Cursor pagination switched to Prisma cursor syntax
- [ ] B-03: `tradesCountWeek` added to `buildKpis` and passed to GoalProgressWidget
- [ ] B-04: `pnlWeek` added to `buildKpis` and used in pnlGoalPct calculation
- [ ] M-01: `_getDecryptedKey` removed from tRPC router
- [ ] M-02: `decryptApiKey` wrapped in try/catch in `ai-config.list`
- [ ] M-03: "Cargar más" affordance added to account-history-modal
- [ ] M-04: `@db.VarChar(500)` added to planNotes in schema
- [ ] M-05: `maxLength={500}` on edit modal planNotes textarea
- [ ] M-06: Discipline ring uses real score or is suppressed
- [ ] n-02: Learning ring suppressed until query is implemented
- [ ] n-04: Pagination test updated after B-02 fix
- [ ] Post-migration: run `prisma generate` to eliminate `@ts-expect-error` markers
- [ ] Create `.env.example` with `AI_KEY_ENCRYPTION_SECRET` documentation
