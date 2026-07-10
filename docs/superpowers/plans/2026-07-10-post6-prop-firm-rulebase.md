# POST-6 — Prop-Firm Rulebase (moat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a curated, DB-backed catalog of prop-firm rule presets that auto-configures a trading account (snapshot), plus the new enforceable rule types (trailing drawdown, phase progress, consistency, weekend holding) with a per-account WARN/ENFORCE mode.

**Architecture:** A new global reference table `prop_firm_presets` (read by all authenticated users, written only by service-role) holds each firm/program/phase's rules. Picking a preset in the account modal **copies** its values into the account's own fields (the existing enforcement path reads those). Four new pure functions in `prop-firm-guard.ts` add the missing rule logic; `enforceMode` reuses the existing `locked` mechanism for hard blocks.

**Tech Stack:** Next.js (custom build — see `src/AGENTS.md`), tRPC, Prisma (client generated at `@/lib/generated/prisma/client`), Supabase Postgres + RLS, Zod, Vitest, React.

## Global Constraints

- **Dual migrations:** every schema change is BOTH SQL in `supabase/migrations/<timestamp>_<name>.sql` AND the Prisma model in `src/prisma/schema.prisma`, followed by `npx prisma generate`. (copied from resume prompt)
- **RLS on new tables.** Per-user tables use `auth.uid() = user_id`; `prop_firm_presets` is GLOBAL reference data → `select to authenticated using (true)`, no write policy (service-role only). (spec §4.1)
- **Run the FULL vitest suite before every push**, not a subset. (resume prompt)
- **TDD for pure domains:** test → verify fail → minimal impl → verify pass → commit. (spec §9)
- **Node 24 (nvm); run binaries via `./node_modules/.bin/` from `src/`.** (resume prompt)
- **Firm numbers are placeholders marked `-- VERIFY`; the user confirms exact values before merge.** (spec §8)
- **Commit frequently; commit+push the branch per sprint, do NOT merge to main.** (workflow memory)
- Branch: `feat/post6-prop-firm-rulebase` (already created & pushed).

---

### Task 1: Migration — `prop_firm_presets` table + new `Account` fields (dual)

**Files:**
- Create: `supabase/migrations/20260710140000_post6_prop_firm_rulebase.sql`
- Modify: `src/prisma/schema.prisma:109-165` (Account model) and add a new `PropFirmPreset` model after it
- Verify: `src/pnpm-lock.yaml` unchanged; `prisma generate` output

**Interfaces:**
- Produces: Prisma model `PropFirmPreset` (fields below) and Account columns `consistencyPct`, `noWeekendHolding`, `enforceMode`, `presetId`. Later tasks consume the generated Prisma types from `@/lib/generated/prisma/client`.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260710140000_post6_prop_firm_rulebase.sql`:

```sql
-- POST-6 — Prop-firm rulebase (moat). A curated, GLOBAL catalog of firm/program/phase
-- rules (prop_firm_presets) + the Account columns the new rule types need.
-- The catalog is reference data: any authenticated user may READ it; only service-role
-- writes (base for a future admin panel). Accounts SNAPSHOT preset values (see plan §3),
-- so editing the catalog never mutates a live challenge.

-- 1) Catalog table (global reference data — no user_id)
create table if not exists public.prop_firm_presets (
  id                 uuid primary key default gen_random_uuid(),
  firm               text not null,
  program            text not null,
  phase              text not null,                 -- PHASE_1 | PHASE_2 | FUNDED
  account_size       numeric(14,2),
  dd_daily_pct       numeric(5,2),
  dd_total_pct       numeric(5,2),
  dd_model           text not null default 'FIXED', -- FIXED | TRAILING
  target_pct         numeric(5,2),
  min_trading_days   int,
  consistency_pct    numeric(5,2),
  no_weekend_holding boolean not null default false,
  max_trades_per_day int,
  source_url         text not null default '',
  verified_at        date,
  version            int not null default 1,
  enabled            boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (firm, program, phase)
);

alter table public.prop_firm_presets enable row level security;
-- Global reference data: authenticated users READ only; service-role bypasses RLS to write.
drop policy if exists prop_firm_presets_read on public.prop_firm_presets;
create policy prop_firm_presets_read on public.prop_firm_presets
  for select to authenticated using (true);

-- 2) New Account columns for the rule types that had no home yet
alter table public.accounts
  add column if not exists consistency_pct    numeric(5,2),
  add column if not exists no_weekend_holding boolean not null default false,
  add column if not exists enforce_mode       text    not null default 'WARN', -- WARN | ENFORCE
  add column if not exists preset_id          uuid;

-- 3) Seed the 3 anchor firms. NUMBERS ARE PLACEHOLDERS — VERIFY before merge.
-- ON CONFLICT keeps re-runs idempotent (replay-from-scratch in CI).
insert into public.prop_firm_presets
  (firm, program, phase, account_size, dd_daily_pct, dd_total_pct, dd_model, target_pct,
   min_trading_days, consistency_pct, no_weekend_holding, max_trades_per_day, source_url, verified_at)
values
  -- FTMO — forex, 2-phase + funded, FIXED drawdown            -- VERIFY at ftmo.com
  ('FTMO','Challenge','PHASE_1',100000, 5, 10,'FIXED',10, 4, null,false,null,'https://ftmo.com', null),
  ('FTMO','Challenge','PHASE_2',100000, 5, 10,'FIXED', 5, 4, null,false,null,'https://ftmo.com', null),
  ('FTMO','Challenge','FUNDED', 100000, 5, 10,'FIXED', null,null,null,false,null,'https://ftmo.com', null),
  -- Topstep — futures, TRAILING drawdown, consistency         -- VERIFY at topstep.com
  -- Topstep states limits in DOLLARS; stored as % of the 50k account_size to fit the
  -- percentage model + numeric(5,2): $2000 trailing = 4%, $3000 target = 6%.
  ('Topstep','Trading Combine','PHASE_1',50000, null, 4,'TRAILING',6, 2, 50,false,null,'https://topstep.com', null),
  ('Topstep','Trading Combine','FUNDED', 50000, null, 4,'TRAILING',null,null, 50,false,null,'https://topstep.com', null),
  -- MyFundedFX — modern one/two-step, consistency             -- VERIFY at myfundedfx.com
  ('MyFundedFX','Evaluation','PHASE_1',100000, 5, 10,'FIXED', 8, null, 40,false,null,'https://myfundedfx.com', null),
  ('MyFundedFX','Evaluation','FUNDED', 100000, 5, 10,'FIXED', null,null, 40,false,null,'https://myfundedfx.com', null)
on conflict (firm, program, phase) do nothing;
```

- [ ] **Step 2: Add the Prisma models**

In `src/prisma/schema.prisma`, inside `model Account { ... }` add these fields in the "Prop Firm extras" block (near line 139):

```prisma
  consistencyPct    Decimal? @map("consistency_pct")     @db.Decimal(5, 2)
  noWeekendHolding  Boolean  @default(false) @map("no_weekend_holding")
  enforceMode       String   @default("WARN") @map("enforce_mode")   // WARN | ENFORCE
  presetId          String?  @map("preset_id") @db.Uuid
```

After the `Account` model (after line 165), add:

```prisma
// ─────────────────────────────────────────────
// PROP FIRM PRESET (POST-6 — curated moat catalog, GLOBAL reference data)
// Read by all authenticated users; written only by service-role. Accounts SNAPSHOT
// these values on selection, so catalog edits never mutate a live challenge.
// ─────────────────────────────────────────────
model PropFirmPreset {
  id               String   @id @default(uuid()) @db.Uuid
  firm             String
  program          String
  phase            String                                            // PHASE_1 | PHASE_2 | FUNDED
  accountSize      Decimal? @map("account_size")      @db.Decimal(14, 2)
  ddDailyPct       Decimal? @map("dd_daily_pct")      @db.Decimal(5, 2)
  ddTotalPct       Decimal? @map("dd_total_pct")      @db.Decimal(5, 2)
  ddModel          String   @default("FIXED") @map("dd_model")       // FIXED | TRAILING
  targetPct        Decimal? @map("target_pct")        @db.Decimal(5, 2)
  minTradingDays   Int?     @map("min_trading_days")
  consistencyPct   Decimal? @map("consistency_pct")   @db.Decimal(5, 2)
  noWeekendHolding Boolean  @default(false) @map("no_weekend_holding")
  maxTradesPerDay  Int?     @map("max_trades_per_day")
  sourceUrl        String   @default("") @map("source_url")
  verifiedAt       DateTime? @map("verified_at") @db.Date
  version          Int      @default(1)
  enabled          Boolean  @default(true)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@unique([firm, program, phase])
  @@map("prop_firm_presets")
}
```

- [ ] **Step 3: Regenerate the Prisma client**

Run (from `src/`): `./node_modules/.bin/prisma generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Type-check**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit`
Expected: PASS (no errors — new fields are additive; nothing consumes them yet).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260710140000_post6_prop_firm_rulebase.sql src/prisma/schema.prisma
git commit -m "feat(post6): prop_firm_presets catalog + account rule fields (dual migration)"
```

---

### Task 2: Engine — `checkTrailingDrawdown`

**Files:**
- Modify: `src/domains/trading/services/prop-firm-guard.ts` (extend `PropFirmViolation` union; add function)
- Test: `src/__tests__/services/trading/prop-firm-guard.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `checkTrailingDrawdown(currentEquity: number, peakEquity: number, initialBalance: number, limitPct: number | null, model: "FIXED" | "TRAILING"): PropFirmViolation | null`. New violation variants `{ type: "TRAILING_DRAWDOWN" | "MAX_DRAWDOWN"; limitPct: number; currentPct: number }`.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/services/trading/prop-firm-guard.test.ts`:

```ts
import { checkTrailingDrawdown } from "@/domains/trading/services/prop-firm-guard"

describe("checkTrailingDrawdown", () => {
  it("null when no limit configured", () => {
    expect(checkTrailingDrawdown(9000, 10_000, 10_000, null, "TRAILING")).toBeNull()
    expect(checkTrailingDrawdown(9000, 10_000, 10_000, 0, "TRAILING")).toBeNull()
  })

  it("FIXED: violation when equity falls limitPct% below initial", () => {
    // 10% of 10k = 1000 → floor 9000; equity 9000 → at floor
    const r = checkTrailingDrawdown(9000, 12_000, 10_000, 10, "FIXED")
    expect(r?.type).toBe("MAX_DRAWDOWN")
  })

  it("FIXED: no violation while above the fixed floor even if below peak", () => {
    // floor 9000; equity 9500 → ok (FIXED ignores the 12k peak)
    expect(checkTrailingDrawdown(9500, 12_000, 10_000, 10, "FIXED")).toBeNull()
  })

  it("TRAILING: floor follows the peak", () => {
    // peak 12k, limit $1000 → floor 11_000; equity 10_900 → violation
    const r = checkTrailingDrawdown(10_900, 12_000, 10_000, 10, "TRAILING")
    expect(r?.type).toBe("TRAILING_DRAWDOWN")
    if (r?.type === "TRAILING_DRAWDOWN") expect(r.limitPct).toBe(10)
  })

  it("TRAILING: no violation just above the trailing floor", () => {
    // peak 12k, floor 11_000; equity 11_100 → ok
    expect(checkTrailingDrawdown(11_100, 12_000, 10_000, 10, "TRAILING")).toBeNull()
  })

  it("null when initialBalance non-positive", () => {
    expect(checkTrailingDrawdown(0, 0, 0, 10, "TRAILING")).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkTrailingDrawdown"`
Expected: FAIL — "checkTrailingDrawdown is not a function" / import error.

- [ ] **Step 3: Write minimal implementation**

In `src/domains/trading/services/prop-firm-guard.ts`, extend the `PropFirmViolation` union (add these members):

```ts
  | { type: "TRAILING_DRAWDOWN"; limitPct: number; currentPct: number }
  | { type: "MAX_DRAWDOWN";      limitPct: number; currentPct: number }
```

and add the function:

```ts
/**
 * Total-drawdown check. FIXED: floor is limitPct% below the INITIAL balance.
 * TRAILING: floor is the same dollar amount below the running PEAK equity (the
 * max-loss line trails new highs). `currentPct` reports realized loss vs initial.
 * Uses realized/journaled equity — no live unrealized P&L (documented limitation).
 */
export function checkTrailingDrawdown(
  currentEquity:  number,
  peakEquity:     number,
  initialBalance: number,
  limitPct:       number | null,
  model:          "FIXED" | "TRAILING",
): PropFirmViolation | null {
  if (limitPct == null || limitPct <= 0 || initialBalance <= 0) return null
  const dollarLimit = (limitPct / 100) * initialBalance
  const anchor      = model === "TRAILING" ? Math.max(peakEquity, initialBalance) : initialBalance
  const floor       = anchor - dollarLimit
  if (currentEquity <= floor) {
    const currentPct = (initialBalance - currentEquity) / initialBalance * 100
    return {
      type: model === "TRAILING" ? "TRAILING_DRAWDOWN" : "MAX_DRAWDOWN",
      limitPct,
      currentPct,
    }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkTrailingDrawdown"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domains/trading/services/prop-firm-guard.ts src/__tests__/services/trading/prop-firm-guard.test.ts
git commit -m "feat(post6): checkTrailingDrawdown (fixed + peak-trailing floor)"
```

---

### Task 3: Engine — `checkConsistency`

**Files:**
- Modify: `src/domains/trading/services/prop-firm-guard.ts`
- Test: `src/__tests__/services/trading/prop-firm-guard.test.ts`

**Interfaces:**
- Produces: `checkConsistency(dailyProfits: number[], consistencyPct: number | null): PropFirmViolation | null`. New variant `{ type: "CONSISTENCY"; limitPct: number; currentPct: number }`.

- [ ] **Step 1: Write the failing test**

Append to the test file:

```ts
import { checkConsistency } from "@/domains/trading/services/prop-firm-guard"

describe("checkConsistency", () => {
  it("null when no limit configured", () => {
    expect(checkConsistency([100, 200], null)).toBeNull()
    expect(checkConsistency([100, 200], 0)).toBeNull()
  })

  it("null when total profit is non-positive", () => {
    expect(checkConsistency([-100, -50], 40)).toBeNull()
  })

  it("violation when one day exceeds the consistency share", () => {
    // total 1000; best day 500 = 50% > 40% limit
    const r = checkConsistency([500, 300, 200], 40)
    expect(r?.type).toBe("CONSISTENCY")
    if (r?.type === "CONSISTENCY") expect(r.currentPct).toBeCloseTo(50, 5)
  })

  it("no violation when best day within share", () => {
    // total 1000; best day 300 = 30% <= 40%
    expect(checkConsistency([300, 300, 400], 40)).toBeNull()
  })

  it("ignores losing days when finding the best day", () => {
    // total 400; best day 300 = 75% > 40%
    expect(checkConsistency([300, 200, -100], 40)?.type).toBe("CONSISTENCY")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkConsistency"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation**

Add the variant to the union:

```ts
  | { type: "CONSISTENCY"; limitPct: number; currentPct: number }
```

and the function:

```ts
/**
 * Consistency rule: no single winning day may exceed `consistencyPct`% of the net
 * total profit over the period. `dailyProfits` is net P&L per day. Only meaningful
 * when the period is net-positive; returns null otherwise.
 */
export function checkConsistency(
  dailyProfits:   number[],
  consistencyPct: number | null,
): PropFirmViolation | null {
  if (consistencyPct == null || consistencyPct <= 0) return null
  const total = dailyProfits.reduce((s, d) => s + d, 0)
  if (total <= 0) return null
  const bestDay    = Math.max(0, ...dailyProfits)
  const currentPct = bestDay / total * 100
  if (currentPct > consistencyPct) {
    return { type: "CONSISTENCY", limitPct: consistencyPct, currentPct }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkConsistency"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domains/trading/services/prop-firm-guard.ts src/__tests__/services/trading/prop-firm-guard.test.ts
git commit -m "feat(post6): checkConsistency (no day > X% of total profit)"
```

---

### Task 4: Engine — `checkWeekendHolding`

**Files:**
- Modify: `src/domains/trading/services/prop-firm-guard.ts`
- Test: `src/__tests__/services/trading/prop-firm-guard.test.ts`

**Interfaces:**
- Produces: `checkWeekendHolding(openDate: Date, closeDate: Date): PropFirmViolation | null`. New variant `{ type: "WEEKEND_HOLDING" }`.

- [ ] **Step 1: Write the failing test**

Append to the test file:

```ts
import { checkWeekendHolding } from "@/domains/trading/services/prop-firm-guard"

describe("checkWeekendHolding", () => {
  it("null for an intraday weekday trade", () => {
    // Wed 2026-07-08 open & close
    expect(checkWeekendHolding(new Date("2026-07-08T10:00:00Z"), new Date("2026-07-08T14:00:00Z"))).toBeNull()
  })

  it("null when held Wed→Thu (no weekend crossed)", () => {
    expect(checkWeekendHolding(new Date("2026-07-08T10:00:00Z"), new Date("2026-07-09T10:00:00Z"))).toBeNull()
  })

  it("violation when held Fri→Mon (crosses the weekend)", () => {
    // Fri 2026-07-10 → Mon 2026-07-13
    expect(checkWeekendHolding(new Date("2026-07-10T20:00:00Z"), new Date("2026-07-13T08:00:00Z"))?.type)
      .toBe("WEEKEND_HOLDING")
  })

  it("violation when the open day itself is Saturday", () => {
    expect(checkWeekendHolding(new Date("2026-07-11T10:00:00Z"), new Date("2026-07-11T12:00:00Z"))?.type)
      .toBe("WEEKEND_HOLDING")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkWeekendHolding"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation**

Add the variant:

```ts
  | { type: "WEEKEND_HOLDING" }
```

and the function:

```ts
/**
 * Weekend-holding restriction: a position must not span (or open on) a Saturday or
 * Sunday. Walks each UTC calendar day in [open, close] and flags if any is a weekend.
 */
export function checkWeekendHolding(openDate: Date, closeDate: Date): PropFirmViolation | null {
  const dayMs = 24 * 60 * 60 * 1000
  const start = Date.UTC(openDate.getUTCFullYear(), openDate.getUTCMonth(), openDate.getUTCDate())
  const end   = Date.UTC(closeDate.getUTCFullYear(), closeDate.getUTCMonth(), closeDate.getUTCDate())
  for (let t = start; t <= end; t += dayMs) {
    const dow = new Date(t).getUTCDay() // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) return { type: "WEEKEND_HOLDING" }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "checkWeekendHolding"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domains/trading/services/prop-firm-guard.ts src/__tests__/services/trading/prop-firm-guard.test.ts
git commit -m "feat(post6): checkWeekendHolding (no position across a weekend)"
```

---

### Task 5: Engine — `phaseProgress` (informational, never blocks)

**Files:**
- Modify: `src/domains/trading/services/prop-firm-guard.ts`
- Test: `src/__tests__/services/trading/prop-firm-guard.test.ts`

**Interfaces:**
- Produces: `phaseProgress(realizedProfit: number, initialBalance: number, targetPct: number | null, tradingDays: number, minTradingDays: number | null): PhaseProgress` where `interface PhaseProgress { targetReached: boolean; targetPct: number | null; profitPct: number; daysDone: number; minDays: number | null; daysReached: boolean; passed: boolean }`.

- [ ] **Step 1: Write the failing test**

Append to the test file:

```ts
import { phaseProgress } from "@/domains/trading/services/prop-firm-guard"

describe("phaseProgress", () => {
  it("passed when target and min days both met", () => {
    // +10% on 100k = 10k; target 10%; 5 days >= 4
    const p = phaseProgress(10_000, 100_000, 10, 5, 4)
    expect(p.targetReached).toBe(true)
    expect(p.daysReached).toBe(true)
    expect(p.passed).toBe(true)
    expect(p.profitPct).toBeCloseTo(10, 5)
  })

  it("not passed when target met but not enough days", () => {
    const p = phaseProgress(10_000, 100_000, 10, 2, 4)
    expect(p.targetReached).toBe(true)
    expect(p.daysReached).toBe(false)
    expect(p.passed).toBe(false)
  })

  it("no target configured → targetReached true (nothing to hit)", () => {
    const p = phaseProgress(0, 100_000, null, 10, null)
    expect(p.targetReached).toBe(true)
    expect(p.daysReached).toBe(true)
    expect(p.passed).toBe(true)
  })

  it("target not reached when profit below it", () => {
    expect(phaseProgress(5_000, 100_000, 10, 10, 4).targetReached).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "phaseProgress"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation**

Add to `prop-firm-guard.ts`:

```ts
export interface PhaseProgress {
  targetReached: boolean
  targetPct:     number | null
  profitPct:     number
  daysDone:      number
  minDays:       number | null
  daysReached:   boolean
  passed:        boolean
}

/**
 * Phase pass-status (informational — never blocks a trade). A phase is passed when the
 * realized profit reaches `targetPct`% of initial AND at least `minTradingDays` were
 * traded. Null target/minDays means "no requirement" (auto-satisfied).
 */
export function phaseProgress(
  realizedProfit: number,
  initialBalance: number,
  targetPct:      number | null,
  tradingDays:    number,
  minTradingDays: number | null,
): PhaseProgress {
  const profitPct     = initialBalance > 0 ? realizedProfit / initialBalance * 100 : 0
  const targetReached = targetPct == null || profitPct >= targetPct
  const daysReached   = minTradingDays == null || tradingDays >= minTradingDays
  return {
    targetReached,
    targetPct,
    profitPct,
    daysDone:    tradingDays,
    minDays:     minTradingDays,
    daysReached,
    passed:      targetReached && daysReached,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-guard.test.ts -t "phaseProgress"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domains/trading/services/prop-firm-guard.ts src/__tests__/services/trading/prop-firm-guard.test.ts
git commit -m "feat(post6): phaseProgress (target + min-days pass status)"
```

---

### Task 6: tRPC — `propFirmPresets.list` + typed catalog reference

**Files:**
- Create: `src/domains/trading/data/prop-firm-presets.ts` (typed reference mirroring the seed)
- Create: `src/server/trpc/routers/prop-firm-presets.ts`
- Modify: `src/server/trpc/root.ts` (register the router)
- Test: `src/__tests__/data/prop-firm-presets.test.ts`

**Interfaces:**
- Consumes: Prisma `PropFirmPreset` model (Task 1).
- Produces: tRPC query `propFirmPresets.list` → array of presets grouped for the picker; typed constant `PROP_FIRM_PRESETS`. Later UI (Task 9) consumes `trpc.propFirmPresets.list`.

- [ ] **Step 1: Write the failing test (typed catalog matches the seeded firms)**

Create `src/__tests__/data/prop-firm-presets.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { PROP_FIRM_PRESETS, FIRMS } from "@/domains/trading/data/prop-firm-presets"

describe("PROP_FIRM_PRESETS", () => {
  it("covers the 3 anchor firms", () => {
    expect(FIRMS).toEqual(["FTMO", "Topstep", "MyFundedFX"])
  })

  it("every preset has a firm/program/phase and a source url", () => {
    for (const p of PROP_FIRM_PRESETS) {
      expect(p.firm).toBeTruthy()
      expect(p.program).toBeTruthy()
      expect(["PHASE_1", "PHASE_2", "FUNDED"]).toContain(p.phase)
      expect(p.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it("Topstep uses a TRAILING drawdown model", () => {
    const topstep = PROP_FIRM_PRESETS.filter((p) => p.firm === "Topstep")
    expect(topstep.length).toBeGreaterThan(0)
    expect(topstep.every((p) => p.ddModel === "TRAILING")).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/data/prop-firm-presets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the typed catalog**

Create `src/domains/trading/data/prop-firm-presets.ts`. Keep numbers in sync with the migration seed (Task 1) — VERIFY before merge:

```ts
// POST-6 curated prop-firm catalog (typed reference). The DB table prop_firm_presets is
// the runtime source (editable without deploy); this constant mirrors the seed for
// type-safety and tests. Keep the two in sync until a seed-from-constant job exists.

export type Phase = "PHASE_1" | "PHASE_2" | "FUNDED"
export type DrawdownModel = "FIXED" | "TRAILING"

export interface PropFirmPresetSeed {
  firm:             string
  program:          string
  phase:            Phase
  accountSize:      number | null
  ddDailyPct:       number | null
  ddTotalPct:       number | null
  ddModel:          DrawdownModel
  targetPct:        number | null
  minTradingDays:   number | null
  consistencyPct:   number | null
  noWeekendHolding: boolean
  maxTradesPerDay:  number | null
  sourceUrl:        string
}

export const FIRMS = ["FTMO", "Topstep", "MyFundedFX"] as const

export const PROP_FIRM_PRESETS: PropFirmPresetSeed[] = [
  { firm: "FTMO", program: "Challenge", phase: "PHASE_1", accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: 10, minTradingDays: 4, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  { firm: "FTMO", program: "Challenge", phase: "PHASE_2", accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: 5,  minTradingDays: 4, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  { firm: "FTMO", program: "Challenge", phase: "FUNDED",  accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: null, minTradingDays: null, consistencyPct: null, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://ftmo.com" },
  // Topstep states limits in DOLLARS; stored as % of the 50k account_size ($2000 trailing = 4%, $3000 target = 6%).
  { firm: "Topstep", program: "Trading Combine", phase: "PHASE_1", accountSize: 50_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: 6, minTradingDays: 2, consistencyPct: 50, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://topstep.com" },
  { firm: "Topstep", program: "Trading Combine", phase: "FUNDED",  accountSize: 50_000, ddDailyPct: null, ddTotalPct: 4, ddModel: "TRAILING", targetPct: null, minTradingDays: null, consistencyPct: 50, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://topstep.com" },
  { firm: "MyFundedFX", program: "Evaluation", phase: "PHASE_1", accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: 8, minTradingDays: null, consistencyPct: 40, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://myfundedfx.com" },
  { firm: "MyFundedFX", program: "Evaluation", phase: "FUNDED",  accountSize: 100_000, ddDailyPct: 5, ddTotalPct: 10, ddModel: "FIXED", targetPct: null, minTradingDays: null, consistencyPct: 40, noWeekendHolding: false, maxTradesPerDay: null, sourceUrl: "https://myfundedfx.com" },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/data/prop-firm-presets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the tRPC router**

Create `src/server/trpc/routers/prop-firm-presets.ts`:

```ts
import { router, protectedProcedure } from "../init"

/** Read-only access to the curated prop-firm catalog (global reference data). */
export const propFirmPresetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.propFirmPreset.findMany({
      where:   { enabled: true },
      orderBy: [{ firm: "asc" }, { program: "asc" }, { phase: "asc" }],
    })
    return rows.map((p) => ({
      ...p,
      accountSize:    p.accountSize    != null ? Number(p.accountSize)    : null,
      ddDailyPct:     p.ddDailyPct     != null ? Number(p.ddDailyPct)     : null,
      ddTotalPct:     p.ddTotalPct     != null ? Number(p.ddTotalPct)     : null,
      targetPct:      p.targetPct      != null ? Number(p.targetPct)      : null,
      consistencyPct: p.consistencyPct != null ? Number(p.consistencyPct) : null,
      verifiedAt:     p.verifiedAt != null ? p.verifiedAt.toISOString() : null,
      createdAt:      p.createdAt.toISOString(),
      updatedAt:      p.updatedAt.toISOString(),
    }))
  }),
})
```

- [ ] **Step 6: Register the router**

In `src/server/trpc/root.ts`, import and add to the root router. Add the import near the other router imports:

```ts
import { propFirmPresetsRouter } from "./routers/prop-firm-presets"
```

and add `propFirmPresets: propFirmPresetsRouter,` to the `router({ ... })` map.

- [ ] **Step 7: Type-check + run the data test**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run __tests__/data/prop-firm-presets.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domains/trading/data/prop-firm-presets.ts src/server/trpc/routers/prop-firm-presets.ts src/server/trpc/root.ts src/__tests__/data/prop-firm-presets.test.ts
git commit -m "feat(post6): propFirmPresets.list router + typed catalog reference"
```

---

### Task 7: Account input + serialization — new fields flow through create/update

**Files:**
- Modify: `src/server/trpc/routers/accounts.ts:30-49` (`AccountInput`), `:53-74` (`serializeAccount`)
- Test: `src/__tests__/routers/accounts-input.test.ts`

**Interfaces:**
- Consumes: Prisma Account fields (Task 1).
- Produces: `AccountInput` accepts `consistencyPct?`, `noWeekendHolding?`, `enforceMode?` (`"WARN" | "ENFORCE"`), `presetId?`; `serializeAccount` returns `consistencyPct` as number|null and passes through `noWeekendHolding`, `enforceMode`, `presetId`. UI (Task 9) relies on these.

- [ ] **Step 1: Write the failing test (schema accepts the new fields)**

Create `src/__tests__/routers/accounts-input.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { z } from "zod"

// Mirror of the extended AccountInput shape (kept in sync with accounts.ts). This test
// guards that the new prop-firm fields parse with the right types/enums.
const EnforceMode = z.enum(["WARN", "ENFORCE"])

describe("AccountInput prop-firm extensions", () => {
  it("enforceMode accepts WARN and ENFORCE only", () => {
    expect(EnforceMode.parse("WARN")).toBe("WARN")
    expect(EnforceMode.parse("ENFORCE")).toBe("ENFORCE")
    expect(() => EnforceMode.parse("HARD")).toThrow()
  })
})
```

(The router itself is exercised end-to-end by the QA phase; this unit test locks the enum.)

- [ ] **Step 2: Run test to verify it fails**

It will actually PASS as written (it only tests a local enum). To make it a real red-first step, FIRST add the import of the router's exported enum. Change the test's import line to:

```ts
import { ENFORCE_MODES } from "@/server/trpc/routers/accounts"
const EnforceMode = z.enum(ENFORCE_MODES)
```

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/routers/accounts-input.test.ts`
Expected: FAIL — `ENFORCE_MODES` is not exported.

- [ ] **Step 3: Extend the router**

In `src/server/trpc/routers/accounts.ts`, near the other const arrays (after line 28) add and export:

```ts
export const ENFORCE_MODES = ["WARN", "ENFORCE"] as const
```

Add to the `AccountInput` object (after `targetLeverage` at line 48):

```ts
  consistencyPct:   z.number().optional(),
  noWeekendHolding: z.boolean().optional(),
  enforceMode:      z.enum(ENFORCE_MODES).optional(),
  presetId:         z.string().uuid().optional(),
```

In `serializeAccount` (in the returned object, after the `targetPct` line ~67) add:

```ts
    consistencyPct: a.consistencyPct != null ? Number(a.consistencyPct) : null,
```

(`noWeekendHolding`, `enforceMode`, `presetId` are already carried by the `...a` spread with correct types.)

- [ ] **Step 4: Run test + type-check**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/routers/accounts-input.test.ts && ./node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/accounts.ts src/__tests__/routers/accounts-input.test.ts
git commit -m "feat(post6): account input/serialize carry consistency, weekend, enforceMode, presetId"
```

---

### Task 8: Wire new checks into the dashboard prop-firm status + ENFORCE lock

**Files:**
- Modify: `src/server/trpc/routers/trades.ts` (the `dashboardStats.propFirmStatus` builder — locate `propFirmStatus`)
- Modify: `src/domains/trading/services/risk-enforcement.ts` (add trailing-DD / weekend evaluation to the pre-trade path; honor `enforceMode`)
- Test: `src/__tests__/services/trading/prop-firm-status.test.ts`

**Interfaces:**
- Consumes: `checkTrailingDrawdown`, `checkConsistency`, `checkWeekendHolding`, `phaseProgress` (Tasks 2-5); Account fields (Task 1).
- Produces: `propFirmStatus[]` entries gain `trailing: { usedPct, limitPct, model }`, `consistency: { usedPct, limitPct } | null`, `phase: PhaseProgress`. The pre-trade guard rejects a trade when `enforceMode === "ENFORCE"` and a blockable rule (trailing DD) is violated, reusing the `locked` path.

> **Note for implementer:** `trades.ts` is large (~1136 LOC). Locate the existing `propFirmStatus` array builder (it already computes `ddPctUsed`, `dailyLossPct`, `tradesUsed`, `allowedSymbols`). Extend that mapper — do NOT restructure the file. First READ the surrounding block and the current `PropFirmStatus` shape (consumed by `prop-firm-rules.tsx`) before editing.

- [ ] **Step 1: Read the current propFirmStatus builder**

Run: `./node_modules/.bin/grep -n "propFirmStatus" src/server/trpc/routers/trades.ts` (or use editor search). Read ~60 lines around it and note how `initialBalance`, realized P&L, and per-day P&L are already available.

- [ ] **Step 2: Write the failing test for the status extension helper**

To keep `trades.ts` testable, extract the new computation into a pure helper. Create `src/__tests__/services/trading/prop-firm-status.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { buildPropFirmExtras } from "@/domains/trading/services/prop-firm-status"

describe("buildPropFirmExtras", () => {
  it("reports trailing status and phase progress", () => {
    const extras = buildPropFirmExtras({
      initialBalance: 100_000,
      currentEquity:  105_000,
      peakEquity:     108_000,
      ddTotalPct:     10,
      ddModel:        "TRAILING",
      dailyProfits:   [3000, 2000],
      consistencyPct: 40,
      targetPct:      10,
      tradingDays:    5,
      minTradingDays: 4,
    })
    expect(extras.trailing.model).toBe("TRAILING")
    expect(extras.phase.passed).toBe(false) // +5% < 10% target
    expect(extras.consistency?.limitPct).toBe(40)
  })

  it("consistency is null when unconfigured", () => {
    const extras = buildPropFirmExtras({
      initialBalance: 100_000, currentEquity: 100_000, peakEquity: 100_000,
      ddTotalPct: 10, ddModel: "FIXED", dailyProfits: [], consistencyPct: null,
      targetPct: null, tradingDays: 0, minTradingDays: null,
    })
    expect(extras.consistency).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the helper**

Create `src/domains/trading/services/prop-firm-status.ts`:

```ts
import { checkConsistency, phaseProgress } from "./prop-firm-guard"
import type { PhaseProgress } from "./prop-firm-guard"

export interface PropFirmExtrasInput {
  initialBalance: number
  currentEquity:  number
  peakEquity:     number
  ddTotalPct:     number | null
  ddModel:        "FIXED" | "TRAILING"
  dailyProfits:   number[]
  consistencyPct: number | null
  targetPct:      number | null
  tradingDays:    number
  minTradingDays: number | null
}

export interface PropFirmExtras {
  trailing:    { usedPct: number; limitPct: number; model: "FIXED" | "TRAILING" }
  consistency: { usedPct: number; limitPct: number } | null
  phase:       PhaseProgress
}

/** Dashboard-facing prop-firm computations that the base guard doesn't already surface. */
export function buildPropFirmExtras(i: PropFirmExtrasInput): PropFirmExtras {
  const dollarLimit = i.ddTotalPct != null ? (i.ddTotalPct / 100) * i.initialBalance : 0
  const anchor      = i.ddModel === "TRAILING" ? Math.max(i.peakEquity, i.initialBalance) : i.initialBalance
  const usedFromAnchor = dollarLimit > 0 ? Math.min(100, Math.max(0, (anchor - i.currentEquity) / dollarLimit * 100)) : 0

  const consViolation = checkConsistency(i.dailyProfits, i.consistencyPct)
  const total = i.dailyProfits.reduce((s, d) => s + d, 0)
  const bestDayPct = total > 0 ? Math.max(0, ...i.dailyProfits) / total * 100 : 0

  return {
    trailing:    { usedPct: usedFromAnchor, limitPct: i.ddTotalPct ?? 0, model: i.ddModel },
    consistency: i.consistencyPct != null
      ? { usedPct: consViolation ? consViolation.currentPct : bestDayPct, limitPct: i.consistencyPct }
      : null,
    phase: phaseProgress(i.currentEquity - i.initialBalance, i.initialBalance, i.targetPct, i.tradingDays, i.minTradingDays),
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `src/`): `./node_modules/.bin/vitest run __tests__/services/trading/prop-firm-status.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire the helper into `trades.ts` propFirmStatus**

In the `propFirmStatus` mapper in `src/server/trpc/routers/trades.ts`, for each prop account compute `peakEquity` from the account's closed-trade equity curve (reuse the existing per-account P&L data already gathered there), call `buildPropFirmExtras(...)`, and spread the result onto the status entry. Keep existing fields intact (additive). If per-day P&L isn't already available in that block, derive `dailyProfits` by grouping the account's closed trades by `date` (the block already loads closed trades).

- [ ] **Step 7: Honor `enforceMode` in the pre-trade guard**

In `src/domains/trading/services/risk-enforcement.ts`, where the daily/weekly/monthly loss lock is applied (the block that sets `locked`/`lockReason`), also evaluate `checkTrailingDrawdown(currentEquity, peakEquity, initialBalance, ddTotalPct, ddModel)`. When it returns a violation AND `account.enforceMode === "ENFORCE"`, set the lock (`lockReason = "TRAILING_DRAWDOWN"`) exactly as the existing loss-limit lock does. When `enforceMode === "WARN"`, do not lock (the dashboard already shows the bar). READ the existing lock block first and mirror its shape.

- [ ] **Step 8: Full type-check + targeted tests**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run __tests__/services/trading/`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domains/trading/services/prop-firm-status.ts src/server/trpc/routers/trades.ts src/domains/trading/services/risk-enforcement.ts src/__tests__/services/trading/prop-firm-status.test.ts
git commit -m "feat(post6): dashboard prop-firm extras + ENFORCE trailing-DD lock"
```

---

### Task 9: UI — preset picker + enforceMode toggle in the account modal

**Files:**
- Modify: `src/app/cuentas/modals/create-account-modal.tsx`, `src/app/cuentas/modals/edit-account-modal.tsx`
- (Possibly extract a shared `PropFirmPresetPicker` component: `src/app/cuentas/components/prop-firm-preset-picker.tsx`)

**Interfaces:**
- Consumes: `trpc.propFirmPresets.list` (Task 6); `accounts.create`/`accounts.update` new inputs (Task 7).

> UI task — verified in the QA phase (Playwright, per project convention), not via unit tests. READ both modals first to match existing form patterns (field components, `useMutation` wiring).

- [ ] **Step 1: Read the two modals** and note how prop-firm fields (ddDailyPct, phase, etc.) are currently rendered and submitted.

- [ ] **Step 2: Add the preset picker.** Create `src/app/cuentas/components/prop-firm-preset-picker.tsx`: three cascading selects — Firm → Program → Phase — sourced from `trpc.propFirmPresets.list.useQuery()`. On phase selection, call an `onApply(preset)` callback that fills the parent form's rule fields (ddDailyPct, ddTotalPct, ddModel, targetPct, minTradingDays, consistencyPct, noWeekendHolding, maxTradesPerDay) and sets `presetId`. Also prefill `initialBalance` from the preset's `accountSize` (when the field is empty/zero) — the rule percentages are relative to the account balance, so a dollar-based firm like Topstep (stored as 4%/6% of its 50k size) only resolves to the intended dollars when the balance matches; leave it editable. Include a "Personalizado" option that clears `presetId` and leaves fields manually editable.

- [ ] **Step 3: Add the enforceMode toggle** (WARN default / ENFORCE) to both modals, only visible for prop-firm account types (`isPropFirmType`). Wire it into the create/update mutation input.

- [ ] **Step 4: Type-check + build**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/pnpm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/cuentas/
git commit -m "feat(post6): account modal preset picker + enforceMode toggle"
```

---

### Task 10: UI — dashboard prop-firm panel shows the new rules

**Files:**
- Modify: `src/app/dashboard/components/prop-firm-rules.tsx`

**Interfaces:**
- Consumes: the extended `propFirmStatus` (Task 8): `trailing`, `consistency`, `phase`.

> UI task — verified in the QA phase. READ the file first (already read in planning: it maps `propFirmStatus` to `RuleBar` rows).

- [ ] **Step 1: Add rows** for: trailing drawdown (`RuleBar` using `a.trailing.usedPct`, labeled with the model), consistency (only when `a.consistency != null`), a weekend-holding indicator, and a phase-progress block (profit target % of target + `daysDone/minDays`) using `a.phase`.

- [ ] **Step 2: Type-check + build**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/pnpm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/components/prop-firm-rules.tsx
git commit -m "feat(post6): dashboard shows trailing DD, consistency, weekend, phase progress"
```

---

### Task 11: Full verification + push

- [ ] **Step 1: Run the FULL suite**

Run (from `src/`): `./node_modules/.bin/vitest run`
Expected: all green (existing + new tests).

- [ ] **Step 2: Type-check + build + lint**

Run (from `src/`): `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/pnpm run build && ./node_modules/.bin/eslint .`
Expected: PASS.

- [ ] **Step 3: Push the branch (do NOT merge to main)**

```bash
git push origin feat/post6-prop-firm-rulebase
```

- [ ] **Step 4: Handoff for QA.** The prop-firm flows are now exercisable through the UI (preset picker → account → dashboard panel; ENFORCE lock on trade create). This is the input to the Playwright QA phase. Note the two things the user must confirm: (a) the firm numbers marked `-- VERIFY`, (b) resolve the CI e2e red (likely rotated Supabase anon key) before the QA run.

---

## Self-Review

**Spec coverage:**
- §3 snapshot approach → Task 9 (picker copies values; no FK) ✅
- §4.1 catalog table + RLS → Task 1 ✅
- §4.2 new Account fields → Task 1 + Task 7 ✅
- §4.3 dual migration → Task 1 ✅
- §5 four engine functions → Tasks 2-5 ✅
- §5 realized-equity limitation → documented in Task 2 docstring + Task 11 handoff ✅
- §6 WARN/ENFORCE reusing `locked` → Task 8 Step 7 ✅
- §6 mode as Account field (not Rule rows) → Task 7 ✅
- §7 UX (modal picker + dashboard) → Tasks 9-10 ✅
- §8 3 anchor firms, numbers VERIFY → Task 1 seed + Task 6 catalog ✅
- §9 TDD + full suite + replay → Tasks 2-6 TDD, Task 11 full suite; replay runs in CI ✅
- §10 YAGNI (no admin panel, no news rule, no live coupling) → not built ✅

**Placeholder scan:** Firm numbers are intentionally `-- VERIFY` (spec §8 makes the user the source of truth) — not a plan placeholder. Tasks 6/8/9 Step-1 "read first" instructions precede edits to large existing files whose exact current lines can't be pinned without reading; the edits themselves specify exact fields/behavior. No "add error handling"-style vagueness.

**Type consistency:** `PropFirmViolation` variants (`TRAILING_DRAWDOWN`, `MAX_DRAWDOWN`, `CONSISTENCY`, `WEEKEND_HOLDING`) defined in Tasks 2-4 and consumed in Task 8. `PhaseProgress` defined in Task 5, consumed in Task 8's `buildPropFirmExtras`. `ENFORCE_MODES` exported in Task 7, no other definition. `PropFirmPresetSeed` (Task 6) matches the migration columns (Task 1). `enforceMode` string `"WARN"|"ENFORCE"` consistent across Tasks 1/7/8/9.
