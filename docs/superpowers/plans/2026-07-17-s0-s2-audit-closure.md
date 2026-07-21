# S0–S2 Audit Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the real actionable debt from the 2026-07-17 S0–S2 audit: (A) a real-DB integration harness + outbox/persistence tests for the S0 event bus, (B) the `Rule.sourceCommitmentId` FK, (C) STATUS.md audit closure incl. the stale DT-1/DT-2.

**Architecture:** Integration tests run against the **supabase local stack** the CI "Validate migrations" job already spins up (fresh DB, all migrations replayed). A separate vitest config isolates them from the 1204 pure unit tests. The FK is a dual (SQL + Prisma) migration. Docs are edited last.

**Tech Stack:** TypeScript, vitest, Prisma, Supabase CLI (CI), Postgres.

## Global Constraints

- **Integration tests CANNOT be run on the current dev machine** (no Supabase CLI, Docker not running). They are validated by CI (the "Validate migrations" job, Task 4). Locally, verify only: `tsc`, `eslint`, the pure suite is unaffected, `prisma generate`, and YAML/SQL correctness.
- Run test/build commands from `src/`: `cd "C:\Users\hosorio\Documents\SAP-HOSORIO\xtern\Trading-journal-v2\src"`. Do NOT run `pnpm install` (stalls); use `npx`/`pnpm exec`.
- The pure suite (`pnpm test`) MUST stay green (1204/1204) and MUST NOT pick up `__tests__/integration/**`.
- Integration setup MUST refuse any `DATABASE_URL` whose host is not `localhost`/`127.0.0.1` (safety: the tests delete rows).
- Migrations are DUAL: SQL in `supabase/migrations/` (repo root) **and** the Prisma model in `src/prisma/schema.prisma`; run `pnpm exec prisma generate` after editing the schema. Migration filename timestamp format: `YYYYMMDDHHMMSS`.
- Node 20. Stay on branch `chore/s0-s2-audit-closure`. Never stage `.claude/settings.json`.

**Reference facts (verified against code):**
- `persistInsights(userId, computed: ComputedInsight[], client = defaultPrisma)` — `src/domains/analytics/insights/insight-store.ts`. Uses `client.$transaction`; creates insights + `publishEvent(tx, {type:"insight.created"})` per create; touches survivors (`lastSeenAt`); resolves the disappeared + `insight.resolved`.
- `ComputedInsight` — `src/domains/analytics/insights/insight-reconcile.ts`: `{ fingerprint, type, category, severity, title, detail, evidence, recommendation?, metric?, sampleSize, confidence?, ... }`. The batch is **deduped by fingerprint**.
- `publishEvent(tx, { userId, type, payload, dedupeKey?, occurredAt? })` and `dispatchPending(prisma, batchSize=50): { claimed, processed, failed }` and `_resetHandlers()` — `src/domains/cognitive/events/event-bus.ts`. Events with no registered handler are marked `processed` (no-op). `dispatchPending` claims globally via raw SQL (not user-scoped) → integration config uses `fileParallelism: false`.
- `DomainEvent` model (`domain_events`): `status` (pending|processing|processed|failed), `type`, `payload`, `userId`, `processedAt`. `Insight` model (`insights`): `status` (active|resolved|committed), `sampleSize Int @default(0)`, `lastSeenAt DateTime @default(now())`, `resolvedAt DateTime?`. `User`: `id` (uuid, NO default → must supply) + `email` (unique) are the only required fields; both `insights` and `domain_events` FK `userId` with `onDelete: Cascade` (so deleting the user cleans everything).
- `Rule.sourceCommitmentId` (`src/prisma/schema.prisma`) is a bare `String? @db.Uuid`, no relation. `Rule.commitments Commitment[]` ↔ `Commitment.rule Rule?` is the existing (implicit-name) relation via `ruleId`.

---

## File Structure

- Create `src/vitest.integration.config.ts` — isolated vitest config for DB tests.
- Modify `src/vitest.config.ts` — exclude `__tests__/integration/**`.
- Modify `src/package.json` — add `test:integration` script.
- Create `src/__tests__/integration/_helpers.ts` — local-only guard, prisma client, user helpers.
- Create `src/__tests__/integration/insight-store.integration.test.ts` — persist tests (4).
- Create `src/__tests__/integration/event-bus.integration.test.ts` — dispatch test (1).
- Modify `.github/workflows/ci.yml` — run the integration suite in the migrations job.
- Create `supabase/migrations/20260717120000_rule_source_commitment_fk.sql` — Part B.
- Modify `src/prisma/schema.prisma` — Part B named relations.
- Modify `docs/STATUS.md` — Part C.

---

### Task 1: Integration harness (config, isolation, guard, smoke)

**Files:**
- Create: `src/vitest.integration.config.ts`, `src/__tests__/integration/_helpers.ts`, `src/__tests__/integration/smoke.integration.test.ts`
- Modify: `src/vitest.config.ts`, `src/package.json`

**Interfaces:**
- Produces: `_helpers.ts` exports `prisma: PrismaClient`, `makeUser(): Promise<string>`, `dropUser(id: string): Promise<void>`; a `test:integration` npm script; the guard that throws on non-local `DATABASE_URL`.

- [ ] **Step 1: Add the exclude to the pure config**

Edit `src/vitest.config.ts` — change the `exclude` line:
```ts
    exclude: ["**/.claude/**", "**/node_modules/**", "**/__tests__/e2e/**", "**/__tests__/integration/**"],
```

- [ ] **Step 2: Create the integration config**

Create `src/vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import path from "path"

// DB-backed integration tests (S0/DT-3). Run ONLY where a local Postgres is up
// (supabase local). Kept out of the default `vitest run` via vitest.config.ts's
// exclude. fileParallelism is off because dispatchPending claims events globally.
export default defineConfig({
  test: {
    globals: true,
    include: ["**/__tests__/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
})
```

- [ ] **Step 3: Add the npm script**

In `src/package.json`, add to `"scripts"` (next to `"test"`):
```json
    "test:integration": "vitest run --config vitest.integration.config.ts",
```

- [ ] **Step 4: Create the helpers + safety guard**

Create `src/__tests__/integration/_helpers.ts`:
```ts
import { PrismaClient } from "@/lib/generated/prisma/client"
import { randomUUID } from "node:crypto"

// Safety: these tests DELETE rows. Refuse to run against anything but a local DB.
const url = process.env.DATABASE_URL ?? ""
const host = (() => { try { return new URL(url).hostname } catch { return "" } })()
if (!/^(localhost|127\.0\.0\.1)$/.test(host)) {
  throw new Error(
    `Integration tests refuse to run against a non-local DATABASE_URL (host="${host}"). ` +
    `Point DATABASE_URL at the supabase local stack.`,
  )
}

export const prisma = new PrismaClient()

/** Create an ephemeral user; deleting it cascades to insights + domain_events. */
export async function makeUser(): Promise<string> {
  const id = randomUUID()
  await prisma.user.create({ data: { id, email: `it-${id}@example.test` } })
  return id
}

export async function dropUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } }).catch(() => {})
}
```

- [ ] **Step 5: Create a connectivity smoke test**

Create `src/__tests__/integration/smoke.integration.test.ts`:
```ts
import { describe, it, expect, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"

let userId: string | null = null
afterEach(async () => { if (userId) { await dropUser(userId); userId = null } })

describe("integration harness", () => {
  it("connects to a real Postgres and round-trips a user", async () => {
    userId = await makeUser()
    const found = await prisma.user.findUnique({ where: { id: userId } })
    expect(found?.id).toBe(userId)
  })
})
```

- [ ] **Step 6: Verify the pure suite still excludes integration (local)**

Run (from `src/`): `npx vitest run __tests__/integration 2>&1 | tail -5` then `npx tsc --noEmit`
Expected: the first shows "No test files found" or that vitest.config excludes them (the integration files are excluded from the default config — a bare `vitest run` must not include them). tsc: clean apart from the pre-existing `puppeteer-core` error in `render-pdf.ts`.
Note: the integration tests themselves CANNOT run here (no local DB) — CI (Task 4) validates them.

- [ ] **Step 7: Commit**

```bash
git add src/vitest.integration.config.ts src/vitest.config.ts src/package.json src/__tests__/integration/_helpers.ts src/__tests__/integration/smoke.integration.test.ts
git commit -m "test(s0-dt3): integration harness (supabase local) with local-only guard"
```

---

### Task 2: persistInsights integration tests

**Files:**
- Create: `src/__tests__/integration/insight-store.integration.test.ts`

**Interfaces:**
- Consumes: `persistInsights` (`@/domains/analytics/insights/insight-store`), `ComputedInsight` (`@/domains/analytics/insights/insight-reconcile`), `prisma`/`makeUser`/`dropUser` (`./_helpers`).

- [ ] **Step 1: Write the tests**

Create `src/__tests__/integration/insight-store.integration.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { persistInsights } from "@/domains/analytics/insights/insight-store"
import type { ComputedInsight } from "@/domains/analytics/insights/insight-reconcile"

function ci(fp: string, over: Partial<ComputedInsight> = {}): ComputedInsight {
  return {
    fingerprint: fp, type: fp, category: "pattern", severity: "info",
    title: `t-${fp}`, detail: "d", evidence: "e", sampleSize: 20, ...over,
  }
}

let userId: string
beforeEach(async () => { userId = await makeUser() })
afterEach(async () => { await dropUser(userId) })

describe("persistInsights (integration, real Postgres)", () => {
  it("creates insights and emits insight.created in the same transaction", async () => {
    const r = await persistInsights(userId, [ci("intraday-decay"), ci("oversizing")], prisma)
    expect(r.created).toBe(2)
    const insights = await prisma.insight.findMany({ where: { userId } })
    expect(insights).toHaveLength(2)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(2)
  })

  it("touches survivors without emitting new events or duplicating rows", async () => {
    await persistInsights(userId, [ci("intraday-decay")], prisma)
    await new Promise((r) => setTimeout(r, 5))
    const r = await persistInsights(userId, [ci("intraday-decay")], prisma)
    expect(r.created).toBe(0)
    expect(r.touched).toBe(1)
    const insights = await prisma.insight.findMany({ where: { userId } })
    expect(insights).toHaveLength(1)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(1) // touch does not re-emit
  })

  it("resolves a disappeared insight and emits insight.resolved", async () => {
    await persistInsights(userId, [ci("intraday-decay")], prisma)
    const r = await persistInsights(userId, [ci("oversizing")], prisma)
    expect(r.created).toBe(1)
    expect(r.resolved).toBe(1)
    const gone = await prisma.insight.findFirst({ where: { userId, type: "intraday-decay" } })
    expect(gone?.status).toBe("resolved")
    expect(gone?.resolvedAt).not.toBeNull()
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.resolved" } })
    expect(events).toHaveLength(1)
  })

  it("rolls back atomically: a mid-transaction failure leaves no insight and no event (FREEZE-D6)", async () => {
    // Second insight has a null NOT-NULL column → the create throws inside the
    // transaction AFTER the first insight+event were written. A real rollback
    // must leave both tables empty. (Mocks cannot prove this.)
    const bad = ci("oversizing", { sampleSize: null as unknown as number })
    await expect(
      persistInsights(userId, [ci("intraday-decay"), bad], prisma),
    ).rejects.toBeTruthy()
    expect(await prisma.insight.count({ where: { userId } })).toBe(0)
    expect(await prisma.domainEvent.count({ where: { userId } })).toBe(0)
  })
})
```

- [ ] **Step 2: Typecheck (local)**

Run (from `src/`): `npx tsc --noEmit`
Expected: clean apart from the pre-existing `puppeteer-core` error. (The suite runs in CI, Task 4.)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/insight-store.integration.test.ts
git commit -m "test(s0-dt3): persistInsights outbox + transactional rollback against real Postgres"
```

---

### Task 3: dispatchPending integration test

**Files:**
- Create: `src/__tests__/integration/event-bus.integration.test.ts`

**Interfaces:**
- Consumes: `publishEvent`, `dispatchPending`, `_resetHandlers` (`@/domains/cognitive/events/event-bus`), `prisma`/`makeUser`/`dropUser` (`./_helpers`).

- [ ] **Step 1: Write the test**

Create `src/__tests__/integration/event-bus.integration.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { publishEvent, dispatchPending, _resetHandlers } from "@/domains/cognitive/events/event-bus"

let userId: string
beforeEach(async () => { userId = await makeUser(); _resetHandlers() })
afterEach(async () => { await dropUser(userId) })

describe("dispatchPending (integration, real Postgres)", () => {
  it("drains pending events, marks them processed, and is idempotent", async () => {
    await prisma.$transaction(async (tx) => {
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "a" } })
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "b" } })
    })
    expect(await prisma.domainEvent.count({ where: { userId, status: "pending" } })).toBe(2)

    const first = await dispatchPending(prisma, 50)
    expect(first.claimed).toBe(2)
    expect(first.processed).toBe(2) // no handler registered → processed no-op
    expect(await prisma.domainEvent.count({ where: { userId, status: "processed" } })).toBe(2)

    const second = await dispatchPending(prisma, 50)
    expect(second.claimed).toBe(0)
    expect(second.processed).toBe(0)
  })
})
```

- [ ] **Step 2: Typecheck (local)**

Run (from `src/`): `npx tsc --noEmit`
Expected: clean apart from the pre-existing `puppeteer-core` error.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/event-bus.integration.test.ts
git commit -m "test(s0-dt3): dispatchPending drains + idempotency against real Postgres"
```

---

### Task 4: Wire the integration suite into CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the integration step to the "Validate migrations" job**

In `.github/workflows/ci.yml`, in the `Validate migrations (replay from scratch)` job, insert a new step AFTER the `Check Prisma↔SQL drift (S0/DT-4)` step and BEFORE `Stop local stack`:
```yaml
      - name: Integration tests (outbox / persistence, real DB)
        working-directory: src
        run: |
          pnpm exec prisma generate
          STATUS_ENV="$(cd .. && supabase status -o env || true)"
          LOCAL_DB_URL=$(echo "$STATUS_ENV" | grep '^DB_URL=' | cut -d'=' -f2- | tr -d '"')
          if [ -z "$LOCAL_DB_URL" ]; then
            echo "::error::Could not extract local DB URL from supabase status -o env"
            echo "$STATUS_ENV"
            exit 1
          fi
          DATABASE_URL="$LOCAL_DB_URL" pnpm exec vitest run --config vitest.integration.config.ts
```
(The `Stop local stack` step has `if: always()`, so it still runs if this step fails.)

- [ ] **Step 2: Validate the YAML locally**

Run (from repo root): `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!/Integration tests \(outbox/.test(y)) throw new Error('step missing'); console.log('step present, yaml readable')"`
Expected: prints "step present, yaml readable". (Full validation happens when CI runs, Task 7.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(s0-dt3): run the integration suite against supabase local in the migrations job"
```

---

### Task 5: Part B — `Rule.sourceCommitmentId` FK (dual migration)

**Files:**
- Create: `supabase/migrations/20260717120000_rule_source_commitment_fk.sql`
- Modify: `src/prisma/schema.prisma`

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/20260717120000_rule_source_commitment_fk.sql`:
```sql
-- S1/DT-4: add the missing FK on rules.source_commitment_id → commitments(id).
-- The column existed as a bare uuid (provenance for Behavior-Engine rules sourced
-- from a commitment) since Commitment did not exist at S1. Commitment exists since
-- S4, so the FK can be added. ON DELETE SET NULL: deleting a commitment must not
-- delete the rule it once sourced, just drop the provenance link.

-- Defensive: null out any dangling refs before the constraint (today the column is
-- unpopulated — rules-from-commitments (OI-4.1) is unbuilt — so this is a no-op).
UPDATE rules
   SET source_commitment_id = NULL
 WHERE source_commitment_id IS NOT NULL
   AND source_commitment_id NOT IN (SELECT id FROM commitments);

CREATE INDEX IF NOT EXISTS rules_source_commitment_id_idx
  ON rules (source_commitment_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rules_source_commitment_id_fkey'
  ) THEN
    ALTER TABLE rules
      ADD CONSTRAINT rules_source_commitment_id_fkey
      FOREIGN KEY (source_commitment_id) REFERENCES commitments (id) ON DELETE SET NULL;
  END IF;
END $$;
```

- [ ] **Step 2: Name both Rule↔Commitment relations in the Prisma schema**

In `src/prisma/schema.prisma`, in the `Rule` model, change the existing `commitments` line and add the new relation. Replace:
```prisma
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  commitments Commitment[]
  ruleSuggestions RuleSuggestion[]
```
with:
```prisma
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  commitments Commitment[] @relation("CommitmentRule")
  sourceCommitment Commitment? @relation("RuleSourceCommitment", fields: [sourceCommitmentId], references: [id], onDelete: SetNull)
  ruleSuggestions RuleSuggestion[]
```

Then in the `Commitment` model, replace:
```prisma
  rule          Rule?             @relation(fields: [ruleId], references: [id], onDelete: SetNull)
```
with:
```prisma
  rule          Rule?             @relation("CommitmentRule", fields: [ruleId], references: [id], onDelete: SetNull)
  sourcedRules  Rule[]            @relation("RuleSourceCommitment")
```

- [ ] **Step 3: Regenerate the Prisma client and typecheck**

Run (from `src/`): `pnpm exec prisma generate && npx tsc --noEmit`
Expected: prisma generate succeeds (validates the schema — named relations resolve); tsc clean apart from the pre-existing `puppeteer-core` error. If prisma reports a relation error, both sides' relation names must match exactly (`CommitmentRule`, `RuleSourceCommitment`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717120000_rule_source_commitment_fk.sql src/prisma/schema.prisma
git commit -m "feat(s1-dt4): add rules.source_commitment_id FK now that Commitment exists"
```

---

### Task 6: Part C — STATUS.md audit closure

**Files:**
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: the exact current row strings (grep them first — the file is edited often).

- [ ] **Step 1: Update the audited rows**

Grep for each row and replace its `Estado` cell. For the rows below, set the status to the verified verdict (keep the ID/Sprint/Item/Context cells unchanged):

- `S0/DT-1` → `✅ parcialmente resuelto — auditado 2026-07-17. El estimador Bayesiano de S3 (`proportionEstimate`) ya corre en `toComputedInsight`: cuando el detector expone `stat`, `sampleSize` se refina al n por-detector (`est.sampleSize`). Residual: los detectores sin `stat` siguen con el n coarse (cobertura = OI-3.3/3.5).`
- `S0/DT-2` → `✅ parcialmente resuelto — auditado 2026-07-17. `toComputedInsight` corre `proportionEstimate` y rellena `confidence`/`credibleIntervalLow/High`/`effectSize` para detectores con `stat` (intraday-decay, weekday-discipline). El "nulo por diseño hasta S3" del doc quedó viejo. Residual: cobertura de `stat` (OI-3.3/3.5).`
- `S0/DT-3` → `✅ resuelto — 2026-07-17. Arnés de integración (supabase local, reusando el job de migraciones de CI) + 5 tests contra Postgres real: persistInsights crea+emite en una tx, touch/resolve, y **rollback atómico real** (FREEZE-D6, imposible con los mocks previos); dispatchPending drena+idempotente. Guard que rechaza DATABASE_URL no-local.`
- `S0/DT-5` → prefix the existing status with `✅ auditado 2026-07-17 — sigue por diseño (S6/S7): ` (recompute procesa `bundle.raw.trades` completo; aceptable para el job diario).
- `S0/DT-6` → `✅ auditado 2026-07-17 — sin colisión hoy: psychology emite 6 ids distintos, generateInsights otros; riesgo latente, no deuda.`
- `S1/DT-3` → `✅ auditado 2026-07-17 — correcto por diseño (FREEZE-P3): `available:false` gatea las 2 plantillas hasta que exista su capacidad (S8/contexto trade anterior).`
- `S1/DT-4` → `✅ resuelto — 2026-07-17. FK `rules.source_commitment_id → commitments(id)` ON DELETE SET NULL + índice (migración `20260717120000`), relaciones Prisma nombradas. Guard defensivo (hoy la columna está vacía: OI-4.1 sin construir).`
- `S2/DT-2` → `✅ auditado 2026-07-17 — diferido: `feedbackForEmotion` usa el total por emoción; la versión con ventana se apoya en `rollingWindow` (existe, no cableado aquí). Bajo, aceptable.`
- `S2/DT-3` → `✅ auditado 2026-07-17 — aproximación documentada: `deriveSession(openTime)` ignora timezone; mejora cuando el trade capture UTC real.`
- `S2/DT-4` → `✅ auditado 2026-07-17 — deliberado (FREEZE-P2): `suggestTagsFromNote` es keyword matcher; la capa LLM es posterior.`

For each: run `grep -n "\`<ID>\`" docs/STATUS.md` to find the line, read it, and Edit only the final `| ⬜ ... |` cell to the new text.

- [ ] **Step 2: Update the header date**

Ensure `> Última actualización:` reads `2026-07-17` (grep; edit if not).

- [ ] **Step 3: Commit**

```bash
git add docs/STATUS.md
git commit -m "docs(status): close the S0-S2 DT/R audit (DT-1/2 stale, DT-3/4 fixed, rest by-design)"
```

---

### Task 7: Full verification + push + PR

**Files:** none (verification only).

- [ ] **Step 1: Pure suite unaffected + typecheck + lint (local)**

Run (from `src/`):
```
npx vitest run
npx tsc --noEmit
pnpm exec eslint .
```
Expected: vitest 1204 passed / 1 skipped (the integration files are excluded by `vitest.config.ts`; a bare run must NOT include them). tsc clean apart from the pre-existing `puppeteer-core` error in `render-pdf.ts`. eslint 0 errors.

- [ ] **Step 2: Confirm integration files are excluded from the default run**

Run (from `src/`): `npx vitest run --reporter=verbose 2>&1 | grep -i "integration" || echo "OK: no integration tests in the default run"`
Expected: "OK: no integration tests in the default run".

- [ ] **Step 3: Push**

```bash
git push -u origin chore/s0-s2-audit-closure
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "chore(s0-s2): close the audited debt — DT-3 integration tests, DT-4 FK, doc fixes" --body "<summary: A) supabase-local integration harness + outbox/persistence tests incl. real transactional rollback (S0/DT-3); B) rules.source_commitment_id FK (S1/DT-4); C) STATUS audit closure incl. DT-1/DT-2 which the S3 Bayesian estimator already partially resolved. Integration suite runs in the migrations CI job; it cannot run on the dev machine (no local Docker).>"
```

- [ ] **Step 5: Watch CI — the integration job is the authoritative gate**

The integration tests and the FK migration replay are validated by CI, not locally. After the run for the PR head SHA appears:
- `Validate migrations (replay from scratch)` must be green — this both replays `20260717120000` (FK migration) from scratch AND runs the integration suite. If the integration step fails, read its log; a migration failure shows in `supabase db reset`.
- `Type check, Tests & Build` must stay green (pure suite + tsc + eslint).

Do NOT declare done until that job is green. If red, fix on this branch and re-push.

---

## Self-Review

**Spec coverage:**
- Part A harness (isolated config, guard, supabase-local) → Task 1. ✓
- Part A tests 1–4 (create/emit, touch, resolve, atomicity) → Task 2. ✓
- Part A test 5 (dispatchPending drain + idempotent) → Task 3. ✓
- Part A CI wiring → Task 4. ✓
- Part B FK (dual migration, named relations, defensive null, drift-safe) → Task 5. ✓
- Part C STATUS closure incl. DT-1/DT-2 stale + by-design verdicts → Task 6. ✓
- "Never against prod" guard → Task 1 Step 4. ✓ "Verify DomainEvent/Insight shape" → done in Reference facts. ✓

**Placeholder scan:** PR body (Task 7 Step 4) is a `<...>` author guide — acceptable prose. Task 6 statuses are given verbatim. No code placeholders.

**Type consistency:** `ci()` builds a valid `ComputedInsight` (all required fields). `sampleSize: null as unknown as number` is the deliberate rollback trigger (Insight.sampleSize is NOT NULL). `dispatchPending(prisma, 50)` and `publishEvent(tx, {...})` match verified signatures. Relation names `CommitmentRule` / `RuleSourceCommitment` are used identically on both models. `makeUser` supplies `id`+`email` (the only required User fields).

**Execution note:** integration tests are NOT runnable on the dev machine (no Docker/Supabase CLI); Tasks 2/3 verify by `tsc` locally and by the CI migrations job (Task 4/7). This is called out in Global Constraints and Task 7.
