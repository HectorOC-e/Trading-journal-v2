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

## Sprint 0 — Fundaciones técnicas
**Objetivo:** preparar el terreno sin romper v2.
**Entregables:**
- Bus de dominio general (extiende `coach-bus.ts`): eventos `trade.*`, `insight.*`, `commitment.*`, `rule.fired`.
- Infra de jobs/scheduler (worker) para tareas periódicas.
- Carpeta `domains/analytics/longitudinal/` con `rollingWindow` (primitiva) + tests.
- Persistencia de `Insight` (tabla + migración) y `recomputeInsights` job (C8/#18).
**Riesgos:** introducir workers en el stack actual (CI/email only). **Mitigación:** worker mínimo, idempotente.
**Dependencias:** ninguna (raíz del DAG).
**Validación:** tests de `rollingWindow`; migración replay; insights se persisten y resuelven.

## Sprint 1 — Unificación de Reglas (C6) + plantillas de protección
**Objetivo:** un solo concepto "Regla" (enforce/warn) y protección de capital lista.
**Entregables:**
- Modelo `Rule` unificado (mode, conditions, actions, trigger); **migración** de `Rule`+`Automation` v2 sin pérdida.
- Badge enforce/warn en UI; plantillas: stop diario $, pérdida semanal, cool-down 2 pérdidas intradía, no-aumentar-tras-pérdida, energía<3 (#8, #11).
**Riesgos:** migración de datos duales. **Mitigación:** script idempotente + dry-run; conservar `Automation` hasta verificar.
**Dependencias:** S0.
**Validación:** migración replay; reglas v2 siguen disparando; bloqueo pre-trade intacto.

## Sprint 2 — Captura de trade v3 (C7)
**Objetivo:** alimentar los motores (psico no opcional silenciosa).
**Entregables:**
- Psico inline + nudge al cerrar sin emoción (#10); campos derivados sesión/riskPct (#27); checklist obligatorio por setup (E5.C3); auto-tagging IA de notas (#37); captura MAE/MFE + campo `regime` (#35, E5.C6).
**Riesgos:** fricción que reduzca registro. **Mitigación:** 1-tap, valores derivados pre-rellenados.
**Dependencias:** S0.
**Validación:** trades nuevos con psico/MAE/MFE; tests de derivación.

## Sprint 3 — Métricas institucionales (C4)
**Objetivo:** el cuadrante de riesgo que espera un prop.
**Entregables:**
- Max DD + DD actual + duración (#3); distribución de R (#19); Sortino/Calmar/Kelly rolling (#22); MAE/MFE analytics (#35); benchmark vs plan (#43); heatmap P&L (#26).
**Riesgos:** correctitud de fórmulas. **Mitigación:** tests con casos conocidos.
**Dependencias:** S0 (rolling), S2 (MAE/MFE).
**Validación:** unit tests de cada métrica; valores cuadran con cálculos manuales.

## Sprint 4 — Behavior Engine I (loop básico) — C5
**Objetivo:** insight→compromiso→verificación→refuerzo.
**Entregables:**
- `Commitment`, `CommitmentCheck`, `Reinforcement` (modelos+migración); `createCommitmentFromInsight`, `evaluateCommitment`, `reinforce`; `carryOverCommitments` para reviews (#5); UI `InsightCard`/`CommitmentCard`.
**Riesgos:** mapeo insight→métrica incompleto. **Mitigación:** empezar con 5 tipos de insight de alto valor.
**Dependencias:** S0 (insights persistidos), S3 (métricas para verificar).
**Validación:** crear compromiso desde insight; verificación marca kept/broken con evidencia; review muestra "¿cumpliste?".

## Sprint 5 — Behavior Engine II (regla↔compromiso) + sugerencias
**Objetivo:** cerrar insight→protección.
**Entregables:**
- `linkRule(commitment, template)`; `RuleSuggestion` + `suggestRulesFromInsights` (#14); CTA "Activar regla anti-revenge" en el insight (#4/#7-quickwin); evaluación continua para compromisos con regla enforce.
**Riesgos:** reglas auto-sugeridas erróneas. **Mitigación:** siempre requieren confirmación.
**Dependencias:** S1 (reglas unificadas), S4.
**Validación:** insight→regla en 1 clic; compromiso con regla se evalúa en cada trade.

## Sprint 6 — Coach v3 I: memoria + threads (C2)
**Objetivo:** el coach recuerda.
**Entregables:**
- `CoachThread`/`CoachMessage`/`CoachMemory` (persistencia); job de resumen+extracción de hechos; inyección de memoria + compromisos activos en el prompt; UI de memoria visible/editable.
**Riesgos:** coste de resúmenes. **Mitigación:** resumir solo al idle/cierre; presupuesto de tokens.
**Dependencias:** S4 (compromisos para referenciar).
**Validación:** nueva conversación referencia hechos/compromisos previos; memoria borrable.

## Sprint 7 — Coach v3 II: proactividad + intervención (C1)
**Objetivo:** intervenir en el momento del error.
**Entregables:**
- Worker proactivo sobre `trade.*` (deltas); detección en vivo (revenge/oversizing/cascada/DD); `Intervention` + `InterventionOverlay` (DS §10.4); refuerzos a HOY; write-tools con permiso (`propose_commitment/rule`) (#13).
**Riesgos:** intervención molesta/fatiga. **Mitigación:** 1 activa, cooldown, solo riesgo real; registrar respuesta.
**Dependencias:** S5 (compromisos/reglas a proponer), S6 (memoria), S0 (bus).
**Validación:** 3ª pérdida+oversizing dispara intervención ≤2s; aceptar crea regla; latencia y cooldown OK.

## Sprint 8 — Psicología v3 (E7)
**Objetivo:** psicólogo cuantitativo.
**Entregables:**
- Cascadas/tilt intradía (#16); calibración de confianza (#23); sesgos extra (#40); mood longitudinal; check-in pre-sesión que puede bloquear (#30).
**Dependencias:** S0 (rolling), S2 (captura), S7 (intervención usa cascada).
**Validación:** detección de cascada con caso sintético; curva de calibración; check-in rojo recomienda no operar.

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
