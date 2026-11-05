# Full Audit Implementation Plan

Goal: resolve14 confirmed findings and related reliability gaps, including withdrawals.
Architecture: existing Next/tRPC/Prisma services, shared account cash adjustments and learning predicates, cursor pagination.
Spec: docs/superpowers/specs/2026-11-05-full-audit-design.md
Constraints: preserve original data; no paid AI; UTC calendar dates vs profile-local instants; account currency for new withdrawals; only paid reduces cash; no unrelated schema churn.

- [x] Task1 Withdrawal backend + cash integration (root): tests for concurrent requests, rejected reactivation, FX, paid balances, rollback and retry; transact account row lock, stable UUID, share paid/reserved values and dashboard integration.
- [x] Task2 Trading realization + budget: meaningful failing regressions then implement atomic partial accounting, validation, original risk, full close and post-realization limits; schema migration if needed; consistent budget denominator and execution FX. Own trades services/helpers/schema and tests.
- [x] Task3 Learning digest + creation: tests for same metrics/racha, local-day planning including DST, manual review queue and100% create; implement shared calculations; preserve existing tests.
- [x] Task4 Withdrawal/notification UI: strict amount parser and calendar dates, currency/account lock, visible available/reserved/paid; request ID retry; protected pending/error states; cursor pagination/deterministic server order and retry; regression tests.
- [ ] Task5 Integration: review cross-module monetary paths, run full tests/type/lint and migration checks, graphify update, independent reviews, resolve findings.
- [ ] Task6 Delivery: push/PR, exact preview deployment, isolated QA desktop/mobile/screenshots, merge if green, exact main CI/production QA, delete task branch and QA data.
