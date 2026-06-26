# SPRINT_PLAN.md
### Trading Journal v3 — Plan de Sprints (cobertura 100% de la auditoría)

> Documento 7/8. Sprints de ~2 semanas. Cada sprint entrega **valor utilizable**. Validación por defecto en cada sprint: **tsc + vitest + eslint** verdes (límite de entorno local con `puppeteer-core`/build documentado), migraciones replay-desde-cero (CI `migrate-validate`), y revisión visual/E2E por el usuario.
> Orden detallado y DAG en `IMPLEMENTATION_ORDER.md`. Aquí: qué, por qué, riesgos, dependencias, validación.

---

## Visión por fases
- **Fase A — Cimientos (S0–S3):** primitivas que desbloquean todo (longitudinal, insights persistidos, unificación de reglas, captura). Sin esto nada longitudinal ni el loop existen.
- **Fase B — Núcleo (S4–S7):** Behavior Engine + Coach v3 (memoria, proactividad, intervención). El corazón del producto.
- **Fase C — Profundidad (S8–S11):** analítica institucional, riesgo/prop, psicología v3, playbook, transferencia.
- **Fase D — Superficies & pulido (S12–S14):** DS v3, las 5 superficies, onboarding, modelo de mejora, regímenes.

---

## Sprint 0 — Fundaciones técnicas ✅ EJECUTADO (v3.1.0)
**Objetivo:** preparar el terreno sin romper v2.
**Entregables (enmendados por ARCHITECTURE_FREEZE / ADR-001):**
- [x] **Bus de dominio server** construido nuevo en `domains/cognitive/events/` (NO "extiende `coach-bus.ts`" — ese es un helper cliente de 9 líneas). Outbox `domain_events` + dispatcher + catálogo `FREEZE-EV`.
- [x] Infra de jobs vía rutas cron (patrón existente `pg_cron→pg_net→/api/cron/*`): `recompute-insights`, `dispatch-events`.
- [x] Carpeta `domains/analytics/longitudinal/` con `rollingWindow` (primitiva) + tests.
- [x] Persistencia de `Insight` (tabla + migración) **con campos de confianza/n (ADR-002)** y `recomputeInsights` job (C8/#18).
**Riesgos:** introducir workers en el stack actual (CI/email only). **Mitigación:** worker mínimo, idempotente.
**Dependencias:** A0 (ADR-000..003) ✅.
**Validación:** ✅ 817/817 tests (25 nuevos), tsc+eslint verdes; ⏳ migración replay vía CI (límite local). Ver `TEST_REPORT_SPRINT_0.md`.

## Sprint 1 — Unificación de Reglas (C6) + plantillas de protección ✅ EJECUTADO (v3.1.0)
**Objetivo:** un solo concepto "Regla" (enforce/warn) y protección de capital lista.
**Entregables:**
- [x] Modelo `Rule` unificado (mode, trigger, conditions, actions, source links); **migración aditiva no destructiva** + backfill idempotente desde `Automation` (mode=enforce si hay BLOCK).
- [x] Badge enforce/warn en UI (`RuleModeBadge`, integrado en `app/reglas`); plantillas de protección (`PROTECTION_TEMPLATES`): stop diario, pérdida semanal, cool-down (#8, #11). `no-aumentar-tras-pérdida` y `energía<3` **catalogadas pero gated** (requieren campos de S2/S8 — sin enforcement falso).
- [x] Informe de no-mapeo (dry-run, read-only) para la revisión humana de **gate G2** (`migration-report.ts` + cron route).
**Riesgos:** migración de datos duales. **Mitigación:** backfill idempotente; `Automation` se conserva y **el motor sigue enforzando desde `Automation`** (cutover gated a G2).
**Dependencias:** S0.
**Validación:** ✅ 836/836 tests (+19, TDD), tsc+eslint verdes, **32/32 tests del motor de reglas sin regresión (bloqueo pre-trade intacto)**; ⏳ migración replay vía CI. Ver `TEST_REPORT_SPRINT_1.md`.
**Pendiente (gate G2, no parte de S1):** revisar el informe de no-mapeo y ejecutar el **cutover de enforcement** `Automation`→`Rule`.

## Sprint 2 — Captura de trade v3 (C7) ✅ EJECUTADO (v3.1.0)
**Objetivo:** alimentar los motores (psico no opcional silenciosa).
**Entregables:**
- [x] Campos derivados sesión/riskPct (#27, `trade-derivation.ts`); captura MAE/MFE + `regime` (#35, E5.C6) — columnas en `Trade` + inputs en `trades.create`.
- [x] Checklist obligatorio por setup (E5.C3, `evaluateChecklist`); auto-tagging determinista de notas (#37, `note-tag-suggester.ts`).
- [x] **Bucle de incentivo (DELTA D10)**: al capturar emoción, devuelve tu WR histórico con esa emoción (`emotion-feedback.ts`) + nudge al cerrar sin emoción (#10).
**Riesgos:** fricción que reduzca registro. **Mitigación:** valores derivados pre-rellenados; el dato devuelve valor en el mismo trade (D10).
**Dependencias:** S0.
**Validación:** ✅ 863/863 tests (+27, TDD); tsc+eslint verdes; migración aditiva (replay → CI). Ver `TEST_REPORT_SPRINT_2.md`.
**Pendiente (UI, verificación del usuario):** mostrar el incentivo/nudge y pre-rellenar derivados en el formulario; analítica de MAE/MFE es **S3**.

## Sprint 3 — Métricas institucionales (C4) ✅ EJECUTADO (v3.1.0)
**Objetivo:** el cuadrante de riesgo que espera un prop.
**Entregables:**
- [x] Max DD + DD actual + duración (#3/#34, `drawdown.ts`); distribución de R (#19, `r-distribution.ts`); Sortino/Calmar/Kelly rolling (#22, `risk-ratios.ts`); MAE/MFE analytics (#35, `mae-mfe.ts`); benchmark vs plan (#43, `benchmark.ts`); heatmap P&L (#26, `pnl-heatmap.ts`). Todo en `domains/analytics/institutional/`, puro y testeado.
- [x] **Estimador Bayesiano con shrinkage** (ADR-002 / FREEZE-D15, `institutional/stats/bayes.ts`): Beta-Binomial + Normal jerárquico + priors empíricos + intervalo creíble (cuantiles Beta reales).
- [x] **Wiring:** `Insight.confidence/credibleInterval/effectSize` (NULL desde S0) se rellenan para los detectores con base estadística (`stat`) → cierra R6 vía el cron `recompute-insights`.
**Riesgos:** correctitud de fórmulas. **Mitigación:** tests con casos conocidos (valores fijados a mano).
**Dependencias:** S0 (rolling, Insight), S2 (MAE/MFE).
**Validación:** ✅ 945/945 vitest (+63, TDD); tsc+eslint verdes (0 errores). Sin migración (analítica pura). Ver `TEST_REPORT_SPRINT_3.md`.
**Diferido a S12/S4:** superficies tRPC/UI del cuadrante + mapper DB→métricas (ver `OPEN_ITEMS_SPRINT_3.md`).

## Sprint 4 — Behavior Engine I (loop básico) — C5 ✅ EJECUTADO (v3.1.0)
**Objetivo:** insight→compromiso→verificación→refuerzo.
**Entregables:**
- [x] `Commitment`/`CommitmentCheck`/`Reinforcement` (modelos + migración `20260626120000`, anonimizables ADR-004).
- [x] Dominio puro (`domains/behavior/`): verificadores (FREEZE-D7), máquina de estados, `planReinforcement` (ratio variable).
- [x] Servicios: `createCommitmentFromInsight`, `evaluateCommitment`, `evaluateWindowCommitments` (cron), `carryOverCommitments` (#5). Eventos `commitment.*` en el outbox.
- [x] Router `behavior` + UI `BehaviorLoopPanel` (CTA "Comprometerme" / "estudiar"; tarjetas de compromiso) en `/analytics`.
**Riesgos:** mapeo insight→métrica incompleto. **Mitigación:** 4 verificadores de alto valor (revenge/intraday-decay/oversizing/off-plan); edge-decay → S10.
**Dependencias:** S0 (insights), S3 (verificadores consumen lógica determinista).
**Validación:** ✅ 961/961 vitest (+16, TDD); tsc+eslint verdes; loop verificado end-to-end en preview. Ver `TEST_REPORT_SPRINT_4.md`.
**Diferido (OPEN_ITEMS_SPRINT_4):** `linkRule`/sugerencias (S5), superficies HOY/Reviews (S12/S13), ImprovementScore (S14), scheduling de crons (ops).

## Sprint 5 — Behavior Engine II (regla↔compromiso) + sugerencias ✅ EJECUTADO (v3.1.0)
**Objetivo:** cerrar insight→protección.
**Entregables:**
- [x] `linkRule(commitment)` → crea `Rule` enforce (en `rules`, enforced live tras G2) + enlaza `commitment.ruleId` (`rule-suggestion-service.ts`); dominio puro `rule-linking.ts` (mapa metricKey→regla; off-plan→null por honestidad).
- [x] `RuleSuggestion` (E10, migración `20260626180000`) + `suggestRulesFromInsights` (#14) + accept/dismiss; CTA "Activar regla anti-X".
- [x] **Evaluación continua** para compromisos con regla enforce (`evaluateRuledCommitmentsOnTrade`, flag `early` — solo ruptura temprana; en `trades.create/close` best-effort).
- [x] UI: `BehaviorLoopPanel` += "Activar regla" + badge "protegido" + sección "Reglas sugeridas".
**Dependencias:** S1 (reglas unificadas, G2 flippeado), S4.
**Validación:** ✅ 967/967 vitest (+6, TDD); tsc+eslint verdes; cutover insight→regla verificado en prod. Ver `TEST_REPORT_SPRINT_5.md`.
**Diferido (OPEN_ITEMS_SPRINT_5):** reglas del loop en `/reglas` UI (S12), off-plan como warn (S8), plantillas extra (S8+).

## Sprint 6 — Coach v3 I: memoria + threads (C2) ✅ EJECUTADO (v3.1.0)
**Objetivo:** el coach recuerda.
**Entregables:**
- [x] `CoachThread`/`CoachMessage`/`CoachMemory` (migración `20260626200000`) con **frontera anti-poisoning** (ADR-003/D9: LLM propone candidatos, usuario confirma; solo confirmado se inyecta).
- [x] Inyección de **memoria confirmada + compromisos activos** en el prompt (`assembleCoachContext` → `streamCoachReply` memoryBlock); persistencia de threads (`appendExchange`).
- [x] UI de memoria **visible/editable/borrable** (`CoachMemoryPanel` en el drawer del coach, toggle 🧠).
**Dependencias:** S4 (compromisos).
**Validación:** ✅ 972/972 vitest (+5, TDD); tsc+eslint verdes; verificado en prod.
**Diferido (OPEN_ITEMS_SPRINT_6):** auto-extracción LLM de candidatos + proactividad/write-tools/check-in → **S7**; cifrado/opt-out de memoria → follow-up.

## Sprint 7 — Coach v3 II: proactividad + intervención (C1) ✅ EJECUTADO (v3.1.0)
**Objetivo:** intervenir en el momento del error.
**Entregables:**
- [x] Motor de intervención **determinista** (`domains/cognitive/intervention/engine.ts`): detectores (revenge/oversizing/cascada/DD) + scoring (§9) + cooldown/token-bucket/máx-1-activa + **override de capital** (D14).
- [x] `Intervention` (E11, migración `20260626220000`) + fast-path en `trades.close` (≤2s, sin LLM en el camino crítico, sin cambiar el contrato) + `InterventionOverlay` (mensaje + acción protectora + salida con fricción).
- [x] `respond`: aceptar → **crea regla enforce** protectora; descartar → outcome `overridden` (para aprender).
**Riesgos:** fatiga. **Mitigación:** 1 activa, cooldown, silencio por defecto; respuesta registrada.
**Dependencias:** S5 (reglas), S6 (memoria), S0 (bus).
**Validación:** ✅ 986/986 vitest (+14, TDD); tsc+eslint verdes; verificado en prod (cascada→overlay→aceptar crea regla).
**Diferido (OPEN_ITEMS_SPRINT_7):** write-tools del chat, auto-extracción LLM de memoria, aprendizaje de expectedImpact, refuerzos a HOY (S13).

## Sprint 8 — Psicología v3 (E7)
**Objetivo:** psicólogo cuantitativo.
**Entregables:**
- Cascadas/tilt intradía (#16); calibración de confianza (#23); sesgos extra (#40); mood longitudinal; check-in pre-sesión que puede bloquear (#30).
**Dependencias:** S0 (rolling), S2 (captura), S7 (intervención usa cascada).
**Validación:** detección de cascada con caso sintético; curva de calibración; check-in rojo recomienda no operar.

> ✅ **EJECUTADO (v3.1.0)** — calibración de confianza (#23, Bayesiano S3), check-in pre-sesión go/no-go (#30, E12 migración `20260626240000`), mood longitudinal (rolling C3). Dominio puro TDD + `PreSessionCheckin` + router `psychology` + `PsychologyV3Panel` en /psicologia. 1000/1000 vitest. Diferido: sesgos extra #40, check-in→regla stop. Ver `*_SPRINT_8.md`.

## Sprint 9 — Riesgo & Prop (E6)
**Objetivo:** quant de prop firm.
**Entregables:**
- Riesgo de ruina (#17); proyección de paso de fase (#15); presupuesto de riesgo/"trade máximo hoy" (#17); reset DD diario configurable (#38); correlación multi-cuenta (#39); política de retiros (#46); freeze agregado.
**Dependencias:** S3 (métricas), S1 (reglas para budget/freeze).
**Validación:** simulación de proyección con caso conocido; budget bloquea al superar.

## Sprint 10 — Playbook intelligence (E8)
**Objetivo:** edge real, no ruido.
**Entregables:**
- Edge decay por expectancy+significancia (#12); curva de evolución (#21); drift operado-vs-definido (#32); base de A/B de variantes (#50).
**Dependencias:** S0 (rolling/snapshots), S3.
**Validación:** decay no se dispara por varianza; drift marca dimensión correcta.

## Sprint 11 — Aprendizaje & transferencia (E9) + Edge instrumento/tags (E10)
**Objetivo:** medir que aprender sirve; absorber Mercados/Etiquetas.
**Entregables:**
- Transferencia edge antes/después (#31); SRS adaptado a rendimiento (#45); errores→tarjeta (#42); edge por instrumento + poda (#24, absorbe Mercados); tag analytics (#20, absorbe Etiquetas).
**Dependencias:** S3, S10.
**Validación:** transferencia reportada con n y etiqueta correlación; tabla de instrumento sugiere poda.

## Sprint 12 — Design System v3 + shell de 5 superficies (E12)
**Objetivo:** la app refleja cómo se mejora, no cómo se guardan datos.
**Entregables:**
- DS v3 (tokens evolucionados, componentes nuevos, estados coaching/intervention); shell de 5 superficies; command palette ⌘K; capa global de intervención; migración de rutas (Dashboard/Notif/Mercados/Etiquetas absorbidos).
**Riesgos:** romper hábitos de navegación. **Mitigación:** migración progresiva + onboarding guiado.
**Dependencias:** S7 (intervención), todo el contenido previo.
**Validación:** revisión visual/E2E; cada gráfico con CTA/insight (gate DS §12).

## Sprint 13 — HOY & notificaciones inteligentes (E11)
**Objetivo:** abrir la app y saber qué hacer hoy.
**Entregables:**
- Feed HOY unificado (absorbe Notificaciones) con priorización adaptativa (#36); digest proactivo (#28); señales tempranas (#44); `RiskBudgetMeter`.
**Dependencias:** S7, S9, S4.
**Validación:** orden de HOY correcto; alertas ignoradas bajan prioridad; críticas no.

## Sprint 14 — Modelo de mejora, regímenes & onboarding (E14, E13)
**Objetivo:** el relato de "eres mejor trader que hace 3 meses".
**Entregables:**
- ImprovementScore con drivers (#41); régimen + rendimiento por régimen (#33); coste de indisciplina temporal (#49); onboarding que activa motores día 1 (#48).
**Dependencias:** S4, S8, S10, S12.
**Validación:** score con descomposición; onboarding deja HOY con contenido real.

---

## Cobertura por sprint (verificación rápida)
| Crítico | Sprint |
|---|---|
| C1 | S7 | C2 | S6 | C3 | S0 | C4 | S3 | C5 | S4 | C6 | S1 | C7 | S2 | C8 | S0 |

Los 50 ítems quedan distribuidos S1–S14 según la matriz del PRD (§13). **Ningún ítem queda fuera del plan.**

---

## Definición de "Hecho" por sprint
1. Código + tests (tsc/vitest/eslint verdes).
2. Migración replay-desde-cero OK (si aplica).
3. Documentación de la feature.
4. Revisión visual/E2E por el usuario (límite local de build/Playwright documentado).
5. Métricas instrumentadas (telemetría del driver correspondiente).
6. Sin regresión en el bloqueo pre-trade ni en la separación práctica/real.
