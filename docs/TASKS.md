# Tasks — Trading Journal v2

> Strategic backlog. See `MASTER_TASKS.md` for the completed security/correctness remediation.  
> Last updated: 2026-05-30

## Leyenda

| Symbol | Meaning |
|---|---|
| `[ ]` | Pending |
| `[/]` | In progress |
| `[x]` | Done |
| `[!]` | Blocked |

| Priority | Level |
|---|---|
| 🔴 | Critical — production risk or broken feature |
| 🟠 | High — significant UX or data quality impact |
| 🟡 | Medium — technical debt with measurable effect |
| 🟢 | Low — quality improvement, no immediate user impact |

---

## Phase 2 — Architecture Refactor

### TASK-A001
**Priority:** 🟠  
**Status:** `[ ]`

**Title:** Split `/aprendizaje/page.tsx` into focused components

**Description:**  
The page is ~1500 LOC with 5 modals, 3 data queries, and all business wiring inline. Extract each modal into its own file under `src/app/aprendizaje/components/`.

**Files to create:**
- `add-resource-modal.tsx` (the add/edit dialog, lines ~850–1600)
- `session-review-modal.tsx` (the batch review dialog, lines ~500–685)
- `impact-modal.tsx` (SetupImpactModal, lines ~690–780)
- `link-setup-modal.tsx` (LinkSetupModal, lines ~782–850)

**Target:** `page.tsx` under 200 LOC after extraction.

---

### TASK-A002
**Priority:** 🟠  
**Status:** `[ ]`

**Title:** Split `/trades/page.tsx` and `/dashboard/page.tsx`

**Description:**  
Apply the same modal extraction pattern to the trades and dashboard pages.

---

### TASK-A003
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Extract ReviewScheduler service

**Description:**  
Move `nextReviewAt` calculation and `reviewInterval` scaling logic out of `learning-resources.ts` router into `src/domains/learning/services/review-scheduler.ts`.

**Why:** The same logic is partially duplicated between `createReview`, the edge function, and the decay detector. A single `ReviewScheduler.calcNextReview(masteryLevel, currentInterval)` function eliminates the duplication.

---

### TASK-A004
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Extract StreakService

**Description:**  
Move streak computation out of `createReview` transaction into `src/domains/learning/services/streak-service.ts`. Function signature: `computeNewStreak(lastReviewDate, currentStreak): { newStreak, lastReviewDate }`.

---

### TASK-A005
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Extract DecayDetector service

**Description:**  
Move the MASTERED→IN_REVIEW transition logic out of the `stats` procedure into `src/domains/learning/services/decay-detector.ts`. Makes it independently testable and reusable.

---

### TASK-A006
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Add unit tests for learning domain services

**Description:**  
Once A003–A005 are extracted, write Vitest unit tests for:
- `ReviewScheduler`: all mastery levels → correct interval
- `StreakService`: consecutive day, same day, gap > 1 day, new user
- `DecayDetector`: not decayed, exactly at threshold, past threshold, MASTERED without nextReviewAt

**Target:** 100% branch coverage on these three services.

---

### TASK-A007
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Paginate trade list

**Description:**  
`trades.list` currently fetches all trades for the user. For accounts with >200 trades this will become slow. Add cursor-based pagination with `limit` + `cursor` params.

---

### TASK-A008
**Priority:** 🟢  
**Status:** `[ ]`

**Title:** Paginate learning resources

**Description:**  
`learning-resources.list` fetches all resources. Add server-side status/type filtering to reduce payload for users with many resources.

---

## Phase 3 — Dashboard Intelligence

### TASK-D001
**Priority:** 🟠  
**Status:** `[ ]`

**Title:** Day-of-week performance breakdown

**Description:**  
Add a tRPC procedure `trades.byDayOfWeek` returning `{ day, totalTrades, wins, winRate, avgPnl }[]`.  
Display as a bar chart in Dashboard.

---

### TASK-D002
**Priority:** 🟠  
**Status:** `[ ]`

**Title:** Setup comparison widget

**Description:**  
Side-by-side comparison of all setups: win rate, avg R, total trades, expectancy.  
Helps trader identify which setups are above/below edge.

---

### TASK-D003
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Rule violation trend chart

**Description:**  
Track `ruleViolations` per weekly review over time and surface the trend in Dashboard.  
Requires `WeeklyReview.ruleViolations` count field (add migration).

---

### TASK-D004
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Equity curve chart

**Description:**  
Cumulative P&L over time per account, using `AccountLog` entries as data points.  
Display in `/cuentas` account detail view.

---

### TASK-D005
**Priority:** 🟢  
**Status:** `[ ]`

**Title:** Session-of-day breakdown

**Description:**  
Classify trades by trading session (London, New York, Asian overlap) using `openedAt` timestamp + account timezone.  
Show win rate and avg R per session.

---

## Phase 4 — Integrations

### TASK-I001
**Priority:** 🟠  
**Status:** `[ ]`

**Title:** MT4/MT5 CSV import

**Description:**  
Parse MT4/MT5 history export format into Trade + TradeEvent records.  
API: `POST /api/import/mt4` with file upload, dry-run mode, conflict resolution.

---

### TASK-I002
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Trade screenshot attachment

**Description:**  
Upload chart screenshots to Supabase Storage, attach to Trade record.  
Display in trade detail drawer.

---

## Phase 5 — AI Analytics

### TASK-AI001
**Priority:** 🟢  
**Status:** `[ ]`

**Title:** Analytics service isolation

**Description:**  
Extract all analytics queries from tRPC routers into `src/domains/analytics/services/analytics-service.ts`.  
This is the prerequisite for plugging in an AI layer without coupling it to the tRPC transport.

---

### TASK-AI002
**Priority:** 🟢  
**Status:** `[ ]`

**Title:** AI coach prototype (RAG over trader data)

**Description:**  
Chat interface that answers questions about the trader's own journal data.  
Backend: Claude API with `claude-sonnet-4-6`, RAG context from Analytics service.  
Prototype scope: "Why did I lose last week?", "What's my best setup?", "Should I trade today?"

---

## Maintenance & Ongoing

### TASK-M001
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Supabase advisor scan — monthly

**Description:**  
Run `get_advisors` MCP tool monthly to catch new security or performance advisories.

---

### TASK-M002
**Priority:** 🟡  
**Status:** `[ ]`

**Title:** Dependency update cadence

**Description:**  
Monthly: `pnpm outdated`, update non-breaking. Quarterly: evaluate major version upgrades.  
Track: Next.js, Prisma, tRPC, Radix UI, Supabase JS.

---

### TASK-M003
**Priority:** 🟢  
**Status:** `[ ]`

**Title:** Error boundary + global error UI

**Description:**  
Add React `ErrorBoundary` to each page-level component. Currently unhandled render errors show a blank page.  
Add `/error.tsx` Next.js error page.
