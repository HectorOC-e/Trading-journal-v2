# HIGH PRIORITY FIXES — Report
> **Date:** 2026-06-04
> **Scope:** Business-rules & platform-consistency fixes — 4 hallazgos.
> **Gates:** `next build` ✅ · `tsc` ✅ 0 errors · `vitest` ✅ 498 tests · `eslint` ✅ 0 errors.

---

## HALLAZGO 1 — ACCOUNTS

### 1A — Drawdown / limit display was inconsistent

**Finding (validated in code):**
- `buildAccountStats.drawdownPct` = true max-drawdown % of balance (correct).
- `buildPropFirmStatus.ddPctUsed` = **utilization** (% of the allowed limit consumed), but the Prop-Firm card rendered it under the label "Max drawdown total" showing e.g. `50.0%` — read as "drawdown is 50%" when actual DD was 2.5% of a 5% limit. Same ambiguity on "Pérdida diaria".

**Fix:**
- `buildPropFirmStatus` now returns `ddActualPct`, `ddLimitPct`, `dailyActualPct`, `dailyLimitPct` alongside the utilization values that drive the bar fill.
- `prop-firm-rules.tsx` now shows **`actual% / limit%`** (e.g. `2.5% / 5.0%`) while the bar still fills by utilization — both readings are now unambiguous and consistent with the account cards.
- Tests added (`buildPropFirmStatus`): actual DD%, daily loss %, prop-type filtering.

### 1B — Accounts could keep trading after hitting a loss limit

**Finding:** `trades.create` only checked **daily** loss, and only for `PROP_FIRM`/`DEMO_PROP`. Weekly/monthly limits were never enforced. No lock state existed.

**Implemented — Locked state:**
- **Schema (migration 011):** `accounts.locked`, `lock_reason`, `locked_at` (safe defaults).
- **`prop-firm-guard.checkLossLimit(period, periodLoss, balance, limitPct)`** — generic daily/weekly/monthly check, applies to **all** account types. `checkDailyLossLimit` retained as a thin delegate.
- **`trades.create` enforcement order:**
  1. If `account.locked` → reject `ACCOUNT_LOCKED:<reason>` (FORBIDDEN).
  2. Setup validity (see Hallazgo 2).
  3. Compute realized **daily / weekly / monthly** loss (UTC period bounds); on first breach → **auto-lock** the account (`lockAccount` + `AccountLog` `LOCKED` `auto:true`) and reject.
  4. Prop-firm-only: max trades/day + symbol allowlist.
- **Import blocked:** `app/api/import/mt4/route.ts` returns `403 ACCOUNT_LOCKED` when the account is locked.
- **Manual lock/unlock:** `accounts.lock` / `accounts.unlock` mutations, each writing an `AccountLog` audit entry (`LOCKED` / `UNLOCKED`).
- **UX:**
  - Account card → red `BLOQUEADA` badge.
  - Detail panel → locked banner naming the limit ("Daily/Weekly/Monthly Loss Limit Reached"), plus **Bloquear / Desbloquear** buttons.
  - Trades page → clear Spanish error banner per limit, directing the user to unlock in Cuentas.
- **Audit:** `AccountLogPayload` gained `LOCKED` / `UNLOCKED` events.

**Restrictions enforced while locked:** no new trades (backend + UI), no CSV import (backend). All exposure-increasing operations rejected server-side — frontend is not trusted.

---

## HALLAZGO 2 — PLAYBOOKS (paused setups selectable)

**Finding:** `setups.list` returns `PAUSADO` setups (only `DESCARTADO` excluded); the register-trade modal rendered them as normal, selectable options. No backend guard.

**Fix:**
- **Frontend:** `register-trade-modal` now renders `PAUSADO`/`DESCARTADO` setups as **disabled** tiles — greyed (opacity 50), `cursor-not-allowed`, non-clickable, with a `PAUSADO`/`DESCARTADO` badge and explanatory `title`. Only active/in-test setups are selectable (`isSelectableSetup`).
- **Backend (not trusting frontend):** `trades.create` validates `setupId` → rejects `SETUP_NOT_FOUND` (missing) or `SETUP_NOT_AVAILABLE` (status `PAUSADO`/`DESCARTADO`).
- Trades page surfaces a clear message for `SETUP_NOT_AVAILABLE`.

---

## HALLAZGO 3 — PROFILE GOALS (stored but not integrated)

**Finding (code-validated):**
- `weeklyTradesGoal`, `weeklyPnlGoal` → consumed only by the dashboard goal widget.
- `weeklyGoalMinutes` → consumed by the learning module ✅.
- `disciplineGoal` → **stored but never consumed anywhere** (widget had it suppressed).

**Fix (real integration):**
- **Dashboard widget:** added the **Discipline** ring — current-week discipline score (from `discipline.weeklyScore`) vs `disciplineGoal`, with exceeded state. Plumbed `discipline` through `dashboard/page → TabPortfolio → GoalProgressWidget`.
- **AI integration:** `buildTraderContext` now fetches the user's goals + this-week progress (`weekPnl`, `weekTrades`) and exposes a `goals` section. `coach-service` renders a **"Metas personales"** block in the system prompt, so the AI coach references P&L / trades / discipline / learning goals in its insights and recommendations.
- **Rule Engine:** audited — there is **no automated rule-engine** entity that consumes goals (rules today are descriptive `Rule` rows + tag-based violation tracking). Documented as a future enhancement (see Pendientes); no fake wiring added.

> Honesty note: weekly P&L / trades goals already affected the dashboard widget; this cycle adds **discipline** (was fully unwired) and **AI** consumption for all goals. Deeper surfacing in the Reviews UI is listed as a pending enhancement.

---

## HALLAZGO 4 — AI CONFIGURATION (misleading OpenRouter error)

**Finding (root cause):** the error *"api key must be a 64 character hex string (32 bytes)"* did **not** come from key validation — it is thrown by `key-encryption.getEncryptionKey()` when the **server** secret `AI_KEY_ENCRYPTION_SECRET` is missing/misconfigured. It bubbled raw to the user, who reasonably thought their OpenRouter key was wrong. `validateKeyFormat` already supported OpenRouter (`sk-or-`).

**Fix:**
- `ai-config.upsert` now **trims** the key, validates format, then wraps `encryptApiKey` in try/catch. A server-secret failure returns a clear, non-blaming message: *"El servidor no tiene configurado el cifrado de claves IA (AI_KEY_ENCRYPTION_SECRET). Tu clave es válida; contacta al administrador."* — never leaking the cryptographic internals as if it were the user's key.
- OpenAI / Anthropic / OpenRouter all validate by their correct prefixes (`sk-`, `sk-ant-`, `sk-or-`).
- Expanded-config design captured in **`docs/AI_CONFIGURATION_SURVEY.md`** (providers, per-feature models, cost control, fallback) — to be implemented after the user answers.

---

## Files Modified

**Backend / domain**
- `prisma/schema.prisma` — `Account.locked/lockReason/lockedAt`
- `prisma/migrations/011_account_lock.sql` — new
- `domains/trading/services/prop-firm-guard.ts` — `checkLossLimit` (daily/weekly/monthly)
- `domains/analytics/services/dashboard-analytics.ts` — propFirm actual/limit fields
- `domains/analytics/ai-context.ts` — goals + week progress in `TraderContext`
- `lib/ai/coach-service.ts` — goals block in system prompt
- `server/trpc/routers/trades.ts` — lock check + setup check + weekly/monthly auto-lock
- `server/trpc/routers/accounts.ts` — `lock`/`unlock` mutations + `lockedAt` serialization
- `server/trpc/routers/ai-config.ts` — server-secret error distinction + key trim
- `app/api/import/mt4/route.ts` — reject import when locked
- `types/index.ts` — `LOCKED`/`UNLOCKED` audit payloads

**Frontend**
- `components/trades/register-trade-modal.tsx` — disabled paused/discarded setups
- `app/cuentas/components/account-card.tsx` — BLOQUEADA badge
- `app/cuentas/components/account-detail-panel.tsx` — locked banner + lock/unlock buttons
- `app/cuentas/page.tsx` — lock/unlock mutations wired
- `app/trades/page.tsx` — lock/setup error messages
- `app/dashboard/components/prop-firm-rules.tsx` — actual% / limit% display
- `app/dashboard/components/goal-progress-widget.tsx` — discipline ring
- `app/dashboard/tabs/tab-portfolio.tsx` + `app/dashboard/page.tsx` — plumb discipline score

**Tests**
- `__tests__/services/trading/prop-firm-guard.test.ts` — `checkLossLimit` (+6)
- `__tests__/services/analytics/dashboard-analytics.test.ts` — `buildPropFirmStatus` (+3)
- `__tests__/lib/coach-service.test.ts` — goals in mock context

**Docs**
- `docs/AI_CONFIGURATION_SURVEY.md` — new
- `docs/HIGH_PRIORITY_FIXES_REPORT.md` — this file

---

## Validation / Impact
- **Build:** `next build` ✅ (23 routes). **Types:** 0. **Tests:** 498 ✅ (+9). **Lint:** 0 errors.
- **Migration 011 is additive** (nullable / defaulted) — safe on existing rows.
- **Backend-authoritative:** every restriction (lock, setup availability, loss limits) is enforced server-side; UI mirrors it.

## Riesgos
- **Migration 011 must be applied** before deploy or the new Prisma fields will 500 on account reads. (`prisma migrate deploy`.)
- Auto-lock uses **realized closed-trade P&L** for the period (pre-trade gate): an account locks when the *already-realized* loss reaches the limit, blocking the *next* trade — it does not partially reject a trade mid-fill.
- Period bounds are **UTC**; a user in a far timezone may see day/week boundaries shifted vs local midnight (consistent with the rest of the platform's UTC date math).

## Pendientes (future)
- Reviews UI: surface goal progress inline (data already in context).
- Rule Engine: introduce automated rules that consume `weeklyTradesGoal` / `disciplineGoal` (no such engine exists today).
- AI config expansion per `AI_CONFIGURATION_SURVEY.md` (per-feature models, cost posture, fallback chain).
- Optional: lock notification (email/toast) when auto-lock triggers.

## Recomendaciones
1. Apply migration 011 in the deploy pipeline alongside 010.
2. Set `AI_KEY_ENCRYPTION_SECRET` (64-hex) in every environment — the new error message will otherwise (correctly) tell users the server isn't configured.
3. Answer the AI survey to unlock the richer configuration build.
