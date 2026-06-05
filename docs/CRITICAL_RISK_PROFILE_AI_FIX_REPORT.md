# CRITICAL RISK / PROFILE / AI — Fix Report
> **Date:** 2026-06-04
> **Gates:** `next build` ✅ · `tsc` ✅ 0 errors · `vitest` ✅ 531 tests · `eslint` ✅ 0 errors

---

## BUG #1 — Account Risk Management & Drawdowns

### PROBLEMA A — Drawdowns inconsistentes (root cause)

**Evidence:** balance $75, max DD ≈ $4.90 → 6.53% actual, limit 12%, but the bar read **"54% / 12%"**.

**Root cause (two layers):**
1. **`RuleBar` display semantics.** When given `usedPct` + `limitLabel` (no `displayRight`), `RuleBar` renders `"{fill%} / {limitLabel}"`. The fill % is the *limit utilization* (6.53 / 12 × 100 = **54%**), so it printed "54% / 12%" — the utilization masqueraded as the drawdown.
2. **Duplicated, divergent formulas.** `account-card.tsx` and `account-detail-panel.tsx` each computed drawdown/loss utilization **inline**, with *different* formulas:
   - Total DD: `drawdownPct / ddTotalPct * 100`
   - Daily/Monthly: `-pnlToday / (balance * ddPct/100) * 100` (a different metric: current period P&L, not peak-to-trough)
   - **Weekly: hardcoded `usedPct={0}`** — never computed.

**Fix — single source of truth (Risk Engine):**
- New `domains/trading/services/risk-engine.ts`:
  - `computeAccountRisk(input)` → per-period `LimitGauge { configured, actualPct, limitPct, usedPct }` for daily/weekly/monthly/total + a `breach` decision.
  - Drawdown uses the canonical `computeMaxDrawdown` + `calcDrawdownPct` from `lib/formulas/drawdown.ts` — no inline math.
- `buildAccountStats` now computes `risk` server-side (receives all `dd*Pct` limits + weekStart) and returns it on every `AccountStat`. `drawdownPct` is now `risk.total.actualPct` (one value, one formula).
- `account-card.tsx` + `account-detail-panel.tsx` render `stats.risk.*`:
  - Bar fills by **`usedPct`** (utilization toward limit).
  - The number shows **`actual% / limit%`** (e.g. `6.53% / 12.0%`).
  - Weekly gauge now real (was hardcoded 0).
- Result for the evidence case: bar fills ~54%, label reads **"6.53% / 12.0%"** — unambiguous and identical across cards, detail panel, and dashboard.

### PROBLEMA B — Auto-lock incl. Max Drawdown

**Before:** `trades.create` only checked **daily** loss (and weekly/monthly added in a prior pass) — **never total max-drawdown**.

**Fix:** `trades.create` now fetches the account's full closed-trade history, computes the risk picture via `computeAccountRisk` (daily/weekly/monthly loss **+ total max-drawdown**), and on `risk.breach`:
1. Auto-locks the account (`locked=true`, `lockReason`, `lockedAt`).
2. Writes an `AccountLog` `LOCKED` entry (`auto: true`, with limit/actual %).
3. Rejects the trade with `ACCOUNT_LOCKED:<reason>`.

Lock reasons: `DAILY_LOSS_LIMIT`, `WEEKLY_LOSS_LIMIT`, `MONTHLY_LOSS_LIMIT`, **`MAX_DRAWDOWN`** (precedence in that order).

**Restrictions while locked (backend-authoritative, UI mirrors):**
- New trades rejected (`trades.create`).
- CSV import rejected (`api/import/mt4` → 403 `ACCOUNT_LOCKED`).
- Messages: "Account Locked — Daily/Weekly/Monthly Loss Limit Reached", "Maximum Drawdown Reached" (UI maps in trades page + detail panel).

**Manual lock/unlock:** `accounts.lock` / `accounts.unlock` mutations with audit (`LOCKED`/`UNLOCKED`). UI: red **BLOQUEADA** badge, locked banner naming the limit, lock/unlock buttons.

**Tests:** `risk-engine.test.ts` (15) — all 4 limits, evidence case, clamping, precedence, profit-never-breaches. `trades.test.ts` integration: locked-account rejection, paused-setup, weekly auto-lock, **max-drawdown auto-lock**. `accounts.test.ts`: lock/unlock + audit.

---

## BUG #2 — OpenRouter API Key

**Root cause:** The error *"api key must be a 64 character hex string (32 bytes)"* was **never** about the user's key. It is thrown by the **server encryption layer** (`key-encryption.getEncryptionKey`) when `AI_KEY_ENCRYPTION_SECRET` is missing/invalid. The key-format validator already accepted OpenRouter (`sk-or-…`). So: (1) the validation is NOT OpenAI-only, (2) the hex requirement applies only to the *server secret*, (3) encryption was failing because (4) `AI_KEY_ENCRYPTION_SECRET` was unset, (5) it was under-documented, (6) there was no dev mode.

**Fix:**
- `EncryptionConfigError` class to distinguish *server misconfig* from *bad user key*.
- **Dev mode:** when the secret is missing and `NODE_ENV !== production`, derive a stable INSECURE dev key (sha256 of a fixed seed) + log a one-time warning. Local dev now works with zero setup. Production still **requires** the real secret (clear `EncryptionConfigError`).
- `ai-config.upsert`: trims the key, validates format, and on encryption failure returns a clear message — *"Missing encryption secret — …"* for config errors, never leaking crypto internals.
- Per-provider validation messages: `Invalid OpenAI/Anthropic/OpenRouter API Key — …`. OpenRouter `sk-or-v1-…` validated by `sk-or-` prefix.
- `.env.example`: documented `AI_KEY_ENCRYPTION_SECRET` (required in prod, optional in dev with derived key).

**AI config screen:** the expanded configuration shipped in prior cycles is intact — default provider/model, global fallback, cost priority (functional via ladders, `auto` keyword), per-feature models, all wired to coach/weekly-reviews/embeddings via `resolveModelForFeature`. No further change needed; documented in `AI_MODELS_CONFIG_REPORT.md`.

---

## BUG #3 — Weekly Goals 500

**Root cause:** The User goal columns (`weekly_goal_minutes`, `weekly_trades_goal`, `weekly_pnl_goal`, `discipline_goal`, `onboarding_completed`) exist in `schema.prisma` but **had no migration** — the base schema was originally `prisma db push`-ed. On migration-built databases the `users` table lacks them, so `goals.set` `UPDATE` throws → 500 *"Error interno"*.

**Fix:** **Migration `013_user_goal_columns.sql`** adds all five columns idempotently (`IF NOT EXISTS`, safe whether present or not). The endpoint, DTO, and types were already correct — once the columns exist, create/edit/persist works.

### Goals integration (real, not just stored)
- **disciplineGoal** (was stored but never consumed): now drives a **Discipline ring** on the dashboard (current-week discipline score vs goal).
- **All goals + this-week progress** are injected into the **AI coach context** (`buildTraderContext.goals`) and rendered in the system prompt ("Metas personales") — AI references them.
- **weeklyPnlGoal / weeklyTradesGoal**: dashboard goal rings (existing).
- **weeklyGoalMinutes**: learning module (existing).
- **Rule Engine:** audited — there is **no automated rule-engine** entity consuming goals (rules are descriptive `Rule` rows + tag-based violations). Documented as future work; no fake wiring added.

---

## Formulas corrected / centralized
| Concern | Before | After |
|---------|--------|-------|
| Max drawdown | `computeMaxDrawdown` (canonical) but % computed inline in 3+ places | `risk-engine.computeAccountRisk` → `calcDrawdownPct` everywhere |
| Daily/weekly/monthly loss % | divergent inline formulas; weekly hardcoded 0 | one `lossPct()` in risk-engine |
| Limit utilization (bar fill) | inline `actual/limit*100` per component | `gauge().usedPct`, clamped |
| Auto-lock decision | daily-only (later +weekly/monthly) | risk-engine `breach` incl. MAX_DRAWDOWN |

## Services / files modified
**New:** `domains/trading/services/risk-engine.ts`, `prisma/migrations/013_user_goal_columns.sql`, `__tests__/services/trading/risk-engine.test.ts`
**Backend:** `dashboard-analytics.ts` (risk in AccountStat), `trades.ts` (risk-engine lock + select), `accounts.ts` (lock/unlock — prior), `ai-config.ts` (EncryptionConfigError), `key-encryption.ts` (dev mode + typed error), `api/import/mt4/route.ts` (lock guard — prior)
**Frontend:** `account-card.tsx`, `account-detail-panel.tsx`, `cuentas/page.tsx`, `trades/page.tsx` (MAX_DRAWDOWN message)
**Config/docs:** `.env.example`, this report
**Tests:** `risk-engine.test.ts` (15), `trades.test.ts` (+1 max-dd), `accounts.test.ts` (lock/unlock — prior), `key-encryption.test.ts`, `ai-config.test.ts` (dev-mode)

## Riesgos
- **Migrations 010–013 must be applied** (`prisma migrate deploy`). 013 is the BUG#3 fix; without it goals still 500.
- Dev encryption key is **insecure by design** — production MUST set `AI_KEY_ENCRYPTION_SECRET`. The app logs a loud warning and refuses in production without it.
- Auto-lock is a **pre-trade gate** on already-realized P&L/drawdown: it blocks the *next* trade once a limit is reached, it does not partially reject an in-flight trade.
- Period bounds are **UTC** (consistent with the rest of the platform).

## Tests ejecutados / QA
- `tsc --noEmit` → 0 errors
- `vitest run` → **531 passing** (+13: risk-engine 15, trades +1, accounts lock/unlock prior, encryption dev-mode)
- `eslint .` → 0 errors
- `next build` → success (23 routes)

### Manual QA checklist
- **Drawdowns:** open an account with $75 init + a dip → card & detail show `6.5% / 12%`, bar ~54%, identical on dashboard.
- **Auto-lock:** breach daily/weekly/monthly loss or total DD → next trade rejected, BLOQUEADA badge, audit entry; unlock restores.
- **OpenRouter:** save `sk-or-v1-…` in dev → succeeds (derived key); in prod without secret → "Missing encryption secret".
- **Weekly Goals:** after migration 013, save goals → persists, discipline ring appears, AI references goals.
