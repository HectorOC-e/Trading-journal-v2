# Feature Opportunities — Trading Journal v2

> **Date:** 2026-05-31  
> **Prioritization framework:** P0 = Critical bug/blocker · P1 = High-value near-term · P2 = Medium-term roadmap · P3 = Long-term vision  
> **Effort scale:** S (1–2 days) · M (3–7 days) · L (1–3 weeks) · XL (3–6 weeks)

---

## P0 — Critical Bugs / Blockers

These issues produce incorrect data or broken features **today**.

---

### F-P0-001 · Connect the Profile Page to the Backend

**User value:** Users cannot save their name, timezone, language, or notification preferences. Settings made on the profile page are lost on page reload. The "Cerrar sesión" and "Borrar cuenta" buttons have no `onClick` handlers — legal risk.  
**Effort:** M (4–5 days)  
**Root cause:** `src/app/perfil/page.tsx` has zero tRPC calls. All 14 fields use local `useState` with hardcoded defaults.  
**Requires:** New `profile` tRPC router with `get`, `update`, `changePassword`, `exportData`, `deleteAccount` procedures; connect to existing `User` model fields.  
**Dependencies:** None — schema fields already exist.

---

### F-P0-002 · Fix KPI Calculation Over Paginated Trade Data

**User value:** Any user with more than 50 trades sees incorrect Win Rate, Net P&L, and Avg R on the `/trades` page KPI strip (calculates only over the first page of 50 trades).  
**Effort:** S (1 day)  
**Root cause:** `src/app/trades/page.tsx:124–130` computes KPIs from `tradePages?.pages.flatMap(p => p.items)` — the infinite query result — which on first load returns only 50 items.  
**Fix:** Move KPI computation to `trades.stats` tRPC procedure (or reuse `trades.dashboardStats`) and query aggregate values from the server.  
**Dependencies:** None.

---

### F-P0-003 · Fix Discipline Score Duplication (3 Implementations)

**User value:** The discipline score shown during review creation can differ from the server-computed score and from the auto-generated preview. Traders track this metric weekly — inconsistency erodes trust.  
**Effort:** S (1 day)  
**Root cause:** `create-review-modal.tsx:103`, `weekly-reviews.ts:computedDisciplineScore`, and `weekly-reviews.ts:prefill` each implement their own formula.  
**Fix:** Extract a shared `computeDisciplineScore(userId, from, to, ctx)` server function; call it from both procedures; have the client modal rely only on server-provided data.  
**Dependencies:** None.

---

### F-P0-004 · Fix Win Rate Criterion Inconsistency

**User value:** Win Rate shown on `/trades` page uses `rMultiple > 0` while the dashboard uses `pnl > 0`. Traders see different win rates on two screens for the same period.  
**Effort:** S (0.5 day)  
**Root cause:** `src/app/trades/page.tsx:125` vs `dashboard-analytics.ts:97`.  
**Fix:** Standardize on `pnl > 0` (cash-positive = win) across all calculation sites. Consider extracting `isWin(trade)` helper to `lib/trading-formulas.ts`.  
**Dependencies:** Precedes F-P0-002 to avoid fixing in two places.

---

### F-P0-005 · Fix Delete Account / Export Data Buttons

**User value:** "Borrar cuenta" and "Exportar datos" buttons on the profile page have no `onClick`. GDPR-style data deletion is a legal requirement if the product operates in regulated markets.  
**Effort:** S (1–2 days)  
**Root cause:** `perfil/page.tsx:329–332` — buttons render with no handlers.  
**Fix:** Implement `profile.deleteAccount` mutation with a confirmation dialog; implement `profile.exportData` that returns a JSON/CSV of all user data.  
**Dependencies:** Depends on F-P0-001.

---

### F-P0-006 · Fix Phase Promotion Hardcoded False

**User value:** Prop firm traders advancing from Phase 1 → Phase 2 → Funded always see "objective not met" — they must ignore the warning to promote. This undermines trust in the tool.  
**Effort:** S (0.5 day)  
**Root cause:** `cuentas/modals/promote-phase-modal.tsx:41` — `objectiveMet = false` hardcoded.  
**Fix:** Compare `account.netPnl` (from account stats) vs `account.targetPct * initialBalance`.  
**Dependencies:** None.

---

## P1 — High-Value, Near-Term Features

Ship within the next 4–8 weeks.

---

### F-P1-001 · Edit Existing Weekly Reviews

**User value:** Once a review is saved (draft or submitted), there is no way to edit it. Traders frequently want to revisit and update their analysis after watching their trades replay.  
**Effort:** M (3 days)  
**What to build:**  
- Add "Edit" button to `ReviewDetailPanel` header  
- Re-use `NuevaReviewModal` in "edit mode" with pre-filled data  
- Call `weeklyReviews.update` mutation on save  
- Show "Last edited" timestamp in detail panel  
**Dependencies:** `weeklyReviews.update` procedure already exists.

---

### F-P1-002 · Per-Trade Psychology Fields

**User value:** Trading psychologists rank per-trade emotional tracking as the highest-leverage habit for behavioral improvement. Currently no structured psychology data exists at the trade level.  
**Effort:** M (5 days)  
**What to add to Trade model:**
```prisma
emotionBefore  String?   // "calm" | "anxious" | "excited" | "fearful" | "overconfident"
confidenceRating Int?    // 1–5
executionQuality Int?    // 1–5
tradeRegret      Boolean @default(false)
fomoFlag         Boolean @default(false)
revengeFlag      Boolean @default(false)
```
- Add to trade registration modal as optional section (collapsible)  
- Add to trade edit modal  
- Expose in analytics: "emotion vs. win rate" breakdown  
**Dependencies:** Schema migration + router update + modal UI.

---

### F-P1-003 · Centralize Financial Formulas in `lib/trading-formulas.ts`

**User value:** Prevents silent metric divergence as the product evolves. A single winRate formula change propagates everywhere.  
**Effort:** M (3 days)  
**What to build:**
- Move and unify `calcWinRate`, `calcDrawdownPct`, `calcDisciplineScore` into `lib/trading-formulas.ts`
- Update all 8 win-rate call sites to use the shared function
- Fix `ai-context.ts` to call `calcSharpeRatio` from formulas instead of re-implementing it
**Dependencies:** Completes F-P0-004 naturally.

---

### F-P1-004 · AI Configuration UI (Per-User Keys and Model Selection)

**User value:** Users want to bring their own API key and choose between Claude Opus (expensive, best coaching) vs Claude Haiku (cheap, fast summaries) based on their budget.  
**Effort:** L (8–10 days)  
**What to build:**
- `UserAiConfig` table in DB (see `ai-architecture-recommendations.md`)
- "Configuración IA" section in the Profile page
- Input fields for API keys (masked), model selectors, test-connection button
- Priority: per-user config > env var fallback
**Dependencies:** F-P0-001 (profile page must work first).

---

### F-P1-005 · Drawdown Label Fix and Standardization

**User value:** The "Drawdown" KPI on the trades page is mislabeled — it shows "worst day P&L" not actual drawdown. Prop firm traders rely on accurate drawdown numbers for risk management.  
**Effort:** S (1 day)  
**What to build:**
- Rename "Drawdown / peor día" → "Peor día" on trades KPI strip
- Add a real drawdown metric using `computeMaxDrawdown` over all trades  
- Standardize `use-account-stats.ts` to use `computeMaxDrawdown` instead of rolling current-DD calculation
**Dependencies:** None.

---

### F-P1-006 · Toast Notification System for Mutations

**User value:** After creating a trade, saving a review, or closing an account, users receive no visual feedback. They cannot tell if an action succeeded or failed.  
**Effort:** M (3 days)  
**What to build:**
- Integrate a toast library (Sonner or Radix Toast) into the app shell
- Add success toasts for: trade created/closed/deleted, review saved, account updated, rule toggled
- Add error toasts for all mutation `onError` callbacks
**Dependencies:** None.

---

### F-P1-007 · Mobile Detail Panel Back Navigation

**User value:** On mobile, opening a trade or review detail panel gives no way to go "back" except finding the X button. Users expect swipe-back or a back arrow.  
**Effort:** S (2 days)  
**What to build:**
- Add back-arrow button to all detail panels on mobile  
- Optionally: implement swipe-down gesture to dismiss full-screen panels  
**Dependencies:** None.

---

## P2 — Medium-Term Roadmap

Ship within 2–4 months.

---

### F-P2-001 · Dashboard Layout Customization

**User value:** Different trader types (scalpers vs swing traders) have different analytics priorities. Let users pin their preferred dashboard tab and reorder KPI cards.  
**Effort:** M (5 days)  
**What to build:**
- Persist last active dashboard tab to user preferences
- Drag-and-drop KPI card reordering with persistence to `localStorage` or DB
- "Reset to default" option  
**Dependencies:** F-P0-001 (profile backend).

---

### F-P2-002 · Theme Customization — System Mode and Accent Colors

**User value:** "System" theme mode respects OS dark/light preference automatically. Custom accent color lets users personalize their experience.  
**Effort:** M (5 days)  
**What to build:**
- Three-way theme selector: light / dark / system (using `prefers-color-scheme`)
- Accent color picker (OKLCH hue wheel) with preview
- Persist choice to user profile
- Colorblind mode: replace green/red with blue/orange  
**Dependencies:** F-P0-001 for persistence.

---

### F-P2-003 · Weekly Review Filtering and Search

**User value:** Traders with 52+ weekly reviews need to find specific weeks quickly. Account filtering is essential for multi-account traders.  
**Effort:** M (3 days)  
**What to build:**
- Search bar filtering reviews by week label, date range, account
- Filter by status (draft/submitted)
- Filter by score ranges (discipline > 80, win rate > 60%)
**Dependencies:** None.

---

### F-P2-004 · Playbook Setup Sparklines with Real Data

**User value:** Setup sparklines on the Playbook page are placeholder "— sin trades" stubs. Real equity-by-setup charts help traders see which setups are improving or degrading.  
**Effort:** M (4 days)  
**Root cause:** `playbook/page.tsx:276–279` — `SparklinePlaceholder` not connected to data.  
**Fix:** Add `dashboardStats.setupStats[].equityCurve` data (already computed in `dashboard-analytics.ts`) to the setup card and drawer.  
**Dependencies:** None.

---

### F-P2-005 · Goal Setting and Weekly Progress Tracking

**User value:** Traders with explicit weekly goals (e.g., "trade 3 days/week," "complete 2 reviews") show significantly better outcomes. The `weeklyGoalMinutes` field exists in the DB but is never surfaced.  
**Effort:** L (10 days)  
**What to build:**
- Goal configuration section in profile: weekly trade goal, learning minutes goal, review goal
- Dashboard widget showing goal progress (progress ring, days remaining)
- Weekly goal email notification if configured  
**Dependencies:** F-P0-001 for goal persistence.

---

### F-P2-006 · R-Multiple Calculation on CSV Import

**User value:** Imported trades from MT4/cTrader show `—` for all R-multiple metrics. This silently corrupts Avg R, Expectancy R, and Sharpe Ratio for anyone who imports trades.  
**Effort:** S (0.5 day)  
**Root cause:** `api/import/mt4/route.ts` — `rMultiple: null` for all imported trades.  
**Fix:** Calculate `rMultiple = (closePrice - entry) / |entry - stop|` for LONG; negate for SHORT. Requires entry and stop prices in the CSV schema.  
**Dependencies:** None.

---

### F-P2-007 · Onboarding Flow for New Users

**User value:** A new user landing on an empty dashboard has no guidance. First-time experience needs: account setup, first trade, profile basics.  
**Effort:** L (2 weeks)  
**What to build:**
- Welcome modal on first login
- 5-step guided setup: create account → set risk parameters → add your first setup → log first trade → create first review
- Progress checklist that disappears after completion
- Skip/resume functionality  
**Dependencies:** F-P0-001 (profile must work).

---

### F-P2-008 · Custom Tags Management

**User value:** Tags like "A+", "Off-plan", "FOMO" are currently free-form strings with no management UI. Traders accumulate duplicates ("fomo", "FOMO", "Fear/FOMO").  
**Effort:** M (5 days)  
**What to build:**
- Tags management page or profile section  
- Predefined tag library (violation types, setup quality, emotion categories)
- Tag merge/rename functionality  
- Tag color coding  
**Dependencies:** None.

---

## P3 — Long-Term Vision

Ship within 6–12 months.

---

### F-P3-001 · Multi-Account Portfolio Dashboard

**User value:** Prop firm traders running 3–5 challenges simultaneously need a unified portfolio view with aggregate equity curve, cross-account correlation, and portfolio-level drawdown.  
**Effort:** XL (4–6 weeks)  
**What to build:**
- Portfolio-level KPI aggregation (total P&L, blended win rate, portfolio equity curve)
- Cross-account allocation view
- Account performance comparison chart
- Portfolio-level drawdown with per-account contribution  
**Dependencies:** Dashboard analytics service (already partially built).

---

### F-P3-002 · AI-Powered Pattern Detection Improvements

**User value:** Current pattern detector (`domains/analytics/services/pattern-detector.ts`) has 5 static patterns. LLM-based pattern analysis over trade notes (via embeddings) would unlock qualitative pattern detection.  
**Effort:** XL (4 weeks)  
**What to build:**
- Semantic clustering of trade notes via embeddings
- Time-of-day performance gradient analysis
- Cross-setup correlation detection
- AI coach proactive nudges ("I noticed you tend to exit early on Wednesdays")  
**Dependencies:** Embedding availability (pgvector already set up).

---

### F-P3-003 · Social Features — Leaderboard and Community Reviews

**User value:** Accountability partners and public review boards are proven behavior-change mechanisms in trading communities.  
**Effort:** XL (6 weeks)  
**What to build:**
- Optional public profile with anonymized performance metrics
- Weekly review sharing (redacted) with comments
- Accountability partner pairing
- Community leaderboard (opt-in, discipline score and consistency metrics)  
**Dependencies:** Major auth and privacy architecture changes.

---

### F-P3-004 · Automated Trade Import (Broker API Integration)

**User value:** Manual trade entry is the biggest adoption barrier. Real-time sync with Interactive Brokers, Tradovate, TopStep, etc. would remove the data entry friction entirely.  
**Effort:** XL (6+ weeks per integration)  
**What to build:**
- OAuth flow for broker connections
- Webhook receivers for trade events
- Conflict resolution for duplicate imports
- Automatic R-multiple and session classification  
**Dependencies:** Each broker requires separate integration work.

---

### F-P3-005 · Trading Psychology Assessment and Curriculum

**User value:** A structured psychological assessment (MBTI-adjacent for traders, impulsivity/loss-aversion profiles) with a personalized improvement curriculum.  
**Effort:** XL (8 weeks)  
**What to build:**
- Initial onboarding psychological assessment (20 questions)
- Profile categorization: "Analytical", "Impulsive", "Risk-Averse", "Overconfident"
- Personalized learning resource recommendations based on profile
- Weekly psychology micro-lessons in the AI coach  
**Dependencies:** AI coach infrastructure, learning resources module.

---

## Feature Priority Matrix

| Feature | Priority | Effort | User Impact | Technical Risk |
|---|---|---|---|---|
| F-P0-001 Profile Backend | P0 | M | Critical | Low |
| F-P0-002 KPI Fix | P0 | S | High | Low |
| F-P0-003 Discipline Score | P0 | S | Medium | Low |
| F-P0-004 Win Rate Fix | P0 | S | High | Low |
| F-P0-005 Delete/Export | P0 | S | Critical (legal) | Low |
| F-P0-006 Phase Promotion | P0 | S | Medium | Low |
| F-P1-001 Edit Reviews | P1 | M | High | Low |
| F-P1-002 Psychology Fields | P1 | M | High | Medium |
| F-P1-003 Formulas Central | P1 | M | Medium | Low |
| F-P1-004 AI Config UI | P1 | L | High | Medium |
| F-P1-005 Drawdown Label | P1 | S | High | Low |
| F-P1-006 Toast System | P1 | M | High | Low |
| F-P1-007 Mobile Back Nav | P1 | S | Medium | Low |
| F-P2-001 Dashboard Customize | P2 | M | Medium | Low |
| F-P2-002 Theme Custom | P2 | M | Medium | Low |
| F-P2-003 Review Filter | P2 | M | Medium | Low |
| F-P2-004 Playbook Sparklines | P2 | M | Medium | Low |
| F-P2-005 Goal Setting | P2 | L | High | Low |
| F-P2-006 CSV R-Multiple | P2 | S | High | Low |
| F-P2-007 Onboarding Flow | P2 | L | High | Low |
| F-P2-008 Custom Tags | P2 | M | Medium | Low |
| F-P3-001 Portfolio Dashboard | P3 | XL | High | Medium |
| F-P3-002 AI Pattern Detect | P3 | XL | High | High |
| F-P3-003 Social Features | P3 | XL | Medium | High |
| F-P3-004 Broker API | P3 | XL | Very High | Very High |
| F-P3-005 Psych Curriculum | P3 | XL | High | High |
