# CLOSURE_SPRINT_PLAN.md
### Trading Journal v3.1 → cierre · Plan por sprints (track de deuda)

> Convierte `CLOSURE_DESIGN.md` en sprints ejecutables (S15–S19). Mismo patrón que v3: dominio puro + TDD → servicio/router → superficie → verificación visual (Playwright vs preview) → merge. Cada sprint deja algo usable.
> **Cerrar v3 = terminar S15–S19.** `POST-1..7` = roadmap v3.2+ (§6), no bloquean el cierre.
> Validación por defecto: tsc + vitest + eslint verdes; migraciones replay-desde-cero (CI); verificación por UI.
> Fecha: 2026-06-27.

---

## Orden y dependencias
```
S15 (protección/loop) ─┐
S16 (historización) ───┼─► independientes entre sí (paralelizables)
S17 (aprendizaje/coach)┘
S18 (feed & rutas) ◄── usa S15/S16 (señales, snapshots)
S19 (memoria 4 capas) ◄── el más grande; usa E16 de S16
```
Orden recomendado serie: **S15 → S16 → S17 → S18 → S19** (riesgo/valor primero; memoria al final).

---

## Sprint 15 — Cerrar el loop de protección 🟠
**Objetivo:** lo prometido sobre protección/reglas, cableado de verdad.
**Entregables:**
- **A1** — verificador de **presupuesto diario** en `trades.create`: bloquea pre-trade si `RiskBudget.exhausted` (reusa engine de reglas + `Account.locked`), avisa a `usedPct ≥ θ`. Flag/umbral por cuenta. **Test de no-regresión del bloqueo.**
- **A4** — `/reglas` lee de `rules` (enforce/warn + origen compromiso/insight); **off-plan como `warn`**; plantillas extra catalogadas.
- **C1** (parte 1) — detector **revenge** (rachas + revengeFlag) en `recompute-insights` → `Insight` con CTA comprometerme.
**Dependencias:** S9 (budget), S1/G2 (rules), S4 (loop).
**Validación:** trade sobre presupuesto se bloquea (UI); `/reglas` muestra reglas del loop; el job produce insights de revenge.

## Sprint 16 — Historización & North Star longitudinal 🟠
**Objetivo:** las curvas temporales ("vs hace 3 meses", evolución de edge).
**Entregables:**
- **Migración** `improvement_scores` (E19) + `setup_edge_snapshots` (E18) + RLS.
- Job diario (cron existente): persiste score + drivers del día y snapshot de edge por setup.
- `improvement.overview` y `playbook.setup` devuelven la **serie**; `ImprovementPanel`/`EdgeEvolutionChart` la dibujan.
- **B3** coste de indisciplina rolling; **B4** calibración/ruina/proyección → `Insight` persistido (`stat`) vía recompute.
**Dependencias:** S14 (score), S10 (edge), S3 (Bayesiano), crons (#97).
**Validación:** curva de mejora visible; snapshots replay-desde-cero verde; insights con confianza/n poblados.

## Sprint 17 — Aprendizaje & coach completos 🟠
**Objetivo:** transferencia/SRS visibles y el coach que actúa con permiso.
**Entregables:**
- **A2** — panel transferencia (#31, banda + caveat) + señal SRS en `/aprendizaje`; cablear `computeNextReview` (#45) en la mutación de calificar review.
- **D1** — write-tools del chat (`propose_commitment`/`propose_rule`) en el agente con confirmación (no-op sin API key; verificación con key).
- **C2** (#40) — sesgos extra (disposition/anclaje) en `psychology-insights`.
- **D3** — aprender `expectedImpact` desde `Intervention.outcome` (EV10).
**Dependencias:** S11 (transfer/SRS), S6/S7 (coach), S8 (psicología).
**Validación:** recurso muestra transferencia; graduar reprograma intervalo; el coach propone con confirmación; nuevos sesgos detectados.

## Sprint 18 — Feed completo & migración real de rutas 🟡
**Objetivo:** HOY inteligente de verdad + las 5 superficies como rutas.
**Entregables:**
- **C3** — telemetría de "ignorado" del feed (persistir descartar/click → `ignored`); el modelo deja de usar solo edad.
- **C4** (#28) — digest proactivo por email del feed HOY (reusa Resend/React Email).
- **A3** — rutas `/hoy /operar /mejorar /proteger /analizar` (shells que componen lo existente, tras flag); absorber **Notificaciones** en HOY y **Mercados/Etiquetas** en ANALIZAR; v2 conservado hasta paridad.
**Dependencias:** S13 (feed), S12 (superficies/flag).
**Validación:** ignorar baja prioridad real; digest enviado; 5 rutas con flag on, v2 intacto con flag off.

## Sprint 19 — Memoria jerárquica de 4 capas (E13–E16) ⚠️
**Objetivo:** elevar `CoachMemory` a la jerarquía del FREEZE §6 sin romper D9.
**Entregables:**
- **Migración** `memory_episodes` (E13, pgvector+saliencia), `memory_patterns` (E14, `supportEpisodeIds[]`+status), `memory_identity` (E15, 1/usuario), `memory_improvement` (E16, reusa E19). RLS. Backfill no destructivo de `CoachMemory` confirmada (P9).
- Memory Agent (background): confirma semántica con **N episodios deterministas** (P6); identidad editable.
- `assembleCoachContext` lee las 4 capas con presupuesto de tokens (FREEZE-D10).
**Dependencias:** S6 (memoria base), S16 (E16=serie de mejora).
**Validación:** 4 tablas con RLS; contexto ensamblado de capas; **D9 intacto** (LLM propone, datos/usuario confirman); migración reversible; sin regresión del coach.

---

## Definición de "v3 cerrado"
1. S15–S19 mergeados a `main`, CI verde, verificados por UI.
2. `AUDIT_FINAL.md` actualizado: gaps 🟠/🟡 → resueltos; memoria 4 capas realizada.
3. Solo quedan abiertas las `POST-1..7` (roadmap v3.2 con disparador) — **no son deuda**.

## 6. POST-1..7 — Roadmap v3.2+ (fuera del cierre)
Cada una con su mini-ADR al activarse:
| POST | Disparador |
|---|---|
| 1 realtime/SSE | el feed HOY necesita tiempo real |
| 2 coach multi-agente | regresión de prompt / coste del monolito |
| 3 cross-user moat | tracción + masa de datos (`Intervention.outcome`/`Commitment.result`) |
| 4 régimen exógeno ATR | el régimen manual demuestra valor |
| 5 extracción a servicio | serverless no da para workers persistentes |
| 6 base prop-firm | sprint dedicado (activo/moat) |
| 7 A/B framework | edge decay/drift estables |
