# CLOSURE_DESIGN.md
### Trading Journal v3.1 → cierre · Especificación del track de saldo de deuda

> **Qué es:** la spec que convierte la `AUDIT_FINAL.md` en trabajo accionable. Para cada gap define **qué falta**, **el enfoque** (reusando lo construido) y **criterios de aceptación**. El plan por sprints vive en `CLOSURE_SPRINT_PLAN.md`.
> **Principio:** cerrar la deuda **respetando el FREEZE** (citar IDs), reutilizando motores/superficies ya hechos. Nada nuevo "big bang"; cada pieza es aditiva, testeable (TDD) y verificable por UI.
> Fecha: 2026-06-27.

---

## 0. Alcance y filosofía
- **En alcance (bloquea cerrar v3):** los gaps 🟠 medios y 🟡 bajos de la auditoría §5 + la simplificación de memoria §6. Son **deuda de lo prometido**.
- **Roadmap, NO en alcance de cierre:** `POST-1..7` (§7 auditoría). Son **frontera reservada con disparador explícito**; force-construirlas ahora contradice su propia razón de diferir (sin tracción/datos/necesidad). Se documentan con su trigger; se abordan en v3.2+ cuando el disparador se cumpla.
- **Invariantes que ningún sprint de cierre rompe:** bloqueo pre-trade real, separación práctica/real, cifrado de credenciales, frontera anti-poisoning de memoria (FREEZE-D9), determinismo (P2), bandas/honestidad estadística (FREEZE-D15/16/17).

---

## 1. A1 — Bloqueo duro pre-trade por presupuesto diario (#17) · 🟠
**Falta:** S9 calcula el presupuesto de riesgo del día y S13 lo muestra como **señal**, pero **no impide** abrir trades cuando se agota (D9.3 lo aplazó a S13; S13 solo lo superfició).
**Enfoque (reusa infra, FREEZE-D8 / invariante de bloqueo):**
- El motor de reglas (`domains/rules/engine.ts`) ya bloquea pre-trade. Añadir un **verificador de presupuesto** que, en `trades.create`, consulte el `RiskBudget` (S9, `computeRiskBudget`) de la cuenta y, si `exhausted`, **bloquee** (mismo camino que una regla `enforce`), o **avise** si `usedPct ≥ θ`.
- Tras `account.dd_breach`/límite diario, reusar `Account.locked`/`lockReason` (ya existe `DAILY_LOSS_LIMIT`).
- Flag/umbral configurable por cuenta (no romper a quien no lo quiere).
**Aceptación:** un trade que supera el presupuesto diario se **bloquea pre-trade** (test de no-regresión que confirma que el bloqueo viejo sigue + el nuevo); verificado por UI en una cuenta de prueba; warn a `usedPct ≥ 0.8`. Determinista, ≤2s.

## 2. A2 — Superficie de transferencia (#31) + SRS (#45) · 🟠
**Falta:** backend S11 (`learningInsights.transfer`, `learning/srs.ts`) sin UI; `computeNextReview` no cableado a la mutación de review/grade.
**Enfoque:**
- Panel en `/aprendizaje` (recurso): tarjeta de **transferencia** (antes/después con banda + caveat D17) + señal de cadencia SRS (`reviewSooner`).
- Cablear `computeNextReview` en la mutación existente de calificar review (`learning-resources`/`study-sessions`): al graduar, reprogramar `nextReviewAt/reviewInterval` con el grade + la señal del setup vinculado.
**Aceptación:** el recurso muestra transferencia honesta (n + "asociación, no causa"); calificar un review reprograma el intervalo (más corto si el edge del setup decae). Verificado por UI.

## 3. B1/B2/B3/B4 — Historización (snapshots E18/E19 + insights persistidos) · 🟠/🟡
**Falta:** `ImprovementScore`(E19) y `SetupEdgeSnapshot`(E18) se calculan al vuelo → sin curva temporal; calibración/ruina/proyección no se historizan como Insight.
**Enfoque (reusa el cron existente `recompute-insights`, patrón pg_cron→pg_net):**
- Migración: tablas `improvement_scores` (E19: userId, date, score, drivers json) y `setup_edge_snapshots` (E18: setupId, date, wr, avgR, expectancy, n). RLS per-usuario.
- Job diario: persiste el score del día + snapshot de edge por setup. `getImprovement`/playbook leen la **serie** además del valor actual.
- `costOfIndiscipline` rolling (B3) sobre la serie. Calibración/ruina/proyección → `Insight` persistido con `stat` (B4) cuando hay base estadística (reusa `recompute-insights` + el wiring Bayesiano de S3).
**Aceptación:** la North Star muestra **curva "vs hace 3 meses"**; `EdgeEvolutionChart` puede leer snapshots; migración replay-desde-cero verde. Determinista.

## 4. C1 — Detectores de insight que faltan (revenge/oversizing/off-plan) · 🟠
**Falta:** los 4 verificadores existen (FREEZE-D7) pero solo algunos **detectores** generan los `Insight` que alimentan loop/feed (OI-4.8). El feed HOY y `behavior.openInsights` dependen de que el job los produzca.
**Enfoque:** añadir detectores deterministas en `recompute-insights` para revenge (rachas + revengeFlag), oversizing (riskPct > p90), off-plan (tags) → emiten `Insight` con `type` mapeable a verificador (canCommit) + `stat` cuando aplique.
**Aceptación:** tras correr el job, `behavior.openInsights` incluye los nuevos tipos con CTA "Comprometerme"; aparecen en el feed HOY priorizados. Determinista, con confianza/n.

## 5. A3 — Migración real de rutas a 5 superficies · 🟡
**Falta:** S12c reagrupa la nav tras flag, pero no hay rutas `/hoy /operar /mejorar /proteger /analizar` ni se absorbieron Dashboard/Notif/Mercados/Etiquetas.
**Enfoque (progresivo, FREEZE §2, sin perder dato):**
- Crear las 5 rutas como **shells** que componen las páginas existentes por superficie (HOY=dashboard+feed+notif; ANALIZAR=analytics+mercados+etiquetas; etc.), tras el mismo flag `v3Shell`. Las rutas v2 se conservan (redirect/alias) hasta paridad.
- Absorber **Notificaciones** en HOY (el feed ya existe), **Mercados/Etiquetas** en ANALIZAR (edges ya existen).
**Aceptación:** con el flag on, las 5 rutas existen y componen su contenido; flag off = v2 intacto; ninguna pantalla v2 pierde su valor. Verificado por UI.

## 6. A4 + misc reglas · 🟡
**Falta:** `/reglas` lista `automations`, no las `rules` del loop (OI-5.1); off-plan como regla "warn" (OI-5.2/8.2); plantillas extra (OI-5.3).
**Enfoque:** `/reglas` lee de `rules` (post-G2 ya es la fuente) y muestra enforce/warn + origen (compromiso/insight); plantilla "no-aumentar-tras-pérdida"/"energía<3" (gated por S2/S8, ya catalogadas); off-plan como `warn`.
**Aceptación:** `/reglas` muestra las reglas del loop con su origen; off-plan avisa.

## 7. C2/C3/C4/D1/D3 — Inteligencia incremental · 🟡
- **C2 (#40):** sesgos extra (disposition effect, anclaje) en `psychology-insights` (framework ya existe).
- **C3 (OI-13.1):** telemetría de "ignorado" del feed HOY → persistir interacciones (descartar/click) y alimentar `ignored` del modelo (hoy edad=proxy).
- **C4 (#28):** digest proactivo por email del feed HOY (reusa Resend/React Email del digest de aprendizaje).
- **D1 (OI-7.1):** write-tools del chat (`propose_commitment`/`propose_rule`) en el agente con confirmación (la capacidad ya existe vía paneles; faltan los tools agénticos). Requiere API key para verificar.
- **D3 (OI-7.3):** aprender `expectedImpact` desde `Intervention.outcome` (EV10).
**Aceptación:** cada uno con su test + verificación; D1 verificable solo con API key.

## 8. E1 — Memoria jerárquica de 4 capas (E13-E16) · ⚠️ arquitectura
**Falta:** se implementó **una** `CoachMemory` (candidate/confirmed) en vez de las 4 capas del FREEZE §6. **La frontera anti-poisoning (D9, lo irreversible) ya se respeta**; falta la **jerarquía**.
**Enfoque (aditivo, sin romper D9):**
- `MemoryEpisode` (E13, append-only + pgvector + saliencia/decay), `MemoryPattern` (E14, semántica con `supportEpisodeIds[]`), `MemoryIdentity` (E15, 1/usuario estructurado), `MemoryImprovement` (E16, reusa la serie de E19). Migrar `CoachMemory` confirmada → `MemoryPattern`/`MemoryIdentity` (P9: conservar original).
- `assembleCoachContext` pasa a leer las 4 capas con presupuesto (FREEZE-D10). El Memory Agent confirma semántica con N episodios deterministas (P6).
**Aceptación:** las 4 tablas existen con RLS; el contexto del coach se ensambla de las capas; D9 intacto (LLM propone, datos/usuario confirman); migración reversible. **Es el sprint más grande del track.**

---

## 9. POST-1..7 — Roadmap reservado (v3.2+, NO cierre)
Se documentan con su disparador; **no se construyen en el cierre** (premature):
`POST-1` realtime/SSE (si HOY necesita tiempo real) · `POST-2` coach multi-agente (regresión de prompt/coste) · `POST-3` cross-user moat (tracción + masa de datos) · `POST-4` régimen exógeno ATR (cuando el manual demuestre valor) · `POST-5` extracción del Cognitive Engine a servicio (cuando serverless no dé) · `POST-6` base prop-firm como activo (sprint dedicado) · `POST-7` A/B framework (tras edge decay/drift estables).

> **Regla:** cada POST requiere su mini-ADR al activarse. El cierre de v3 = terminar §1–§8.
