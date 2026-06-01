# SPRINT 1 RESOLUTION DECISIONS
> **Architecture Review Responses & Implementation Adjustments**
> Based on Interactive Survey Results
> Last Updated: 2026-05-31

---

## SURVEY RESPONSES & DECISIONS

### Decision 1.1: Function Signatures 🟢 APPROVED

**Response:** Adoptar target-architecture exactamente

**Implicación:**
- Cambiar todas las firmas de funciones en Sprint 1 plan para que coincidan con target-architecture
- Ejemplo: cambiar de `winRate(trades)` a `calcWinRate(wins, total)`
- Todos los call sites deben refactorizarse para pasar `wins` y `total` separadamente (no `trades` array)

**Acción requerida antes de código:**
1. Crear `SPRINT_1_FORMULA_SPEC.md` con firmas exactas de target-architecture
2. Documentar ejemplos de uso para cada función
3. Actualizar plan de implementación TASK-027 para usar estas firmas

**Riesgo mitigado:** 1.1 (Function Signature Mismatch)
**Dependencias clarificadas:** Alineación completa con Sprint 3+ profile backend

---

### Decision 1.2: Performance Baseline 🔴 CRITICAL - MUST DO

**Response:** Sí, medir antes de implementar (CRÍTICO)

**Implicación:**
- ANTES de empezar Sprint 1, ejecutar benchmark de KPI actual
- Medir tiempos de query en cuentas con: 10, 100, 500, 1000+ trades
- Si >500ms, agregar índice DB (userId, closedAt) INMEDIATAMENTE
- Documentar baseline en `SPRINT_1_PERFORMANCE_BASELINE.md`

**Acción requerida PRE-Sprint 1:**
```sql
-- Benchmark query (replace with actual KPI calculation)
EXPLAIN ANALYZE
SELECT COUNT(*) as total_trades,
       COUNT(CASE WHEN pnl > 0 THEN 1 END) as wins
FROM trades
WHERE user_id = 'test-user-id'
  AND closed_at IS NOT NULL;
```

**Success Criteria:**
- ✅ Query completes in <100ms for 10 trades
- ✅ Query completes in <500ms for 100 trades
- ✅ Query completes in <1s for 500+ trades
- ✅ If >1s, index applied and re-tested

**Riesgo mitigado:** 2.1 (KPI Query Performance Dependency), 1.5 (Analytics Cache Gap)
**Blocker para Sprint 1:** SÍ - No comienza hasta baseline medido

---

### Decision 1.3: Analytics Service Layer ⚠️ DEFERRED

**Response:** Decidir después

**Implicación:**
- NO crear stub de `analytics-service.ts` en Sprint 1
- Sprint 3 profile backend decidirá cómo integrar formulas
- RIESGO: Si profile backend llama formulas directamente, violará target-architecture
- ALTERNATIVA: Sprint 3 crea analytics-service después de que formulas están estables

**Acción requerida:**
1. Documentar en `SPRINT_1_DECISIONS.md` que analytic-service es pospuesto
2. Flag en Sprint 3 kickoff: "Decide analytics service integration approach"
3. Crear ADR (Architecture Decision Record) con razón del pospuesto

**Riesgo identificado:** 4.2 (Analytics Service Integration Gap) - DEFERRED
**Follow-up requerido:** Sprint 3 planeamiento DEBE incluir esta decisión

---

### Decision 1.4: Win Criterion 🟢 APPROVED

**Response:** `pnl > 0` (ganancias en dinero)

**Implicación:**
- Criterio canónico: Una operación es "win" si `pnl > 0` (hace dinero, no importa rMultiple)
- Todos los 9 sitios unificados a este criterio
- Trades con rMultiple indefinido pero pnl > 0 son WINS

**Acción requerida:**
```typescript
// SPRINT_1_FORMULA_SPEC.md
## Win Criterion Definition

**Canonical Criterion:** pnl > 0

export function isWin(trade: { pnl: number | null }): boolean {
  return (trade.pnl ?? 0) > 0
}

// Edge cases:
// - Trade with pnl = null: treated as 0 (loss)
// - Trade with pnl = 0: NOT a win (breakeven is loss)
// - Trade with pnl > 0, rMultiple = null: IS a win
```

1. Audit los 9 sitios antes de implementar
2. Documentar criterio actual en cada sitio
3. Plan migration para sitios con criterio diferente

**Riesgo mitigado:** 3.1 (Win-Rate Metric Shift), 1.4 (Win-Rate Scope Ambiguity)

---

### Decision 1.5: Drawdown Specification 🟢 APPROVED

**Response:** Especificar ahora en SPRINT_1_FORMULA_SPEC.md

**Implicación:**
- ANTES de implementar TASK-028 y TASK-029, decidir exactamente:
  1. ¿Peak-to-trough? (máxima caída desde cualquier peak)
  2. ¿Current drawdown? (caída del último peak al valor actual)
  3. ¿Display format? (porcentaje 0–100, decimal 0–1, o monto en $)

**Acción requerida:**
```typescript
// Example specification for peak-to-trough

/**
 * Calculate maximum peak-to-trough drawdown from equity curve.
 * 
 * @param pnlSequence - Array of cumulative P&L values over time
 * @returns Maximum drawdown amount (in points/dollars)
 * 
 * @example
 * Equity: [1000, 1200, 900, 1100]  // peak=1200, trough=900
 * Result: 300 (peak-to-trough)
 */
export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0, peak = 0, maxDd = 0
  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

/**
 * Convert max drawdown amount to percentage.
 * 
 * @param maxDdDollar - Max drawdown in dollars/points
 * @param initBal - Initial balance
 * @returns Drawdown as percentage (0–100)
 */
export function calcDrawdownPct(maxDdDollar: number, initBal: number): number {
  return initBal > 0 ? (maxDdDollar / initBal) * 100 : 0
}
```

1. Definir variant exacta (peak-to-trough RECOMENDADO)
2. Especificar formato display (percentage RECOMENDADO)
3. Documento side-by-side: old vs new
4. Test con 3+ cuentas de producción

**Riesgo mitigado:** 1.3 (Drawdown Variant Ambiguity), 3.2 (Drawdown Format Regression)

---

### Decision 1.6: TypeScript Interfaces 🔴 CRITICAL - MUST DO

**Response:** Sí, crear `lib/formulas/types.ts`

**Implicación:**
- ANTES de implementar TASK-027, crear archivo `lib/formulas/types.ts`
- Definir TODAS las interfaces que target-architecture especifica
- Documentar si porcentajes son 0–100 o 0–1
- Respetar "single source of truth" principle

**Acción requerida:**

```typescript
// src/lib/formulas/types.ts

/**
 * Input parameters for discipline score calculation.
 * Data sourced from Learning Resources and Rule Tracking tables.
 */
export interface DisciplineParams {
  totalTrades:       number   // Total trades in period
  taggedViolations:  number   // Trades tagged with FOMO, Off-plan, etc.
  pendingReviews:    number   // Learning resources pending SRS review
  completedReviews:  number   // Learning resources completed
  totalEnabledRules: number   // Total rules trader has enabled
  violatedRules:     number   // Rules trader violated
}

/**
 * Output from discipline score calculation.
 * All scores are 0–100 (percentage).
 */
export interface DisciplineBreakdown {
  score:          number   // Total discipline score (0–100)
  executionScore: number   // Execution score (0–50)
  learningScore:  number   // Learning score (0–30)
  adherenceScore: number   // Rule adherence score (0–20)
}

/**
 * Win rate output.
 * Percentage format (0–100) unless otherwise specified.
 */
export interface WinRateOutput {
  percentage:     number   // 0–100
  count:          number   // Number of wins
  total:          number   // Total trades
}

/**
 * Risk/reward metrics.
 */
export interface RiskRewardMetrics {
  rMultiple:      number | null   // R multiple of single trade
  avgR:           number          // Average R across trades (can be negative)
  expectancyR:    number          // Expected value in R terms
}

/**
 * Analytics aggregation output.
 * Serves as contract for routers and domain services.
 */
export interface AnalyticsOutput {
  kpis:            KpiSummary
  equityCurve:     EquityPoint[]
  pnlByDate:       DailyPnl[]
  patterns:        DetectedPattern[]
}

export interface KpiSummary {
  totalTrades:    number
  winRate:        number              // 0–100 (percentage)
  netPnl:         number
  avgR:           number
  profitFactor:   number
  expectancyR:    number
  sharpeRatio:    number | null
  maxDrawdownPct: number              // 0–100 (percentage)
  disciplineScore: DisciplineBreakdown
}
```

1. Crear archivo `lib/formulas/types.ts`
2. Define interfaces ANTES de implementar funciones
3. Documentar format de cada campo (porcentaje, decimal, monto, etc.)
4. Exportar desde `lib/formulas/index.ts`

**Riesgo mitigado:** 1.2 (Missing Interface Definitions), 4.1 (Formulas Type Safety Violation)
**Blocker para implementación:** SÍ - Tipos deben estar definidos

---

## REVISED SPRINT 1 CRITICAL PATH

Basado en decisiones tomadas, nuevo orden crítico:

### PRE-Sprint 1 (Antes de cualquier código)

**Día -3:**
1. ✅ Medir performance baseline de KPI query
2. ✅ Si >500ms, agregar índice DB
3. ✅ Auditar 9 win-rate sites (documentar criterio actual)

**Día -2:**
1. ✅ Crear `SPRINT_1_FORMULA_SPEC.md`
   - Firmas exactas de target-architecture
   - Drawdown variant exacta
   - Win criterion definido
   - Edge cases documentados
2. ✅ Crear `lib/formulas/types.ts`
   - Todas las interfaces de target-architecture
   - Documentar formatos (porcentaje 0–100, decimal 0–1, etc.)

**Día -1:**
1. ✅ Team review de spec y tipos
2. ✅ Clarify analytic-service integration approach
3. ✅ Crear `SPRINT_1_DECISIONS.md` (este archivo) en repo

### Sprint 1 Implementation (con decisiones aplicadas)

**Week 1:**
- TASK-027: Implement formulas with target-architecture signatures
- TASK-005: Unify 9 win-rate sites using spec
- TASK-028/029: Fix drawdown using spec variant

**Week 2:**
- TASK-001/009: Fix KPI pagination (usando performance baseline)
- TASK-054-003: Security hardening
- TASK-004/026: CSV import & error messages
- Integration & regression testing

---

## UPDATED RISK STATUS

| Risk ID | Title | Before | After | Status |
|---------|-------|--------|-------|--------|
| 1.1 | Function Signature Mismatch | 🔴 Critical | 🟢 Resolved | Adoptar target-architecture |
| 1.2 | Missing Interfaces | 🔴 Critical | 🟢 Resolved | Crear lib/formulas/types.ts |
| 1.3 | Drawdown Variant | 🟠 High | 🟢 Resolved | Especificar en FORMULA_SPEC |
| 1.4 | Win-Rate Scope | 🟠 High | 🟢 Resolved | Auditar + documentar |
| 1.5 | Analytics Cache Gap | 🟠 High | 🟡 Mitigated | Baseline medido primero |
| 1.6 | SQL Injection Fix | 🟡 Medium | 🟡 Medium | Sin cambios necesarios |
| 1.7 | Feature Flag Incompatibility | 🟡 Medium | 🟡 Medium | Sin cambios necesarios |
| 2.1 | KPI Query Performance | 🔴 Critical | 🟡 Mitigated | Baseline + posible índice |
| 2.2 | Domain Services | 🟡 Medium | ⚠️ Deferred | Sprint 3 decidirá |
| 2.3 | AI Config Schema | 🟠 High | 🟢 Mitigated | Formulas no dependen de AI config |
| 2.4 | Discipline Score Data | 🟡 Medium | ⚠️ TODO | Auditar campos DB |
| 2.5 | TypeScript Generation | 🟡 Medium | 🟢 Resolved | Documentar workflow |
| 3.1 | Win-Rate Metric Shift | 🔴 Critical | 🟡 Mitigated | Auditar + criterio explícito |
| 3.2 | Drawdown Format Change | 🟠 High | 🟢 Resolved | Especificar format ahora |
| 3.3 | CSV Import rMultiple | 🟡 Medium | 🟡 Medium | Plan migración históricas |
| 4.1 | Type Safety Violation | 🔴 Critical | 🟢 Resolved | Crear types.ts |
| 4.2 | Analytics Service Gap | 🔴 Critical | ⚠️ Deferred | Sprint 3 decidirá |

**Resumen:**
- 🔴 Critical: 7 → 2 (resolver en pre-Sprint)
- 🟠 High: 4 → 1 (resto mitigado)
- 🟡 Medium: 5 → 3 (deferred o mitigado)

---

## DELIVERABLES BEFORE SPRINT 1 STARTS

1. **SPRINT_1_FORMULA_SPEC.md** ← CRITICAL
   - Function signatures (target-architecture)
   - Drawdown variant definition
   - Win criterion specification
   - Edge cases & examples
   - Input/output formats

2. **lib/formulas/types.ts** ← CRITICAL
   - DisciplineParams, DisciplineBreakdown
   - WinRateOutput, RiskRewardMetrics
   - AnalyticsOutput, KpiSummary
   - All interfaces exported

3. **SPRINT_1_PERFORMANCE_BASELINE.md** ← CRITICAL
   - Query execution times (10, 100, 500, 1000+ trades)
   - Index strategy if needed
   - Caching decision (if >500ms)

4. **Database audit report** ← REQUIRED
   - Verify Discipline Score fields exist
   - Document any schema gaps
   - Plan migrations if needed

5. **Win-Rate site audit report** ← REQUIRED
   - List all 9 sites
   - Document current criterion in each
   - Plan migration for outliers

6. **SPRINT_1_DECISIONS.md** ← This file
   - Repository of decisions
   - Rationale for each decision
   - Follow-up requirements

---

## APPROVAL CHECKLIST

Before Day 1 of Sprint 1:

- [ ] Performance baseline measured (<1s confirmed OR index added)
- [ ] SPRINT_1_FORMULA_SPEC.md approved by team
- [ ] lib/formulas/types.ts created with all interfaces
- [ ] Win-rate sites audited (all 9 documented)
- [ ] Drawdown variant specified (format confirmed)
- [ ] Database audit complete (Discipline Score fields verified)
- [ ] SPRINT_1_DECISIONS.md reviewed and committed
- [ ] Analytics service approach documented (pospuesto para Sprint 3)
- [ ] Team trained on new formula signatures
- [ ] Risk status briefing completed

---

*End of SPRINT_1_RESOLUTION_DECISIONS.md*

**Status:** READY FOR APPROVAL
**Next Step:** Complete pre-Sprint 1 deliverables, then begin Sprint 1 implementation

