# Sprint 7 Fix Report

**Date:** 2026-06-03  
**Branch:** `claude/epic-darwin-1XZTX`  
**Scope:** All Blocking and Major findings from `docs/SPRINT_7_QA_REPORT.md`

---

## Summary

| ID   | Severity | Status  | File(s) touched |
|------|----------|---------|----------------|
| B-01 | Blocking | ✅ Fixed | `src/app/api/ai-embed/route.ts` |
| B-02 | Blocking | ✅ Fixed | `src/app/api/ai-embed/route.ts` |
| M-01 | Major    | ✅ Fixed | `src/server/trpc/routers/accounts.ts` |
| M-02 | Major    | ✅ Fixed | `src/app/dashboard/page.tsx` |
| M-03 | Major    | ✅ Fixed | `src/app/api/ai-embed/route.ts` |
| M-04 | Major    | ✅ Fixed | `src/server/trpc/routers/trades.ts` |

---

## B-01 — IDOR in `ai-embed/route.ts` (direct call path)

**Root cause:** On the direct-call path, `user.id` from Supabase auth was captured inside the `else` branch but never referenced in the `prisma.trade.findUnique` or `$executeRaw` calls that follow. Any authenticated user could embed notes for any trade by supplying another user's `tradeId`.

**Fix:**
- Captured `userId` (string) on the direct path; set it to `null` on the webhook path.
- Changed `prisma.trade.findUnique` → `prisma.trade.findFirst` with:
  ```ts
  where: { id: tradeId, ...(userId ? { userId } : {}) }
  ```
- Conditioned the raw `UPDATE` statement: when `userId` is non-null, the `WHERE` clause includes `AND user_id = ${userId}::uuid`.

---

## B-02 — Missing body-size cap in `ai-embed/route.ts`

**Root cause:** The route parsed `req.json()` with no payload size limit, making it trivial to cause an OOM condition by sending a multi-MB body.

**Fix:**
- Added `MAX_BODY_BYTES = 16_384` (16 KB) constant.
- Before JSON parsing, read `Content-Length` header; if it exceeds the cap, return `413 PAYLOAD_TOO_LARGE`.

---

## M-01 — Stale `from` field in `archive` audit log (`accounts.ts`)

**Root cause:** `archive` ran `account.update(…{ status: "INACTIVE" })` first and then read `account.status` for the audit log `from` field. By that point Prisma returns the *updated* record, so `from` was always `"INACTIVE"` — identical to `to`.

**Fix:** Added `findUniqueOrThrow` with `select: { status: true }` **before** the update, matching the pattern already used in `changeStatus`:
```ts
const prev = await ctx.prisma.account.findUniqueOrThrow({
  where: { id: input, userId: ctx.userId },
  select: { status: true },
})
// …then update…
const archivePayload = { event: "STATUS_CHANGE", from: prev.status, to: "INACTIVE", note: "Archivada" }
```

---

## M-02 — Unguarded `localStorage` calls in `dashboard/page.tsx`

**Root cause:** Both `localStorage.getItem` (in `useEffect`) and `localStorage.setItem` (in `handlePeriodChange`) were called without error handling. In private-browsing mode or when storage quota is exhausted these throw, crashing the React component and rendering the whole dashboard blank.

**Fix:** Wrapped each call in an isolated `try/catch` so:
- `setPrefsLoaded(true)` is always reached even if `getItem` throws.
- `setPeriod(p)` still runs if `setItem` throws (state is updated; only persistence fails).

---

## M-03 — Indistinguishable webhook error states in `ai-embed/route.ts`

**Root cause:** When a request arrived with `x-webhook-secret`, the route returned `401` for both "secret env var not configured" and "wrong secret provided". Operators had no way to distinguish misconfiguration (should alert as a deployment error) from an actual malicious probe.

**Fix:**
- **Not configured** (`SUPABASE_WEBHOOK_SECRET` env var absent): returns `503` with `{ reason: "WEBHOOK_NOT_CONFIGURED" }` and logs `warn`.
- **Wrong secret**: returns `401` (no body detail) and logs `warn`.
- **Correct secret**: logs `info("ai-embed: webhook auth accepted")` for audit trail.

**Bonus (N-01):** Replaced plain `===` string comparison with a constant-time `secretsMatch()` helper using `crypto.timingSafeEqual` to eliminate timing-based secret leakage.

---

## M-04 — Unbounded tag input in `trades.create` and `trades.update`

**Root cause:** Both mutations accepted `z.array(z.string())` with no constraints — no limit on the number of tags or the length of each tag string. An attacker could submit thousands of tags or arbitrarily long strings, causing database bloat and potential denial-of-service.

**Fix:** Applied constraints at the Zod schema level:
```ts
// Before
tags: z.array(z.string()).default([])
tags: z.array(z.string()).optional()

// After
tags: z.array(z.string().min(1).max(30)).max(20).default([])
tags: z.array(z.string().min(1).max(30)).max(20).optional()
```
- Max 20 tags per trade (matches UX affordance)
- Max 30 characters per tag (prevents DB bloat)
- Min 1 character (rejects empty-string tags)

---

## Tests Added

### `src/__tests__/routers/accounts.test.ts`
- **`archive: audit log captures pre-update status in 'from' field (M-01)`** — verifies that `findUniqueOrThrow` is called before the update and that the log payload `from` field equals the pre-update status.

### `src/__tests__/routers/trades.test.ts`
- **`trades.create — tag validation (M-04)`** (4 tests):
  - Accepts valid tags within limits
  - Rejects tag element > 30 chars
  - Rejects empty-string tag element
  - Rejects array with > 20 tags
- **`trades.update — tag validation (M-04)`** (3 tests):
  - Accepts valid tag update
  - Rejects tag element > 30 chars on update
  - Rejects array with > 20 tags on update

**Test suite result:** 438 tests, 33 files — all pass.

---

## TypeScript

`./node_modules/.bin/tsc --noEmit` — passes with no errors.
