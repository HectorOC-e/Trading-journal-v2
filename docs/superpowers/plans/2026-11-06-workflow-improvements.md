# Workflow Improvements Implementation Plan

> **For agentic workers:** Execute scoped independent tasks with TDD and one whole-branch review. Ledger outside repo tracks evidence and integration.

**Goal:** Implement the five user-approved improvements in the existing workflow.
**Architecture:** Reuse current tRPC/Prisma services and UI; additive optional review metadata; local explicit draft recovery; server-authoritative cash and scoped strategy analytics.
**Tech Stack:** Next16/React19/tRPC11/Prisma7/Zod4/Vitest/Playwright/Supabase/Vercel.
**Spec:** docs/superpowers/specs/2026-11-06-workflow-improvements-design.md

## Global Constraints
- Graphify before source lookup, AST update after code changes. Read installed Next guides.
- No changes to original user access or IA configs; no paid model calls. QA-only writes.
- Preserve prior fixes, ownership, financial native/base separation and old nullable data.

## Review Focus
- Borrador antiguo frente a versión nueva de servidor: no auto-overwrite, mantener expectedVersion.
- Saldo nativo con correcciones, retiros pagados/reservados y parcial realizado.
- Acción desde review: ownership, doble click/retry, origen borrado y periodos históricos.
- Dashboard en medianoche de perfil, sin recursos ni cuentas y con consultas fallidas.
- Setups con cero cierres, R nulo, checklist ausente y varias divisas.

### Task 1: Cash transparency (root)
Files: accounts serializer/detail/card, new cash breakdown component and focused tests.
Interface: accounts.list adds realizedPnl:number native; old serialized embedded account adapters aligned.
- [ ] Tests RED for full reconciliation/negative/FX/native UI.
- [ ] Add canonical breakdown and use authoritative balances throughout detail.
- [ ] Focused tests GREEN; integrate delta and ledger.

### Task 2: Review continuity (agent)
Files: review service/router/UI, behavior commitment service, study-session/practice linkage and Prisma schema.
Interfaces: nullable reviewSource metadata {kind:'weekly',weekStart,conclusion} on Commitment/StudySession/LearningPractice; optional plannedSessionId on practice API; serialize structured metadata explicitly. Root owns migration generation/apply.
- [ ] Tests RED: owned source, supported verifier, planned-vs-completed, retry uniqueness, historical follow-up.
- [ ] Reuse existing entities; source CTA/modal and follow-up on weekly report. Do not edit review-lifecycle.tsx (draft task owns it).
- [ ] Focused tests GREEN; report exact changes/interfaces.

### Task 3: Recoverable drafts (agent)
Files: shared utility/hook/banner, review-lifecycle/notes-draft, practice/resource modals, storage cleanup, tests.
Interface: server/props remain compatible; preserve practice expectedVersion and idempotency ID; coordinate practice modal changes with continuity agent.
- [ ] Tests RED for explicit restore/no-autosubmit, isolation, corrupt/quota, revision-safe save, modal reload and practice UUID.
- [ ] Implement shared local recovery and integrate three editors.
- [ ] Focused tests GREEN; report.

### Task 4: Strategy context (agent)
Files: playbook router/service and setup-intelligence-panel + tests.
Interface: playbook.setup scope REAL/DEMO/BACKTEST default REAL; return closed/R/checklist sample context; no mixed-currency sums.
- [ ] Tests RED on scope/owner/QA exclusion/null data/denominators.
- [ ] Add selector + contextual counts/limited sample using existing UI.
- [ ] Focused tests GREEN; report.

### Task 5: Daily plan (agent)
Files: today router, new daily-plan service/component, dashboard mount and tests.
Interface: today.plan reads current commitments, planned sessions, due resources and practices in profile calendar; source metadata optional. Do not alter existing today.feed contract.
- [ ] Tests RED on profile day bounds/owner/empty/error/deep links.
- [ ] Reuse Button/links; compact card separate from signals feed; action to existing practice registration.
- [ ] Focused tests GREEN; report.

### Task 6: Integration/release (root)
- [ ] Generate/apply additive migration after schema review; generate Prisma, baseline + regressions.
- [ ] Full tests/type/lint/build, graph update, independent final review and fixes.
- [ ] Push/PR; exact preview + CI; desktop/mobile QA and screenshots using dedicated account.
- [ ] Merge/delete branch; verify exact production + CI, screenshots, canonical QA cleanup, revoke preview links.
