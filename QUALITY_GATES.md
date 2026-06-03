# Quality Gates — Definition of Done

All new tRPC procedures and UI features must pass these 4 gates before code review.

---

## Gate 1: Zod Schema Matches TypeScript Interface

**Scope:** All new tRPC input/output schemas.

**Checklist:**
- [ ] `z.object(...)` input schema has a corresponding TypeScript type (or is derived from it via `z.infer<...>`)
- [ ] Router output matches the declared return type
- [ ] Run `npm run typecheck` — zero errors

**Example violation:** Zod schema accepts `number`, TypeScript expects `Decimal | null`.

---

## Gate 2: Browser QA for Visual Features

**Scope:** Any feature touching UI colors, theme, form inputs, layout, or animations.

**Checklist:**
- [ ] Open `http://localhost:3000` in Chrome **and** Safari
- [ ] Test in **light mode** and **dark mode**
- [ ] Test accent color if applicable (5 hue values: 0, 72, 144, 216, 288)
- [ ] Test mobile viewport (375px wide)
- [ ] No inline `style={{ color: "#..." }}` that bypasses CSS variables
- [ ] Screenshot before/after if color or layout changed

**Mandatory for:** `ThemeProvider`, accent color, goal widget, sparklines, filter bars, any modal.

---

## Gate 3: Integration Tests for Serialization / Roundtrip

**Scope:** All tRPC procedures that return `Decimal`, `Date`, or custom serialized types.

**Checklist:**
- [ ] Test file exists at `src/__tests__/routers/<router-name>.test.ts`
- [ ] Happy path test: call procedure with valid input, verify returned type matches schema
- [ ] Error path test: verify UNAUTHORIZED, NOT_FOUND, or validation errors work
- [ ] Roundtrip test (if applicable): write → read → verify value preserved
- [ ] Run `npm test` — no regressions

**Required for:** Procedures that serialize `Decimal` → `number`, dates → ISO string, nested relations.

---

## Gate 4: Security Review for Secrets / Sensitive Data

**Scope:** Any procedure or API route reading/writing API keys, passwords, auth tokens, encrypted data.

**Checklist:**
- [ ] Procedure uses `protectedProcedure` (not `publicProcedure`)
- [ ] No plaintext secrets logged, cached, or included in error messages
- [ ] Sensitive output masked with `maskApiKey()` or equivalent before returning to client
- [ ] Rate limiting applied if endpoint can trigger external API calls
  - AI test: 5 calls/min per user
  - Embedding: queue-based (no burst)
- [ ] Security reviewer has approved (add comment: `// Gate 4: reviewed by <name> <date>`)

**Naming convention:** Functions that decrypt or expose secrets must be `server-only` (`import 'server-only'`) and never exported via tRPC router.

---

## Pre-commit Checklist

Before every commit touching backend/API code:

```bash
# 1. Type check
npm run typecheck

# 2. Run all tests
npm test

# 3. Verify no new @ts-expect-error directives for generated types
#    (they should be removed once prisma generate has run)
```

---

## Common Anti-Patterns

| Anti-Pattern | Gate Violated | Correct Approach |
|---|---|---|
| `as never` to pass Decimal between components | Gate 1 | Serialize Decimal to `number` in router; remove cast |
| Visual feature merged without browser QA | Gate 2 | Screenshot in PR + test matrix |
| tRPC procedure returns `Date` without `.toISOString()` | Gate 3 | Serialize all dates in router |
| `_getDecryptedKey` in tRPC router | Gate 4 | Move to server-only helper; never expose via tRPC |
| No rate limit on AI key test endpoint | Gate 4 | Use in-memory rate limiter; 5/min per user |
| Cursor pagination uses `id < cursor` with random UUIDs | Gate 3 | Use Prisma native cursor API: `cursor: { id }, skip: 1` |

---

**Document maintained by:** Engineering team  
**Last updated:** 2026-06-03  
**Next review:** Sprint 7 kickoff
