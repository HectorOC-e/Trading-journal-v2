# REHYDRATION_REPORT.md
### Trading Journal v3 — Reconstrucción de contexto

> Documento de rehidratación. No implementa nada. Reconstruye el estado completo del sistema a partir de:
> la auditoría vinculante (`docs/auditoria-producto-trading-journal-v2.md`), los 8 documentos maestros de `docs/v3/`,
> y una **lectura del código real** (`src/`) para separar lo documentado de lo construido.
> Fecha: 2026-06-25 · Rama: `feat/v3-master-plan`.

---

## 0. Estado de la documentación (qué existe de verdad)

| Documento | Existe | Rol |
|---|---|---|
| `auditoria-producto-trading-journal-v2.md` | ✔ | Fuente de verdad vinculante (C1–C8, 11 módulos, 50 ítems ROI, R1–R6) |
| `v3/PRODUCT_MASTER_PLAN.md` | ✔ | AS-IS/TO-BE, 5 superficies, dominio futuro, brechas, riesgos |
| `v3/MASTER_PRD.md` | ✔ | 14 Epics → Capabilities → User Stories → AC + matriz de cobertura |
| `v3/DESIGN_SYSTEM_V3.md` | ✔ | Tokens, motion, estados, componentes nuevos, gate de UI |
| `v3/AI_COACH_V3.md` | ✔ | Memoria, proactividad, intervención, write-tools, NFR |
| `v3/ANALYTICS_V3.md` | ✔ | Longitudinal, institucional, edge/drift, riesgo/prop, mejora |
| `v3/BEHAVIOR_ENGINE_V3.md` | ✔ | El loop: Insight→Compromiso→Regla→Verificación→Refuerzo |
| `v3/SPRINT_PLAN.md` | ✔ | Sprints S0–S14, 100% cobertura |
| `v3/IMPLEMENTATION_ORDER.md` | ✔ | DAG, ruta crítica, gates G1–G6 |
| `ARCHITECTURE_CHALLENGE.md` | ✔ (este entregable) | Desafío crítico |
| `ROADMAP.md` (docs/) | ✔ pero **v2** | Roadmap legado, no v3 |
| `DECISIONS.md` / ADRs | ✖ | **No existen.** Las decisiones de raíz viven sólo en `v3/README.md` §"Decisiones de raíz" |

**Implicación:** no hay registro de decisiones arquitectónicas (ADR). Las 4 decisiones de raíz aprobadas (2026-06-25) están en prosa, sin alternativas descartadas ni reversibilidad. Esto es una deuda de gobernanza que el Architecture Challenge retoma.

---

## 1. Visión del producto

**Qué es Trading Journal v3.**
La evolución de un *journal de élite con analítica determinista* (v2) hacia una **"capa cognitiva sobre el broker"**: un sistema que no sólo *registra* trades, sino que **cambia el comportamiento del trader** mediante un loop cerrado y verificado.

**Qué problema resuelve.**
El problema central diagnosticado en la auditoría, en una frase: *el sistema es reactivo, episódico y sin memoria*. Registra mucho y cambia poco. La distancia entre lo que el sistema **sabe** (18 detectores deterministas) y lo que el trader **hace distinto** es el producto que falta. v3 invierte la unidad de valor:

> v2: "el trade guardado" → v3: **"el cambio de comportamiento verificado"**.

**Pregunta de validación única** (aplicada a cada feature): *¿esto aumenta la probabilidad de que el trader gane dinero, preserve capital, mejore disciplina o acelere aprendizaje?* Si no → eliminar/rediseñar/absorber.

**Estado final deseado (TO-BE).**
- **5 superficies cognitivas** (HOY, OPERAR, MEJORAR, PROTEGER, ANALIZAR) en lugar de 11 pestañas de datos.
- **2 subsistemas transversales** que son el verdadero núcleo: **AI Coach v3** (memoria + proactividad + acción) y **Behavior Engine** (el loop).
- Un coach que pasa de **Útil** a **Profesional/Elite**: interviene en el momento del error, recuerda, y actúa con permiso.
- North Star: *% de traders con mejora verificada de disciplina y expectancy a 90 días.*

**Anti-alcance explícito:** no es un EMS (no ejecuta órdenes), no da señales de mercado, no es social/copy-trading, no backtesta estrategias de mercado. *Mejora al trader, no sustituye su criterio de mercado.*

---

## 2. Hallazgos heredados (auditoría) — estado de cobertura

La auditoría definió 8 críticos (C1–C8). Distingo **cubierto en diseño** (hay spec + Epic + sprint) de **cubierto en código** (existe implementación). **Nada de v3 está construido todavía** — el repo está en fase de diseño. Por tanto "cubierto" abajo significa *cubierto a nivel de especificación*.

| # | Hallazgo crítico | Cobertura en diseño | Estado real en código | Riesgo de cierre |
|---|---|---|---|---|
| **C1** | Coach reactivo puro (sin iniciativa) | **Cubierto** (E2.C2, S7, AI_COACH §4) | **No iniciado** | **Alto** — depende de infra de eventos que no existe |
| **C2** | Sin memoria entre conversaciones | **Cubierto** (E2.C1/C8, S6, AI_COACH §3) | **No iniciado** (chat efímero) | Medio |
| **C3** | Sin análisis longitudinal / ventanas rodantes | **Cubierto** (E3, S0 `rollingWindow`, ANALYTICS §1) | **No iniciado** | Bajo — es trabajo determinista acotado |
| **C4** | Métricas institucionales ausentes | **Cubierto** (E4, S3) | **No iniciado** (sólo Sharpe + PF hoy) | Bajo-medio (necesita MAE/MFE captura → S2) |
| **C5** | Loop de reviews no se cierra | **Cubierto** (E1, S4, BEHAVIOR §4.6) | **Parcial** — sólo *commitments mensuales* se arrastran hoy | Medio |
| **C6** | Dualidad Reglas vs Automatizaciones | **Cubierto** (E6.C1, S1) | **No iniciado** — `Rule` y `Automation` coexisten en schema (líneas 287 y 342) | **Alto** — fusión semántica + migración de datos |
| **C7** | Captura psicológica opcional → motores ciegos | **Cubierto** (E5, E7.C5, S2) | **No iniciado** — `emotionBefore`/`confidenceRating` siguen opcionales | Medio (riesgo de fricción) |
| **C8** | Insights no se historian ni accionan | **Cubierto** (E1.C6, S0, ANALYTICS §12) | **No iniciado** — se recalculan por request | Bajo |

**Clasificación pedida:**
- **Cubiertos (en diseño, sin huecos): C2, C3, C8** — son trabajo determinista/persistencia acotado.
- **Parcialmente cubiertos: C1, C5, C6, C7** —
  - C1: la *capacidad* está especificada pero **la infraestructura de ejecución no** (ver §5 y Challenge §2).
  - C5: el loop está diseñado pero el mapeo `insight→métrica verificable` está reconocido como incompleto ("empezar con 5 tipos").
  - C6: la fusión está descrita como "sin pérdida" pero los dos modelos **no mapean 1:1** semánticamente.
  - C7: depende de no introducir fricción que mate el registro (riesgo R2 reentra).
- **Aún no resueltos de verdad (riesgo abierto):** ninguno queda *fuera* del plan, pero los hallazgos cuyo **cierre real es dudoso** son C1 (infra), C6 (migración semántica) y los ítems estadísticos del top-50 (#12, #15, #17, #23, #33, #41) cuyo rigor cuantitativo es frágil a tamaños de muestra retail (ver Challenge §1 y §3).

> Cobertura documental: la matriz del PRD §13 garantiza que **C1–C8, #1–#50, módulos 3.1–3.11, R1–R6 y oportunidades** tienen Epic. La trazabilidad *en papel* es completa. El riesgo no es de cobertura, es de **profundidad de ejecución** en 3–4 puntos.

---

## 3. Arquitectura objetivo (TO-BE)

### 3.1 AI Coach v3
Dos caminos:
- **PULL (chat):** como hoy pero con memoria persistente, contexto longitudinal por defecto y **write-tools con permiso** (`propose_commitment`, `propose_rule`, `schedule_checkin`, `create_study_card`, `mark_review_ready`).
- **PUSH (proactivo):** un *worker* suscrito a eventos de dominio que opera **sobre deltas**, corre los detectores deterministas sobre la ventana del día, y decide: **intervenir** (overlay, riesgo real), **reforzar** (HOY feed) o **callar** (silencio por defecto).
- Niveles: Útil (hoy) → **Profesional** (+memoria +iniciativa +acción) → **Elite** (+aprende tu patrón y lo previene, vía E14).
- Invariante: **el LLM narra, no calcula**; todo número viene de Analytics determinista. El coach nunca escribe sin confirmación explícita.

### 3.2 Analytics v3
- **Primitiva fundacional:** `rollingWindow(series, {size, step, agg})` — base de TODO lo longitudinal (resuelve C3).
- **Institucional:** max DD + duración, distribución de R, MAE/MFE, Sortino/Calmar/Kelly rolling, heatmap P&L.
- **Edge:** decay por expectancy + significancia (no sólo WR), curva de evolución, **drift** (operado vs definido).
- **Riesgo/Prop:** riesgo de ruina (Monte Carlo), proyección de paso de fase, presupuesto de riesgo del día, correlación multi-cuenta.
- **Régimen:** proxy interno (v3.0) → datos reales de volatilidad (v3.1).
- **ImprovementScore:** índice compuesto rolling con descomposición de drivers.
- Organización: `domains/analytics/{longitudinal,institutional,setups,psychology,regime,risk,instrument,tags,improvement,insights}`.

### 3.3 Behavior Engine (el núcleo — "esto es el producto")
Cadena: **INSIGHT → COMPROMISO → REGLA → SEGUIMIENTO → VERIFICACIÓN → REFUERZO**, donde el refuerzo recalibra el siguiente insight.
- Entidades: `Insight` (persistido), `Commitment`, `CommitmentCheck`, `Rule` (unificado), `RuleSuggestion`, `Reinforcement`.
- Máquina de estados del compromiso: ACTIVE → {KEPT, PARTIAL, BROKEN, EXPIRED} → feed al ImprovementScore.
- Servicios clave: `createCommitmentFromInsight`, `linkRule`, `evaluateCommitment`, `reinforce`, `suggestRulesFromInsights`, `carryOverCommitments`.
- Invariantes: ningún insight sin CTA; ningún compromiso sin verificación; verificación **objetiva** (datos, no opinión); el refuerzo **siempre** ocurre.

### 3.4 Rules Engine (unificado — PROTEGER)
- Fusión `Rule` + `Automation` → un único `Rule { mode: 'enforce'|'warn', trigger, conditions, actions, sourceCommitmentId?, sourceInsightId? }`.
- Conserva el **bloqueo pre-trade real** (invariante de no-regresión).
- Plantillas de protección de capital: stop diario $, pérdida semanal, cool-down 2 pérdidas intradía, no-aumentar-tras-pérdida, energía<3.
- Puente **detección→protección**: `RuleSuggestion` desde insights críticos.

### 3.5 Memory System (subsistema del coach)
- `CoachMemory { kind: 'fact'|'preference'|'summary'|'trait', content, confidence, expiresAt? }`, `CoachThread`, `CoachMessage`.
- Ciclo: al cerrar/idle un thread, un job (LLM) genera **resumen** y extrae **hechos/preferencias**. Al iniciar conversación, se inyectan hechos relevantes + compromisos activos + resumen previo.
- **Visible y editable** por el trader (privacidad/transparencia). Cifrado en reposo, borrable.
- *(Nota: el plan trata esto como memoria plana de 4 tipos. El Challenge §5 propone elevarla a una memoria jerárquica episódica/semántica/identidad/mejora.)*

### 3.6 Intervention System
- Worker proactivo → si dispara crítico en vivo (revenge 2ª/3ª pérdida, **cascada/tilt**, oversizing, acercamiento a DD diario) → `InterventionOverlay` (DS §10.4, elevación e4, backdrop blur).
- Reglas: **máx 1 intervención activa**, cooldown, copy directo+empático, **2 acciones máximo**, las críticas de capital nunca se suprimen.
- Registra `Intervention { trigger, severity, shownAt, response, outcome }` para aprendizaje y para el ImprovementScore.
- *(El plan define la UX de intervención y el "cuándo". El Challenge §6 propone el motor de scoring formal — prioridad/severidad/urgencia/confianza/impacto — que el plan no formaliza.)*

### 3.7 Learning System
- Absorbe Aprendizaje en MEJORAR con **transferencia medida**: edge del setup antes/después de dominar un recurso (etiquetado como correlación, con n).
- SRS adaptado al rendimiento real (un setup que empeora adelanta su repaso).
- Errores recurrentes → tarjeta de estudio automática.

---

## 4. Estado de implementación por iniciativa

> Leyenda: **No iniciada** / **Parcial** (existe base en v2 reutilizable) / **Completada**. *Ninguna iniciativa v3 está Completada — el repo está en fase de diseño.*

| Iniciativa | Estado | Base reutilizable en código (v2) |
|---|---|---|
| `rollingWindow` + longitudinal (S0) | **No iniciada** | Sólo Playbook usa ventana fija de 20 |
| Persistencia de `Insight` (S0) | **No iniciada** | `insights-engine.ts`/`psychology-insights.ts` calculan en memoria |
| Bus de dominio + jobs (S0) | **No iniciada** | `coach-bus.ts` = **helper cliente de 9 líneas** (no es un bus); cron vía `pg_cron→pg_net→/api/cron/*` |
| Unificación Rule/Automation (S1) | **No iniciada** | `Rule` (L287) + `Automation` (L342) coexisten; `domains/rules/engine.ts` funciona |
| Captura de trade v3 (S2) | **No iniciada** | `Trade` tiene `emotionBefore`/`confidenceRating`; **sin** MAE/MFE/regime/riskPct |
| Métricas institucionales (S3) | **Parcial (base)** | `dashboard-analytics.ts` tiene Sharpe/PF/equity; falta el resto |
| Behavior Engine I/II (S4–S5) | **No iniciada** | `monthly-goals.ts` arrastra commitments mensuales (semilla conceptual) |
| Coach memoria + threads (S6) | **No iniciada** | `coach-service.ts`/`coach-agent.ts`/`coach-tools.ts` (10 tools read-only) |
| Coach proactivo + intervención (S7) | **No iniciada** | Ninguna — no hay worker ni canal push |
| Psicología v3 (S8) | **Parcial (base)** | 6 detectores deterministas existentes |
| Riesgo & Prop (S9) | **No iniciada** | `buildPropFirmStatus` (estado, no proyección) |
| Playbook intelligence (S10) | **Parcial (base)** | `calcSetupHealth` + sugerencias WR-last-20 |
| Aprendizaje/transferencia + instrumento/tags (S11) | **No iniciada** | SRS + vínculo recurso→setup; `Market`/`Tag` models |
| DS v3 + 5 superficies (S12) | **No iniciada** | Tokens en `globals.css`, `command-palette` semilla, `shell-with-rail` |
| HOY & notificaciones (S13) | **No iniciada** | `Notification` model + centro de eventos |
| ImprovementScore/régimen/onboarding (S14) | **No iniciada** | `components/onboarding/` semilla |

**Resumen:** 0 completadas · 4 parciales (base v2 aprovechable: S3, S8, S10, y C5 parcial) · 11 no iniciadas.

---

## 5. Dependencias (mapa técnico)

### 5.1 Ruta crítica (del plan)
```
S0 ▶ S4 ▶ S5 ▶ S6 ▶ S7 ▶ S12 ▶ S13 ▶ S14
(primitivas → loop → regla↔compromiso → memoria → proactividad → superficies → HOY → mejora)
```

### 5.2 Dependencias fundacionales reales (lo que TODO necesita)
```
rollingWindow ─┐
Insight persist ┼─→ Behavior Engine ─→ Coach proactivo/intervención ─→ HOY feed
Bus + jobs ─────┘                  └─→ Reviews loop cerrado
Fusión Rule/Automation ─→ linkRule (compromiso↔regla)
Captura psico/MAE/regime ─→ detectores ricos ─→ verificación de compromisos
Métricas institucionales ─→ risk/prop ─→ presupuesto de riesgo
DS v3 ─→ 5 superficies (se integra al final, envuelve capacidades reales)
```

### 5.3 Dependencias **ocultas / infra** que el plan subdimensiona
Estas no están en el DAG del plan y son las que más condicionan el cierre de C1:

1. **Runtime de ejecución de eventos.** No existe. El "bus" documentado es un `window.dispatchEvent` cliente. Un bus de dominio **in-process** en Next.js serverless no sobrevive entre requests/instancias → se necesita un patrón **outbox + Postgres LISTEN/NOTIFY o cola** (decisión no tomada).
2. **Canal de entrega push.** No hay websockets ni Supabase Realtime. La intervención "≤2s" sólo puede entregarse **síncronamente en la respuesta de la mutación `trade.create`** o por polling. El plan asume push sin canal.
3. **Scheduler.** Hoy = `pg_cron` horario → HTTP `/api/cron/*` (`maxDuration=300`). Sirve para digests batch, **no** para verificación continua ni intervención en vivo.
4. **Caché incremental de `buildTraderContext`** (~12 queries/request) — prerrequisito de coste para proactividad y memoria. Es NFR en el plan, no sprint con entregable.

> **Conclusión de dependencias:** la ruta crítica del *valor* (S0→S4→S5) es sólida y determinista. La ruta crítica del *diferenciador* (S6→S7, el coach proactivo) descansa sobre infra de eventos/entrega que **no está planificada como entregable propio**. Esto es el hallazgo #1 de §6.

---

## 6. Riesgos de implementación

| ID | Riesgo | Severidad | Evidencia / razón |
|---|---|---|---|
| **RI-1** | **C1 (proactividad/intervención) carece de infra de eventos y push.** S0 reduce "worker/scheduler" a un bullet; no hay bus server, ni cola, ni canal realtime. | **Crítico** | `coach-bus.ts` = helper cliente; sólo cron HTTP horario; sin websockets |
| **RI-2** | **Fusión Rule/Automation no es 1:1.** Son dos modelos con semánticas distintas (descriptivo vs ejecutable); "sin pérdida" es optimista. | Alto | Schema L287 vs L342; gate G2 reconoce el riesgo pero S1 = 1 sprint |
| **RI-3** | **Rigor estadístico frágil a n retail.** t-test/Mann-Kendall/calibración/ruina sobre 20–200 trades + ~20 detectores rolling = falsos positivos (look-elsewhere). Reintroduce R6. | Alto | Ver Challenge §1, §3 |
| **RI-4** | **Coste/latencia IA.** Proactividad + resúmenes de memoria + narración por trade escalan con volumen×usuarios. "Presupuesto de tokens con degradación elegante" es una frase, no un diseño. | Alto | NFR sin entregable; `buildTraderContext` ~12 queries |
| **RI-5** | **Memoria del coach poisoning.** Hechos extraídos por LLM se inyectan como verdad en prompts futuros; sin verificación, error compuesto a 5 años. | Medio-alto | AI_COACH §3.2; sólo columna `confidence` |
| **RI-6** | **Régimen v3.0 es circular.** Proxy derivado del propio P&L confunde régimen con rendimiento. | Medio | ANALYTICS §7; datos reales diferidos a v3.1 |
| **RI-7** | **Sobre-intervención → evasión.** Bloquear/nombrar fallos puede generar rechazo; el trader desactiva enforce o deja de registrar (R2 por otra puerta). | Medio-alto | Modelo de refuerzo binario; sin teoría de autonomía |
| **RI-8** | **Re-arquitectura de nav sobre Next.js fork interno.** Shell de 5 superficies + ⌘K + overlay global en un Next.js con APIs alteradas. | Medio | `src/AGENTS.md`: "This is NOT the Next.js you know" |
| **RI-9** | **Pseudo-causalidad en transferencia/ImprovementScore.** Pre-post sin control; confundido por régimen/tiempo/mean-reversion. | Medio | E9.C1, E14; R6 explícito en la auditoría |
| **RI-10** | **Alcance.** 15 sprints, ~13 entidades nuevas sobre 28 modelos / 56 migraciones; el núcleo (S4–S7) es el más arriesgado y está a mitad de la ruta. | Medio | SPRINT_PLAN; schema actual |
| **RI-11** | **Sin ADRs / gobernanza de decisiones.** Decisiones de raíz en prosa, sin alternativas ni reversibilidad documentada. | Bajo-medio | No existe `DECISIONS.md` |
| **RI-12** | **Privacidad: perfil psicológico inferido → procesadores LLM externos.** CoachMemory/check-ins viajan a Anthropic/OpenAI/OpenRouter cada request. | Medio | AI_COACH §12 menciona cifrado en reposo, no el flujo a terceros |

---

## 7. Próximo paso recomendado

**Ejecutar Sprint 0 — Fundaciones técnicas**, pero con un **alcance corregido** respecto al plan, porque tal como está S0 oculta la dependencia más cara (infra de eventos).

**Recomendación concreta (qué hacer literalmente después):**

1. **No saltar a código aún.** Antes de S0, cerrar **dos decisiones de arquitectura (ADR)** que el plan da por hechas y que condicionan todo lo demás:
   - **ADR-001: Runtime de eventos y entrega.** ¿Outbox + LISTEN/NOTIFY? ¿Cola (pg-boss)? ¿Intervención síncrona en la mutación `trade.create` vs push? Esto define si C1 es viable y cuánto cuesta. **Es la decisión bloqueante real.**
   - **ADR-002: Estrategia estadística.** Frecuentista (t-test/Mann-Kendall) vs **Bayesiano con shrinkage/priors jerárquicos** para tamaños retail. Define la credibilidad de todo lo cuantitativo y mitiga RI-3/R6.

2. **Entonces sí, Sprint 0**, en este orden de entregables (raíz del DAG, puro determinista, sin UI):
   - `rollingWindow` + tests (desbloquea C3 y casi todo lo longitudinal).
   - Persistencia de `Insight` + `recomputeInsights` (cierra C8, habilita el feed y el "mejoró/empeoró").
   - **El bus + la infra de jobs según ADR-001** — y reconocer que esto es **un sprint propio**, no un bullet. Renombrar conceptualmente: no es "extender `coach-bus.ts`", es **construir un bus de dominio desde cero**.

3. **Gate G1** tras S0: validar primitivas + persistencia + que el camino de eventos elegido entrega un evento `trade.created` a un consumidor server de forma fiable. Si el camino de eventos no es fiable a coste razonable, **re-secuenciar S7** (intervención) o degradar su SLA de "≤2s push" a "en el siguiente render / polling corto" antes de comprometerlo.

> En una frase: **el siguiente paso es S0, pero el verdadero primer paso es decidir ADR-001 (eventos/entrega), porque es la pieza de la que depende el único diferenciador difícil del producto y es la que el plan da por resuelta sin estarlo.**

---

### Apéndice — Anclas de código verificadas
- `src/lib/coach-bus.ts` — helper cliente `window.dispatchEvent` (9 líneas).
- `src/prisma/schema.prisma` — 28 modelos; `Rule` L287, `Automation` L342; `Trade` L222 (sin MAE/MFE/regime).
- `src/domains/rules/{engine,conditions,actions,templates}.ts` — motor de reglas con bloqueo pre-trade real.
- `src/lib/ai/{coach-agent,coach-service,coach-tools}.ts` — chat agéntico, 10 tools read-only.
- `src/domains/analytics/ai-context.ts` — contexto estático del coach.
- `src/app/api/cron/{reviews-digest,learning-digest}/route.ts` — único "scheduler": `pg_cron→pg_net→HTTP`, `maxDuration=300`.
- `src/AGENTS.md` — advertencia de Next.js fork interno.
- Sin librería de colas/realtime/websocket en `package.json`.
</invoke>
