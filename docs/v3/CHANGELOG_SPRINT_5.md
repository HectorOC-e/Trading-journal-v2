# CHANGELOG_SPRINT_5.md
### Trading Journal v3.1 — Sprint 5 (Behavior Engine II: regla↔compromiso + sugerencias)

> Estado: **completado** (dominio + schema + servicios + continuous-eval + tRPC + UI). Cierra `insight → compromiso → REGLA`.
> Principio: **romper un compromiso pasa de "medido" a "prevenido"** — una regla enforce lo bloquea en el momento de operar.
> Fecha: 2026-06-26 · Rama: `feat/v3-s5-behavior-rules`.

---

## 1. Resumen
S4 dejó el loop midiendo (insight→compromiso→verificación→refuerzo). S5 cierra el eslabón de **protección**: un compromiso se respalda con una **regla enforce** (BLOCK pre-trade) en 1 clic (`linkRule`), y los insights críticos generan **sugerencias de regla** ("Activar regla anti-X") aceptables/descartables. Además, los compromisos con regla se **evalúan en cada trade** (detección temprana de ruptura; la regla ya la previene).

## 2. Dominio puro (TDD) — `src/domains/behavior/rule-linking.ts`
- `proposeRuleForCommitment(metricKey)` → regla enforce (BLOCK) sobre campos que el motor SÍ evalúa pre-trade: `tradesPerDayBeyond2`→`tradesToday≥2`, `revengeTradesAfterLoss`→`minsSinceLastLoss<15`, `oversizedTrades`→`riskPct>umbral`. `offPlanTrades`→**null** (tag post-hoc, no prevenible → honestidad FREEZE-P3).
- `suggestRuleForInsight(insightType)` → `{proposedRule, reason}` | null. `canEnforce(metricKey)`.

## 3. Schema — migración `20260626180000`
- `RuleSuggestion` (E10): `userId, insightId?, proposedRule(json), reason, status(pending|accepted|dismissed), ruleId?`. RLS per-usuario. Aditiva. (`linkRule` reutiliza la tabla `rules` existente, que es la fuente de enforcement live tras G2.)

## 4. Servicios — `src/server/services/behavior/rule-suggestion-service.ts`
- `linkRule(commitmentId)`: crea `Rule` enforce (en `rules`, `sourceCommitmentId`/`sourceInsightId`) + enlaza `commitment.ruleId` (en transacción). `NotEnforceableError` si el metric no es prevenible.
- `suggestRulesFromInsights(userId)`: genera `RuleSuggestion` para insights críticos enforzables sin sugerencia pendiente (idempotente).
- `acceptRuleSuggestion` (materializa la regla) / `dismissRuleSuggestion`.
- **Continuous-eval** (`commitment-service.evaluateRuledCommitmentsOnTrade` + flag `early` en `evaluateCommitment`): en `trades.create`/`close` (post, best-effort) se re-mide cada compromiso activo con regla; solo termina si **ya está roto** (nunca premia "kept" antes de tiempo — eso es del job de cierre de ventana).

## 5. API + UI
- Router `behavior` += `linkRule`, `ruleSuggestions`, `generateSuggestions`, `acceptSuggestion`, `dismissSuggestion`.
- `BehaviorLoopPanel`: botón **"Activar regla"** en compromisos sin regla + badge **"protegido por regla"** (ShieldCheck); sección **"Reglas sugeridas"** con Activar/Descartar.

## 6. Invariantes
- No se materializa regla que no pueda enforzar (off-plan → null, no no-op falso).
- `linkRule`/accept crean la regla en `rules` → **enforced live** (G2 ya flippeado).
- Continuous-eval es best-effort y **nunca bloquea** la escritura del trade.

## 7. Lo que NO se hizo (diferido)
- ❌ Regla para `offPlanTrades` (no prevenible pre-trade) — quedaría como "warn"/aviso, no enforce.
- ❌ Plantillas adicionales (energía<3 → S8; no-aumentar-tras-pérdida → captura pendiente).
- ❌ Superficies ricas (las sugerencias/Activar regla también en HOY/insight panel nativo) → S12/S13.
- ❌ Mostrar las reglas creadas por el loop en `/reglas` UI (lee `automations`; las del loop viven en `rules`) → cohesión de superficies en S12.

## 8. Verificación
Ver `TEST_REPORT_SPRINT_5.md`: **967/967 vitest** (+6, TDD), tsc+eslint verdes. Verificación end-to-end del cutover insight→regla en prod.
