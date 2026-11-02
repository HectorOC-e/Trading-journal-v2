# Learning Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Implement the six requested learning usability improvements with safe corrections and end-to-end acceptance.
**Architecture:** Existing tRPC module plus transactional session revision ledger and shared review reason helper. Existing frontend gains history, plan actions and actionable recovery/empty states.
**Tech Stack:** Next.js, React, TypeScript, Prisma, Supabase Postgres, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-02-learning-usability-design.md

## Global Constraints

Preserve timezone calendars, idempotent finishes, cross-tab timer sync and partial resource PATCH fixes. No new runtime dependencies. QA-only test data. Additive migration; full CI + real preview + production verification. Existing account password remains unchanged.

## Review Focus

- Concurrent revision/void: expectedUpdatedAt must reject stale edits; resource deltas applied once.
- Legacy or changed progress units: no silent inferred adjustment; note-only edits never change units.
- Cancellation versus completion of plans: only planned rows can reschedule/cancel.
- Error with cached data versus initial failure: useful data retained, explicit retry shown.
- Empty filter and first visit: separate actions, reset all active filters, local dates correct.

### Task 1: Backend and migration

Files: src/prisma/schema.prisma; supabase/migrations (create via Supabase CLI); src/server/trpc/routers/study-sessions.ts; src/server/services/learning/session-revisions.ts; src/server/services/learning/study-progress.ts; router/service tests.
Interfaces: history({limit:20,cursor?:uuid})→{items,nextCursor}; items include original serialized session fields plus updatedAt, revisionCount, canAdjustProgress, needsProgressConfirmation, progressLabel. reviseCompleted({id,durationMin,note,expectedUpdatedAt,adjustProgress:boolean}); voidCompleted({id,expectedUpdatedAt,adjustProgress:boolean}); reschedule({id,date,plannedMin}); cancelPlanned({id}). Void status is voided; cancelled plans status cancelled. Both preserve rows. New columns: progressTypeAtFinish:String?, progressUnitsApplied:Int?, revisionLog:Json default[]. New finish/completePlanned capture actual applied units atomically.
- [x] Write and observe failing regressions for revision/audit/ownership/void/replay/stale edits/legacy choice/notes-only/partial progress/plan races.
- [x] Implement transactional ledger, guarded mutations, and additive migration; generate Prisma.
- [x] Run targeted tests and type check; document migration replay.

### Task 2: History UI

Files: new src/app/aprendizaje/components/session-history.tsx and tests. Render paginated history; edit/void dialogs; date in profile zone, duration, resource, status; explicit progress choice for legacy; confirmation; errors and retries; load more. Invalidates studySessions and learningResources after writes. Exports SessionHistory(). Uses exact Task1 endpoint contracts. Root/page agent integrates it in Hoy.
- [x] Failing component tests for edit, void, legacy choice, errors and pagination.
- [x] Implement and run targeted tests.

### Task 3: Hoy and plan UX

Files: hoy-tab.tsx; plan-session-modal.tsx; progreso-sections.tsx; new small plan controls if needed; tests. Consume reschedule/cancelPlanned from Task1. HoyTab props add optional onCreateResource():void; integrate SessionHistory; expose loading/error/retry with cached-data retention. Simplify repeated review blocks; retain detailed impact/insights without repeating the summary. Plans expose Reprogramar/Cancelar with confirmation and local dates.
- [x] Failing tests for retry/cached data/plan actions.
- [x] Implement and test mobile-friendly Hoy, agenda actions, history integration.

### Task 4: Review reasons and library onboarding

Files: review-queue.ts and tests; resource-grid.tsx; resource-card.tsx; focus-session.tsx label usage only (coordinate root); page.tsx; empty-state tests. Export reviewReason(resource,todayISO):{kind:'overdue'|'today'|'manual',label:string}|null, reusing isResourceReviewDue. Show source of review on queue/cards; stable due-first ordering. ResourceGrid adds optional onCreateResource; initial empty vs filtered empty buttons. Page passes callbacks, keeps slim nonduplicate stats outside Hoy, uses clear retry for list/stats. Root will reconcile shared labels in Hoy if needed.
- [x] Failing tests for reasons, archived/mastered, first resource and clearing filters.
- [x] Implement and run targeted tests.

### Task 5: Integration and release

- [x] Independent review across transactions and all UI states; fix important findings.
- [ ] Full local suite/type/lint, graphify update, migration replay CI; inspect additive SQL before apply.
- [ ] Push draft PR; apply safe additive migration before preview accesses new columns; wait READY.
- [ ] Real QA browser + Supabase: edit/void sessions and verify time/streak/progress/audit; reschedule/cancel; empty/filter; injected API error/retry; review labels; mobile captures.
- [ ] All CI/acceptance pass then merge/delete branch; verify production exact SHA and main CI; revoke temporary access.
