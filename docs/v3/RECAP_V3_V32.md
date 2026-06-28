# RECAP_V3_V32.md
### Trading Journal — Recorrido completo de v3 y v3.2 (backend / UI / razón de ser)

> Resumen de todas las funcionalidades entregadas en v3 (S3–S14 + cierre) y v3.2 (los 5 ejes del compañero cognitivo). Para cada pieza: qué se construyó en backend, qué es observable en la UI, y por qué existe.
> Última actualización: 2026-06-28.

---

## 🧠 La tesis de v3
v3 convirtió el journal en una **capa cognitiva sobre el bróker que cambia el comportamiento del trader** — no "otra app de métricas", sino un sistema que **observa, entiende, interviene y enseña**. Principio de diseño: **se construyó el cerebro antes que la piel** — la lógica (S3–S11, pura y testeada) aterrizó invisible, y la UI la hizo observable en S12–S14.

**Fundamentos transversales:** `ARCHITECTURE_FREEZE` con principios (P1–P9), decisiones (D1–D18) y entidades (E1–E20) congelados; **bus de eventos con outbox** (productores→consumidores desacoplados); **crons** (pg_cron → pg_net → `/api/cron/*` con Bearer secret).

---

## 📦 v3 — Sprint por sprint

### S3 · Métricas institucionales + estadística bayesiana
- **Backend:** `analytics/institutional/` (drawdown, distribución de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap) + `stats/bayes.ts` (estimador bayesiano, ADR-002). Cablea `Insight.confidence`.
- **UI:** (aflora en S12) métricas con **bandas de confianza**, no números secos.
- **Razón:** un trader con 30 trades no tiene "57% win rate" sino una estimación con incertidumbre. La honestidad estadística es la base de toda la confianza del sistema.

### S4 · Behavior Engine I — el bucle
- **Backend:** `domains/behavior` (verifiers/commitment-machine/reinforcement) + `commitments`/`commitment_checks`/`reinforcements` + `commitment-service` (emite eventos al outbox).
- **UI:** `BehaviorLoopPanel` en /analytics.
- **Razón:** el núcleo conductual — **insight → compromiso → verificación**. Convierte "deberías operar menos" en un compromiso medible que el sistema verifica al cierre de la ventana.

### S5 · Behavior Engine II — regla ↔ compromiso
- **Backend:** `linkRule` (blinda un compromiso con una regla de bloqueo), `RuleSuggestion` + accept/dismiss, evaluación continua, autogeneración.
- **UI:** botón **"Activar regla"**.
- **Razón:** un compromiso es una promesa; una regla lo hace **imposible de romper** (bloqueo pre-trade). Cierra la brecha intención↔ejecución.

### S6 · Coach v3 I — memoria + hilos
- **Backend:** `CoachThread`/`Message`/`Memory` con **frontera anti-envenenamiento** (el LLM propone candidato, el usuario confirma, solo lo confirmado se inyecta); `assembleCoachContext`.
- **UI:** `CoachMemoryPanel` (🧠 en el drawer del coach).
- **Razón:** un coach que olvida no sirve; uno que "recuerda" alucinaciones es peligroso. La frontera (D9) garantiza que la memoria de largo plazo solo contiene lo validado.

### S7 · Coach v3 II — intervención
- **Backend:** motor **determinista** (cascada de pérdidas / revancha / sobredimensionamiento / drawdown + scoring + fatiga + override por capital) + entidad `Intervention` + fast-path en `trades.close`; aceptar → crea regla.
- **UI:** `InterventionOverlay` global (aparece en el momento del error).
- **Razón:** el valor está en **interrumpir en caliente**, no en el post-mortem. Determinista para ser predecible y explicable.

### S8 · Psicología v3
- **Backend:** calibración + **check-in pre-sesión** (ánimo/energía/sueño → go/caution/no_go) + tendencia de humor (`PreSessionCheckin`, E12).
- **UI:** check-in pre-sesión con veredicto.
- **Razón:** el estado mental predice el desempeño. Un go/no-go honesto *antes* de operar previene los días en los que no deberías haber abierto la plataforma.

### S9 · Riesgo & Prop — motor de riesgo
- **Backend (puro, read-only):** ruina (analítica + Monte Carlo), proyección de paso de fase, presupuesto diario + reset, correlación multi-cuenta, política de retiros — en bandas de Jeffreys. `risk-service` + router.
- **UI:** (aflora en S12, superficie PROTEGER).
- **Razón:** los traders de prop firm viven o mueren por las reglas de la firma. Responde "¿cuánto puedo arriesgar hoy sin reventar la cuenta?" con rigor.

### S10 · Inteligencia de Playbook — decadencia/deriva/evolución del edge
- **Backend:** edge-decay con significancia de **Welch**, deriva definición-vs-ejecución, evolución vía ventana móvil, comparación de variantes A/B.
- **UI:** (aflora en S12, superficie MEJORAR).
- **Razón:** un setup que funcionaba puede estar muriendo. Detectar la decadencia con significancia estadística avisa antes de que sangre.

### S11 · Aprendizaje / transferencia + edge por instrumento/tags
- **Backend:** edge por instrumento (+poda), edge por tag (oro/veneno), **transferencia** (asociación-no-causa), SRS adaptado al desempeño, tarjetas de error.
- **UI:** (aflora en S12).
- **Razón:** conecta lo que estudias con lo que operas, y cuantifica qué tags/instrumentos son tu oro y cuáles tu veneno — honestamente (asociación, nunca causa).

### S12 · Design System v3 + 5 superficies
- **UI:** tokens DS v3 + superficies **ANALIZAR/PROTEGER/MEJORAR** (hacen visibles S3/S9/S10/S11) + shell de 5 superficies tras flag (`tj.v3Shell`, OFF) + `InterventionOverlay` global + onboarding día-1.
- **Razón:** el cerebro gana piel. Reorganiza por **lo que el trader hace** (Hoy/Operar/Analizar/Proteger/Mejorar), no por tablas.

### S13 · Feed HOY
- **Backend:** `assembleTodayFeed` (señales priorizadas, floor crítico) + anomalía diaria.
- **UI:** `TodayFeed` + `RiskBudgetMeter`.
- **Razón:** responde la pregunta de cada mañana: **"¿qué muevo hoy para mejorar y no romperme?"**

### S14 · ImprovementScore — la North Star
- **Backend:** índice compuesto 0–100 + drivers + régimen (experimental) + coste de la indisciplina.
- **UI:** panel del índice de mejora.
- **Razón:** una cifra honesta de "¿estoy mejorando?", descompuesta en drivers accionables.

---

## 🔒 Cierre de v3 (deuda saldada tras re-verificar vs código)

| Pieza | Backend | UI | Razón |
|---|---|---|---|
| **A1** (#116) | guard de presupuesto forward-looking en create | bloqueo "supera tu presupuesto del día" | avisar antes de abrir |
| **B1** (#117) | `improvement_scores` (E19) + snapshot diario | curva del índice + "vs hace N días" | el índice era un valor sin historia |
| **A2** (#118) | `computeNextReview` modulado por el edge | panel de transferencia (antes/después + caveat) | superficiar el aprendizaje S11 |
| **A4** (#119) | `rules.list` devuelve el origen | badge "desde compromiso/insight" | trazabilidad de cada regla |

→ **v3.1 cerrado:** 14 sprints + 3 gates, deuda genuina saldada.

---

## 🌟 v3.2 — El compañero cognitivo (5 ejes)

### 🧠 Eje 1 · Recuerda — Memoria jerárquica de 4 capas (E1, #120/#121/#122)
- **Backend:**
  - **E13 Episódica** (`memory_episodes`, pgvector): saliencia + decay; recall kNN×saliencia. Productores: intervención, check-in rojo, compromiso cumplido/roto.
  - **E14 Semántica** (`memory_patterns`): Memory Agent generaliza patrones desde episodios, confirmados solo con N≥3 (P6 — lo confirma el dato).
  - **E15 Identidad** (`memory_identity`): registro estructurado editable (tono/foco/estilo).
  - **E16 Mejora**: lee la serie E19 → "índice X, +N vs hace M días".
  - `assembleCoachContext` ensambla las 4 con presupuesto (D10).
- **UI:** editor de Identidad + capas visibles (eje 5).
- **Razón:** un compañero de verdad recuerda momentos concretos, generaliza patrones, conoce tu estilo y ve tu progreso — sin inventar nada.

### 🤝 Eje 2 · Actúa con permiso — Write-tools del coach (D1, #123/#126)
- **Backend:** `propose_rule` → `RuleSuggestion` pendiente (plantillas seguras); `propose_commitment` → compromiso `proposed` (inerte hasta aceptar). En el loop agéntico.
- **UI:** las propuestas afloran en el panel del bucle ("El coach te propone" / accept-dismiss).
- **Razón:** el coach propone acciones concretas (regla dura o compromiso blando) que tú confirmas. El sistema propone, tú decides.

### 📉 Eje 3 · Aprende — Telemetría de ignorado del feed (C3, #124)
- **Backend:** `feed_ignores` + record/get; `today-service` realimenta el `ignored` que el feed ya penalizaba.
- **UI:** botón X para descartar (señales no-críticas).
- **Razón:** el feed aprende qué ignoras y lo hunde — pero lo crítico nunca se silencia.

### 📬 Eje 4 · Te busca — Digest cognitivo semanal (C4, #125)
- **Backend:** `cognitive-digest.ts` puro + servicio (delta de mejora + compromisos + patrón → 1 notificación, dedupe semana ISO). Ruta `/api/cron/cognitive-digest`.
- **UI:** notificación "Tu semana cognitiva" (opt-outable).
- **Razón:** el sistema te busca proactivamente, sin incordiar cuando no hay nada que decir.
- **⚠️ Ops pendiente:** falta agendar el cron.

### 👁️ Eje 5 · Transparente — Memoria de 4 capas visible (#127)
- **Backend:** queries `coach.patterns` / `coach.episodes` (read-only).
- **UI:** `CoachMemoryLayers` en el panel 🧠 — "Patrones (confirmados por tus datos + %)" y "Momentos recordados (evidencia, etiqueta + fecha)".
- **Razón:** ADR-003 §3 — la memoria debe ser visible. El trader ve qué recuerda el sistema y por qué. Read-only porque los episodios son evidencia y los patrones los confirma el dato.

---

## 🧭 Invariantes que ningún sprint rompió
- **Bloqueo pre-trade** (protecciones bloquean antes de abrir).
- **Separación práctica/real** (demo/backtest no contamina estadísticas reales).
- **Frontera anti-envenenamiento (D9/P6):** el LLM nunca escribe memoria/identidad directo — propone, los datos/el usuario confirman.
- **Honestidad estadística:** bandas de confianza, "asociación no causa", nada de certeza fingida.
- **Permiso:** el sistema propone, el usuario dispone.

---

## ⏳ Pendiente (ver detalle al final de la sesión)
- **Ops:** agendar el cron del digest cognitivo · habilitar protección de contraseñas filtradas en Supabase Auth (TODO del audit de seguridad).
- **Roadmap reservado:** A3 rutas reales de 5 superficies · POST-1..7 (apuestas con disparador; solo POST-6 prop-firm "lista").
- **Follow-ups menores:** recall episódico por query del último mensaje (hoy = top salientes) · backfill `CoachMemory kind:fact` → `MemoryPattern` · sesgo de anclaje (#40, no construido a propósito) · DataTable dev render loop (pre-existente).
