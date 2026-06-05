# Sprint 8 Implementation Plan

> **Based on:** `SPRINT_MASTER_PLAN.md` (Sprint 8 template), `CANONICAL_EXECUTION_PLAN.md` (task assignments), `SPRINT_7_RETROSPECTIVE.md` (priority adjustments)  
> **Adjusted:** Promotes TASK-070 from stretch to P1 mandatory; enforces structural constraint on TASK-024/025 (must start Day 1 before any new feature work); adds TASK-071 deferred from Sprint 7; includes TASK-042/043 as stretch; adds QUALITY_GATES.md API checklist from Retro recommendation 10.  
> **Vision constraint:** No changes to non-goal items. All tasks align with the privacy-first single-tenant coach vision.

---

## Sprint Objective

Close the persistent testing gap that blocked automatic detection of B-01 and M-02 in Sprint 7. Deliver the monthly review model (deferred twice). Harden accessibility across all critical flows. Extract the coach service layer and stand up CI/CD.

**Theme:** Tests, Accessibility, and Monthly Reviews

---

## What Changed from the Original Sprint 8 Plan

| Original Task | Status | Action |
|---|---|---|
| TASK-065 — Extract `coach-service.ts` (M, 4h) | Not started | Keep — Group D |
| TASK-076 — CI/CD GitHub Actions (M, 4h) | Not started | Keep — Group E |
| TASK-024 — RTL component tests (L, 8h) | Deferred 3× | **Hard commitment: must start Day 1** (not a regular backlog item; structural constraint) |
| TASK-025 — Playwright e2e (L, 8h) | Deferred 3× | **Hard commitment: follows TASK-024** |
| TASK-021 — Activate analytics cache (XS, 0.5h) | Deferred multiple sprints | Keep — Group E; if not actionable, drop from backlog (Retro R-008) |
| TASK-022 — Resend email domain (XS, 0.5h) | Not started | Keep — Group E |
| TASK-070 — Accessibility pass (M, 4h) | Stretch Sprint 7, not delivered | **Promoted to P1 mandatory** (not stretch). Retro: "Sprint 8 must treat it as P1 given critical routes still lack `aria-label`, `role=\"table\"`, focus rings." |
| TASK-071 — Monthly review model (L, 8h) | Deferred Sprint 7 | Added — Group C. TASK-006 (dep) is ✅ done. Now is the natural moment. |

**New additions from Sprint 7 retrospective:**
- **Structural constraint:** No new feature work begins until TASK-024 produces at least 3 passing RTL tests (Retro recommendation 11)
- **QUALITY_GATES.md API checklist:** Add auth → userId → DB query data-flow checklist for route handlers (Retro recommendation 10; prevents recurrence of B-01 pattern)
- **Upstash Redis pre-sprint:** Code is ready since Sprint 7 (`UpstashRateLimiter`). Pre-sprint operational task: provision Upstash account + env vars
- **TD-012 cleanup:** `phasePayload as never` in accounts router — XS, bundle with Group D
- **TASK-042 / TASK-043:** Skeleton screens + empty states — stretch group if primary groups finish early

---

## Grouped Functionalities

### Group A — Testing: RTL + Playwright (MUST START DAY 1, 16h)

> **Structural constraint from Retro:** If TASK-024/025 are not completed in the first half of the sprint, they are the first candidates to defer again. To break the cycle: **no new feature implementation begins until at least 3 RTL tests are green.**

#### TASK-024 — React Testing Library Component Tests (L, 8h)

**Why now:** Every sprint says "we'll do it next sprint." Sprint 7 QA manual review found B-01 (IDOR) and M-02 (unguarded `localStorage`) — both would have been caught by integration tests. Zero component tests is the highest quality risk in the project.

**Minimum scope (required — not stretch):**

1. **`RegisterTradeModal` — tag validation** (TASK-051 integration, M-04 regression guard)
   - Renders without crashing
   - Tag field: accepts valid input, shows validation error for >30 chars, shows error for >20 tags
   - Submit disabled when required fields empty

2. **`ReviewDetailPanel` — edit/delete** (TASK-031 regression guard)
   - "Editar" button opens `NuevaReviewModal` in edit mode; fields pre-populated
   - "Eliminar" button shows confirmation dialog; calls `weeklyReviews.delete` on confirm
   - Does not show edit/delete if review belongs to another user (mocked `userId` mismatch)

3. **`DashboardPage` — localStorage fallback** (M-02 regression guard)
   - Renders with valid `localStorage` period
   - Renders correctly when `localStorage` throws (mocked `localStorage.getItem` throws `SecurityError`)
   - Period selector updates state and calls `localStorage.setItem`

4. **`AccountsPage` — archive audit log** (M-01 regression guard)
   - Archive action sends `findUniqueOrThrow` before `update`
   - Audit log payload contains `from: <previous_status>` not `"INACTIVE"`

5. **`PlaybookPage` — setup health dot** (TASK-064 regression guard)
   - 🟢 renders for healthy setup (winRate ≥ expectedWr AND avgR ≥ minR)
   - 🔴 renders for critical setup
   - ⚪ renders for setups with <5 trades ("Insuficiente")

**Setup requirements:**
- Install `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` as dev deps
- Configure Vitest to handle JSDOM environment (`vitest.config.ts` or `vitest.workspace.ts`)
- Create `src/__tests__/setup.ts` with `@testing-library/jest-dom` matchers
- Mock tRPC caller for component tests (wrap with a mock `trpc` context provider)

**Acceptance criteria:**
1. All 5 component tests pass with `npx vitest run`
2. No existing unit tests broken by JSDOM configuration
3. Each test is an actual behavior assertion (no render-and-expect-not-to-throw-only tests)
4. `tsc --noEmit` passes — component test files are TypeScript-typed
5. Test setup documented in `docs/TESTING.md` (minimal: how to run, what's covered, how to add new tests)

---

#### TASK-025 — Playwright E2E Happy Path (L, 8h)

**Why now:** The app has no automated smoke test. A broken login or broken trade creation could ship undetected. One Playwright test covering the critical path protects against the most severe regressions.

**Required scenarios (minimum):**

1. **Login → Dashboard** (smoke test)
   - Navigate to `/` → redirected to `/login`
   - Enter valid credentials → redirected to `/dashboard`
   - Dashboard KPI cards render (not empty)

2. **Create Trade → Verify in list**
   - Login as test user
   - Click "Nuevo Trade" → fill required fields (instrument, direction, entryPrice, size, accountId)
   - Submit → trade appears in trades table
   - Trade row shows correct instrument and direction

3. **Register Trade → Verify embedding triggered**
   - Create a trade with notes populated
   - Verify `notes_embedding` is set within 15 seconds (poll `GET /api/ai-embed` status, or query DB directly via Playwright test fixture)

**Stretch scenario (if time allows):**

4. **Create Weekly Review → Edit → Delete**
   - Navigate to `/reviews` → create review for current week
   - Click "Editar" → modify a field → save
   - Verify updated value persists on reload
   - Delete review → verify removed from list

**Setup requirements:**
- Install `@playwright/test` as dev dep
- Configure `playwright.config.ts` with base URL and test credentials (via env vars: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`)
- Create `src/__tests__/e2e/` directory
- Add `e2e` script to `package.json`: `"e2e": "playwright test"`
- Add `.env.test` to `.gitignore` (not `.env.example` — document env vars there instead)

**Acceptance criteria:**
1. At least scenarios 1 and 2 pass reliably (3 runs, no flakiness)
2. Tests run against a real Supabase test project (not mocked)
3. `npm run e2e` command works from `src/` directory
4. Test user credentials are env-var injected (not hardcoded)
5. `playwright.config.ts` has `retries: 1` for CI resilience

---

### Group B — Accessibility: P1 Mandatory (M, 4h)

#### TASK-070 — Accessibility Pass (M, 4h)

**Why P1:** TASK-070 was a stretch goal in Sprint 7 and was not delivered. The retrospective explicitly states: "Sprint 8 debe tratarlo como P1 (no stretch) dado que las rutas críticas (dashboard, trades, review modal) aún no tienen `aria-label`, `role=\"table\"`, o focus rings visibles."

**Scope — critical flows only:**

**Dashboard (`/dashboard`)**
- `<main>` has `aria-label="Panel principal"`
- KPI strip: each card has `aria-label` with the metric name and value (e.g. `aria-label="Win Rate: 62%"`)
- Period selector buttons: `aria-pressed` state reflects selected period
- Equity chart: `<canvas>` or `<figure>` with `role="img"` and `aria-label="Curva de equity"`

**Trades table (`/trades`)**
- `<table>` has `role="table"` (if using div-based layout, add ARIA role; if using semantic `<table>`, remove the override)
- `<th>` cells have `scope="col"`
- Sortable columns have `aria-sort="ascending" | "descending" | "none"`
- "Nuevo Trade" button: `aria-label="Registrar nuevo trade"`
- Row actions (edit, delete): `aria-label="Editar trade {instrument}" | "Eliminar trade {instrument}"`

**Review modal (`NuevaReviewModal`)**
- Modal has `role="dialog"` and `aria-modal="true"`
- Modal has `aria-labelledby` pointing to the heading
- Focus is trapped within modal while open (Tab cycles within modal)
- Escape key closes modal
- On close, focus returns to the trigger button

**Global**
- All interactive elements have visible focus rings (audit for `outline: none` or `outline: 0` without replacement)
- Toast notifications: `role="alert"` and `aria-live="polite"`
- `prefers-reduced-motion`: wrap Recharts animations and sparkline transitions in a `@media (prefers-reduced-motion: reduce)` guard

**Acceptance criteria:**
1. Axe DevTools (or `@axe-core/react`) reports 0 critical violations on Dashboard, Trades, and Reviews pages
2. Tab navigation reaches all interactive elements on the three critical pages
3. `NuevaReviewModal` traps focus and returns focus on close (manual test)
4. Toast notifications are announced by screen reader (manual test with VoiceOver or NVDA)
5. `tsc --noEmit` passes — no type errors from ARIA attributes

---

### Group C — Monthly Reviews (L, 8h)

#### TASK-071 — Monthly Review Model (L, 8h)

**Why now:** TASK-031 (weekly review edit/delete) shipped in Sprint 7. The review model is mature. TASK-006 (review backend foundation) is done. Monthly reviews are the natural extension — traders need to see patterns across multiple weeks, not just within one week.

**Schema additions:**
```prisma
model MonthlyReview {
  id            String   @id @default(uuid())
  userId        String
  year          Int
  month         Int      // 1–12
  summary       String?  @db.Text
  keyThemes     String[] // recurring patterns across weekly reviews
  goalsSet      String[] // goals for next month
  goalsMet      String[] // goals met from previous month
  overallScore  Int?     // 0–100 composite discipline score
  weeklyIds     String[] // references to WeeklyReview.id (soft relation)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, year, month])
  @@index([userId, year])
}
```

**Backend:**
- `src/server/trpc/routers/monthly-reviews.ts`:
  - `list`: returns all monthly reviews for authenticated user, sorted by year desc, month desc
  - `get(year, month)`: returns single review with prefill from weekly reviews of that month
  - `create({ year, month, summary, keyThemes, goalsSet, goalsMet, overallScore })`: creates or updates (upsert on unique constraint)
  - `update({ id, ...fields })`: partial update of any field
  - `delete(id)`: delete with ownership check
  - `prefill(year, month)`: read-only; aggregates weekly reviews of that month → suggests keyThemes, computes overallScore as avg of weekly discipline scores
- Add `monthlyReviews` to `appRouter` in `src/server/trpc/root.ts`

**Frontend:**
- `/reviews` page: add toggle between "Semanales" and "Mensuales" tabs (or "Semanas | Meses" pill selector)
- Monthly review list: cards showing month name, overallScore badge, keyThemes preview
- `NuevaMensualModal`: create/edit form for monthly review
  - Header: "Revisión de {Mes} {Año}"
  - Fields: Summary (textarea), Key Themes (tag input), Goals Set (tag input), Goals Met (tag input), Overall Score (auto-computed from prefill, editable)
  - Prefill button: "Rellenar desde semanas" — calls `prefill` query and populates fields
- Monthly detail panel (sidebar or page): shows all fields + list of weekly reviews that belong to that month (linked)

**Acceptance criteria:**
1. Trader can create a monthly review for any past month
2. "Rellenar desde semanas" correctly aggregates weekly reviews of the selected month
3. Overall score auto-computed as average of weekly discipline scores (editable)
4. Monthly review list shows correct months sorted newest first
5. Edit and delete work the same as for weekly reviews (TASK-031 pattern)
6. Unique constraint enforced: duplicate `(userId, year, month)` shows error, not crash
7. `prisma migrate dev` applies the schema change without breaking existing tables
8. All existing 438 tests pass (no regressions)
9. New tests: `monthlyReviews.create`, `monthlyReviews.prefill`, `monthlyReviews.delete` — at minimum 5 unit tests covering ownership enforcement and prefill aggregation

---

### Group D — Code Quality (XS–M, 4.5h)

#### TASK-065 — Extract `coach-service.ts` (M, 4h)

**Why now:** `src/app/api/ai-coach/route.ts` contains business logic (prompt construction, model selection, response parsing) inline in the route handler. This makes the logic untestable in isolation and couples it to the HTTP layer. Sprint 7 retrospective R-003 recommends extracting `createTrade()` and `closeTrade()` as a parallel example.

**Deliverables:**
- Create `src/lib/ai/coach-service.ts` with:
  ```ts
  export interface CoachContext {
    tradeId:  string
    userId:   string
    question: string
  }

  export interface CoachResponse {
    answer:    string
    modelUsed: string
    tokenUsage: { prompt: number; completion: number }
  }

  export async function runCoachQuery(ctx: CoachContext): Promise<CoachResponse>
  ```
- Move prompt construction, model invocation (`openai.chat.completions.create` or equivalent), and response parsing into `runCoachQuery`
- `ai-coach/route.ts` becomes: auth → rate limit → `runCoachQuery(ctx)` → return JSON
- Add `src/__tests__/lib/coach-service.test.ts`:
  - Mock the AI SDK call
  - Test that prompt includes `tradeId` and `question`
  - Test that token usage is returned
  - Test that `CoachResponse` shape matches what the route returns

**Acceptance criteria:**
1. `ai-coach/route.ts` is ≤50 lines after extraction
2. `runCoachQuery` is independently importable and testable
3. `tsc --noEmit` passes
4. All existing tests pass (no behavior change)

---

#### TD-012 — Fix `phasePayload as never` in accounts router (XS, 0.5h)

**Why now:** Deferred from Sprint 7 (Retro R-005). Low risk, one-line fix.

```ts
// Before (in accounts.ts changePhase mutation):
const phasePayload = { ... } as never

// After:
type PhasePayload = { event: "PHASE_CHANGE"; from: AccountPhase; to: AccountPhase; changedAt: string }
const phasePayload: PhasePayload = { ... }
```

**Acceptance criteria:**
1. `grep -n "as never" src/server/trpc/routers/accounts.ts` returns 0 results
2. `tsc --noEmit` passes

---

### Group E — Infrastructure (M + XS, 5h)

#### TASK-076 — CI/CD Pipeline: GitHub Actions (M, 4h)

**Why now:** Canonical Sprint 8 assignment. No automated CI means TypeScript errors and test failures can reach `main` undetected. With 438 tests and a growing codebase, manual "tsc + vitest" before push is not reliable enough.

**Deliverables:**
- `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on:
    push:
      branches: [main, "claude/*"]
    pull_request:
      branches: [main]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: "10.33.0" }
        - uses: actions/setup-node@v4
          with: { node-version: "20", cache: "pnpm", cache-dependency-path: "src/pnpm-lock.yaml" }
        - run: pnpm install --frozen-lockfile
          working-directory: src
        - run: ./node_modules/.bin/tsc --noEmit
          working-directory: src
        - run: npx vitest run --reporter=verbose
          working-directory: src
  ```
- Add `DATABASE_URL` and other required env vars to GitHub Secrets documentation (in `docs/CI_SETUP.md`)
- Branch protection: document (don't configure programmatically) that `main` should require status checks to pass

**Acceptance criteria:**
1. CI workflow file exists at `.github/workflows/ci.yml`
2. Workflow runs on push to `claude/*` branches (so Sprint 8 branch gets CI)
3. TypeScript check runs before tests (fail-fast)
4. pnpm cache is used (reduces CI time)
5. Workflow passes with current test suite (438 tests, 0 TypeScript errors)

---

#### TASK-021 — Activate Analytics Cache (XS, 0.5h)

**Decision gate:** This item has been deferred since Sprint 2. The Sprint 7 retrospective (R-008) says: "Evaluar si el cache es necesario en producción actual o si se puede eliminar del backlog."

**Action:** Before implementation, check if `ANALYTICS_CACHE_ENABLED` is actually wired to any performance-critical path. If the flag guards a `Redis.get/set` wrapper that has no Redis provisioned, activating it is a no-op or a crash. Options:

- If the cache is useful: set `ANALYTICS_CACHE_ENABLED=true` in `.env.example` and document the Redis dep
- If the cache is not yet implemented end-to-end: close the task and remove from backlog (technical debt that never materialized)
- **Default:** Close TASK-021 as "Accepted risk — cache not needed at current scale" and remove from active backlog

**Acceptance criteria:**
1. Explicit decision documented in `docs/technical-debt.md` (either "closed — not needed" or "activated — here's how")
2. No hanging TODO in code that references `ANALYTICS_CACHE_ENABLED` without a corresponding implementation

---

#### TASK-022 — Configure Resend Email Domain (XS, 0.5h)

**Deliverables:**
- DNS records for Resend domain verification (document in `.env.example` and `docs/EMAIL_SETUP.md`)
- `RESEND_API_KEY` and `RESEND_FROM_DOMAIN` added to `.env.example`
- Verify transactional email (password reset, notifications) works with the configured domain
- Smoke test: send a test email via `resend.emails.send()` in a one-off script

**Acceptance criteria:**
1. `.env.example` contains `RESEND_API_KEY` and `RESEND_FROM_DOMAIN` with placeholder values
2. `docs/EMAIL_SETUP.md` documents the DNS records required
3. Transactional email sends without "domain not verified" error in Resend dashboard

---

### Group F — UX Polish: Stretch Goals (L, 8h)

> **Only begin Group F if Groups A–E are complete with buffer time remaining.**

#### TASK-042 — Skeleton Screens (M, 4h)

**Scope:** Replace "Cargando…" plain text with animated skeleton loaders on the three highest-traffic pages.

- **Dashboard KPI strip:** 4 `animate-pulse` skeleton cards matching the real card dimensions
- **Trades table:** 5 skeleton rows with columns matching instrument, direction, date, P&L, R
- **Account cards:** 3 skeleton cards in `AccountsPage`

**Pattern:**
```tsx
// SkeletonCard.tsx
function SkeletonCard() {
  return <div className="animate-pulse bg-muted rounded-md h-24 w-full" />
}
```

**Acceptance criteria:**
1. "Cargando…" text removed from Dashboard, Trades, and Accounts loading states
2. Skeleton dimensions match the real content (no layout shift when data loads)
3. `prefers-reduced-motion`: skeletons are static (no animation) when motion is reduced
4. Dark mode: skeletons use `bg-muted` (already adapts via CSS variables)

---

#### TASK-043 — Empty States (M, 4h)

**Scope:** New users currently see blank pages. Add icon + headline + CTA for the 4 main pages.

| Page | Icon | Headline | CTA |
|------|------|----------|-----|
| `/trades` | `TrendingUp` (Lucide) | "Aún no hay trades registrados" | "Registrar primer trade" → opens `RegisterTradeModal` |
| `/accounts` | `Wallet` | "Sin cuentas configuradas" | "Crear cuenta" → opens account creation form |
| `/playbook` | `BookOpen` | "Tu playbook está vacío" | "Agregar primer setup" → opens setup form |
| `/markets` | `BarChart2` | "Sin mercados seguidos" | "Agregar mercado" → opens market selection |

**Pattern:**
```tsx
function EmptyState({ icon: Icon, title, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
      <Icon className="h-12 w-12" />
      <p className="text-lg">{title}</p>
      {cta}
    </div>
  )
}
```

**Acceptance criteria:**
1. Empty state renders on all 4 pages when data arrays are empty
2. CTA button triggers the correct action (modal or navigation)
3. Empty state hidden once first item exists (conditional on `data.length === 0`)
4. Works in light and dark mode

---

## QUALITY_GATES.md Addition (Pre-Sprint, 0.5h)

**From Retro recommendation 10:** Add an API route data-flow checklist to prevent recurrence of the B-01 IDOR pattern.

**Add to `docs/QUALITY_GATES.md`:**

```markdown
## Gate 5: API Route Auth Data-Flow Checklist

For every POST/GET/PATCH/DELETE route handler that requires authentication:

- [ ] The `userId` captured in the auth branch appears in the `WHERE` clause of ALL subsequent Prisma queries and mutations
- [ ] UPDATE/DELETE queries have `userId` in the condition, not just the resource ID
- [ ] If the handler has two auth paths (e.g., session auth + webhook auth), trace each path independently — `userId` captured in one branch is not visible in the other
- [ ] `findUnique` with a non-unique filter: use `findFirst` instead (Prisma silently ignores extra fields on `findUnique`)
- [ ] Cross-user access test: can user A access/modify user B's resource by changing the resource ID in the request? (Manual or test)
```

---

## Pre-Sprint Checklist

- [ ] **Upstash Redis provisioning** (R-001 from Retro): Create Upstash account → create Redis database → add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables. `UpstashRateLimiter` is already implemented — this is an operational step only.
- [ ] **Install `@upstash/ratelimit @upstash/redis`** after env vars are available; replace `require()` with proper imports in `src/lib/rate-limiter.ts` (Retro R-007)
- [ ] **Playwright test user:** Create a dedicated test account in Supabase for E2E tests; set `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` env vars
- [ ] **JSDOM configuration:** Verify `vitest.config.ts` supports both `node` (unit tests) and `jsdom` (component tests) environments without conflict
- [ ] **RTL dev dependencies:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` — confirm versions compatible with React 19
- [ ] **GitHub Actions secrets:** Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` to repository secrets before CI workflow runs
- [ ] **TASK-021 decision:** Before implementing, check the actual `ANALYTICS_CACHE_ENABLED` code path. Close as "not needed" or implement — do not defer again.

---

## Dependencies

```
TASK-024 (RTL tests) ──────────────────────────────────────────────────► Must be first (structural constraint)
  └── Requires: vitest JSDOM config, @testing-library/react installed

TASK-025 (Playwright e2e) ─────────────────────────────────────────────► After TASK-024 (infra overlap)
  └── Requires: @playwright/test installed, E2E test user provisioned

TASK-070 (accessibility) ──────────────────────────────────────────────► No code blockers; manual VoiceOver test at end
  └── RTL tests help verify ARIA attributes once TASK-024 setup is done

TASK-071 (monthly reviews) ────────────────────────────────────────────► TASK-006 (review backend) ✅ done
                             └── Requires: prisma migrate dev (new MonthlyReview table)
                             └── Blocks: any frontend referencing monthly reviews

TASK-065 (coach-service extraction) ──────────────────────────────────► No blockers; refactor only
  └── Unlocks: testable AI prompts in TASK-024 RTL setup

TASK-076 (CI/CD) ──────────────────────────────────────────────────────► TASK-024/025 should be done first
  └── CI should run the new tests from Day 1; set up after tests exist

TASK-021 (analytics cache decision) ──────────────────────────────────► Decision gate; then close or implement
TASK-022 (Resend domain) ──────────────────────────────────────────────► Operational; no code deps

QUALITY_GATES.md update ───────────────────────────────────────────────► Pre-sprint; guides all implementation

TD-012 (phasePayload as never) ────────────────────────────────────────► Bundle with TASK-065 (same area)
```

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| React 19 + `@testing-library/react` compatibility | 🔴 High | Verify compatible version before installing (RTL v16+ supports React 19). If broken, use `@testing-library/react@canary`. |
| TASK-024 scope creep — 5 components is too many, sprint stalls | 🔴 High | **Hard minimum of 3 tests** (Dashboard localStorage, ReviewDetailPanel edit, Trades table row). The other 2 become stretch within TASK-024. Sprint is not at risk if 3 tests ship. |
| Playwright flakiness in CI (async Supabase auth) | 🟠 Medium | Set `retries: 2` and `timeout: 30_000` in `playwright.config.ts`. Auth test uses `waitForURL` not fixed delay. |
| `prisma migrate dev` for TASK-071 drops test DB in CI | 🟠 Medium | CI uses a separate test Supabase project with its own `DATABASE_URL`. Document in `CI_SETUP.md`. |
| `NuevaMensualModal` reuses `NuevaReviewModal` form infrastructure — prop drilling complexity | 🟡 Medium | Build `NuevaMensualModal` as a separate component. Do not try to make `NuevaReviewModal` generic for both weekly and monthly — they have different fields. |
| TASK-070 accessibility fixes break existing component layouts | 🟡 Medium | Make structural changes first (`role`, `aria-*`, `scope`) — these are additive. Focus trap is the only behavioral change; test manually before/after. |
| TASK-021 decision reveals cache is partially implemented — cleanup needed | 🟡 Medium | Budget 1h for cleanup if cache code needs to be removed (remove stale dead code, not just delete the flag). |
| Upstash provisioning blocked (no account, billing) | 🟡 Medium | `InMemoryRateLimiter` remains active. No sprint impact. Rate limiter works in development. Move provisioning to Sprint 9. |

---

## Acceptance Criteria (Sprint-Level)

1. **TASK-024 (RTL):** At least 3 component tests pass; `localStorage` fallback test specifically guards M-02; all tests run in CI
2. **TASK-025 (Playwright):** Login → Dashboard and Create Trade → Verify in list scenarios pass reliably (3 consecutive runs)
3. **TASK-070 (Accessibility):** Axe DevTools reports 0 critical violations on Dashboard, Trades, Reviews; focus trap works in `NuevaReviewModal`
4. **TASK-071 (Monthly Reviews):** Trader can create, edit, delete, and prefill monthly reviews; `prisma migrate dev` applies without breaking existing tables; 5 unit tests cover router
5. **TASK-065 (Coach service):** `ai-coach/route.ts` ≤50 lines; `runCoachQuery` has tests; no behavior change
6. **TD-012:** `phasePayload as never` removed; `tsc --noEmit` clean
7. **TASK-076 (CI/CD):** `.github/workflows/ci.yml` runs TypeScript check + Vitest on push to `claude/*` branches; passes with current test suite
8. **TASK-021 (Cache):** Explicit decision documented; no lingering undecided TODO
9. **TASK-022 (Email):** `.env.example` updated; `EMAIL_SETUP.md` documents DNS records
10. **QUALITY_GATES.md:** API route data-flow checklist added (Gate 5)
11. **Tests:** All existing 438 tests continue to pass; new RTL tests added (minimum 3); new monthly-review unit tests added (minimum 5)
12. **TypeScript:** `tsc --noEmit` — 0 errors throughout sprint

---

## User-Visible Outcomes

- **Traders can track monthly patterns** — see how multiple weeks compose into a monthly review; set and track goals month-over-month
- **App is accessible by keyboard** — traders using keyboard navigation or screen readers can reach all interactive elements on Dashboard, Trades, and Reviews
- **Automated regression protection** — CI catches type errors and test failures before they reach main; devs get feedback within 5 minutes of push
- **Loading states look polished** (stretch) — skeleton screens instead of plain "Cargando…" text
- **New user experience improved** (stretch) — empty states guide new traders to their first action instead of showing blank pages

---

## Estimated Duration & Effort

| Group | Tasks | Effort | Priority |
|---|---|---|---|
| A — Tests (must start Day 1) | TASK-024, TASK-025 | 16h | P1 — structural constraint |
| B — Accessibility | TASK-070 | 4h | P1 — mandatory (not stretch) |
| C — Monthly Reviews | TASK-071 | 8h | P2 — high user value |
| D — Code Quality | TASK-065, TD-012 | 4.5h | P2 — architecture debt |
| E — Infrastructure | TASK-076, TASK-021, TASK-022 | 5h | P2 — operational |
| F — UX Polish (stretch) | TASK-042, TASK-043 | 8h | P3 — only if A–E complete |
| Pre-sprint setup | QUALITY_GATES.md, env vars | 0.5h | Pre-sprint |
| **Total (primary A–E)** | | **38h** | |
| **Total (with stretch F)** | | **46h** | |
| **Buffer** | | 2–4h | QA, regression, unforeseen |

> **Note:** Primary scope (38h) fills a 40h sprint with minimal buffer. If TASK-024 or TASK-071 run over estimate, Group D or E items move to Sprint 9. **Under no circumstances defer TASK-024 again.**

**Recommended pacing:**
- Day 1: Pre-sprint setup (QUALITY_GATES.md, RTL/Playwright dev dep install, verify jsdom config)
- Day 1–3: Group A — TASK-024 RTL tests (must ship 3 tests before any feature work)
- Day 4–5: Group A — TASK-025 Playwright + Group B — TASK-070 accessibility
- Day 6–7: Group C — TASK-071 monthly reviews (schema migration + backend)
- Day 8: Group C — TASK-071 frontend (modal + list view)
- Day 9: Group D (TASK-065 + TD-012) + Group E (TASK-076 CI/CD)
- Day 10: Group E completion (TASK-021 decision + TASK-022) + stretch Group F if capacity

---

## Definition of Done

- All primary Group A–E tasks merged to `claude/epic-darwin-1XZTX`
- TypeScript clean (`tsc --noEmit` passes from `src/`)
- `npx vitest run` passes with 0 failures (from `src/` directory)
- QA checklist from `QUALITY_GATES.md` (updated with Gate 5) completed for each feature:
  - Gate 1: Zod/TypeScript schema alignment verified (monthly reviews schema)
  - Gate 2: Light and dark mode tested for TASK-070, TASK-071, TASK-042, TASK-043
  - Gate 3: Integration test roundtrip for TASK-071 (create → get → delete)
  - Gate 4: Security review for TASK-071 (cross-user ownership check) and TASK-076 (no secrets in CI logs)
  - Gate 5 (new): API route data-flow checklist for any new route handlers in TASK-071
- `docs/SPRINT_8_COMPLETION_REPORT.md` created on sprint close
- `docs/backlog.md` updated: TASK-024, TASK-025, TASK-070, TASK-071, TASK-065, TASK-076 marked DONE
- `docs/technical-debt.md` updated: TD-012 marked Closed Sprint 8; R-001/R-002 risk status updated based on Upstash + RTL outcomes

---

**Document Prepared:** 2026-06-03  
**Sprint:** 8 (Weeks 23–26)  
**Planned Tests:** 438 baseline → target 455+ (RTL component tests + monthly review unit tests + Playwright smoke test)
