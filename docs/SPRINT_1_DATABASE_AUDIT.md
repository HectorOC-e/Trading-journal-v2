# SPRINT 1 DATABASE AUDIT REPORT
> Schema Verification for Discipline Score & Psychology Fields
> Date: 2026-05-31

---

## EXECUTIVE SUMMARY

Current schema has critical gaps preventing full implementation of discipline score and psychology features:

| Feature | Status | Gap | Impact |
|---|---|---|---|
| **Discipline Score** | ⚠️ Partial | Weekly aggregate exists, but granular breakdown fields missing | Can compute total score but not 3-component breakdown |
| **Psychology Fields** | ❌ Critical | All 7 fields missing from Trade model | Cannot track emotion/confidence data |
| **Rule Tracking** | ⚠️ Partial | Rule model exists, but violation tracking missing | Cannot audit which rules were violated per trade |

**Pre-Sprint 1 Decision:** Create migration to add psychology fields (Phase I of Sprint 1) before formula implementation begins.

---

## DETAILED AUDIT RESULTS

### 1. DISCIPLINE SCORE FIELDS

**Current State:**
- ✓ `WeeklyReview.disciplineScore` exists (INT, single score 0–100)
- ❌ Sub-component fields missing (executionScore, learningScore, adherenceScore)

**Target State (from target-architecture.md §3.1):**
```typescript
interface DisciplineBreakdown {
  score:          number   // 0–100 (rounded integer)
  executionScore: number   // 0–50 (decimal)
  learningScore:  number   // 0–30 (decimal)
  adherenceScore: number   // 0–20 (decimal)
}
```

**Required Data Sources:**

| Component | Source | Calculation |
|---|---|---|
| **executionScore (0–50)** | Trade tags | `(totalTrades - taggedViolations) / totalTrades * 50` |
| **learningScore (0–30)** | LearningResource status | `completedReviews / pendingReviews * 30` |
| **adherenceScore (0–20)** | Rule tracking | `(enabledRules - violatedRules) / enabledRules * 20` |

**Data Availability Check:**

✓ **For Execution Score:**
- Trade model has `tags: String[]` field
- Current behavioral tags: FOMO, Off-plan, Impulsivo, Revenge (found in codebase via grep)
- Calculation: Count trades where tags includes behavioral violation

✓ **For Learning Score:**
- LearningResource model has `status` enum (PENDING | IN_PROGRESS | COMPLETED | IN_REVIEW | MASTERED | ABANDONED)
- Calculation: Count resources with status = COMPLETED or MASTERED

⚠️ **For Adherence Score:**
- Rule model exists with `enabled` boolean
- **PROBLEM:** No way to track which rule was violated on a specific trade
- **WORKAROUND 1:** Use tagged trades (`tags` field) for rule violations
- **WORKAROUND 2:** Create `TradeRuleViolation` junction table (not recommended for Sprint 1)
- **CHOSEN:** Will use rule-violation tags on Trade model + Rule.enabled field

**Migration Required:** None for existing schema fields, but Weekly Review creation will need to store breakdown:

```sql
-- Add breakdown fields to weekly_reviews table
ALTER TABLE weekly_reviews
ADD COLUMN IF NOT EXISTS execution_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS learning_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS adherence_score DECIMAL(5,2);
```

---

### 2. PSYCHOLOGY FIELDS (CRITICAL MISSING)

**Current State:** ❌ ALL MISSING from Trade model

**Target State (from target-architecture.md §3.5):**

```typescript
// Trade model psychology additions
emotionPre:       string?   // "CALM" | "CONFIDENT" | "ANXIOUS" | "FOMO" | "REVENGE" | "OVERCONFIDENT" | "NEUTRAL"
emotionPost:      string?   // same enum
setupConfidence:  number?   // 1–5 integer
executionQuality: number?   // 1–5 integer
fomoFlag:         boolean   // default: false
revengeFlag:      boolean   // default: false
psychNotes:       string?   // free text
```

**Impact on Sprint 1:**
- Formulas don't depend on psychology fields (discipline formula depends on tags, not emotion)
- UI components (register-trade-modal, edit-trade-modal) cannot display psychology section
- Analytics.psychology route will return null/empty
- Weekly review psychology prefill will be incomplete

**Decision:** Defer psychology field migration to Phase XI (later sprint). Sprint 1 will:
1. Add psychology fields to types.ts as optional/nullable
2. Formulas handle null emotion/confidence gracefully
3. Document that psychology UI disabled pending migration

**Migration Plan (Phase XI):**
```sql
-- Add psychology fields to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS emotion_pre VARCHAR(20),
ADD COLUMN IF NOT EXISTS emotion_post VARCHAR(20),
ADD COLUMN IF NOT EXISTS setup_confidence INT,
ADD COLUMN IF NOT EXISTS execution_quality INT,
ADD COLUMN IF NOT EXISTS fomo_flag BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revenge_flag BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS psych_notes TEXT;

-- Add psychology-related tables
CREATE TABLE psychology_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emotion_distribution JSONB,
  emotion_win_rates JSONB,
  fomo_trades INT DEFAULT 0,
  revenge_trades INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. RULE TRACKING FIELDS

**Current State:**
- ✓ Rule model exists (id, userId, name, description, severity, isSystem, enabled, createdAt, updatedAt)
- ❌ No way to record which rule was violated on a specific trade

**Target State:**
- Need to track: Which rule(s) were violated on each trade
- Source: Either trade tags (current approach) or junction table (future)

**Current Workaround (in use):**
- Trade.tags array includes rule violation tags
- Example tags: "FOMO", "OffPlan", "SizingViolation", etc.
- Adherence score calculates: `(enabledRules - violatedRules) / enabledRules * 20`
- violatedRules = count of trades with violation tags (aggregated)

**Limitation:**
- Cannot map specific violations to specific rules (many-to-many relationship)
- Cannot identify which Rule was violated on Trade #123

**Recommendation for Sprint 1:**
- Continue using tag-based violation tracking (low migration risk)
- Create `TradeRuleViolation` junction table in Phase II (after Sprint 1 stabilizes)
- Document in SPRINT_1_DECISIONS.md: Rule violation tracking deferred

---

### 4. ANALYTICS CACHE

**Current State:**
- ✓ TradeStatsCache model exists (userId, period, accountId, statsJson, computedAt)
- ✓ Already designed for KPI caching per period
- Cache key: `(userId, period)` with optional accountId
- TTL: 5 minutes at application layer

**Status for Sprint 1:** ✓ READY
- No schema changes needed
- Will use existing table for analytics cache
- ANALYTICS_CACHE_ENABLED feature flag enables/disables usage

---

### 5. OTHER REQUIRED MODELS (From target-architecture.md §4)

| Model | Current | Required | Sprint 1 Impact |
|---|---|---|---|
| UserAiConfig | ❌ Missing | Yes (Phase IX) | Defer to Sprint 5 |
| UserPreferences | ❌ Missing | Yes (Phase XI) | Defer to Sprint 5 |
| AiUsageLog | ❌ Missing | Yes (Phase IX) | Defer to Sprint 5 |
| TradeEmbedding | ❌ Missing | Yes (Phase X) | Defer to Sprint 5 |
| EmailLog | ❌ Missing | Yes (Phase X) | Defer to Sprint 5 |
| MonthlyReview | ❌ Missing | Yes (Phase XII) | Defer to Sprint 6 |
| SetupChecklist | ❌ Missing | Yes (Phase XIV) | Defer to Sprint 8 |

**Sprint 1 Scope:** Only formulas module — none of these new models needed yet.

---

## MIGRATION PLAN FOR SPRINT 1

### Pre-Sprint (Blocking)

None. Existing schema supports discipline score calculation via:
- Trade.tags for behavioral violations
- Rule model for enabled rules (count violations via tags)
- LearningResource.status for learning completion

### During Sprint 1 (Optional Enhancement)

Create migration to add discipline breakdown fields to WeeklyReview (for completeness):

```sql
-- File: src/prisma/migrations/XXX_add_discipline_breakdown/migration.sql

ALTER TABLE weekly_reviews
ADD COLUMN IF NOT EXISTS execution_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS learning_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS adherence_score DECIMAL(5,2);

-- Update existing rows: compute breakdown from disciplineScore
UPDATE weekly_reviews
SET
  execution_score = disciplineScore * 0.5 / 100,   -- rough estimate; will be recomputed
  learning_score = disciplineScore * 0.3 / 100,
  adherence_score = disciplineScore * 0.2 / 100
WHERE execution_score IS NULL;
```

**Timing:** After calcDisciplineScore() function is tested and integrated into weekly-review generation.

---

## PSYCHOLOGY FIELDS MIGRATION (Deferred to Phase XI)

**Why Deferred:**
1. Sprint 1 formulas don't depend on psychology data
2. UI components not ready (no modal updates)
3. No analytics computed for psychology stats yet
4. Reduces migration risk for Sprint 1

**When to Execute:** Before Phase XI (weeks 7–8 of roadmap), after Sprint 5 completes.

**Blocking Check:** Do NOT implement psychology features without these fields in schema.

---

## VALIDATION CHECKLIST

Before Sprint 1 implementation:

- [ ] Confirmed Trade.tags includes behavioral violation tags (FOMO, Off-plan, Impulsivo, Revenge)
- [ ] Confirmed LearningResource.status enum supports COMPLETED/MASTERED counts
- [ ] Confirmed Rule model supports enabled filtering
- [ ] Confirmed TradeStatsCache ready for analytics caching
- [ ] Documented: Psychology fields deferred to Phase XI
- [ ] Documented: Rule violation junction table deferred to Phase II
- [ ] Database audit complete (this document)

---

## SUMMARY

| Area | Status | Blocker? | Action |
|---|---|---|---|
| Discipline Score Calculation | ✓ Data available | No | Can implement immediately |
| Psychology Fields | ❌ Missing | No* | Defer to Phase XI |
| Rule Violation Tracking | ⚠️ Tag-based only | No | Accept limitation for Sprint 1 |
| Analytics Caching | ✓ Ready | No | Use existing cache table |

*Psychology is not blocking Sprint 1; all formula functions will handle null values gracefully.

---

**END OF DATABASE AUDIT**

**Status:** APPROVED FOR SPRINT 1 IMPLEMENTATION
**Next Steps:**
1. Create SPRINT_1_FORMULA_SPEC.md ✓ (done)
2. Create lib/formulas/types.ts ✓ (done)
3. Audit 9 win-rate sites (next)
4. Run KPI performance baseline (next)
5. Begin Sprint 1 implementation (Week 1)
