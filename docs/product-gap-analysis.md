# Product Gap Analysis — Trading Journal v2

> **Date:** 2026-05-31  
> **Scope:** Full codebase audit across formulas, profile, psychology, reviews, and mobile  
> **Audit team:** PM · UX Researcher · Senior Trader · Trading Psychologist · Quant Analyst · SaaS Architect · AI Product Designer

---

## 1. Drawdown Calculation Audit

### Formula Used

**Source:** `src/domains/trading/services/account-service.ts:1–10`

```typescript
export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0, peak = 0, maxDd = 0
  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}
```

**Verdict: CORRECT — this is a proper peak-to-trough Maximum Drawdown on the cumulative P&L curve.**

The algorithm tracks the running peak of cumulative PnL and at every step computes the distance from that peak to the current cumulative value. The maximum of those distances is the Maximum Drawdown in dollar terms. This matches the industry-standard MDD formula.

### Where the Dollar Value is Converted to Percentage

| Location | Formula | Notes |
|---|---|---|
| `dashboard-analytics.ts:192` | `(maxDd / initBal) * 100` | Correct: DD% = maxDrawdownDollar / initialBalance |
| `use-account-stats.ts:50` | `((peakCumPnl - cumPnl) / initBal) * 100` | Slightly different calculation — tracks running DD vs max DD |
| `trades.ts:636–648` (router) | `computeMaxDrawdown(allClosed.map(…))` then divides by `initBal` | Used for auto-deactivation trigger |

### Bug: Inconsistent Drawdown in `use-account-stats.ts`

`use-account-stats.ts:50` computes **current** drawdown from peak (i.e., "where you are now relative to your all-time equity high") — not the historical maximum. This means the metric shown in the account card and account detail panel **resets to zero after a new equity high** even if the trader suffered a prior large drawdown. This is misleading for prop-firm drawdown limit tracking.

**Recommendation:** Use `computeMaxDrawdown` from the domain service consistently everywhere. The current approach in `use-account-stats.ts` should be labeled "current drawdown from ATH" rather than "max drawdown."

### Second Bug: Trades Page Drawdown Label

`src/app/trades/page.tsx:131–170` — the "Drawdown" KPI on the trades strip is labeled "peor día" (worst day) but is actually `minDay` = the minimum single-day PnL sum. This is **not a drawdown metric**; it is "worst trading day P&L." The label is misleading.

---

## 2. Formula Centralization Audit

| Formula | Location(s) | Centralized Service? | Status |
|---|---|---|---|
| **Win Rate** | `dashboard-analytics.ts:101`, `trades.ts:736`, `weekly-reviews.ts:205`, `weekly-reviews.ts:271`, `create-review-modal.tsx:99`, `trading-sessions.ts:94`, `learning-resources.ts:447`, `use-account-stats.ts:39` | No — 8 separate inline calculations | FRAGMENTED |
| **Net P&L** | Every router and component that touches trades | No — always inline `reduce((s,t) => s + t.pnl, 0)` | ACCEPTABLE (trivial sum) |
| **Average R** | `dashboard-analytics.ts:104`, `trades.ts:~740`, `use-account-stats.ts:40` | No | FRAGMENTED |
| **Sharpe Ratio** | `lib/formulas.ts:42` (canonical), `ai-context.ts:185–191` (duplicated inline) | Partially — `calcSharpeRatio()` exists but not used in `ai-context.ts` | PARTIALLY CENTRALIZED |
| **Max Drawdown (dollar)** | `domains/trading/services/account-service.ts:1` (canonical) | Yes — `computeMaxDrawdown()` — but `use-account-stats.ts:50` re-implements a variant | MOSTLY CENTRALIZED |
| **Drawdown %** | `dashboard-analytics.ts:192`, `use-account-stats.ts:50`, `trades.ts:648` | No central function | FRAGMENTED |
| **Discipline Score** | `weekly-reviews.ts:computedDisciplineScore`, `weekly-reviews.ts:prefill` (duplicated), `create-review-modal.tsx:103` (frontend inline) | No — 3 independent implementations | FRAGMENTED |
| **Profit Factor** | `lib/formulas.ts:55` (canonical), called from `dashboard-analytics.ts` | Yes — `calcProfitFactor()` | CENTRALIZED |
| **Expectancy R** | `lib/formulas.ts:17` (canonical), called from `dashboard-analytics.ts` | Yes — `calcExpectancyR()` | CENTRALIZED |

### Critical Issues

1. **Win Rate has 8 implementations.** A change to the business rule (e.g., treating break-even trades differently) requires updating 8 files. One known inconsistency already exists: `/trades/page.tsx` uses `rMultiple > 0` as the win criterion while the dashboard uses `pnl > 0`.

2. **Discipline Score has 3 independent implementations.** The frontend modal (`create-review-modal.tsx:103`) uses a simplified tag-counting formula (`disciplinedCount / total * 100`), while the server computes a weighted multi-factor score (execution 50pts + learning 30pts + adherence 20pts). They produce different numbers for the same week.

3. **Sharpe Ratio is re-implemented in `ai-context.ts:185`** instead of calling `calcSharpeRatio` from `lib/formulas.ts`. The inline version uses population std dev; the library version uses Bessel-corrected sample std dev.

### Recommendation: Create `lib/trading-formulas.ts`

Move and re-export all formula functions with a single source of truth:

```typescript
// Proposed: lib/trading-formulas.ts
export { calcSharpeRatio, calcProfitFactor, calcExpectancyR } from "./formulas"
export function calcWinRate(wins: number, total: number): number { ... }
export function calcDrawdownPct(maxDdDollar: number, initBal: number): number { ... }
export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown { ... }
```

---

## 3. User Profile Impact Audit

### Current State of `/perfil/page.tsx`

**Status: CRITICAL — Page is entirely non-functional (UI disconnected from backend)**

The profile page (`src/app/perfil/page.tsx`) is a fully static component. All 14 fields use local `useState` with hardcoded default values. There are zero tRPC calls or `fetch` calls in the entire file.

| Field | UI Present | Persisted | Connected to App |
|---|---|---|---|
| Name / Surname | Yes | No | No |
| Email | Yes | No | No |
| Timezone | Yes (select) | No | No — Session classification ignores this |
| Language | Yes (select) | No | No |
| Risk per trade | Yes | No | No — Account creation ignores this |
| Max trades/day | Yes | No | No — Account creation ignores this |
| Daily loss cap | Yes | No | No |
| Auto-pause toggle | Yes | No | No |
| Daily plan reminder | Yes | No | No |
| Block NFP | Yes | No | No |
| Email notifications (3) | Yes | No | No |
| Session times | Display only | N/A | N/A |

### What the Schema Actually Has (vs. UI)

The `User` model in `schema.prisma` has these fields that **already exist in the DB but are never shown/edited in the UI**:

| DB Field | Schema Type | Profile UI? |
|---|---|---|
| `timezone` | `String @default("America/Tegucigalpa")` | Shown but not saved |
| `baseCurrency` | `String @default("USD")` | Not shown |
| `language` | `String @default("es")` | Shown but not saved |
| `weeklyGoalMinutes` | `Int?` | Not shown |
| `emailNotifications` | `Boolean` | Toggle shown but not saved |
| `currentStreak` | `Int` | Not shown on profile |
| `bestStreak` | `Int` | Not shown on profile |
| `role` | `String @default("Single-trader")` | Not shown |

### Missing Profile Fields (High-Value Gaps)

| Missing Field | Impact on System | Priority |
|---|---|---|
| AI API keys (per-user) | AI Coach is currently shared-key-only | P1 |
| AI model selection | No user control over model quality/cost | P1 |
| Default risk % per trade | Should pre-fill trade registration form | P1 |
| Base currency | Affects all P&L display formatting | P1 |
| Session time customization (editable) | Session classification is hardcoded | P2 |
| Dashboard layout preference | No persistence of tab selection, grain | P2 |
| Weekly goal (minutes studying) | Field exists in DB, never surfaced | P2 |
| Notification email (separate from auth) | Resend uses auth email | P2 |
| Data export preferences | Button exists but no handler | P2 |
| Delete account flow | Button exists but no handler | P0 (legal) |

### Profile-to-App Propagation Score: 0/14

No setting saved in the profile propagates to any other part of the application. The timezone shown in the sidebar subtitle is hardcoded. The session times are hardcoded. The trade form does not read a default risk %.

---

## 4. AI Configuration Per User Audit

### API Key Storage

**Current state:** All API keys are stored as **server-side environment variables only** — `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.

`src/lib/ai/config.ts:21–27` — `getProviderKey()` reads exclusively from `process.env`. There is no per-user API key storage in the database schema.

**Implication:** All users of a deployment share the same API credentials and cost center. This is acceptable for single-tenant deployments but blocks multi-tenant SaaS.

### Per-User Model Selection

**Current state:** Model selection is determined by env vars or hardcoded defaults in `src/lib/ai/config.ts`:
- Coach model: `claude-sonnet-4-5` (hardcoded, see also audit finding T-015)
- Embedding model: `openai/text-embedding-3-small`
- Summary model: `claude-haiku-4-5-20251001`

No user can select a different model. No UI exists for model configuration.

### Connectivity Test UI

**Current state:** None. There is a `isAnyKeyConfigured()` function that the AI Coach route checks before responding with `NO_API_KEY`, but no UI panel or endpoint that tests the connection and reports latency/validity.

### AI Coach Availability Check

`src/app/api/ai-coach/route.ts:72` — if no key is configured, returns `{ error: "NO_API_KEY" }` with HTTP 200. The UI in `ai-coach-drawer.tsx` must inspect the payload to detect this failure. There is no connectivity test endpoint.

---

## 5. Visual Personalization Audit

### Theme System

**Current state:** Binary dark/light toggle implemented via `ThemeProvider` in `src/components/theme-provider.tsx`. The toggle persists to `localStorage("tj-theme")`.

Design tokens are defined in `src/app/globals.css` as CSS custom properties on `:root` (light) and `.dark` (dark). The token set covers all semantic colors (bg, panel, ink, accent, win, loss, be, chip, line).

**Gaps:**
- No "system" theme option (respects OS preference via `prefers-color-scheme`)
- No custom accent color — accent is hardcoded to `oklch(58% 0.16 264)` (blue)
- No custom win/loss color (colorblind users cannot change green/red)
- No font size adjustment
- No compact/comfortable density toggle

### Custom Color Support

No custom color support exists. The design token architecture supports it — adding a user-selected accent OKLCH value as an inline CSS variable would work — but no UI or persistence layer exists.

### Brand/Logo Customization

No branding customization. The app name "TJ" and "Trading Journal" are hardcoded in `Sidebar.tsx`.

---

## 6. Psychology Fields Audit

### Trade Model Fields

**Schema (`schema.prisma`):** The `Trade` model has **no dedicated psychology fields**.

The only psychology-adjacent data exists in:
1. `tags: String[]` — can include user-defined tags like "psicologia", "FOMO", "Impulsivo", "Off-plan"
2. `notes: String` — free-text field, unstructured
3. `TradingSessionLog.preMood: Int?` — 1–5 scale, pre-session only
4. `TradingSessionLog.energyLevel: Int?` — 1–5 scale, pre-session only

### What's Missing

| Psychology Dimension | Present in Schema? | Present in UI? | Notes |
|---|---|---|---|
| Pre-trade emotion (per trade) | No | No | Only session-level preMood |
| Post-trade emotion | No | No | — |
| Confidence level (per trade) | No | No | — |
| FOMO flag | No (only as tag) | Partial (tag) | Not queryable as structured data |
| Revenge trading flag | No (only as tag) | Partial (tag) | — |
| Impulse trading flag | No (only as tag) | Partial (tag) | — |
| Trade quality self-rating | No | No | — |
| Execution quality (vs plan) | Partial (checklist) | Checklist present | TradeChecklistResult exists |
| Pre-session mood correlation | Yes (TradingSessionLog) | Dashboard tab-disciplina | Implemented — "mood correlation" chart |
| Discipline score (weekly) | Yes (WeeklyReview) | Yes | Weekly aggregate |
| Violation tags | Yes (tags array) | Yes | Used in discipline tab |

### Psychology Tracking Gaps (High-Value)

1. **No per-trade emotional state.** A trader cannot tag "I felt FOMO on this specific trade" in a structured way — it must be buried in free-text notes or as a generic string tag.
2. **No confidence metric per trade.** Many trading psychology frameworks (SMB, Mark Douglas) track pre-trade confidence as a predictor of discipline.
3. **No post-trade regret/satisfaction field.** Post-trade reflection is the highest-leverage psychology intervention.
4. **Session mood is not linked to individual trades.** You cannot correlate "I had 2.0 mood this morning" with "these 3 specific trades were losers."
5. **FOMO/revenge/impulse are string tags, not boolean flags.** This prevents reliable counting ("how many FOMO trades did I take this month?").

---

## 7. Weekly Reviews UX Gaps

### Edit Existing Reviews

**Current state:** No edit button exists on the `ReviewDetailPanel` (`src/app/reviews/components/review-detail-panel.tsx`). The panel shows the review in read-only view. There is no way to open an existing review for editing.

The `weeklyReviews.update` procedure exists in the router (`weekly-reviews.ts:83–95`) and accepts partial input, but it is never called from any UI component.

**Impact:** If a trader saves a draft, they cannot continue editing it. If they submit a review and realize they made an error, they cannot correct it.

### Draft vs Submitted Status

| Feature | State |
|---|---|
| `status` field in schema | Yes — `"draft" \| "submitted"` |
| Draft saves from modal | Yes — "Guardar borrador" button works |
| Draft indicator on card | Yes — "Borrador" badge displayed |
| Edit/Continue draft flow | Missing — no "Continue editing" button |
| Re-open submitted review | Missing — no edit button anywhere |
| Delete review | `delete` procedure exists; no UI button visible in detail panel |

### Other Weekly Review Gaps

1. **No filtering by account in the reviews list.** If a trader manages 3 prop firm accounts and wants to see only reviews for Account A, they cannot.
2. **Review list has no search/filter.** With many reviews, finding a specific week requires scrolling.
3. **No diff between draft and submitted stats.** If you edit a draft after saving, there's no change history.
4. **Review card summary text is hidden on mobile** (`hidden sm:block` at `review-card.tsx:123`).
5. **No week comparison view.** A trader cannot see two reviews side-by-side.

---

## 8. Responsive Design Audit

### Breakpoint Coverage

The application implements a three-tier responsive layout:

| Breakpoint | Treatment | Quality |
|---|---|---|
| Mobile (`< 768px`) | Fixed top bar (52px) + bottom nav (56px) + body scroll | Good |
| Tablet (`768px–1023px`) | Icon-only sidebar (56px) | Good |
| Desktop (`≥ 1024px`) | Full collapsible sidebar (240px / 56px) | Good |

### Mobile-Specific Implementations

- `Sidebar.tsx:75–275` — Complete mobile nav re-implementation with bottom bar + "Más" drawer
- `globals.css:145–183` — Mobile media query block
- `detail-panel-mobile` CSS class — Detail panels become full-screen sheets on mobile

### Mobile Gaps

| Issue | Location | Severity |
|---|---|---|
| Dashboard tabs overflow horizontally | `tab-*.tsx` | Medium |
| `ReviewDetailPanel` full-screen sheet blocks back navigation (no swipe gesture) | `review-detail-panel.tsx` | Medium |
| Trade register modal lacks mobile keyboard optimization (`inputmode`, `type="number"`) | `register-trade-modal.tsx` | Low |
| Dashboard charts (Recharts) have no touch interaction | Multiple chart components | Medium |
| The "Más" drawer only shows 4 items — Retiros not accessible on mobile without drawer | `Sidebar.tsx:88–93` | Low |
| KPI strip on mobile shows 2 columns; 4 KPIs often need scrolling | `kpi-strip.tsx:17` | Low |
| Account detail panel (380px wide) renders at full screen on mobile but lacks back button | `account-detail-panel.tsx` | Medium |

---

## 9. Empty States and Error Handling

### Empty States Coverage

| Page | Empty State | Quality |
|---|---|---|
| Reviews | "No hay reviews todavía" + CTA button | Good |
| Trades | Loading spinner only | Minimal |
| Dashboard | Error boundary + reload button | Minimal |
| Aprendizaje | Filtered empty state exists | Good |
| Cuentas | No empty state when no accounts | Missing |
| Playbook | No empty state for no setups | Missing |
| Mercados | No empty state | Missing |

### Error Handling Gaps

1. `dashboard/error.tsx` calls `window.location.reload()` — antipattern in SPA, should call `reset()` from error boundary
2. `api/ai-coach/route.ts:106` — returns `{ error: "BAD_REQUEST" }` with status 500 (message-code mismatch)
3. No toast/notification system for mutations (trade created, review saved, etc.) — mutations either silently succeed or fail
4. `trades/loading.tsx` exists but is a bare `<div>` with no skeleton UI

---

## Summary: Gap Severity Matrix

| Area | Critical | High | Medium | Low |
|---|---|---|---|---|
| Profile / Settings | 1 (non-functional) | 3 (missing fields) | 2 | 1 |
| Formulas | 2 (inconsistent) | 2 (fragmented) | 1 | — |
| Weekly Reviews UX | 1 (no edit) | 1 (no filter) | 2 | 2 |
| AI Configuration | — | 2 (no per-user key) | 2 | 1 |
| Psychology Tracking | — | 2 (no per-trade) | 3 | — |
| Mobile Responsiveness | — | 1 | 4 | 3 |
| Visual Personalization | — | — | 3 | 2 |
| Empty States / Errors | — | 1 | 3 | 2 |
