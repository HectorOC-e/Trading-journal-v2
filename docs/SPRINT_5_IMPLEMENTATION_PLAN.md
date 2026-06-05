# Sprint 5 Implementation Plan: AI Configuration & Core Analytics

> **Sprint Duration:** Weeks 11–14 (2026-07-14 to 2026-08-04)  
> **Base Plan:** SPRINT_MASTER_PLAN.md § Sprint 5  
> **Canonical Reference:** CANONICAL_EXECUTION_PLAN.md § Sprint 5  
> **Adjustments from:** SPRINT_4_RETROSPECTIVE.md (QA findings, risks, recommendations)  
> **Status:** 📋 Planned — Sprint 4 QA complete (364 tests, all Major findings resolved)

---

## 1. Executive Summary

### Sprint Objective

Implement multi-provider AI configuration with encrypted key storage (TASK-033). Add accent color picker and goal-setting dashboard widget (TASK-046/050). Propagate currency handling globally (TASK-056). Surface Sharpe Ratio as KPI (TASK-062). Optimize performance (TASK-067, TASK-020). Establish testing infrastructure foundation for critical procedures.

### Key Adjustments vs. SPRINT_MASTER_PLAN.md

Sprint 4 retrospective identified 3 critical recommendations that impact Sprint 5 scope and priorities:

| Item | Master Plan | This Plan | Reason |
|---|---|---|---|
| Testing Infrastructure focus | Sprint 8 (TASK-024/025) | **Critical procedures have integration tests** | Sprint 4 lesson: new tRPC procedures must have serialization validation tests (Gate 3) |
| Quality gate enforcement | Not mentioned | **Mandatory for all new procedures** | Sprint 4 revealed 3 Blocking findings from missing gates (Zod/interface sync, browser testing, serialization) |
| Browser QA testing | Not mentioned | **Mandatory for all UI tasks** | Sprint 4 B-02 (theme CSS) shipped broken; visual testing now non-negotiable |
| Risk mitigation specificity | Generic | **Specific to Sprint 5 tasks** | Adding root-cause mitigations from Sprint 4 audits |
| Psychology field test coverage | Not mentioned | **Required: integration tests for field serialization** | Sprint 4 M-03 identified gaps; need per-field roundtrip tests |
| Type safety review density | Per-PR | **Enhanced PR checklist for AI/analytics tasks** | Sprint 4 M-01/M-05 from missed cast reviews |

**No scope reduction.** All SPRINT_MASTER_PLAN.md tasks remain. Sprint 5 adds explicit quality gates and testing strategy based on Sprint 4 learning.

---

### Sprint Capacity

| Metric | Value |
|---|---|
| Available hours | 40h (2-week sprint) |
| Planned hours | 28h |
| Buffer | 12h (discovered issues, testing, QA) |
| Tests at sprint start | 364 |
| Tests target at end | 410+ |
| Quality gates | 3 mandatory (carried forward from Sprint 4) |

---

## 2. Task Groups

---

### Group A — AI Configuration (CRITICAL PATH)

**Objective:** TASK-033 — Implement per-user AI provider configuration with encrypted key storage. Unblocks TASK-046, TASK-050. Highest complexity in this sprint.

**Why Critical Path:** 8h estimate + complex crypto/validation logic + new tRPC procedures require full Gate 1–3 compliance.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-033-arch — Architecture review: UserAiConfig schema, encryption strategy, key formats per provider | 1h | BE/Arch | Required before implementation. Check: unique constraints, encryption key rotation, per-user isolation |
| TASK-033a — Create `UserAiConfig` Prisma model with encrypted `apiKey` field | 1.5h | BE | Fields: provider (enum: Anthropic/OpenRouter/OpenAI), apiKey (encrypted), model (optional override), metadata (isActive, lastTested, errorLog) |
| TASK-033b — Implement key encryption/decryption service (`lib/ai/key-encryption.ts`) | 1.5h | BE | AES-256-GCM with random IV; test encrypt→decrypt roundtrip; handle key rotation |
| TASK-033c — Create `aiConfig.get`, `aiConfig.update`, `aiConfig.delete` tRPC procedures | 2h | BE | Zod validation for provider enum + key format per provider. TypeScript interface must match Zod schema exactly (Gate 1). Test with real API keys. |
| TASK-033d — Implement test connection endpoint (`api/ai-test/route.ts`) | 1h | BE | Calls provider API with user's key; returns {valid: true/false, error?: string}; no side effects |
| TASK-033e — UI: Add "Configuración de IA" section to profile page | 1h | FE | Form: provider selector, masked key input, test connection button, last-tested timestamp, usage display |
| TASK-033f — Integration tests: CRUD + encryption roundtrip + API validation | 1h | QA | Create key → encrypt → decrypt → compare; test all 3 providers; test invalid key rejection. Must validate serialization (Gate 3). |

**Acceptance Criteria:**
- [ ] `UserAiConfig` Prisma model created with unique (userId, provider) constraint
- [ ] Keys encrypted at rest; decryption works correctly
- [ ] All 3 provider key formats validated (Anthropic, OpenRouter, OpenAI)
- [ ] `aiConfig.get/update/delete` procedures work end-to-end
- [ ] Test connection endpoint returns {valid, error} correctly
- [ ] UI form functional; keys masked on display
- [ ] Integration tests pass: encrypt→decrypt roundtrip, API validation, 5+ test keys
- [ ] No Zod/interface mismatch (Gate 1 passed)
- [ ] Key serialization tested (Gate 3 passed)

**Risks:**
- 🔴 **Critical:** Encryption/decryption fails; keys corrupted in DB → need comprehensive roundtrip testing
- 🟠 **High:** API key validation too strict; rejects valid keys for some providers → test with real keys from each provider
- 🟡 **Medium:** UI key masking fails; plaintext visible → verify input type + display validation in browser (Gate 2)

**Risk Mitigation:**
- Test encrypt→decrypt cycle with 10+ random keys before deployment
- Obtain test keys from each provider; validate all 3 in `aiConfig.update` tests
- Browser visual test: verify keys masked in dev browser

---

### Group B — Personalization: Accent Color & Goals

**Objective:** TASK-046 (accent color picker + colorblind mode) + TASK-050 (goal-setting dashboard widget). Depends on TASK-030 (UserPreferences from Sprint 4).

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-046a — Accent color picker UI (OKLCH hue 0–360) in profile Apariencia section | 1h | FE | Radio buttons for 8 presets + custom hue slider; real-time preview on canvas |
| TASK-046b — Colorblind mode toggle (protanopia, deuteranopia, tritanopia presets) | 1h | FE | Preset CSS variable swaps for each mode; test contrast with WCAG checker (APCA preferred) |
| TASK-046c — Persist accent color + colorblind mode to `UserPreferences` (via TASK-030) | 0.5h | FE | Read on mount, write on change; depends on TASK-030 persistence working |
| TASK-046d — Apply accent color to all UI elements via CSS variables | 0.5h | FE | Audit: buttons, badges, progress rings, highlights; test on 3+ pages |
| TASK-046e — Browser test: all modes render correctly; contrast passes WCAG AA | 0.5h | QA | Manual in browser: light + dark + system modes; colorblind + normal; contrast check on key elements (Gate 2) |
| TASK-050a — Goal-setting backend (already done in Sprint 3 + Pre-Sprint 4) | 0 | BE | Confirmed: `goals.set` router procedure exists, accepts weeklyTradesGoal, weeklyPnlGoal, disciplineScore |
| TASK-050b — Dashboard goal widget (circular progress rings for 4 goals) | 1.5h | FE | Display: trades goal, P&L goal, discipline goal, learning minutes goal; show progress (0–100%); missing bar shows gap |
| TASK-050c — Goal update form (profile page Goals section) | 1h | FE | Input: numeric limits per goal type; slider for discipline score + learning minutes |
| TASK-050d — Integration test: goal CRUD + widget persistence | 0.5h | QA | Create goal → update → delete; verify widget reflects updated values; test edge cases (0% to 100%) |

**Acceptance Criteria:**
- [ ] Accent color picker functional; real-time preview works
- [ ] All 3 colorblind modes apply correct color palette
- [ ] Accent color persisted to UserPreferences; loads on next session
- [ ] Colorblind mode persisted and reapplied on reload
- [ ] All UI elements using accent color update when changed
- [ ] Contrast passes WCAG AA for all modes (verified in browser with tool)
- [ ] Goal widget displays progress rings for 4 goals
- [ ] Goal form allows create/update/delete
- [ ] Goals persist and reload correctly
- [ ] All modes tested in browser (light/dark/system + colorblind modes) — Gate 2 passed

**Risks:**
- 🟡 **Medium:** Accent color CSS variable injection incomplete; some elements don't update → audit all components using color
- 🟡 **Medium:** Colorblind contrast insufficient; fails WCAG check → test with real WCAG contrast tool, not manual assessment
- 🟡 **Medium:** Goal widget misses a goal or displays incorrectly → test all 4 goal types

**Risk Mitigation:**
- Grep for all color-related CSS vars; update any hardcoded colors
- Use WCAG contrast checker (APCA preferred); re-test if any preset fails
- Test widget with 4 different goal scenarios (some at 0%, some at 100%, some in-between)

---

### Group C — International Support & Analytics

**Objective:** TASK-056 (useCurrency hook), TASK-062 (Sharpe Ratio KPI), TASK-074 (pre-trade planning field). Independent from Group A/B after day 3.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-056a — Create `useCurrency()` React hook to read `profile.baseCurrency` | 0.5h | FE | Reads from UserContext; returns {baseCurrency, symbol, exchangeRate}; memoized |
| TASK-056b — Audit all P&L displays; replace hardcoded "USD" with `useCurrency().symbol` | 1h | FE | Audit: KPI strip, trade list, analytics dashboard, review summary, goals widget |
| TASK-056c — Browser test: P&L displays correct currency symbol for 3+ currencies (USD, EUR, GBP) | 0.5h | QA | Manual test on USD, EUR, GBP accounts; verify symbol appears correctly (Gate 2) |
| TASK-062a — Retrieve Sharpe Ratio from `dashboardStats` query (formula centralized in Sprint 1) | 0.5h | FE | Assumes `calcSharpeRatio()` available from `lib/formulas`; confirm in codebase first |
| TASK-062b — Design KPI card component for Sharpe Ratio (match existing KPI strip style) | 0.5h | FE | Display: "Sharpe Ratio: 1.23", target benchmark (1.0), trend indicator (↑ / →) |
| TASK-062c — Add Sharpe Ratio card to analytics dashboard KPI strip | 0.5h | FE | Position: after Profit Factor; responsive layout for mobile |
| TASK-062d — Browser test: Sharpe Ratio displays correctly on analytics page for 3+ accounts | 0.5h | QA | Manual: verify number format, trend indicator, no display overflow (Gate 2) |
| TASK-074a — Add `planNotes` field to Prisma Trade model (optional String, max 500 chars) | 0.5h | BE | Migration: add column, all existing trades get NULL |
| TASK-074b — Add pre-trade planning field to register trade form (textarea, max 500 chars) | 0.5h | FE | Collapsible section; label "Plan pre-operación"; optional |
| TASK-074c — Display `planNotes` in trade detail panel (read-only) | 0.25h | FE | Show if not null; limit display to 200 chars with ellipsis + expand |
| TASK-074d — Test: planNotes roundtrip (create → read → edit → display) | 0.5h | QA | Create trade with/without planNotes; verify persisted and displayed correctly |

**Acceptance Criteria:**
- [ ] `useCurrency()` hook implemented and memoized
- [ ] All P&L displays audited; hardcoded "USD" replaced with `useCurrency().symbol`
- [ ] Currency displays correctly for USD, EUR, GBP (verified in browser)
- [ ] Sharpe Ratio KPI card added to dashboard
- [ ] Sharpe Ratio calculation correct (compare to manual calculation for 1+ account)
- [ ] `planNotes` field added to Trade model
- [ ] Pre-trade planning field appears in trade form
- [ ] `planNotes` visible in trade detail panel
- [ ] All 3 tasks' browser tests passed (Gate 2)

**Risks:**
- 🟡 **Medium:** `useCurrency()` not used everywhere; some displays still hardcoded → grep for "USD", "currency", "symbol"
- 🟡 **Medium:** Sharpe Ratio formula incorrect; doesn't match manual calculation → validate calculation before display
- 🟡 **Medium:** `planNotes` field not displayed in one view (create vs. edit vs. detail) → test all 3 paths

**Risk Mitigation:**
- Comprehensive grep for hardcoded currency references
- Manually calculate Sharpe Ratio for 1+ account; compare to dashboard display
- Roundtrip test: create → read → edit → verify all 3 views show/accept `planNotes`

---

### Group D — Performance & Infrastructure

**Objective:** TASK-067 (optimize tRPC JWT parsing), TASK-020 (cursor pagination for accountLogs). Independent from Groups A–C.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-067a — Extract `userId` from JWT in Next.js middleware | 1h | BE | Parse JWT once; set as `x-user-id` header; avoid calling `supabase.auth.getUser()` in tRPC context |
| TASK-067b — Update `createTRPCContext()` to read header instead of calling Supabase | 0.5h | BE | Remove `await ctx.supabase.auth.getUser()` call; read header; reduce per-request latency |
| TASK-067c — Tests: tRPC latency benchmark (before/after JWT extraction) | 0.5h | QA | Measure p50/p95 latency on 10 sample tRPC calls; target: <50ms improvement |
| TASK-020a — Implement cursor pagination schema for `accountLogs.list` | 0.5h | BE | Zod input: {accountId, cursor?, limit?}; output: {items: [], nextCursor?} |
| TASK-020b — Update tRPC router procedure to use cursor pagination | 0.5h | BE | Replace offset-based pagination with cursor (ID-based); return paginated results |
| TASK-020c — Browser test: accountLogs page loads first page + "load more" button works | 0.5h | QA | Manual: verify pagination loads without page jump; cursor handling correct (Gate 2) |

**Acceptance Criteria:**
- [ ] JWT extraction moved to middleware; tRPC context reads header
- [ ] Per-request Supabase auth calls eliminated
- [ ] tRPC latency improved by 30–50ms (confirmed by benchmark)
- [ ] Cursor pagination schema implemented for `accountLogs.list`
- [ ] `accountLogs.list` returns paginated results with nextCursor
- [ ] Frontend pagination works; "load more" button functional
- [ ] No regression on other tRPC procedures

**Risks:**
- 🟡 **Medium:** JWT extraction breaks for missing/malformed token → validate header presence and format
- 🟡 **Medium:** Cursor pagination edge cases (empty list, last page) → test boundary conditions

**Risk Mitigation:**
- Test with missing, malformed, expired JWT tokens
- Test pagination with 0 items, 1 item, exactly limit items, and >limit items

---

## 3. Quality Gates (Carried Forward from Sprint 4)

**All tasks must pass these 3 gates before merge.**

### Gate 1: Zod–Interface Sync

Every new tRPC procedure:
- TypeScript input interface matches Zod schema field-for-field
- No `as` cast to narrow input type inside procedure
- PR checklist: "✓ Zod schema and TypeScript interface match"

**Tasks affected:** TASK-033c, TASK-050c, TASK-062b, TASK-067b, TASK-020b (all tRPC procedures)

### Gate 2: Browser Testing for UI Changes

Any task modifying DOM, CSS, localStorage, classList must be:
1. Tested in dev server before marking done
2. Visually confirmed for all variants (light/dark/mobile)
3. PR description: "Tested in browser: [what was confirmed]"

**Tasks affected:** TASK-046 (all subtasks), TASK-050b/c, TASK-056c, TASK-062c/d, TASK-067 (not UI), TASK-020c

### Gate 3: Serialization Validation for DB-Touching Procedures

Any tRPC mutation returning Prisma data must:
- Convert `Decimal` fields with `Number()` or `.toNumber()`
- Serialize `Date` fields to ISO if needed
- Test via tRPC stack (not just `caller.procedure()`)

**Tasks affected:** TASK-033c (aiConfig.get/update/delete), TASK-050c (goal mutations), TASK-074b (trade create with planNotes)

---

## 4. Sprint Schedule

### Week 1 (Days 1–5) — AI Config Architecture + Backend

| Day | Focus | Tasks |
|---|---|---|
| Day 1 | Architecture review + planning | TASK-033-arch |
| Day 2–3 | AI Config backend (schema + encryption) | TASK-033a/b |
| Day 4–5 | AI Config procedures + testing | TASK-033c/f |

**Milestones:**
- End Day 1: Schema design approved; encryption strategy documented
- End Day 5: `aiConfig.get/update/delete` functional; integration tests passing (Gate 1 + 3)

### Week 2 (Days 6–10) — Frontend + Analytics + Polish

| Day | Focus | Tasks |
|---|---|---|
| Day 6 | AI Config UI + browser test | TASK-033d/e (test connection), TASK-033e (UI) |
| Day 7 | Personalization: accent + goals | TASK-046a/b, TASK-050b/c |
| Day 8 | Browser tests for personalization | TASK-046e, TASK-050d |
| Day 9 | Analytics + currency + planning field | TASK-056a/b, TASK-062a/b, TASK-074a/b |
| Day 10 | Browser tests + performance + QA gate sweep | TASK-067a/b, TASK-020a/b, TASK-056c, TASK-062d, TASK-020c, final QA |

**Milestones:**
- End Day 6: AI Config UI complete; test connection working (Gate 2)
- End Day 8: Accent color + colorblind mode + goals widget functional (Gate 2)
- End Day 9: Currency hook + Sharpe Ratio + planNotes integrated (Gate 2)
- End Day 10: All quality gates passed; 410+ tests green

---

## 5. Dependency Graph

```
TASK-030 (Sprint 4 complete: UserPreferences CRUD)
  ├─→ TASK-046a/b/c (accent color + colorblind mode)
  └─→ TASK-050b/c (goal dashboard widget)

TASK-027 (Sprint 1 complete: formula module)
  └─→ TASK-062a (Sharpe Ratio from dashboardStats)

Independent streams (after Day 1 architecture review):
  ├─ TASK-033a/b/c/e/f (AI configuration)
  ├─ TASK-056a/b/c (useCurrency hook)
  ├─ TASK-074a/b/c/d (planNotes field)
  └─ TASK-067a/b/c + TASK-020a/b/c (performance)

TASK-033e (AI Config UI test) → TASK-033d (test connection endpoint)
```

**Critical path:** TASK-033-arch → TASK-033a → TASK-033b → TASK-033c → TASK-033e (5 days)  
**All other groups can run in parallel after Day 1.**

---

## 6. Risk Register (Sprint 5 Specific)

| Risk | Severity | Mitigation |
|---|---|---|
| TASK-033 encryption fails; keys corrupted | 🔴 Critical | Encrypt→decrypt roundtrip with 10+ keys before deploy. Test with real provider keys. |
| TASK-033 Zod/interface mismatch repeats Sprint 4 B-01 | 🟠 High | Gate 1: mandatory PR checklist item. Reviewer must confirm match field-by-field. |
| TASK-046 colorblind contrast fails WCAG AA | 🟠 High | Use WCAG contrast checker tool (APCA preferred); re-test if preset fails; don't trust manual assessment |
| TASK-056 useCurrency() not propagated everywhere; hardcoded USD remains | 🟡 Medium | Comprehensive grep for "USD", "currency", "symbol" before closing task |
| TASK-062 Sharpe Ratio formula incorrect | 🟡 Medium | Manually calculate Sharpe for 1+ account; compare to dashboard. Validate formula from `lib/formulas` |
| TASK-067 JWT middleware breaks authentication | 🟡 Medium | Test with missing, malformed, expired JWT; verify fallback behavior |
| TASK-020 cursor pagination edge cases (empty, last page, boundary) | 🟡 Medium | Test with 0 items, 1 item, exactly limit, and >limit items |
| New procedures repeat Decimal serialization issue (Gate 3) | 🟡 Medium | All mutations returning Prisma data must explicitly convert Decimal. Test via tRPC stack. |
| Browser QA gates incomplete; visual regressions in production | 🟡 Medium | Gate 2: all UI tasks must be tested in dev browser before merge. PR: document what was confirmed. |
| Sprint over-capacity if TASK-033 hits encryption edge cases | 🟡 Medium | Priority order: TASK-033 > TASK-046/050 > TASK-056 > TASK-062 > TASK-067/020. Drop analytics/performance if needed. |

---

## 7. Testing Strategy

### New Unit Tests (target: +46 tests → 410+ total)

| Test Area | Task | Tests | Coverage Focus |
|---|---|---|---|
| AI Config encryption | TASK-033b/f | 8 | Encrypt→decrypt roundtrip; key formats per provider; invalid key rejection |
| AI Config procedures | TASK-033c/f | 6 | Get, update, delete; permission checks; error cases |
| Accent color + colorblind | TASK-046d | 4 | Color vars applied; all presets render; contrast passes WCAG |
| Goal CRUD | TASK-050c/d | 6 | Create, update, delete; validation; widget persistence |
| useCurrency hook | TASK-056a | 3 | Hook returns correct currency; memoization works |
| planNotes roundtrip | TASK-074d | 4 | Create with/without notes; edit; display |
| Cursor pagination | TASK-020b | 5 | Empty list, boundary, nextCursor logic |

### Browser QA (Gate 2 — Mandatory)

| Feature | Test | Pass Criteria |
|---|---|---|
| AI Config form | Add, update, delete key for each provider | Form validates; test connection returns {valid: true/false}; UI error message clear |
| Accent color picker | Select preset + custom hue; reload page | Color applied to all UI; persists on reload; preview matches final |
| Colorblind mode | Switch between normal + 3 colorblind modes | Color palette changes; contrast passes WCAG check; all text readable |
| Goal widget | Create/update goal; widget updates | Progress rings reflect new values; all 4 goals display correctly |
| Currency display | View P&L on USD, EUR, GBP accounts | Correct currency symbol shows; no hardcoded "USD" visible |
| Sharpe Ratio card | View analytics dashboard | Card displays correctly; number format clean; no overflow on mobile |
| Pre-trade planning | Create trade with planNotes; view detail | Notes visible in detail panel; not visible in trade list (correct) |

### Integration Tests (Gate 3 — Mandatory)

- **TASK-033c:** `aiConfig.get` returns all fields correctly typed (no Decimal objects)
- **TASK-050c:** Goal mutations persist; `profile.update` still works (regression)
- **TASK-074b:** Trade create with `planNotes` serializes correctly; null handling correct
- **Regression:** All Sprint 4 psychology fields still roundtrip correctly (M-03 fix intact)

---

## 8. Acceptance Criteria (Sprint 5 Definition of Done)

### Must-Have

- [ ] **TASK-033:** AI Config CRUD functional. Encryption roundtrip validated. All 3 providers working. (Gate 1 + 3)
- [ ] **TASK-033e:** AI Config UI complete. Masked keys. Test connection working. (Gate 2)
- [ ] **TASK-046:** Accent color picker + colorblind mode functional. Contrast passes WCAG. (Gate 2)
- [ ] **TASK-050:** Goal widget displays 4 goals. Update form works. Goals persist. (Gate 2)
- [ ] **TASK-056:** `useCurrency()` hook created. Propagated to all P&L displays. Tested on 3+ currencies. (Gate 2)
- [ ] **TASK-062:** Sharpe Ratio KPI card added to dashboard. Formula validated. (Gate 2)
- [ ] **TASK-074:** `planNotes` field added. Form + display working. (Gate 2)
- [ ] **TASK-067:** JWT extracted to middleware. tRPC latency improved by 30+ms.
- [ ] **TASK-020:** Cursor pagination implemented. Frontend "load more" works.
- [ ] **All quality gates passed:** Gate 1 (Zod sync), Gate 2 (browser tested), Gate 3 (serialization)
- [ ] **410+ tests passing, 0 failing**
- [ ] **tsc --noEmit clean**

### Exit Criteria

- [ ] All must-have items merged to branch
- [ ] Manual QA sign-off: AI Config, accent colors, goals, Sharpe Ratio confirmed in browser
- [ ] Integration tests pass for all new tRPC procedures
- [ ] No regressions in Sprints 1–4 features (psychology fields, preferences, reviews, formulas)
- [ ] Browser testing gates (Gate 2) 100% passed

---

## 9. Sprint Success Metrics

| Metric | Target |
|---|---|
| Tests passing | 410+ / 410+ |
| Type errors | 0 new (tsc --noEmit clean) |
| New procedures with Zod/interface mismatch | 0 (Gate 1: 100%) |
| Browser QA gates passed | 100% (all UI tasks) |
| Serialization tests for DB procedures | 100% (Gate 3 coverage) |
| Open Blocking/Major findings at sprint end | 0 |
| tRPC latency improvement | 30–50ms (TASK-067) |

---

## 10. Comparison to SPRINT_MASTER_PLAN.md

| Item | Master Plan | This Plan | Reason |
|---|---|---|---|
| TASK-033 timing | Weeks 11–14 | **Same** | Unchanged; remains critical path |
| Quality gates | Not present | **3 mandatory gates** | Direct lessons from Sprint 4 B-01/B-02/B-03 |
| Browser testing requirement | Not present | **Mandatory for all UI tasks** | Sprint 4 B-02 (theme CSS) shipped broken; visual testing now non-negotiable |
| Testing strategy density | Generic | **Detailed per task + Gate 3 validation** | Sprint 4 M-03 revealed serialization gaps |
| Performance optimization | TASK-067, TASK-020 | **Same; more specific latency target** | Added: measure TASK-067 impact (30+ms improvement) |
| Risk register | 5 generic | **10 risks; 5 from Sprint 4 audit findings** | B-01 (Zod), B-02 (browser), B-03 (serialization) formalized as sprint risks |
| Type safety review | Per-PR | **Enhanced for analytics/AI tasks** | Sprint 4 M-01/M-05 from missed cast reviews |
| Minor findings closure | Not planned | **Deferred to Sprint 6 polish pass** | Consistent with Sprint 4 decision; keep Sprint 5 focused |
| Accent color + colorblind | TASK-046 (4h) | **TASK-046 (4h)** | Unchanged; but added WCAG contrast validation |

---

## 11. Files to Create / Modify

| File | Change | Task | Owner |
|---|---|---|---|
| `src/lib/ai/key-encryption.ts` | New: AES-256-GCM encrypt/decrypt | TASK-033b | BE |
| `prisma/schema.prisma` | Add `UserAiConfig` model; add `planNotes` to Trade | TASK-033a, TASK-074a | BE |
| `src/server/trpc/routers/ai-config.ts` | New: aiConfig.get/update/delete procedures | TASK-033c | BE |
| `src/app/api/ai-test/route.ts` | New: test connection endpoint | TASK-033d | BE |
| `src/app/perfil/page.tsx` | Add Configuración de IA section | TASK-033e | FE |
| `src/app/perfil/page.tsx` | Add accent color picker + colorblind mode to Apariencia | TASK-046a/b | FE |
| `src/app/dashboard/page.tsx` | Add goal-setting widget + update goal form | TASK-050b/c | FE |
| `src/hooks/useCurrency.ts` | New: currency hook | TASK-056a | FE |
| `src/app/trades/page.tsx` | Replace hardcoded "USD" with useCurrency() | TASK-056b | FE |
| `src/app/analytics/page.tsx` | Add Sharpe Ratio KPI card | TASK-062a/b/c | FE |
| `src/app/trades/modals/register-trade-modal.tsx` | Add planNotes textarea field | TASK-074b | FE |
| `src/app/trades/[id]/page.tsx` | Display planNotes in detail panel | TASK-074c | FE |
| `src/middleware.ts` | Extract userId from JWT; set x-user-id header | TASK-067a | BE |
| `src/server/trpc/init.ts` | Read userId from header; remove auth.getUser() | TASK-067b | BE |
| `src/server/trpc/routers/account-logs.ts` | Cursor pagination for accountLogs.list | TASK-020a/b | BE |
| `src/__tests__/ai-config.test.ts` | New: encryption roundtrip + CRUD tests | TASK-033f | QA |
| `src/__tests__/goals.test.ts` | Add CRUD tests | TASK-050d | QA |
| `src/__tests__/trades.test.ts` | Add planNotes roundtrip tests | TASK-074d | QA |
| `src/__tests__/account-logs.test.ts` | Add cursor pagination tests | TASK-020b | QA |

---

## 12. Known Constraints & Deferments

### Deferred to Sprint 6 (Polish Pass)

Per Sprint 4 retrospective, the following minor findings remain open and are deferred to Sprint 6:
- **m-01:** Auto-save skips when only `disciplineScore` changes
- **m-02:** `autoSaveStatus` never resets from "saved" to idle
- **m-03:** Week options stale if app kept open across week boundary
- **m-04:** Auto-save effect missing exhaustive-deps
- **m-05:** Tab save mutation has no error handler
- **m-06:** Week selector visual selection lost when collapsed

These 6 Minor findings do not block Sprint 5 deliverables and will be addressed in Sprint 6 quality pass.

### Discipline Score Consolidation (TASK-011)

Successfully consolidated in Sprint 4. No changes to this sprint.

### Testing Infrastructure (TASK-024/025)

Full testing infrastructure (RTL component tests, Playwright e2e, CI/CD) deferred to Sprint 8 per SPRINT_MASTER_PLAN.md. Sprint 5 adds **integration test requirements for critical new procedures** (Gate 3) as stopgap until formal testing framework.

---

## Appendix A: Sprint 4 → Sprint 5 Knowledge Transfer

| Sprint 4 Finding | How Sprint 5 Responds |
|---|---|
| B-01: Zod/interface mismatch in new procedures | Gate 1: mandatory PR checklist for all tRPC tasks |
| B-02: Theme CSS shipped broken; no visual test | Gate 2: browser testing mandatory for all UI tasks |
| B-03: Decimal serialization untested | Gate 3: integration tests for all DB-touching mutations |
| M-01: Type safety issues (any types) | Enhanced review: grep for `as never`/`any` in TASK-046/062/074 |
| M-02: Stale closures in useEffect | useEffect deps checklist for TASK-050 (goals modal) |
| M-03: Fragile empty-string sentinel | Psychology field serialization tested roundtrip (TASK-074) |
| M-04: Hardcoded visualizations | TASK-062 Sharpe Ratio: validate formula before display |
| M-05: Unnecessary defensive casts | Code review: audit for unused type narrowing in AI Config UI |
| R-001: TD-002 discipline score divergence | Consolidated in Sprint 4; Sprint 5 validates regression (test suite) |
| R-002: Type safety debt | Continue TASK-013 reduction; enhanced type review in PR |
| QA maturity | Post-sprint QA audit for Sprint 5 (structured like Sprint 4) |

---

*End of SPRINT_5_IMPLEMENTATION_PLAN.md*  
*Generated: 2026-06-02 | Based on: SPRINT_MASTER_PLAN.md + SPRINT_4_RETROSPECTIVE.md + CANONICAL_EXECUTION_PLAN.md*
