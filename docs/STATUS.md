# Status — Trading Journal v3.2

> Estado vivo del proyecto. Qué funciona, qué falta verificar, qué falta construir.
> Última actualización: 2026-07-09.
> Arquitectura canónica: `ARCHITECTURE.md` · Qué es el producto: `PROJECT_GUIDE.md`

## 1. Checklist de QA pendiente de V3

> Los 109 ítems provienen de los 17 `OPEN_ITEMS_SPRINT_N.md` (hoy borrados; ver git). Se volcaron
> **sin cruzarlos contra el código**: `⬜ sin verificar` significa "nadie lo ha comprobado en esta
> pasada", no "está roto". Cerrarlos es el trabajo de la ronda de QA.
>
> Excepción: las filas con un estado distinto de `⬜` sí llevan respaldo. `✅ resuelto` cita la
> verificación del cierre de S0–S2; `⚠️ probablemente sigue abierto` cita la evidencia estática que
> lo sugiere. Fíate del estado de cada fila, no de esta advertencia general.
>
> Los sprints 3–14 usan IDs globalmente únicos (`OI-7.3`) y se conservan tal cual. Los sprints 0–2
> reiniciaban la numeración en cada sprint (tres ítems distintos llamados `OI-1`), así que van
> prefijados: `S0/OI-1`, `S1/OI-1`, `S2/OI-1`. Con eso, cada fila es trazable al historial de git.

| ID | Sprint | Item | Contexto | Estado |
|---|---|---|---|---|
| `S0/OI-1` | S0 | Migración `20260625120000` sin replay local; falta confirmación CI (`supabase db reset`). | CI / G1 | ⬜ sin verificar |
| `S0/OI-2` | S0 | Spike end-to-end del outbox (recompute → `insight.created` → dispatch → `processed`) en entorno con DB. Valida ADR-001 a coste medido. | G1 (antes de S4) | ⬜ sin verificar |
| `S0/DT-1` | S0 | **`sample_size` es coarse** (= nº total de trades, no n por detector). | Media · Los detectores existentes no exponen n. Refinar cuando se reescriban los detectores con la capa Bayesiana (S3). Honesto pero impreciso. | ⬜ sin verificar |
| `S0/DT-2` | S0 | **Campos Bayesianos nulos** (`confidence`, `credible_interval_*`, `effect_size`). | Media · Por diseño (ADR-002): las columnas existen, el estimador es S3. Riesgo: que algún consumidor asuma que están llenos. Mitigar documentando "nullable hasta S3". | ⬜ sin verificar |
| `S0/DT-3` | S0 | **Capa DB sin tests de integración** (`publishEvent`/`persistInsights`/`dispatchPending`). | Media · Bloqueado por falta de DB local. Añadir tests con DB efímera (testcontainers/Supabase local) cuando el entorno lo permita. | ⬜ sin verificar |
| `S0/DT-4` | S0 | **Doble mantenimiento SQL ↔ `schema.prisma`.** | Baja · Patrón ya existente en el repo (56 migraciones). Riesgo de drift si se edita uno sin el otro. Un check de drift en CI lo cerraría. | ✅ resuelto — 2026-07-14: `prisma migrate status` añadido al job `migrate-validate` (CI). Falla si hay cambios en schema.prisma sin migración SQL correspondiente. |
| `S0/DT-5` | S0 | **`recomputeInsights` recalcula sobre "todos los trades"** (no incremental). | Baja-media · Aceptable para un job diario en S0; el worker incremental sobre deltas (NFR coste, FREEZE §RI-4) es S6/S7. No usar este job en el camino de intervención. | ⬜ sin verificar |
| `S0/DT-6` | S0 | **`generatePsychologyInsights` y `generateInsights` podrían compartir categorías** sin coordinación de fingerprint. | Baja · Cubierto hoy por el dedupe (D-S0-7), pero si dos detectores deben coexistir con el mismo slug habría colisión silenciosa (se queda el primero). Revisar al ampliar detectores. | ⬜ sin verificar |
| `S0/R-1` | S0 | **Fast-path síncrono de intervención** aún no existe; el outbox solo da entrega diferida. C1 sigue sin su mecanismo de "momento del error". | RI-1 / ADR-001 · S7 (productor en `trade.create`) | ⬜ sin verificar |
| `S0/R-2` | S0 | **Coste del job a escala** (recompute por usuario × detectores) sin caché incremental de contexto. | RI-4 · S3/S6 (FREEZE-D7) | ⬜ sin verificar |
| `S0/R-3` | S0 | **Dispatcher no programado** → si se programa antes de tener consumidores, drena eventos. Debe programarse **junto con** el primer consumidor (S4). | D-S0-3 · S4 | ⬜ sin verificar |
| `S0/R-4` | S0 | **Rigor estadístico** aún ausente (columnas vacías). Mostrar insights sin confianza puede reintroducir R6 si la UI los trata como ciertos. **No exponer en UI hasta S3.** | RI-3 / ADR-002 · S3 | ⬜ sin verificar |
| `S0/R-5` | S0 | **Migración de reglas (C6)** intacta — sigue siendo el riesgo alto de S1 (fusión semántica). | RI-2 · S1 | ⬜ sin verificar |
| `S0/R-6` | S0 | **Privacidad de memoria** (ADR-003) registrada pero no implementada; ningún sprint puede introducir memoria plana editable por LLM. | RI-12 · S6 | ⬜ sin verificar |
| `S0/BIZ-1` | S0 | **Aislamiento de datos cross-user (POST-3 del freeze):** ¿el esquema debe permitir aprendizaje poblacional anónimo futuro? Afecta cómo se modelan tablas desde ya. | Habilitar el moat (§7 del Challenge) más tarde = migración de datos + consentimiento. Decidir antes de S4 (cuando nacen `Intervention`/`Commitment`, los datos del moat). | ⬜ sin verificar |
| `S1/OI-1` | S1 | Revisar el **informe de no-mapeo** (`/api/cron/rules-migration-report`) con datos reales: triar `descriptiveWithoutEnforcement` (falsa protección) y `ambiguousAutomations`. | G2 (revisión humana) | ✅ resuelto — 2026-07-13, informe corrido contra prod (paridad espejo 10/10 perfecta, 0 ambiguas, triaje de 13 falsas protecciones aprobado por el usuario); ver spec G2 §2 |
| `S1/OI-2` | S1 | Diseñar y ejecutar el **cutover**: que `runAutomations` (o su sucesor) lea de `rules` (mode/enforce) en vez de `automations`, con test de no-regresión del bloqueo pre-trade. **Sólo tras OI-1.** | post-G2 | ✅ resuelto — 2026-07-13, flip `RULES_SOURCE=rules` verificado en prod (RULE_BLOCKED por UI; `rules.last_fired_at` bumps, automations quieta); no-regresión en `run-rules.test.ts` |
| `S1/OI-3` | S1 | Tras verificar paridad, **deprecar/retirar `automations`** (P9: conservar hasta verificar). | post-cutover | ✅ resuelto — 2026-07-13, rama `feat/g2-rules-cutover`: engine solo-`runRules`, `/reglas` edita `rules`, router/dual-write/informe retirados; tabla `automations` archivada intacta (P9) |
| `S1/OI-4` | S1 | Replay de la migración `20260625130000` en CI. | CI | ⬜ sin verificar |
| `S1/DT-1` | S1 | **Doble fuente temporal de reglas** (`automations` enforza; `rules` tiene copias inertes). | Media · Inherente a la migración no destructiva. Se resuelve con el cutover (OI-2) + retiro de `automations` (OI-3). Mientras tanto, editar una automatización **no** actualiza su copia en `rules` (la copia es un snapshot del backfill). | ✅ resuelto — cutover G2 2026-07-13: fuente única `rules` (el dual-write de S1.5 mantuvo el espejo; paridad 10/10 verificada antes del flip) |
| `S1/DT-2` | S1 | **Backfill = snapshot**, no sincronización viva. | Media · Si el usuario edita automatizaciones tras la migración, `rules` queda desfasado hasta el cutover. Aceptable porque `rules` es inerte; documentar para no confiar en esas filas antes de G2. | ✅ resuelto — cutover G2 2026-07-13: `rules` es la fuente editable y de enforcement; el snapshot dejó de existir como concepto |
| `S1/DT-3` | S1 | **2 plantillas gated** (`no-size-increase-after-loss`, `no-trade-low-energy`). | Baja · Esperan campos de S2 (contexto trade anterior) y S8 (energía). Activarlas es añadir el campo al registro + `available:true` + `rule`. | ⬜ sin verificar |
| `S1/DT-4` | S1 | **`source_commitment_id` sin FK** (Commitment no existe hasta S4). | Baja · Añadir FK cuando nazca `Commitment` (S4/S5). | ⬜ sin verificar |
| `S1/DT-5` | S1 | **Badge sólo en `app/reglas`** (lista de automatizaciones). | Baja · Cuando exista la superficie PROTEGER (S12) y el cutover, el badge debe reflejar `rule.mode` directamente, no `classifyMode(actions)`. | ✅ resuelto — cutover G2 2026-07-13: `/reglas` renderiza `<RuleModeBadge mode={r.mode}>` desde `rules.list` |
| `S1/DT-6` | S1 | **Plantillas de protección aún no expuestas en la galería de UI** (`automations.templates`). | Baja-media · `PROTECTION_TEMPLATES` existe y está testeado, pero la galería actual usa `TEMPLATES` (automatizaciones). Integrarlas en la UI de creación es trabajo de S1.5/S12. | ✅ resuelto — tsc + suite — 3 plantillas de protección en la galería (closeout S0–S2) |
| `S1/R-1` | S1 | **Falsa protección no resuelta hasta G2.** El informe la detecta, pero las reglas CRÍTICA descriptivas siguen sin bloquear hasta el cutover. | RI-2 / R3 · G2 (OI-1/OI-2) | ✅ resuelto — triaje OI-1 2026-07-13: 3 descriptivas tienen protección real en risk-enforcement, 3 no son enforceables hoy (aviso honesto); cutover ejecutado |
| `S1/R-2` | S1 | **Cutover es el momento de máximo riesgo** (cambiar la fuente del bloqueo pre-trade). | RI-2 · OI-2 con test de no-regresión obligatorio | ✅ resuelto — mitigado con flip por env var (rollback sin deploy) + verificación observable en prod + invariante `run-rules.test.ts` |
| `S1/R-3` | S1 | Heredados de S0 sin cerrar: **G1** (replay S0 + spike outbox) y **BIZ-1** (aislamiento de datos cross-user, antes de S4). | OPEN_ITEMS_SPRINT_0 · CI / antes de S4 | ⬜ sin verificar |
| `S2/OI-1` | S2 | Mostrar el **incentivo D10** al capturar emoción (`feedbackForEmotion` → "tu WR ansioso es 33% en 6 trades"). | Lógica lista; falta el componente en el formulario de cierre/captura. | ✅ resuelto — 2 tests + render — `EmotionInsight` en el modal de registro (closeout S0–S2) |
| `S2/OI-2` | S2 | **Nudge #10** al cerrar sin emoción (`needsEmotionNudge`). | Lógica lista; falta el prompt 1-tap. | ⬜ sin verificar |
| `S2/OI-3` | S2 | **Pre-fill** de `session`/`riskPct` en el formulario (`deriveSession`/`deriveRiskPct`), editable inline. | Helpers listos; falta llamarlos en el form. | ⬜ sin verificar |
| `S2/OI-4` | S2 | Mostrar **sugerencias de tags** (`suggestTagsFromNote`) como chips confirmables. | Core listo. | ✅ resuelto — 4 tests + render — `NoteTagSuggestions` bajo Notas (closeout S0–S2) |
| `S2/OI-5` | S2 | Inputs de **MAE/MFE** y selector de **regime** en el formulario. | Columnas + input del router listos. | ⬜ sin verificar |
| `S2/DT-1` | S2 | **`riskPct` se deriva en cliente**, no en servidor. | Media · Si una integración crea trades sin pasar por el form (import/API), `riskPct` quedará null. Fallback: derivar en `trades.create` usando el balance de la cuenta. | ✅ resuelto — tsc + suite — `trades.create` deriva `riskPct` (closeout S0–S2) |
| `S2/DT-2` | S2 | **`sample_size` del feedback emocional es el total por emoción**, sin ventana temporal. | Baja · Aceptable para el incentivo. Una versión "últimas 4 semanas" se apoya en `rollingWindow` (S0) — futuro. | ⬜ sin verificar |
| `S2/DT-3` | S2 | **`deriveSession` ignora timezone**. | Baja · Aproximación editable documentada. Mejorará cuando el trade capture timezone/UTC real. | ⬜ sin verificar |
| `S2/DT-4` | S2 | **Auto-tagging sólo determinista** (keywords). | Baja · Cobertura limitada de lenguaje; la capa LLM (enriquecimiento) es posterior. | ⬜ sin verificar |
| `S2/DT-5` | S2 | **`evaluateChecklist` no está cableado en `trades.create`** para auto-taggear "Off-plan". | Media · La función existe y está testeada; falta invocarla en la mutación para añadir el tag automáticamente. | ✅ resuelto — tsc + suite — `saveChecklistResult` auto-taggea Off-plan (closeout S0–S2) |
| `S2/R-1` | S2 | Si la UI no expone el incentivo (OI-1), C7 vuelve a ser "captura sin retorno" → reaparece R2. **El valor de S2 depende del wiring.** | UI follow-up | ⬜ sin verificar |
| `S2/R-2` | S2 | Heredados sin cerrar: **gate G2** (cutover de reglas, S1), **gate G1** (replay S0 + spike outbox), **BIZ-1** (aislamiento de datos cross-user, antes de S4). | CI / antes de S4 | ⬜ sin verificar |
| `OI-3.1` | S3 | **Superficies tRPC + UI** del cuadrante institucional (drawdown chart con bandas, histograma de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap) | FREEZE-D3: Analytics es puro; las superficies se diseñan con DS v3 | ⬜ sin verificar |
| `OI-3.2` | S3 | **Mapper DB→métricas** (cargar trades con `maeR/mfeR/regime` + setups con `expectedWr/expectedAvgR` + equity y componer las 6 métricas) | crear el mapper sin consumidor sería dead code; el `analyticsBundle` actual no selecciona esos campos | ⬜ sin verificar |
| `OI-3.3` | S3 | **Wiring Bayesiano de insights continuos** (p. ej. `emotion-performance`: diferencia de medias de P&L) | requiere comparador de dos muestras; `normalEstimate` ya existe y está testeado, falta exponer la base en el detector | ⬜ sin verificar |
| `OI-3.4` | S3 | **Priors empíricos en producción** — hoy los detectores usan priors por defecto débiles; falta alimentar `empiricalBetaPrior`/`empiricalNormalPrior` con los grupos reales del usuario (setups/instrumentos) | el pooling cobra valor con volumen de datos; los priors son reversibles (FREEZE-D15) | ⬜ sin verificar |
| `OI-3.5` | S3 | **Ampliar cobertura de `stat`** a más detectores de proporción (setup concentration, etc.) | cobertura inicial acotada a propósito (subconjunto de alto valor) | ⬜ sin verificar |
| `OI-3.6` | S3 | **Smoke en prod del llenado de confianza** — verificar que el cron persiste `confidence/credible_interval/effect_size` no nulos para los 2 detectores cableados | requiere deploy + corrida del cron | ⬜ sin verificar |
| `OI-4.1` | S4 | **`linkRule(commitment, template)`** + continuous-eval para compromisos con regla enforce | el cierre insight→protección es el foco de S5 | ⬜ sin verificar |
| `OI-4.2` | S4 | **`suggestRulesFromInsights`** + CTA "Activar regla anti-X" en el insight | idem | ⬜ sin verificar |
| `OI-4.3` | S4 | **Verificador `edge-decay`** (5º de FREEZE-D7) | necesita `SetupEdgeSnapshot` | ⬜ sin verificar |
| `OI-4.4` | S4 | **Superficies ricas del loop** (HOY: compromisos del día/refuerzos; Reviews: bloque "¿Cumpliste?") | superficies = S12/S13; hoy vive en `/analytics` | ⬜ sin verificar |
| `OI-4.5` | S4 | **Feed a `ImprovementScore`** desde `commitment.kept/broken` | el índice de mejora es S14 | ⬜ sin verificar |
| `OI-4.6` | S4 | **Scheduling de crons en prod** (`evaluate-commitments`, `dispatch-events`) | ops (pg_cron → pg_net + cron_secret ya configurado) | ⬜ sin verificar |
| `OI-4.7` | S4 | **Insights persistidos poblados en prod** | depende de programar `recompute-insights` (hoy invocable, no agendado) → sin él, `behavior.openInsights` está vacío en prod | ⬜ sin verificar |
| `OI-4.8` | S4 | **Más specs insight→commitment** (revenge/oversizing/off-plan necesitan sus detectores) | hoy solo `intraday-decay` tiene detector + spec; los otros 3 verificadores existen, faltan sus detectores | ⬜ sin verificar |
| `OI-5.1` | S5 | Reglas del loop visibles en `/reglas` (la UI lista `automations`; las del loop viven en `rules`) | S12 (cohesión de superficies) | ✅ resuelto — cutover G2 2026-07-13: `/reglas` lista `rules` (ejecutables con badge de origen "desde compromiso/insight"; descriptivas en Recordatorios) |
| `OI-5.2` | S5 | `offPlanTrades` como regla "warn" (no prevenible pre-trade, pero avisable) | S8/incremental | ⬜ sin verificar |
| `OI-5.3` | S5 | Plantillas extra (energía<3 → S8; no-aumentar-tamaño-tras-pérdida → captura) | S8+ | ⬜ sin verificar |
| `OI-5.4` | S5 | Sugerencias/Activar-regla también en HOY + panel de insights nativo | S12/S13 | ⬜ sin verificar |
| `OI-5.5` | S5 | `generateSuggestions` agendado (hoy on-demand vía tRPC; podría correr en el cron de insights) | ops/incremental | ⬜ sin verificar |
| `OI-6.1` | S6 | **Auto-extracción LLM** de candidatos (resumen de thread + hechos/preferencias → `proposeMemories`) | **S7** (worker proactivo) | ⬜ sin verificar |
| `OI-6.2` | S6 | Proactividad/intervención tiempo real + write-tools con permiso + check-in pre-sesión | **S7** | ⬜ sin verificar |
| `OI-6.3` | S6 | Cifrado en reposo de memoria sensible + opt-out de envío (ADR-003 §3 avanzado) | follow-up privacidad | ⬜ sin verificar |
| `OI-6.4` | S6 | Soporte determinista para confirmar memoria semántica (N episodios) — hoy confirma el usuario | S8+ (cuando haya señal) | ⬜ sin verificar |
| `OI-6.5` | S6 | Editar contenido de memoria desde el panel (hoy: añadir/confirmar/borrar; editar vía API existe) | incremental UI | ⬜ sin verificar |
| `OI-6.6` | S6 | Resumen automático del thread (`thread.summary`) | S7 (con la auto-extracción) | ⬜ sin verificar |
| `OI-7.1` | S7 | **Write-tools del chat** (`propose_commitment`/`propose_rule`/`schedule_checkin`/`create_study_card`/`mark_review_ready`) en el agente con confirmación | follow-up coach | ⬜ sin verificar |
| `OI-7.2` | S7 | **Auto-extracción LLM** de memoria candidata (S6 OI-6.1) — el worker/summarizer llama `proposeMemories` | con helper de completion one-shot | ⬜ sin verificar |
| `OI-7.3` | S7 | Aprender `expectedImpact` desde `Intervention.outcome` (EV10) | E14/§9 | ⬜ sin verificar |
| `OI-7.4` | S7 | Intervención en `trade.create` (oversizing en la entrada) | incremental | ⬜ sin verificar |
| `OI-7.5` | S7 | Refuerzos + intervenciones en el feed **HOY** | S13 | ⬜ sin verificar |
| `OI-7.6` | S7 | θ adaptativo desde MemoryIdentity (hoy θ fijo) | S8+/§9 | ⬜ sin verificar |
| `OI-7.7` | S7 | Cascada/tilt intradía más fina (psicología v3) | S8 | ⬜ sin verificar |
| `OI-8.1` | S8 | Sesgos cognitivos extra (#40: disposition effect, anclaje, etc.) | incremental sobre psychology-insights | ⬜ sin verificar |
| `OI-8.2` | S8 | Check-in `no_go` que crea una regla "stop por hoy" (hoy solo recomienda) | follow-up | ⬜ sin verificar |
| `OI-8.3` | S8 | Tilt intradía fino + correlación check-in→resultado del día | S9+ | ⬜ sin verificar |
| `OI-8.4` | S8 | Calibración como Insight persistido (historización Bayesiana) | con recompute | ⬜ sin verificar |
| `OI-8.5` | S8 | Verificación live end-to-end del check-in/calibración | siguiente sesión | ⬜ sin verificar |
| `OI-9.1` | S9 | Superficie UI del cuadrante de riesgo (ruina/proyección/budget) + `RiskBudgetMeter` | S12/S13 | ⬜ sin verificar |
| `OI-9.2` | S9 | Bloqueo duro pre-trade por budget diario + freeze agregado (hoy solo señal/warn) | S13 (reusa rules/account-lock) | ⬜ sin verificar |
| `OI-9.3` | S9 | `aggregateCapAmount` como setting por usuario (hoy parámetro del router, inerte si null) | S13 + ajustes PROTEGER | ⬜ sin verificar |
| `OI-9.4` | S9 | Horizonte de fase desde el ritmo real / deadline de la firma (hoy 60 sesiones por defecto) | S13 | ⬜ sin verificar |
| `OI-9.5` | S9 | Proyección/ruina como Insight persistido (historización + alertas al deteriorarse) | con recompute (#18) | ⬜ sin verificar |
| `OI-9.6` | S9 | Política de retiros para TRAILING con floor que sigue al pico (hoy reporta distancia al floor desde inicial) | follow-up | ⬜ sin verificar |
| `OI-9.7` | S9 | Verificación live end-to-end por UI (cuando exista la superficie, S12/S13) | S12/S13 | ⬜ sin verificar |
| `OI-10.1` | S10 | Superficie UI: `EdgeEvolutionChart`, badges de drift, banner de decay | S12 | ⬜ sin verificar |
| `OI-10.2` | S10 | Decay/drift como **Insight persistido** + oferta de compromiso/regla ("revisar setup X", "no operar US30") | con recompute / behavior | ⬜ sin verificar |
| `OI-10.3` | S10 | `SetupEdgeSnapshot` (E18) persistido vía job (hoy la curva se calcula al vuelo) | S14 / recompute | ⬜ sin verificar |
| `OI-10.4` | S10 | Drift por **sesión/mercado** — requiere añadir "sesión esperada" a la definición de `Setup` | follow-up (ampliar schema) | ⬜ sin verificar |
| `OI-10.5` | S10 | Sugerencia de **poda** de instrumento con edge negativo (#24) — vive en S11 (instrument) pero comparte el motor de significancia | S11 | ⬜ sin verificar |
| `OI-10.6` | S10 | A/B completo (asignación + tagging por versión en el trade) | POST-7 | ⬜ sin verificar |
| `OI-10.7` | S10 | Verificación live end-to-end por UI (cuando exista la superficie) | S12 | ⬜ sin verificar |
| `OI-11.1` | S11 | Superficies UI: tabla de instrumento (CTA poda), tags-veneno/oro accionables, panel de transferencia/SRS, errores→tarjeta | S12 | ⬜ sin verificar |
| `OI-11.2` | S11 | Cablear `computeNextReview` en la mutación de review/grade existente (hoy se entrega la señal de cadencia, no se reprograma) | S12 | ⬜ sin verificar |
| `OI-11.3` | S11 | Edge instrumento/tag y errores como **Insight persistido** + oferta de compromiso/regla ("no operar US30", "evita FOMO") | con recompute / behavior | ⬜ sin verificar |
| `OI-11.4` | S11 | `transferBaseline` (E4) persistido al vincular recurso (hoy se computa por fecha) | follow-up si una superficie lo exige | ⬜ sin verificar |
| `OI-11.5` | S11 | Set de "tags de error" configurable / derivado del catálogo `Tag` (hoy constante por defecto) | follow-up | ⬜ sin verificar |
| `OI-11.6` | S11 | Absorción/retiro de las pantallas Mercados y Etiquetas v2 tras paridad de valor | S12 (FREEZE: conservar hasta verificar) | ⬜ sin verificar |
| `OI-11.7` | S11 | Verificación live end-to-end por UI (cuando exista la superficie) | S12 | ⬜ sin verificar |
| `OI-13.1` | S13 | Telemetría de **ignorado por ítem** (clicks/descartes → `ignored`); hoy el decay usa la edad como proxy | follow-up (necesita persistir interacciones del feed) | ⬜ sin verificar |
| `OI-13.2` | S13 | Digest proactivo por email del feed HOY (#28) — el digest de aprendizaje ya existe, extenderlo | follow-up / cron | ⬜ sin verificar |
| `OI-13.3` | S13 | Absorber la pantalla **Notificaciones** dentro del feed (hoy conviven) | S12c (migración real de rutas) / follow-up | ⬜ sin verificar |
| `OI-13.4` | S13 | Señales tempranas en vivo (#44) vía outbox (rachas/drift en el momento) en lugar de poll | con realtime (POST-1) | ⬜ sin verificar |
| `OI-13.5` | S13 | Refuerzos productor real a `today` (hoy se leen si existen; el productor de Reinforcement visible=today es del Behavior Engine) | con uso del loop | ⬜ sin verificar |
| `OI-13.6` | S13 | Verificación live end-to-end en prod (feed reaccionando a un trade nuevo) | siguiente sesión | ⬜ sin verificar |
| `OI-14.1` | S14 | Persistir **`ImprovementScore` (E19, snapshot diario)** vía job → la curva temporal "vs hace 3 meses" (hoy es el valor actual, sin serie histórica) | follow-up (job + tabla; cron ya existe el patrón) | ⬜ sin verificar |
| `OI-14.2` | S14 | Régimen **exógeno real (ATR / datos de mercado)** — hoy manual/proxy (experimental) | POST-4 (mini-ADR cuando el régimen manual demuestre valor) | ⬜ sin verificar |
| `OI-14.3` | S14 | **Recalibrar los pesos** del índice con datos reales (hoy 0.3/0.3/0.25/0.15 por defecto) | follow-up | ⬜ sin verificar |
| `OI-14.4` | S14 | `coste de indisciplina` **rolling temporal** (hoy es acumulado total) para la North Star longitudinal | con E19 snapshots | ⬜ sin verificar |
| `OI-14.5` | S14 | Drivers del score como narración del coach mentor (AI_COACH §9) | con coach proactivo | ⬜ sin verificar |

<!-- filas: 109 (69 OI-x.y sprints 3–14 + 40 S0/S1/S2) -->

### Nota metodológica sobre el conteo

El brief original daba como "dato ya verificado" que `docs/v3/OPEN_ITEMS_SPRINT_{0,1,2,12}.md` **no
existen** (S0–S2 estarían solo en `OPENITEMS_CLOSEOUT_S0_S2.md`). Verificación directa: **`OPEN_ITEMS_SPRINT_0.md`, `_1.md` y `_2.md` SÍ existen y están commiteados** en `docs/v3/` (confirmado con
`git log`, sin cambios pendientes). `OPEN_ITEMS_SPRINT_12.md` efectivamente no existe.

Esto no afectó el conteo de 69 filas `OI-x.y`: el script de extracción usa el glob
`OPEN_ITEMS_SPRINT_*.md`, que sí matchea los 3 ficheros de S0–S2, pero su regex de fila
(`\s*\|\s*(OI-[\d.]+)\s*\|`) exige que el ID venga inmediatamente tras el `|` (sin `**`). Los
ficheros S0–S2 escriben sus IDs en **negrita** (`| **OI-1** |...`), formato que la regex no
matchea — por eso quedan excluidos del conteo automático de `OI-x.y`, no por no existir. Los
ficheros S3–S14 escriben el ID sin negrita (`| OI-3.1 | ...`), por eso sí se capturan. El resultado
(69) es correcto, pero el motivo no es "los ficheros no existen": es un accidente de formato. Si
algún día se homogeneiza el formato de esas 3 tablas a texto plano, el universo de ítems de S0–S2
subiría en 11 (2 de S0 + 4 de S1 + 5 de S2) respecto a los ya volcados arriba con prefijo `S*/`.

### Notas de correspondencia con `OPENITEMS_CLOSEOUT_S0_S2.md`

El closeout nombra los IDs **sin prefijo de sprint**; la correspondencia con las filas `S0/S1/S2`
de arriba se resolvió con su columna "Sprint". Cinco quedaron marcados `✅ resuelto` en la tabla.
Los demás:

| Fila del closeout | Corresponde a | Estado aplicado |
|---|---|---|
| `G1` spike outbox (S0) | `S0/OI-2` (spike end-to-end del outbox) | ⬜ sin verificar — necesita DB real |
| `G2` cutover de reglas (S1) | gate G2, no un `OI-*` de S1 | ⬜ sin verificar — decisión + DB |
| `BIZ-1` aislamiento cross-user (S0) | `S0/BIZ-1` | ⬜ sin verificar — decisión de negocio; existe `ADR-004`, confirmar si la cierra |
| `OI-5`, `OI-2`, `OI-3` (S2) | `S2/OI-5`, `S2/OI-2`, `S2/OI-3` | ⬜ sin verificar — follow-up de formulario, diferido a propósito |

**Ambigüedad no resuelta (no se adivinó):** el closeout lista `**OI-4 (S0)** replay migraciones`,
pero S0 solo define `OI-1` y `OI-2`. La descripción ("replay de migraciones, lo valida CI") coincide
con `S0/OI-1`, no con ningún `OI-4`. El closeout se etiqueta mal a sí mismo. `S0/OI-1` se deja
`⬜ sin verificar`; confirmar durante la ronda de QA si CI ya lo cerró.

### Gaps de `AUDIT_FINAL.md`

> **`AUDIT_FINAL.md` se contradice consigo mismo.** Su §5 lista estos gaps como deuda abierta; su
> §9 (posterior, del 2026-06-27, tras re-verificar contra código) los declara resueltos con su PR.
> **Manda la §9.** Las tablas de §5 se conservan abajo por su descripción, pero el estado vinculante
> es este:

| ID | Estado según §9 | Verificación |
|---|---|---|
| `GAP-A1` guard de presupuesto | ✅ resuelto | forward-looking (PR #116); el lock backward-looking ya existía |
| `GAP-B1` historización de `ImprovementScore` | ✅ resuelto | E19 + cron + curva (PR #117), verificado en prod |
| `GAP-A2` transferencia #31 + SRS #45 | ✅ resuelto | panel + `computeNextReview` cableado (PR #118), verificado |
| `GAP-A4` origen de regla del loop | ✅ resuelto | badge "desde compromiso/insight" (PR #119) |
| `GAP-C1` detectores revenge/oversizing | ✅ resuelto | ya existían (`detectLosingStreak`/`Oversizing`/`Emotion`) |
| `GAP-C2` disposition effect (#40) | ✅ resuelto | ya existía (`detectHoldingAsymmetry`) |
| `GAP-B2` `SetupEdgeSnapshot` | ⏭️ omitido | la curva de edge ya funciona al vuelo |

**Hallazgo de la §9, relevante para la ronda de QA:** la auditoría a nivel-doc **sobre-estimó la
deuda**; la re-verificación contra código mostró que A4/C1/C2/A2-SRS estaban parcial o mayormente
construidos. Espera que lo mismo pase con parte de los 109 ítems del checklist de arriba: verifica
contra el código antes de construir.

Ningún gap de §5 queda `⬜ sin verificar`: la §9 los cubre todos.

#### Descripciones originales (§5, estado SUPERADO por §9)

Fuente: `AUDIT_FINAL.md` §5 ("Gaps reales, por severidad"), conservado por su descripción.

**🟠 Medio — lo que un usuario notaría**

| ID | Gap | Nota |
|---|---|---|
| `GAP-A1` (OI-9.2) | Bloqueo duro pre-trade por presupuesto diario (#17) no cableado | S9/D9.3 lo prometió a S13; S13 lo expone como señal en el feed + meter, pero no bloquea. Reusa `Account.locked` + rules engine. *El gap funcional más visible.* |
| `GAP-A2` (OI-11.1/11.2) | Transferencia #31 + SRS #45 sin superficie | Backend S11 listo; falta UI en /aprendizaje + cablear `computeNextReview` a la mutación de grade. |
| `GAP-C1` (OI-4.8) | Detectores de insight parciales | Los 4 verificadores (revenge/oversizing/off-plan/intraday) existen, pero solo algunos detectores generan los insights que alimentan el loop/feed. |
| `GAP-B1` (OI-14.1) | ImprovementScore sin curva temporal | El índice es el valor actual; falta persistir E19 (snapshot diario) para "vs hace 3 meses". |

**🟡 Bajo — estructural / longitudinal / incremental**

| ID | Gap | Nota |
|---|---|---|
| `GAP-A3` (OI-13.3) | Migración real de rutas a 5 superficies (`/hoy`,`/operar`… absorbiendo Dashboard/Notif/Mercados/Etiquetas) | Hoy = reagrupación de nav tras flag; Notificaciones convive, no absorbida. |
| `GAP-A4` (OI-5.1) | `/reglas` lista `automations`, no las `rules` del loop | — |
| `GAP-B2/B3/B4` (OI-10.3/14.4/8.4/9.5) | Persistir `SetupEdgeSnapshot` (E18), coste de indisciplina rolling, calibración/ruina/proyección como Insight historizado | — |
| `GAP-C2/C3/C4` (OI-8.1/13.1/13.2) | Sesgos extra #40; telemetría de "ignorado" del feed (hoy edad=proxy); digest #28 por email del feed HOY | — |
| `GAP-D1/D3` (OI-7.1/7.3) | Write-tools del chat (`propose_commitment/propose_rule` — la capacidad ya se entrega vía paneles); aprender `expectedImpact` de `Intervention.outcome` | — |
| `GAP-Misc` (OI-5.2/8.2, OI-5.3) | Off-plan como regla "warn"; plantillas extra | — |

> Cerrados durante el camino (NO abiertos, según el documento): auto-extracción LLM de memoria
> (OI-6.1/7.2 → PR #103 D-A); superficies institucional/riesgo/playbook/edges (S12); onboarding
> día-1 #48 (S12d); crons v3 agendados en prod (#97).

**Reclasificado a v3.2 (roadmap, NO deuda — no bloquea el cierre, según el documento)**

| ID | Item | Nota |
|---|---|---|
| `GAP-E1` | Memoria jerárquica de 4 capas (E13–E16) | Su invariante irreversible (frontera anti-poisoning, FREEZE-D9) YA está cumplido; la jerarquía es *enhancement*, no corrección. |
| `GAP-A3` (dup.) | Migración real de rutas a 5 superficies | Hoy reagrupación de nav tras flag. |
| `GAP-C3` (dup.) | Telemetría de ignorado del feed | — |
| `GAP-C4` (dup.) | Digest #28 | — |
| `GAP-D1` (dup.) | Write-tools del chat | — |
| `GAP-D3` (dup.) | expectedImpact | — |
| `GAP-POST-1..7` | Realtime, multi-agente, cross-user moat, ATR, extracción a servicio, base prop-firm, A/B | Frontera reservada con disparador. |
| `GAP-Anclaje` | Sesgo de anclaje (#40) | No se construyó un detector de determinismo dudoso a propósito (P3). |

El propio `AUDIT_FINAL.md`, en su §9 ("CIERRE DEL TRACK DE DEUDA", 2026-06-27, el mismo día),
registra que varios de estos gaps de §5 fueron resueltos con posterioridad tras una re-verificación
contra código:

| Ítem | Resolución (según el documento, §9) |
|---|---|
| `GAP-A1` | ✅ guard de presupuesto forward-looking (PR #116); el lock backward-looking ya existía |
| `GAP-B1` | ✅ historización ImprovementScore — E19 + cron + curva (PR #117), verificado en prod |
| `GAP-A2` | ✅ transferencia #31 + SRS #45 — panel + `computeNextReview` cableado (PR #118), verificado |
| `GAP-A4` | ✅ origen de regla del loop — badge "desde compromiso/insight" (PR #119) |
| `GAP-C1` | ✅ detectores revenge/oversizing ya existían (`detectLosingStreak/Oversizing/Emotion`) |
| `GAP-C2` | ✅ disposition effect #40 ya existía (`detectHoldingAsymmetry`) |
| `GAP-B2` | ⏭️ omitido — la curva de edge ya funciona al vuelo |

El propio documento concluye: "la auditoría a nivel-doc sobre-estimó la deuda; la re-verificación
contra código mostró que A4/C1/C2/A2-SRS estaban parcial/mayormente construidos."

## 2. Ops pendientes (acción del usuario, sin código)

Fuente: `PENDING_AND_RESUME.md` §1 (borrado en la consolidación; ver historial de git).

- 🔴 **Agendar el cron del digest cognitivo (C4).** La ruta `/api/cron/cognitive-digest` existe y
  funciona, pero **no está programada**. Sin schedule, el digest semanal no se dispara. Falta añadir
  en Supabase: pg_cron → pg_net → la ruta, con `Bearer CRON_SECRET` (igual que los demás crons).
- 🟡 **Protección de contraseñas filtradas en Supabase Auth.** TODO del audit de seguridad — toggle
  en el dashboard de Auth, no migrable por código.

## 3. Deuda técnica

> Fuente: `TECHNICAL_DEBT.md`, del 2026-06-05 (borrado en la consolidación; ver historial de git). v3 pudo haber cerrado parte de esta deuda desde
> entonces; no se afirma que siga abierta salvo verificación puntual anotada abajo.

| ID | Título | Tipo | Prioridad | Estado |
|---|---|---|---|---|
| `TD-018` | Extraer lógica de negocio inline del router `trades.ts` (~924 LOC) a `trade-service` | Refactor | P3 | ✅ resuelto — 2026-07-14: orquestación extraída a `src/server/services/trades/` (serializers, embedding-service, dashboard-service, trade-read-service, trade-write-service); el router quedó en 180 LOC (zod + delegación). El **cálculo** ya vivía en `domains/` (deuda sobre-estimada en ese eje, como anticipaba §1). `dashboardStats` ganó su primer test directo (partición practice). Suite 1168/1168 + tsc + eslint. |
| `TD-019` | Cliente Supabase creado por-request en el contexto tRPC | Refactor/infra | P3 | ✅ resuelto — 2026-07-16: la deuda estaba **mal caracterizada**. `ctx.supabase` es un cliente HTTP stateless de `@supabase/ssr`, no una conexión a Postgres: no hay pool que gestionar (Prisma ya maneja el suyo). El costo real era `auth.getUser()` en `createTRPCContext()`, un round-trip de red al Auth server en **cada** llamada tRPC. Sustituido por `getClaims()`, que verifica la firma ES256 del JWT contra el JWKS que auth-js cachea process-wide (10 min) → sin red en proceso caliente. Verificado que el proyecto usa claves asimétricas (JWKS expone ES256); con el secreto legacy HS256 `getClaims()` habría hecho fallback a red y no habría servido de nada. Mismo cambio aplicado al gate de auth de páginas (`proxy.ts`, que en Next 16 reemplaza a `middleware.ts` y corre en runtime Node): el refresh de sesión se preserva porque `getClaims()` sigue pasando por `getSession()`, que rota el token expirado y reescribe las cookies. De paso se eliminó código muerto en `proxy.ts` (header de respuesta `x-user-id` que nadie leía y que habría sido un bypass spoofeable si se cableaba). |
| `TD-037` | ~22 efectos "sync-on-open" (setState sincrónico en effect) | Refactor render | P3 | ⬜ sin verificar — requiere auditoría manual de los efectos, no verificable de forma fiable con un grep simple |
| `DataTable dev render loop` | Re-render infinito solo en dev; columnas responsivas solo en build prod. No afecta prod. Pre-existente a v3. | Bug conocido (dev-only) | — | ⬜ sin verificar |

## 4. Backlog

> Fuente: `BACKLOG.md`, del 2026-06-05 (borrado en la consolidación; ver historial de git). Misma advertencia de frescura que la deuda técnica: v3
> pudo haber implementado parte de esto; no se afirma que siga pendiente sin verificar.

**P1 — Próximo (v2.1)**

| ID | Tarea | Esfuerzo | Estado |
|---|---|---|---|
| `B-01` | Generar iconos PWA PNG (192/512) y verificar `apple-touch-icon` en iOS | S | ⬜ sin verificar |
| `B-02` | Añadir `eslint` como gate de CI | S | ⬜ sin verificar |
| `B-03` | E2E Playwright en CI (smoke tests ya scaffolded) | M | ⬜ sin verificar |
| `B-04` | Wire de error tracker (Sentry) para runtime | M | ⬜ sin verificar |
| `B-05` | Test de carga a 1000+ trades; activar/medir `TradeStatsCache` | M | ⬜ sin verificar |

**P2 — Deseable**

| ID | Tarea | Esfuerzo | Estado |
|---|---|---|---|
| `B-06` | Captura de charts en export PDF (hoy solo tablas) | M | ⬜ sin verificar |
| `B-07` | Superficie de detección de patrones en la UI | M | ⬜ sin verificar |
| `B-08` | Fallback de onboarding paso 4 (detectar `profile.email`\|\|`name`) | S | ⬜ sin verificar |
| `B-09` | Procedimiento de bump de cache del Service Worker por deploy | S | ⬜ sin verificar |
| `B-10` | Comparación de reviews lado a lado | M | ⬜ sin verificar |

**P3 — Oportunista / futuro**

| ID | Tarea | Esfuerzo | Estado |
|---|---|---|---|
| `B-11` | Implementar features IA configurables pero no consumidas (trade/psychology/learning analysis) | L | ⬜ sin verificar |
| `B-12` | `AiUsageLog` (tracking de uso/costo IA) | M | ⬜ sin verificar |
| `B-13` | Soporte multi-divisa | L | ⬜ sin verificar |
| `B-14` | Integración con API de brokers (import automático) | L | ⬜ sin verificar |
| `B-15` | App móvil / profundización PWA | L | ⬜ sin verificar |
| `B-16` | Features sociales (compartir setups, leaderboards) | L | ⬜ sin verificar |

## 5. Roadmap reservado

> Fuente: `PENDING_AND_RESUME.md` §2 (borrado en la consolidación; ver historial de git). No es deuda: son apuestas de producto con disparador
> propio, deliberadamente no iniciadas.

- **A3 — rutas reales de 5 superficies** (`/hoy`, `/operar`, `/analizar`, `/proteger`, `/mejorar`).
  Refactor de IA grande y cosmético (el agrupado de nav ya da el modelo mental tras el flag
  `tj.v3Shell`). Solo si se quiere cerrar la visión de UX.
- **POST-1..7 — apuestas estratégicas con disparador:**
  - **POST-6** (base de reglas prop-firm como moat) → **única con disparador cumplido** (tras S9),
    valor claro para audiencia prop. Sprint dedicado grande.
  - POST-1 realtime/SSE · POST-2 coach multiagente · POST-3 moat cross-user · POST-4 ATR ·
    POST-5 extracción a servicio · POST-7 framework A/B → disparadores **NO activados** (prematuros
    por su propio diseño).

## 6. Prompt de retoma de sesión

> Copia y pega esto al iniciar la próxima sesión:

```
Continúo el proyecto Trading Journal. v3.1/v3.2 cerrados y mergeados. POST-6 mergeado
(PR #128). Cutover G2 CERRADO: PR #129 mergeado el 2026-07-13 (a28df30); RULES_SOURCE
verificada inerte en código (el borrado de la env var en Vercel es cosmético y no es
verificable desde la sesión — no bloquear nada por eso). TD-018 (trade-service) HECHO
el 2026-07-14: PR #130.

ESTADO DEL PR #130 — verificar primero con `gh pr view 130`:
- Si está mergeado: seguir con lo siguiente en el orden acordado:
  (1) check de drift SQL↔Prisma en CI (cierra S0/DT-4),
  (2) pendientes de STATUS.md §2 Ops (cron cognitive-digest sigue sin agendar, a propósito).
- Si NO está mergeado: yo (usuario) debo mergearlo con CI verde; no tiene migraciones.
  Plan (ejecutado): docs/superpowers/plans/2026-07-14-td018-trade-service.md

Lee primero, en este orden:
  1) docs/STATUS.md        (estado, pendientes, checklist de QA)
  2) docs/PROJECT_GUIDE.md (qué es el producto)
  3) docs/ARCHITECTURE.md  (principios/decisiones/entidades congelados)

Confirma al arrancar que tienes acceso a gh, Vercel MCP, Supabase MCP y .env (handoff §0).

Reglas de trabajo (las de toda la sesión anterior):
- Trabaja desde origin/main; una rama por pieza; PR + CI verde + merge yo mismo (gh).
- TDD para dominios puros; migraciones DUALES (SQL en supabase/migrations + modelo
  prisma) con `npx prisma generate`; RLS per-usuario en tablas nuevas.
- Corre la suite vitest COMPLETA antes de cada push (no un subconjunto).
- Re-verifica vs CÓDIGO antes de construir (varias veces la deuda estaba sobre-estimada).
- Verifica vs BD/UI real: smoke con .env para lógica; Playwright + Vercel MCP (bypass SSO)
  para UI; usuario demo ariaoc89@gmail.com (pw S12bVerify!2026, = E2E_USER).
- Node 24 (nvm); binarios vía ./node_modules/.bin/ desde src/.
- Tras cada pieza, resume en 3 ejes: backend / observable-en-UI / razón de ser.

GOTCHA crítico de migraciones: migrate-deploy (ci.yml, job "Apply migrations to
production") corre SOLO en el run del SHA del merge a main (~5 min). `gh run list` justo
tras mergear suele cazar un run anterior — identifica el run por headSha == HEAD y espera
ESE `migrate-deploy: success` antes del smoke post-merge (verifica que la tabla exista).

Orden de trabajo acordado (2026-07-13): G2 (hecho, PR #129) → TD-018 (hecho, PR #130)
→ check de drift SQL↔Prisma en CI. El cron cognitive-digest queda pospuesto a propósito.
No arranques nada grande sin confirmarlo conmigo primero.

Gotcha de credenciales QA: la password del usuario demo fue restaurada el 2026-07-13 al
valor documentado abajo y el GH secret E2E_USER_PASSWORD re-sincronizado. Si el login
e2e falla con "Email o contraseña incorrectos", sospecha rotación posterior.
```

**Datos útiles para la próxima sesión:**
- **Supabase project ref:** `jpojusluihjjsjvcubdp`.
- **Vercel:** projectId `prj_qKKQQLDmGREOf0GYHqA4H95tdsFs`, teamId `team_H1wCGwK6JxmFhFUsBf8zd3M8`.
  Preview SSO se saltea con `get_access_to_vercel_url` (MCP).
- **Prod:** www.tjournalx.com. **Usuario demo/E2E:** ariaoc89@gmail.com / `S12bVerify!2026` (GH
  secret `E2E_USER_PASSWORD` igualado). UID demo: `5c69e364-3819-4df7-abf0-f484794250ed`.
- **Migraciones v3.2 aplicadas:** `improvement_scores` (E19), `memory_episodes` (E13, pgvector),
  `memory_patterns` (E14), `memory_identity` (E15), `feed_ignores` (C3).
- **Crons existentes:** dispatch-events, recompute-insights (+snapshot improvement +patterns),
  evaluate-commitments, learning-digest, reviews-digest. **Nuevo sin agendar:** cognitive-digest.
