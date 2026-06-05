# MANUAL QA TEST PLAN — FINAL (Post-Sprint 12)
> **Date:** 2026-06-04  
> **Scope:** New features (Sprints 9-12) + regression cases  
> **Execution:** Manual, screen by screen

---

## How to Use This Plan
1. Execute each test case in order
2. Mark: ✅ Pass | ❌ Fail | ⚠️ Partial | N/A (not applicable in env)
3. For fails: capture screenshot + steps to reproduce
4. Focus on NEW and MODIFIED features — known stable areas can be spot-checked

---

## Section 1 — Trades Page: Account Filter (TD-035)

### TC-001: Account filter shows only when >1 account
**Precondition:** User has only 1 account  
**Steps:** Open `/trades`  
**Expected:** No account filter chip bar visible  

### TC-002: Account filter shows chips for each account
**Precondition:** User has 2+ accounts  
**Steps:** Open `/trades`  
**Expected:** "Todas" chip + one chip per account name  

### TC-003: Filter by specific account
**Steps:** Click account "B" chip  
**Expected:** Trade list shows only trades from account B; "B" chip has accent color  

### TC-004: Reset filter
**Steps:** After TC-003, click "Todas"  
**Expected:** All trades appear; "Todas" chip highlighted  

### TC-005: Filter clears selected trade
**Precondition:** A trade detail panel is open  
**Steps:** Switch account filter  
**Expected:** Detail panel closes (selectedId cleared)  

---

## Section 2 — Dashboard: Multi-Account Equity Curve (TASK-053)

### TC-006: Equity curve chart renders
**Precondition:** User has 2+ accounts with CLOSED trades  
**Steps:** Open Dashboard → Portfolio tab  
**Expected:** "Curva de equity por cuenta" card visible with line chart  

### TC-007: Each account has distinct color
**Expected:** Lines use different colors; legend row below chart shows name + color swatch  

### TC-008: Single account = no equity curve chart
**Precondition:** User has only 1 active account  
**Expected:** Chart is not rendered (condition: `accountStats.length > 1`)  

---

## Section 3 — Playbook: Setup Version Diff (TD-034)

### TC-009: Version history shows diff
**Precondition:** A setup has been edited (versioned field change: checklist or direction)  
**Steps:** Open Setup drawer → "Historial de versiones" → expand  
**Expected:** Version entry shows green "+" lines for added items, red "-" for removed  

### TC-010: No diff section when nothing changed
**Steps:** View version with no checklist changes (direction-only edit)  
**Expected:** No diff items shown; only reason + date  

### TC-011: Direction change shown
**Precondition:** Direction was changed (e.g., LONG → AMBAS)  
**Expected:** Version diff shows "Dirección: LONG → AMBAS" in amber  

---

## Section 4 — ISO Week Timezone (TD-036)

### TC-012: ISO week key is stable across timezones
**Test:** Navigate to Dashboard → Disciplina tab  
**Expected:** Weekly score chart shows current week correctly without offset (week label matches calendar week)  
**Note:** Requires observation in UTC-6 environment (Honduras/Central America)  

---

## Section 5 — PWA (TASK-077)

### TC-013: Manifest registered
**Steps:** Open Browser DevTools → Application → Manifest  
**Expected:** Manifest shows app name "Trading Journal", theme color "#4f6ef7", display "standalone"  

### TC-014: Service worker registered
**Steps:** DevTools → Application → Service Workers  
**Expected:** `sw.js` registered and active  

### TC-015: App installable (Chrome)
**Steps:** Address bar → Install icon OR Chrome menu → "Install Trading Journal"  
**Expected:** Install prompt available (requires HTTPS)  

### TC-016: Offline fallback (pages)
**Steps:** DevTools → Network → Offline → Navigate to `/dashboard`  
**Expected:** Cached page loads OR graceful offline message  

---

## Section 6 — PDF Export (TASK-078)

### TC-017: Export button visible on dashboard
**Steps:** Open `/dashboard`  
**Expected:** "Exportar PDF" button in top bar (right side)  

### TC-018: Export page opens in new tab
**Steps:** Click "Exportar PDF"  
**Expected:** New tab opens at `/dashboard/export`; print dialog auto-triggers after ~500ms  

### TC-019: Export page shows correct data
**Expected sections in print preview:**
- "Métricas Globales" with Net P&L, Win Rate, Sharpe, Profit Factor
- "Cuentas" table with balance, P&L, win rate
- "Performance por Setup" table (top 10)
- "Últimas Operaciones" table (last 20)
- Header with user name (if set)
- Footer with date  

### TC-020: Print CSS applied
**Steps:** Preview print (Ctrl+P in browser)  
**Expected:** Colors visible (print-color-adjust: exact); no sidebar; clean white background  

---

## Section 7 — Onboarding Checklist (TASK-052)

### TC-021: Checklist visible for new users
**Precondition:** Fresh account with no trades, no setups  
**Steps:** Open Dashboard → Portfolio tab  
**Expected:** "Primeros pasos" banner visible with 0/4 steps done  

### TC-022: Steps complete correctly
**Steps:** Create account → expected: Account step shows ✅ checkmark  
**Steps:** Create setup → expected: Setup step shows ✅  
**Steps:** Register trade → expected: Trade step shows ✅  
**Steps:** Fill profile name → expected: Profile step shows ✅  

### TC-023: Checklist dismisses
**Steps:** Click X on checklist  
**Expected:** Checklist hidden immediately; does not reappear on page reload  

### TC-024: Checklist auto-dismisses on completion
**Precondition:** All 4 steps done  
**Expected:** Checklist disappears automatically  

### TC-025: Collapsed state works
**Steps:** Click on checklist header  
**Expected:** Steps section collapses; click again to expand  

---

## Section 8 — Regression Checks

### TC-026: Trades CRUD still works
- Register trade (with psychology fields) → close trade → verify P&L appears

### TC-027: Dashboard analytics correct period
- Switch period (7d / 1M / ALL) → verify KPIs update

### TC-028: Prop firm guard active
- Create PROP_FIRM account with daily loss limit → try registering trade that would breach → verify error

### TC-029: Reviews — weekly + monthly
- Create weekly review → verify discipline score calculated → create monthly review → verify prefill from weekly

### TC-030: AI Coach
- Open AI coach drawer → type question → verify streaming response

---

## Pass Criteria
- All TC-001 through TC-020: 100% pass (new features)
- TC-021 through TC-025: 100% pass (onboarding)
- TC-026 through TC-030: 100% pass (regression — zero regressions allowed)
