# FINAL MANUAL QA TEST PLAN — Trading Journal v2
> **Date:** 2026-06-04
> **Scope:** Full-platform pre-production validation, screen by screen.
> Execute on staging with migration 010 applied + env vars set.

## Legend
✅ Pass · ❌ Fail · ⚠️ Partial · N/A

---

## 1. Auth & Navigation
- **T-01** Logout → redirected to `/login`; protected routes redirect when logged out
- **T-02** Login → lands on `/dashboard`
- **T-03** All 11 sidebar links navigate correctly; active item highlighted
- **T-04** Mobile: bottom nav + "más secciones" drawer work
- **T-05** Theme toggle (light/dark/system) persists across reload

## 2. Dashboard
- **T-06** Portfolio/Operador/Disciplina/Playbook tabs switch; default tab persists
- **T-07** Period filter (7d…ALL) updates all KPIs
- **T-08** KPIs match manual calc on a 3-trade account (Net P&L, Win Rate, Avg R)
- **T-09** Multi-account equity curve renders (≥2 accounts), distinct colors, legend
- **T-10** Prop-firm rules card shows DD/daily-loss/trade-count per account
- **T-11** Goal progress widget reflects targets
- **T-12** "Exportar PDF" → new tab `/dashboard/export`, print dialog auto-opens, all sections present
- **T-13** Onboarding checklist visible for new user; steps tick as completed; dismiss persists

## 3. Trades
- **T-14** Register trade (with psychology: emotion, confidence, FOMO, revenge) → appears in list
- **T-15** Account filter chips (>1 account) filter list; switching clears open detail panel
- **T-16** Close trade → P&L + R-multiple computed; equity updates
- **T-17** Prop-firm guard: breach daily-loss / max-trades / symbol → blocked with message
- **T-18** CSV import (MT4) → trades imported, deduped, rMultiple present
- **T-19** Edit / delete / position-log work
- **T-20** Mobile: detail panel scrolls (iOS), back closes

## 4. Accounts
- **T-21** Create account (personal + prop-firm) with rules
- **T-22** Phase promotion (prop-firm) — objectiveMet computed, not hardcoded
- **T-23** Drawdown shows max-DD (not current-from-ATH); "días activo" correct
- **T-24** Archived accounts excluded from dashboard analytics
- **T-25** Sync balance + history modal work

## 5. Playbook
- **T-26** Create/edit setup (checklists, color, direction, images)
- **T-27** Edit versioned field → new version recorded
- **T-28** Version history diff shows + added / − removed checklist items, direction change
- **T-29** Setup sparkline (equity), health dot, lifecycle suggestion render
- **T-30** Session win-rate matrix correct

## 6. Reviews
- **T-31** Create weekly review → discipline score derived from tags
- **T-32** AI summary generates (or graceful error toast if no key)
- **T-33** Create monthly review → prefills from weekly data
- **T-34** Review detail panel + edit/delete

## 7. Learning (Aprendizaje)
- **T-35** Add resource → appears; due cards surface per SRS
- **T-36** Review session updates streak (UTC-correct across midnight)
- **T-37** Stale indicator on >30d-untouched in-progress resource
- **T-38** Impact ranking renders without N+1 lag

## 8. Rules / Markets / Tags / Withdrawals
- **T-39** Rule CRUD; delete confirm shows quoted name
- **T-40** Market watchlist CRUD + category filter
- **T-41** Custom tag CRUD; system tags excluded
- **T-42** Withdrawal CRUD; status transitions (SOLICITADO→…→PAGADO); KPI summary

## 9. Profile / Settings
- **T-43** Edit profile (name, avatar) persists; onboarding profile step ticks
- **T-44** Accent hue + colorblind mode apply live and persist
- **T-45** AI config: add key → validated; invalid format rejected; key encrypted

## 10. AI Coach
- **T-46** Open drawer → ask question → streaming response (with key)
- **T-47** No key → graceful disabled state, no crash

## 11. PWA
- **T-48** DevTools → Manifest valid; Service Worker active
- **T-49** Installable (Chrome desktop/Android, HTTPS)
- **T-50** Offline → cached pages load; API returns offline JSON

## 12. Accessibility / Responsive
- **T-51** Tab keys navigate; focus rings visible
- **T-52** FilterBar: single-select = tabs (aria-selected); multiSelect = toggles (aria-pressed)
- **T-53** Screen reader announces nav landmarks
- **T-54** Layouts hold at 360 / 768 / 1024 / 1440 widths

## 13. Regression (zero tolerance)
- **T-55** No console errors on any page load
- **T-56** Metrics identical across Dashboard / Trades KPI strip / PDF export
- **T-57** Page refresh preserves theme, default tab, period, dismissed onboarding

## Pass Criteria
- Sections 1-11: 100% pass
- Section 12: ≥90% (device-farm items may be deferred)
- Section 13: 100% — no regressions allowed
