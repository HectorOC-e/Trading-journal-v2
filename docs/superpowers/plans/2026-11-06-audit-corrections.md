# Correcciones auditoría general Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with independent domain tasks delegated under dispatching-parallel-agents. Steps use checkbox syntax.

**Goal:** Correct all14 audited cases and validate exact preview and production before completing authorized merge/cleanup.
**Architecture:** Keep existing modules; share reconciled cash across account consumers, preserve omitted PATCH fields, enforce risk at exposure increases, and use atomic Coach persistence. Maintain ownership and nontrading cash separation.
**Tech Stack:** Next16.2.7, React19, tRPC11, Zod4, Prisma7, Supabase, Vitest/Playwright, Vercel.
**Spec:** /workspace/qa-learning/audit-2026-11-06/informe.md and linked domain reports.

## Global Constraints
- Preserve existing users, account access and AI configuration; QA data only for live writes.
- Omit password topic. No paid AI calls needed for tool/persistence validation.
- Source lookup via graphify before grep/read; update graph AST-only after changes.
- Never merge until local checks, exact preview verification and review pass.

## Review Focus
- Empty/omitted PATCH fields preserve data; explicit zero/false/empty retain intended behavior.
- NonUSD accounts reconcile in native currency while dashboard reports base currency.
- Locked accounts allow reducing positions but reject increasing exposure.
- Future dated realizations cannot block today's trading.
- Offline fallback must not cache authenticated HTML across users.

### Task 1: PATCH contracts and reconciled accounts (root)
Files: accounts/markets routers, cash-adjustments/withdrawal service, account card/page and their tests; coordinate dashboard/trade cash consumption with Task2.
Interfaces: Extend cash adjustment loader with correction total while preserving paid/reserved; Task2 receives corrected native cash semantics.
- [ ] Add regression tests and observe failures: rename preserves capital, instrument edit preserves watchlist; sync800 rejects withdrawal900; native card reflects paid cash and FX.
- [ ] Preserve PATCH defaults only for creates; share balance corrections across consumers; card uses authoritative native balance.
- [ ] Run focused tests, commit and ledger.

### Task 2: Trading/risk/dashboard (independent agent)
Files: trade-write-service, risk-enforcement, dashboard-service and focused tests.
Interfaces: Consume shared correction cash semantics from Task1; own dashboard account scope and snapshots.
- [ ] Tests RED: blocked SCALE_IN, size correction1R, future loss ignored, selected account scope.
- [ ] Minimal fixes including native reconciled equity consumers coordinated with root.
- [ ] Focused tests GREEN; report changed files, commands and limits.

### Task 3: Learning/reviews/Coach (independent agent)
Files: weekly/monthly review routers, coach router/thread service, coach-tools, learning-resources and tests.
Interfaces: Existing API contracts maintained; atomic exchange and percentage lifecycle use existing services.
- [ ] Tests RED: omitted notes preserved, no half exchange on failure, manual review in agenda, percentage100 completion.
- [ ] Minimal fixes; no LLM calls or DB writes.
- [ ] Focused tests GREEN; report evidence and files.

### Task 4: Import deletion barrier and offline fallback (independent agent)
Files: MT4 handler, SW, existing shared deletion guards and tests.
Interfaces: Reuse durable deletion gate; no authenticated page caching across users.
- [ ] Tests RED: pending deletion import rejected; offline fallback current and safe.
- [ ] Minimal fixes respecting Next route-handler guide.
- [ ] Focused tests GREEN; report evidence and files.

### Task 5: Integration and release
Files: all changed tests/docs/graph and QA artifacts outside repo.
- [ ] Full unit tests, TypeScript, lint; fix actual regressions; AST-only graph update.
- [ ] Independent whole-branch review; act on confirmed significant findings with regression evidence.
- [ ] Push branch, create PR, verify CI and exact READY Vercel preview.
- [ ] Dedicated QA account, desktop/mobile flow validation and screenshots; clean temporary data.
- [ ] Merge/delete branch only when green; verify exact production deploy, CI, smoke checks and cleanup.
