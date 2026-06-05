# Quality Gates

All features must pass the applicable gates before merging. Gates are checked during Sprint QA review.

---

## Gate 1: Zod Schema ↔ TypeScript Alignment

For every new or modified tRPC procedure:

- [ ] Zod input schema matches the TypeScript types used inside the handler
- [ ] Router output type is explicitly declared or inferrable via `RouterOutputs`
- [ ] `pnpm exec tsc --noEmit` passes from `src/` with 0 errors
- [ ] No `as any`, `as never`, or `@ts-ignore` in the changed code (use `satisfies` instead)
- [ ] `Prisma.Decimal` fields are serialized to `number` before returning from the router

---

## Gate 2: Browser QA for Visual Features

For every UI change:

- [ ] Test in Chrome (latest) in both **light mode** and **dark mode**
- [ ] Test at 375px viewport (mobile breakpoint)
- [ ] Test at 1280px viewport (standard desktop)
- [ ] No hardcoded color values — use CSS variables (`var(--ink)`, `var(--panel)`, etc.)
- [ ] No `style={{ color: "#..." }}` that bypasses the theme system
- [ ] Screenshot before/after in PR description for visual changes
- [ ] Loading state exists (skeleton or spinner) — no blank flash on data load
- [ ] Empty state exists — no blank screen when data array is empty

---

## Gate 3: Integration Tests for Serialization and Roundtrip

For every new tRPC router:

- [ ] Test file exists at `src/__tests__/routers/<router-name>.test.ts`
- [ ] Happy path: valid input → router returns value matching declared output type
- [ ] Error path: UNAUTHORIZED returns `TRPCError` with code `UNAUTHORIZED`
- [ ] Error path: NOT_FOUND (or similar) returns `TRPCError` with code `NOT_FOUND`
- [ ] Ownership check: a different `userId` in context cannot access or mutate the resource
- [ ] Roundtrip: write (create/update) → read → verify value preserved
- [ ] `pnpm test` from `src/` — 0 regressions in existing tests

---

## Gate 4: Security Review for Sensitive Operations

For every route handler, tRPC procedure, or service that touches secrets, auth, or user data:

- [ ] Uses `protectedProcedure` (not public)
- [ ] No plaintext secrets in logs, cache keys, or error messages
- [ ] Sensitive values masked in output (e.g. `maskApiKey`, truncated IDs)
- [ ] AI key operations go through `key-encryption.ts` — never stored in plaintext
- [ ] `_getDecryptedKey` or equivalent NEVER exposed via tRPC router — server-only helper only
- [ ] Rate limiting applied for any endpoint that calls external AI APIs (5 req/min per user)
- [ ] Reviewed against Gate 5 checklist for all API route handlers

---

## Gate 5: API Route Auth Data-Flow Checklist

> Added Sprint 8 — prevents recurrence of B-01 (IDOR) pattern from Sprint 7.

For every `POST`, `GET`, `PATCH`, or `DELETE` route handler that requires authentication:

- [ ] The `userId` captured in the auth branch appears in the `WHERE` clause of **all** subsequent Prisma queries and mutations — not just as a filter hint, but enforced
- [ ] `UPDATE` / `DELETE` queries have `userId` in the condition, not only the resource ID
  - ✅ `prisma.trade.update({ where: { id, userId: ctx.userId }, ... })`
  - ❌ `prisma.trade.update({ where: { id }, ... })`
- [ ] If the handler has **two auth paths** (e.g., session auth + webhook auth), trace each path **independently** — a `userId` captured inside an `if (isWebhook)` block is not visible outside it
- [ ] Using `prisma.<model>.findUnique` with a non-unique field? Use `findFirst` instead — Prisma silently ignores extra fields on `findUnique` when the unique index doesn't include them
- [ ] Manual cross-user test: can user A access or mutate user B's resource by changing the resource ID in the request? Answer must be **no**
- [ ] Body size limit enforced for endpoints accepting arbitrary payloads (max 16 KB or smaller as appropriate)

---

## Pre-Commit Checklist

Run before every commit that touches server-side code:

```bash
cd src
pnpm exec tsc --noEmit        # TypeScript check
pnpm test                     # All tests pass
grep -r "as never" server/    # Should return 0 results
grep -r "as any" server/      # Review any hits — justify or remove
```

---

## Common Anti-Patterns (Gate Violation Examples)

| Anti-Pattern | Gate | Correct Fix |
|---|---|---|
| `as never` to satisfy Prisma type | Gate 1 | Use `satisfies` or declare explicit interface |
| Visual feature without browser QA | Gate 2 | Screenshot in PR; run test matrix |
| tRPC returns `Date` without `.toISOString()` | Gate 3 | Serialize all dates in router before return |
| `_getDecryptedKey` exposed via tRPC | Gate 4 | Move to `server/` directory, import only in server context |
| No rate limit on AI endpoint | Gate 4 | Use `InMemoryRateLimiter` or `UpstashRateLimiter` |
| `userId` captured in auth but not in DB query | Gate 5 | Trace data flow: `auth → userId → WHERE userId = ?` |
| `findUnique` used with extra non-unique filter | Gate 5 | Use `findFirst` which respects all WHERE conditions |
| Route accepts arbitrary-size body | Gate 5 | Check `content-length` header; reject > `MAX_BODY_BYTES` |
