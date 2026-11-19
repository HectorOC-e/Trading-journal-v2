# Strategy Validation Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an auditable `Hipótesis → Backtesting → Demo → Real` validation route inside Playbook, with isolated evidence per operational mode, configurable criteria, manual decisions, practice links, AI explanations, and in-app notifications.

**Architecture:** Keep strategy definitions shared while deriving financial evidence independently for each `OperationalMode`. Persist only per-setup policy and immutable decisions; calculate current metrics from owned closed trades, then snapshot and sign the server-calculated evidence whenever the user decides. Extend the existing Playbook router/UI and reuse Learning Practices, notification infrastructure, and AI provider resolution.

**Tech Stack:** Next.js 16.2.7, React 19.2.7, TypeScript 5.9, tRPC 11, Prisma 7, PostgreSQL/Supabase, Zod 4, Vitest 4, Testing Library, Playwright 1.60, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-18-ruta-validacion-estrategias-design.md`

## Global Constraints

- Backtesting, Demo, and Real evidence must remain independent; no `ALL` financial query or combined P&L is allowed.
- Promotions never move, copy, edit, or reclassify trades, accounts, practices, or operational modes.
- Only owned, closed trades linked to the setup may enter stage evidence.
- Real is continuous monitoring and cannot become a completed stage.
- AI may explain and suggest practices but cannot promote, suspend, or certify a strategy.
- Default thresholds are editable references, not statistical significance or a profitability guarantee.
- Evidence snapshots are calculated on the server and historical decisions are immutable.
- New tables must enforce ownership with database constraints, RLS, and tested cross-user denial.
- Do not add a candle simulator, broker execution, automatic trading block, or Monte Carlo engine.
- The first release sends in-app notifications only; email remains outside this cut.

## Review Focus

- Missing or null R values must reduce R coverage and never be treated as `0R`; Task 1 pins this behavior.
- A setup with trades in multiple currencies must still have currency-free R evidence and no combined monetary total; Tasks 1 and 3 pin this behavior.
- Concurrent or repeated promotion submissions must create at most one equivalent decision and preserve an immutable snapshot; Tasks 2 and 4 pin this behavior.
- A modified trade or policy must change the current signature without rewriting a historical decision; Tasks 3 and 4 pin this behavior.
- A user-supplied note, practice text, or screenshot metadata must be treated as untrusted evidence and never as AI instructions; Task 7 pins the prompt boundary.

---

## File map

### New files

- `src/domains/analytics/setups/validation.ts` — pure types, default policy, metrics, criteria, verdicts, and transitions.
- `src/server/services/setups/validation-service.ts` — owned database reads, mode-isolated evidence, state derivation, snapshots, and signatures.
- `src/server/services/setups/validation-ai-service.ts` — bounded prompt and optional AI explanation.
- `src/components/playbook/setup-validation-route.tsx` — four-stage route and side-by-side evidence.
- `src/components/playbook/setup-validation-stage-card.tsx` — one stage's metrics and criterion results.
- `src/components/playbook/setup-validation-decision-dialog.tsx` — manual decision/reason flow.
- `src/__tests__/domains/analytics/setups/validation.test.ts` — domain calculations and edge cases.
- `src/__tests__/services/setups/validation-service.test.ts` — ownership, isolated queries, state, and signatures.
- `src/__tests__/services/setups/validation-ai.test.ts` — safe prompt and provider failure behavior.
- `src/__tests__/routers/playbook-validation.test.ts` — policy and decision router contracts.
- `src/__tests__/components/playbook/setup-validation-route.test.tsx` — route UI and user decisions.
- `src/__tests__/integration/setup-validation.integration.test.ts` — constraints, RLS, and immutable history.
- `supabase/migrations/20261118120000_setup_validation_route.sql` — enums, tables, indexes, constraints, RLS, grants, and decision immutability.
- `docs/MANUAL_RUTA_VALIDACION_ESTRATEGIAS.md` — illustrated end-user guide.

### Modified files

- `src/prisma/schema.prisma` — validation relations and models.
- `src/server/trpc/routers/playbook.ts` — overview, evidence, policy, decision, explanation, history, and notification procedures.
- `src/app/playbook/page.tsx` — mount the validation route for each setup.
- `src/lib/messages/catalog.ts` — eligibility and deterioration notification definitions.
- `src/app/aprendizaje/page.tsx` and `src/app/aprendizaje/components/practices-tab.tsx` — consume a safe prefilled practice intent.
- `src/app/aprendizaje/modals/practice-modal.tsx` — accept initial mode, objective, title, and exercise without auto-saving.
- `src/__tests__/e2e/flows-authed.spec.ts` — authenticated stage, practice, and isolation journey.

### Generated files

- `src/lib/generated/prisma/**` — refreshed by `pnpm exec prisma generate`; do not hand-edit.
- `graphify-out/**` — refreshed with `graphify update .` after code changes.

---

### Task 1: Pure validation engine

**Files:**
- Create: `src/domains/analytics/setups/validation.ts`
- Test: `src/__tests__/domains/analytics/setups/validation.test.ts`

**Interfaces:**
- Produces: `ValidationStage`, `ValidationVerdict`, `ValidationAction`, `ValidationPolicy`, `ValidationTrade`, `ValidationDefinition`, `ValidationCriterion`, `StageEvidence`, `DEFAULT_VALIDATION_POLICY`, `evaluateValidationStage(input)`, `deriveValidationState(decisions)`, and `validateValidationTransition(state, action, targetStage)`.
- Consumes: no database or framework code.

- [ ] **Step 1: Write failing calculation tests**

  Cover the default values `30/80/70` for Backtesting, `20/4/80` for Demo, and `20/4` for Real monitoring; verify empty evidence is `INCOMPLETE`, partial evidence is `INSUFFICIENT`, and a qualifying sample is `ELIGIBLE`.

- [ ] **Step 2: Add review-focus edge-case tests**

  Assert null R lowers `rCoveragePct` without becoming zero; expectancy equals the mean of valid R only; maximum drawdown uses cumulative R; distinct weeks use ISO week boundaries; currencies and P&L are absent from `StageEvidence`.

- [ ] **Step 3: Run the focused test and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/domains/analytics/setups/validation.test.ts`
  Expected: FAIL because the validation module does not exist.

- [ ] **Step 4: Implement the pure engine**

  Implement `evaluateValidationStage(input: { stage: ValidationStage; policy: ValidationPolicy; definition: ValidationDefinition; trades: ValidationTrade[]; checklist: Map<string, { checked: number; total: number }> }): StageEvidence`. Represent percentage thresholds as integers `0..100`, round only presentation values, and keep raw calculations finite.

- [ ] **Step 5: Implement state and transition rules**

  Derive current state from ordered immutable decisions. Permit forward promotion one stage at a time, review/suspension/resume actions, and Real monitoring; reject completion of Real and invalid skips. Require the caller to mark an unmet promotion as an exception.

- [ ] **Step 6: Run the focused test and commit**

  Run: `cd src && pnpm exec vitest run __tests__/domains/analytics/setups/validation.test.ts`
  Expected: PASS.

  Commit: `feat(playbook): add strategy validation engine`

### Task 2: Durable policy and immutable decision history

**Files:**
- Modify: `src/prisma/schema.prisma`
- Create: `supabase/migrations/20261118120000_setup_validation_route.sql`
- Create: `src/__tests__/integration/setup-validation.integration.test.ts`

**Interfaces:**
- Produces: Prisma models `SetupValidationPolicy` and `SetupValidationDecision`; unique policy key `userId_setupId`; decision idempotency key; database ownership and immutability guarantees.
- Consumes: `ValidationStage`/`ValidationAction` string values defined in Task 1.

- [ ] **Step 1: Write the failing integration tests**

  Test one policy per owned setup, rejection of mismatched `user_id/setup_id`, cross-user RLS denial, rejection of `UPDATE`/`DELETE` on decisions through the authenticated role, cascade on setup deletion, and duplicate decision idempotency.

- [ ] **Step 2: Run the migration test and confirm the red state**

  Run: `cd src && pnpm test:integration -- __tests__/integration/setup-validation.integration.test.ts`
  Expected: FAIL because the tables do not exist.

- [ ] **Step 3: Add the Prisma models**

  `SetupValidationPolicy` stores typed default thresholds, `version`, `criteria Json`, timestamps, `userId`, and `setupId`. `SetupValidationDecision` stores stages, action, optional mode, `policyVersion`, versioned `evidenceSnapshot`, `evidenceSignature`, note, exception reason, client-generated `idempotencyKey`, and `createdAt`. Add relations to `User` and `Setup`.

- [ ] **Step 4: Add the SQL migration**

  Create tables and checks for valid stages/actions/modes, percentage/range bounds, FK ownership using a composite owned-setup key, indexes on `(user_id, setup_id, created_at)`, unique `(user_id, setup_id)` policy and `(user_id, idempotency_key)` decision. Enable RLS; policies may select/insert owned rows, update owned policies, and must not update/delete decision rows.

- [ ] **Step 5: Generate the Prisma client and run migration checks**

  Run: `cd src && pnpm exec prisma format && pnpm exec prisma generate`
  Run: `cd src && pnpm test:integration -- __tests__/integration/setup-validation.integration.test.ts`
  Expected: both commands succeed and the integration test passes.

- [ ] **Step 6: Commit**

  Commit: `feat(db): persist strategy validation policies and decisions`

### Task 3: Owned, mode-isolated evidence service

**Files:**
- Create: `src/server/services/setups/validation-service.ts`
- Test: `src/__tests__/services/setups/validation-service.test.ts`

**Interfaces:**
- Produces: `getValidationPolicy(prisma, userId, setupId)`, `getSetupValidationEvidence(prisma, userId, setupId, mode)`, `getSetupValidationOverview(prisma, userId, setupId)`, `buildValidationEvidenceSignature(evidence, policyVersion)`, and `getSetupValidationHistory(prisma, userId, setupId)`.
- Consumes: Task 1 engine/types, Task 2 Prisma models, `scopedTradeWhere`, existing checklist, practice link, decay, and drift data.

- [ ] **Step 1: Write failing ownership and isolation tests**

  Verify every setup lookup includes `userId`; each financial query uses exactly one mode and `status: CLOSED`; QA/other-mode trades never enter the result; overview requests REAL, DEMO, and BACKTEST independently and returns no combined monetary field.

- [ ] **Step 2: Write failing evidence-context tests**

  Verify checklist denominators, distinct weeks, linked `EXECUTED` practice count, capture count, changed trade/policy signature, stable ordering-independent signature, and historical decisions remaining unchanged.

- [ ] **Step 3: Run the focused test and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/services/setups/validation-service.test.ts`
  Expected: FAIL because the service does not exist.

- [ ] **Step 4: Implement policy materialization**

  Return the existing owned policy or create the default policy idempotently. Never materialize a policy for a missing or foreign setup.

- [ ] **Step 5: Implement isolated evidence and overview**

  Reuse `scopedTradeWhere(prisma, userId, { mode, includeArchived: true })`; select only required fields. Feed the pure engine, add bounded practice/capture context, derive current state from decisions, and expose comparison rows without aggregating modes.

- [ ] **Step 6: Implement canonical evidence signatures**

  Hash a versioned canonical serialization containing algorithm version, policy version, setup definition revision, mode, sorted trade IDs/revisions, checklist results, and derived evidence. Exclude display copy and unordered object key behavior.

- [ ] **Step 7: Run tests and commit**

  Run: `cd src && pnpm exec vitest run __tests__/services/setups/validation-service.test.ts __tests__/services/setups/playbook-context.test.ts`
  Expected: PASS.

  Commit: `feat(playbook): derive isolated validation evidence`

### Task 4: Authenticated API, manual decisions, and concurrency

**Files:**
- Modify: `src/server/trpc/routers/playbook.ts`
- Create: `src/__tests__/routers/playbook-validation.test.ts`

**Interfaces:**
- Produces tRPC procedures `validationOverview`, `validationEvidence`, `validationPolicy`, `updateValidationPolicy`, `validationHistory`, and `createValidationDecision`.
- Consumes: Task 3 service; notification synchronization is added in Task 6.

- [ ] **Step 1: Write failing router contract tests**

  Cover Zod bounds, foreign setup `NOT_FOUND`, policy version conflict, one-stage promotion, explicit exception reason when verdict is not `ELIGIBLE`, Real non-completion, and server-calculated snapshots that ignore any client-provided evidence.

- [ ] **Step 2: Add concurrency and idempotency tests**

  Submit the same client UUID twice and assert one decision/result; submit stale policy or state versions and assert `CONFLICT`; assert a later trade edit changes current signature but not the saved JSON/signature.

- [ ] **Step 3: Run the focused test and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/routers/playbook-validation.test.ts`
  Expected: FAIL because procedures are absent.

- [ ] **Step 4: Implement read procedures and policy update**

  Accept only owned setup UUIDs. `updateValidationPolicy` validates all percentages `0..100`, positive sample/week counts, and `expectedVersion`; update atomically and increment `version`.

- [ ] **Step 5: Implement decision transaction**

  Lock the owned setup row, resolve policy/history, recompute current evidence, validate transition/exception, and insert an immutable decision with the client idempotency key. Return the existing equivalent decision on a safe retry; reject a key reused with different input.

- [ ] **Step 6: Run tests and commit**

  Run: `cd src && pnpm exec vitest run __tests__/routers/playbook-validation.test.ts __tests__/routers/playbook-reliability.test.ts`
  Expected: PASS.

  Commit: `feat(api): add strategy validation workflow`

### Task 5: Playbook route, evidence comparison, and decision dialog

**Files:**
- Create: `src/components/playbook/setup-validation-route.tsx`
- Create: `src/components/playbook/setup-validation-stage-card.tsx`
- Create: `src/components/playbook/setup-validation-decision-dialog.tsx`
- Modify: `src/app/playbook/page.tsx`
- Test: `src/__tests__/components/playbook/setup-validation-route.test.tsx`

**Interfaces:**
- Produces: `<SetupValidationRoute setupId setupName />`, four-stage summary, isolated comparison, criteria editor, and decision history/dialog.
- Consumes: Task 4 tRPC contracts and existing modal/button/card styling.

- [ ] **Step 1: Write failing component tests**

  Assert the four labels, explicit mode labels, no combined total, `—` for unavailable values, criterion status text, eligible/manual confirmation, exception reason requirement, Real “Monitoreo continuo”, loading/error/retry, and responsive accessible tab/dialog semantics.

- [ ] **Step 2: Run the focused test and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/components/playbook/setup-validation-route.test.tsx`
  Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement focused stage components**

  Keep stage presentation independent from fetching. Format sample, R metrics, percentages, weeks, practices, captures, decay/drift, and criteria. Never format missing data as zero.

- [ ] **Step 4: Implement the route container and dialog**

  Fetch one overview, expose detail by stage, update policy with optimistic-concurrency feedback, invalidate overview/history after decisions, and require typed exception reason before exceptional promotion.

- [ ] **Step 5: Mount inside each Playbook setup card**

  Add the route beside the existing `SetupIntelligencePanel`; do not replace existing intelligence or bind the route to the global single-mode selector.

- [ ] **Step 6: Run component tests, lint touched files, and commit**

  Run: `cd src && pnpm exec vitest run __tests__/components/playbook/setup-validation-route.test.tsx __tests__/components/playbook/setup-context.test.tsx`
  Run: `cd src && pnpm exec eslint components/playbook app/playbook/page.tsx`
  Expected: PASS with no lint errors.

  Commit: `feat(playbook): show strategy validation route`

### Task 6: In-app eligibility and deterioration notifications

**Files:**
- Modify: `src/lib/messages/catalog.ts`
- Modify: `src/server/trpc/routers/playbook.ts`
- Modify: `src/components/playbook/setup-validation-route.tsx`
- Test: `src/__tests__/services/notifications/emit.test.ts`
- Test: `src/__tests__/routers/playbook-validation.test.ts`

**Interfaces:**
- Produces: message codes `SETUP_STAGE_ELIGIBLE` and `SETUP_VALIDATION_WARNING`; tRPC mutation `syncValidationNotifications({ setupId, evidenceSignature })`.
- Consumes: Task 3 evidence and existing `emitNotification` preference/dedupe behavior.

- [ ] **Step 1: Write failing notification tests**

  Verify eligibility and warning copy link to the setup's Playbook route, use category `Aprendizaje`, dedupe by setup/stage/verdict/signature, do not emit for insufficient data, and reject stale client signatures.

- [ ] **Step 2: Run focused tests and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/services/notifications/emit.test.ts __tests__/routers/playbook-validation.test.ts`
  Expected: FAIL because the codes/mutation are absent.

- [ ] **Step 3: Add catalog messages and synchronization mutation**

  Recompute evidence on the server, compare the supplied signature, and emit only current `ELIGIBLE` or promoted `WARNING` states. Use a signature-based dedupe key so unchanged evidence refreshes one live notification rather than stacking rows.

- [ ] **Step 4: Invoke synchronization from the route after fresh overview data**

  Trigger at most once per setup/signature in the mounted client and never from a query. Notification failure must not hide validation evidence.

- [ ] **Step 5: Run tests and commit**

  Run: `cd src && pnpm exec vitest run __tests__/services/notifications/emit.test.ts __tests__/routers/playbook-validation.test.ts`
  Expected: PASS.

  Commit: `feat(notifications): announce strategy validation changes`

### Task 7: Practice handoff and safe AI explanation

**Files:**
- Create: `src/server/services/setups/validation-ai-service.ts`
- Modify: `src/server/trpc/routers/playbook.ts`
- Modify: `src/components/playbook/setup-validation-route.tsx`
- Modify: `src/app/aprendizaje/page.tsx`
- Modify: `src/app/aprendizaje/components/practices-tab.tsx`
- Modify: `src/app/aprendizaje/modals/practice-modal.tsx`
- Create: `src/__tests__/services/setups/validation-ai.test.ts`
- Modify: `src/__tests__/components/playbook/setup-validation-route.test.tsx`
- Modify: `src/__tests__/components/learning-practices.test.tsx`

**Interfaces:**
- Produces: `buildValidationExplanationPrompt(evidence)`, `generateValidationExplanation(prisma, userId, setupId, stage)`, tRPC mutation `validationExplanation`, and a prefilled-but-unsaved practice handoff.
- Consumes: Task 3 bounded evidence, existing `resolveAiCall`/`executeAiCall`, rate limiter, and existing practice modal.

- [ ] **Step 1: Write failing safe-prompt tests**

  Assert the prompt contains mode, sample, policy, facts, limits, and linked-practice summaries; excludes unrelated trades and API keys; labels user notes/attachment metadata as untrusted; instructs the model not to certify, promote, or execute actions.

- [ ] **Step 2: Write failing practice-handoff tests**

  From a failed criterion, assert “Crear práctica” opens Learning Practices with mode/objective/exercise prefilled, requires user review and save, and does not create minutes, trades, or a practice automatically.

- [ ] **Step 3: Run focused tests and confirm the red state**

  Run: `cd src && pnpm exec vitest run __tests__/services/setups/validation-ai.test.ts __tests__/components/playbook/setup-validation-route.test.tsx __tests__/components/learning-practices.test.tsx`
  Expected: FAIL for the missing explanation/handoff.

- [ ] **Step 4: Implement bounded AI explanation**

  Use the existing `ai_chat` provider candidates, feature name `strategy_validation`, interactive profile, rate limit, and current server evidence. Return a transient explanation only; do not persist it as a decision or mutate route state.

- [ ] **Step 5: Implement practice intent handoff**

  Encode only setup ID, stage/mode, and short template keys in the URL. Resolve owned setup context on the destination; open the existing modal with editable defaults and remove consumed query parameters after opening.

- [ ] **Step 6: Run tests and commit**

  Run: `cd src && pnpm exec vitest run __tests__/services/setups/validation-ai.test.ts __tests__/components/playbook/setup-validation-route.test.tsx __tests__/components/learning-practices.test.tsx`
  Expected: PASS.

  Commit: `feat(learning): connect validation gaps to guided practice`

### Task 8: End-to-end acceptance, manual, and release verification

**Files:**
- Modify: `src/__tests__/e2e/flows-authed.spec.ts`
- Create: `docs/MANUAL_RUTA_VALIDACION_ESTRATEGIAS.md`
- Modify: `docs/PROJECT_GUIDE.md`
- Modify: `docs/CHANGELOG.md`

**Interfaces:**
- Produces: authenticated browser proof, screenshots, user documentation, and release evidence.
- Consumes: Tasks 1–7 complete.

- [ ] **Step 1: Add the authenticated E2E journey**

  Create a setup and isolated Backtesting/Demo/Real fixtures for the QA user; verify only Backtesting changes first, link a practice/capture, promote manually, compare modes without a total, promote to Real monitoring, inject deterioration, and see a warning without automatic downgrade.

- [ ] **Step 2: Add ownership and mobile assertions**

  Verify a second user cannot read/write policy or decisions, and exercise the route/dialog/practice handoff at desktop and mobile viewport sizes with keyboard-accessible controls.

- [ ] **Step 3: Write the illustrated manual**

  Document definitions, presets, editing policy, interpreting evidence, exceptional promotion, practice handoff, AI limits, suspension/review, notifications, and Real monitoring. Insert the actual preview screenshots captured by the E2E run, with descriptive captions and alt text.

- [ ] **Step 4: Run the complete local verification suite**

  Run: `cd src && pnpm exec tsc --noEmit`
  Run: `cd src && pnpm lint`
  Run: `cd src && pnpm test`
  Run: `cd src && pnpm test:integration`
  Run: `cd src && pnpm build`
  Expected: all commands exit `0`.

- [ ] **Step 5: Refresh Graphify and inspect the diff**

  Run: `graphify update .`
  Run: `git diff --check`
  Run: `git status --short`
  Expected: graph updated, no whitespace errors, only intended feature/docs/generated changes.

- [ ] **Step 6: Commit documentation and acceptance tests**

  Commit: `docs(playbook): add strategy validation guide and acceptance flow`

- [ ] **Step 7: Execute the established delivery procedure**

  Push the feature branch, wait for GitHub CI and Vercel preview, run the authenticated Playwright flow against preview, capture desktop/mobile screenshots, inspect application/API/database results, and fix any failure on the branch.

- [ ] **Step 8: Merge and production verification**

  After all required checks pass, merge to `main`, delete the remote feature branch, verify the Vercel production deployment and `/api/health`, run the production-safe authenticated checks, clean all QA rows/configuration copies, and report run/deployment/artifact links.

---

## Self-review result

- Spec coverage: all thirteen sections map to Tasks 1–8; email and advanced Monte Carlo remain explicitly out of scope.
- Step scan: each step has one checkable output; persistence, service, API, UI, notifications, AI/practice, and release are separate reviewer-sized units.
- Type consistency: stage/action/verdict/policy types originate in Task 1; persistence and all later interfaces consume the same names.
- Review focus: all five high-risk input classes have an explicit owning test task.
- Proportion: the plan fixes interfaces and acceptance behavior without transcribing implementations.
