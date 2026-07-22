# Status — Trading Journal v3.2

> Estado vivo del proyecto. Qué funciona, qué falta verificar, qué falta construir.
> Última actualización: 2026-07-22.
> Arquitectura canónica: `ARCHITECTURE.md` · Qué es el producto: `PROJECT_GUIDE.md`

## Hallazgo de diseño: las protecciones impiden la conducta que los detectores miden (2026-07-22)

> Las dos reglas anti-revancha de aria se desactivaron temporalmente durante la simulación y
> **quedaron restauradas** (`enabled = true`, verificado). No hay acción pendiente.

Al intentar generar volumen con patrón para Fase 2, **tres capas de protección distintas
bloquearon los trades**, cada una correctamente:

1. **Cooldown anti-revancha** (`Bloquear revenge trade` + `Enfriamiento tras una pérdida`):
   `minsSinceLastLoss < 15`. Usa **reloj real** (`Date.now() − lastLoss.createdAt`, ver
   `rules/context.ts`), no la fecha del trade — así que ninguna simulación rápida puede
   registrar una revancha, ponga la fecha que ponga. Disparó `CRITICAL_ALERT` y generó
   notificación: el loop `regla → alerta → notificación` funciona de punta a punta.
2. **Guard de presupuesto diario** (`evaluateBudgetGuard`): rechazó una revancha con **triple
   tamaño** tras dos pérdidas. Aritmética verificada: margen restante 2.39 %, riesgo del trade
   4.02 % → bloqueo. Exactamente su propósito.
3. **Guard de margen** en el formulario: deshabilita el submit si el margen requerido supera
   el balance.

**La consecuencia es estructural, no un bug.** El detector de *oversizing* necesita ≥20 % de
trades post-pérdida sobredimensionados, y el de *revenge* ≥30 % de post-pérdida. En una cuenta
con las protecciones puestas **esas muestras no se pueden acumular**: el producto impide la
conducta antes de que llegue a ser un patrón. Los detectores correspondientes son, por diseño,
inalcanzables en una cuenta protegida — y eso explica en parte por qué `interventions` sigue
vacía en producción.

Los únicos detectores que pueden alcanzar umbral sin desmontar protecciones son los que **no
chocan con ningún guard**: `intraday-decay` (trades tardíos) y `off-plan` (checklist sin marcar).

⚠️ **Nota sobre el guard de presupuesto:** estaba prácticamente inerte antes de #154. Con el
riesgo infravalorado ×20 casi nunca alcanzaba el umbral; al corregir el `point_value` empezó a
bloquear de verdad. Su comportamiento actual es nuevo en la práctica, aunque el código sea viejo.

## Auditoría de la matemática de riesgo (2026-07-22)

Tres defectos de la misma familia aparecieron seguidos al simular en aria. Se auditaron
**todos** los sitios que calculan riesgo. Regla que los separa: si la cifra representa
**dinero**, necesita `pointValue`; si es un **ratio**, el factor se cancela y no lo necesita.

| Sitio | Veredicto |
|---|---|
| `trading/services/trade-service.ts:27` (`computeRMultiple`) | ✅ ya aplicaba `pointValue` |
| `components/trades/trade-detail-panel.tsx:301` | ✅ ya lo aplicaba |
| `lib/formulas/risk.ts:38` (`calcRMultiple`) | ✅ correcto — ratio, se cancela |
| `components/trades/register-trade-modal.tsx:332` (`calcRR`) | ✅ correcto — ratio, se cancela |
| `trading/services/trade-derivation.ts:47` (`deriveRiskAmount`) | 🔴 **arreglado (#154)** |
| `rules/context.ts:66` (`riskPct` de reglas) | 🔴 **arreglado (#154)** |
| `analytics/services/dashboard-analytics.ts:515` (`avgPlannedRisk`) | 🔴 **PENDIENTE** |

**Lo que queda pendiente y por qué.** `avgPlannedRisk` se muestra en `tab-operador.tsx:295`
como `$${valor}` con el subtítulo "riesgo en $ al abrir el trade": es **dinero mal calculado
y visible al usuario**, infravalorado por el multiplicador del instrumento (×20 NQ, ×50 ES,
×100 GC, ×1000 CL). No entró en #154 porque exige llevar `pointValue` hasta `MinimalTrade`
y la consulta de `dashboard-service`, que es otra tubería. El `riskRewardRatio` de al lado
**sí es correcto**: es un ratio.

Los tres defectos comparten causa: el proyecto aprendió la lección del `pointValue` para el
**P&L** (ver el comentario en `trade-write-service.ts`, ruta de cierre) y nunca la trasladó
al **riesgo**.

## Resultado de la simulación de trader en aria (2026-07-22)

Ejecutadas las fases 0-3 del plan (`docs/superpowers/plans/2026-07-21-simulacion-trader-aria.md`).
**15 trades sintéticos**, todos con tag `sim:2026-07-22`. Estado final de aria: 67 trades,
10 insights activos (3 con estadística bayesiana), 2 compromisos, 1 regla derivada,
1 refuerzo, 2 intervenciones, 15 eventos en la outbox, 2 patrones de memoria.

### El hallazgo principal: la captura psicológica es lo que enciende la maquinaria

Tres detectores que **no podían existir** aparecieron en cuanto hubo trades con emoción:

| Detector | Hallazgo |
|---|---|
| `emotion-before-loss` | "La frustración/ansiedad aparece antes del 66.7 % de tus pérdidas" |
| `emotion-performance` | "Tus pérdidas aumentan cuando operas en estado emocional negativo" |
| `violation-emotion` | "Tus violaciones de reglas se asocian a `anxious`" |

Los 52 trades históricos tienen **cero emociones capturadas**. Estos tres correlacionan emoción
con resultado, así que llevaban desde siempre estructuralmente mudos — no por falta de volumen,
sino porque nadie había capturado nunca el dato que necesitan. **Bastaron 15 trades con
psicología.** Es la validación que ningún fixture podía dar (#151 probó la maquinaria; esto
prueba que el gesto de capturar es lo que la activa).

### Loop conductual: validado en vivo, de punta a punta

`insight → compromiso → regla → verificación`, ejercitado por primera vez contra producción:

- **Badge de confianza visible**: `confianza 92% · n=14` sobre `intraday-decay`. Tres insights
  llevan estadística bayesiana (`intraday-decay` 0.920, `weekday-discipline` 0.956); el resto
  con `confidence` nulo, como corresponde.
- **CTA "Comprometerme"** crea el compromiso inline, sin diálogo.
- **`linkRule` rechaza `off-plan`** con *"Este compromiso no se puede proteger con una regla
  automática"* (400). **Es correcto, no es un bug** — no es prevenible pre-trade. Reportarlo
  como defecto habría sido el falso positivo que el plan anticipaba.
- **`linkRule` acepta `intraday-decay`** → crea la regla "Máx. 2 trades por día"
  (`TRADE_PRE_CREATE`, enabled), visible en `/reglas` con su badge **"desde compromiso"**.
- **`Verificar ahora`** marcó el compromiso off-plan como `broken` — correcto: 16 trades
  off-plan contra objetivo 0.
- **Outbox**: 15 eventos acumulados en `pending`, que es lo correcto con el dispatcher
  des-agendado hasta S4. *(Una observación intermedia de que "el camino de trades no publica
  eventos" resultó FALSA: se midió antes de que corriera el recompute.)*

### `OI-7.3` deja de ser no-validable

`interventions` pasó de vacía a 2 filas. La intervención de cascada saltó sola tras 3 pérdidas
en un día, con el ciclo completo registrado:

```
trigger: cascade · severity: critical
scores: { urgency 0.95, severity 0.9, confidence 0.85, expectedImpact 0.6 }
status: active → responded · response: dismissed · outcome: overridden
```

El `expectedImpact` estático ya tiene una fila real y un desenlace contra el que contrastarse.

### Defectos encontrados y corregidos

Cuatro PRs, todos mergeados y verificados en producción:

| PR | Defecto | Consecuencia que tenía |
|---|---|---|
| **#152** | `riskPct` derivaba contra `initialBalance` (0 en 3 de 5 cuentas) | `risk_pct` NULL en **53 de 53** trades |
| **#153** | `buildContext` dividía por `initialBalance` en 3 campos | `riskPct`/`dayPnlPct`/`weekPnlPct` = **cero constante** en reglas |
| **#154** | El riesgo en dinero ignoraba el `point_value` | Riesgo **×20 subestimado** en NQ (0.07 % vs 1.3 % real) |
| **#155** | Los crons esperaban 5 s por trabajos de 60-300 s | El job se ejecutaba pero se registraba como fallido |

Los tres primeros convergían en el mismo punto: `verifyOversizedTrades` reportaba *"cumplimiento
perfecto"* pasara lo que pasara, fabricando refuerzo positivo falso. Ninguno tenía cobertura:
`createTrade` y `buildContext` no tenían **un solo test directo** — así sobrevivieron.

### Lo que NO se pudo verificar

- **`revenge` y `oversizing` no alcanzaron umbral**, y es estructural: ver la sección anterior
  sobre protecciones. No es un fallo de la simulación.
- **El nudge de emoción de #141 sigue sin verse en vivo.** Está localizado
  (`trade-detail-panel.tsx:458`, dentro del formulario de cierre, no del panel) y el helper de
  simulación ya está corregido, pero ningún trade llegó al cierre sin emoción previa: el que iba
  a probarlo lo bloqueó una regla. **Pendiente.**
- **Fases 4 y 5 no ejecutadas**: las 5 features de IA y el recorrido de superficies analíticas.
- **`avgPlannedRisk`** (`dashboard-analytics:515`) sigue mal por el `point_value` — ver la
  auditoría de riesgo más arriba.

### Lo que esto NO prueba

Que a un trader le compense el gesto de capturar psicología. Eso sólo lo contesta alguien
operando de verdad, con dinero y sin saber el resultado. Lo que sí queda probado es que **si lo
captura, el sistema responde**: tres detectores nuevos con 15 trades.

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
| `S0/OI-1` | S0 | Migración `20260625120000` sin replay local; falta confirmación CI (`supabase db reset`). | CI / G1 | ✅ resuelto — auditado 2026-07-21. `ci.yml:169` tiene el step **"Replay from zero (db reset)"** (`supabase db reset`) en el job `migrate-validate`, que corre en **cada** CI; la migración `20260625120000_v3_s0_outbox_and_insights.sql` está presente y por tanto se re-aplica desde cero cada vez. La fila estaba stale desde #139. |
| `S0/OI-2` | S0 | Spike end-to-end del outbox (recompute → `insight.created` → dispatch → `processed`) en entorno con DB. Valida ADR-001 a coste medido. | G1 (antes de S4) | ✅ resuelto — auditado 2026-07-21. El spike **es** la suite de integración que #146 añadió: `ci.yml:197-209` corre `vitest --config vitest.integration.config.ts` contra la BD recién migrada, con `persistInsights` emitiendo a la outbox en una tx y `dispatchPending` drenando+idempotente. Gate **G1 cerrado**. |
| `S0/DT-1` | S0 | **`sample_size` es coarse** (= nº total de trades, no n por detector). | Media · Los detectores existentes no exponen n. Refinar cuando se reescriban los detectores con la capa Bayesiana (S3). Honesto pero impreciso. | ✅ parcialmente resuelto — auditado 2026-07-17. El estimador Bayesiano de S3 (`proportionEstimate`) ya corre en `toComputedInsight`: con `stat`, `sampleSize` se refina al n por-detector (`est.sampleSize`). Residual: los detectores sin `stat` siguen con el n coarse (cobertura = OI-3.3/3.5). |
| `S0/DT-2` | S0 | **Campos Bayesianos nulos** (`confidence`, `credible_interval_*`, `effect_size`). | Media · Por diseño (ADR-002): las columnas existen, el estimador es S3. Riesgo: que algún consumidor asuma que están llenos. Mitigar documentando "nullable hasta S3". | ✅ parcialmente resuelto — auditado 2026-07-17. `toComputedInsight` corre `proportionEstimate` y rellena `confidence`/`credibleIntervalLow/High`/`effectSize` para detectores con `stat` (intraday-decay, weekday-discipline). El "nulo por diseño hasta S3" quedó viejo. Residual: cobertura de `stat` (OI-3.3/3.5). |
| `S0/DT-3` | S0 | **Capa DB sin tests de integración** (`publishEvent`/`persistInsights`/`dispatchPending`). | Media · Bloqueado por falta de DB local. Añadir tests con DB efímera (testcontainers/Supabase local) cuando el entorno lo permita. | ✅ resuelto — 2026-07-17 (rama chore/s0-s2-audit-closure). Arnés de integración (supabase local, reusando el job de migraciones de CI) + 5 tests contra Postgres real: `persistInsights` crea+emite en una tx, touch/resolve, y **rollback atómico real** (FREEZE-D6, imposible con los mocks previos); `dispatchPending` drena+idempotente. Guard que rechaza `DATABASE_URL` no-local. La excusa "bloqueado por falta de BD local" quedó vieja (#139 trajo el stack local). |
| `S0/DT-4` | S0 | **Doble mantenimiento SQL ↔ `schema.prisma`.** | Baja · Patrón ya existente en el repo (56 migraciones). Riesgo de drift si se edita uno sin el otro. Un check de drift en CI lo cerraría. | ✅ resuelto **de verdad** — 2026-07-16 (PR #139). **El cierre anterior era falso en dos ejes.** (1) El doc decía `prisma migrate status`; lo que se implementó fue `supabase db push --dry-run`. (2) Ese comando **no puede fallar**: `db push` compara las migraciones contra el *historial* de la BD destino, y los dos pasos previos del job (`supabase start` + `db reset`) acababan de aplicarlas todas → siempre "nada que aplicar". Nunca abría `schema.prisma`. **El drift real se acumuló detrás de ese verde**: faltaban la tabla `resource_reviews` y **18 columnas** en `supabase/migrations/`, presentes en prod y en `schema.prisma` → `supabase db reset` producía una BD contra la que la app **no arranca** (`column onboarding_completed of relation users does not exist`). Nadie lo vio porque nadie reconstruye desde cero. Arreglado con la migración de reconciliación `20260716210000` (todo `IF NOT EXISTS` → no-op en prod) + `scripts/check-schema-drift.sh`, verificado en ambas direcciones (rojo en main pre-fix nombrando tabla+18 columnas, verde tras la migración). El gate compara **solo tablas y columnas**: índices/FKs/tipos difieren por diseño (~325 líneas) y gatearlos lo dejaría rojo permanente. 4 excepciones en allowlist con su motivo (`app_settings` + 3 columnas pgvector). También se eliminó el modelo muerto `TradeEmbedding` (mapea a una tabla que no existe en ningún lado y nadie usa). |
| `S0/DT-5` | S0 | **`recomputeInsights` recalcula sobre "todos los trades"** (no incremental). | Baja-media · Aceptable para un job diario en S0; el worker incremental sobre deltas (NFR coste, FREEZE §RI-4) es S6/S7. No usar este job en el camino de intervención. | ✅ auditado 2026-07-17 — sigue por diseño (S6/S7): `recomputeInsights` procesa `bundle.raw.trades` completo; aceptable para el job diario, no en el camino de intervención. |
| `S0/DT-6` | S0 | **`generatePsychologyInsights` y `generateInsights` podrían compartir categorías** sin coordinación de fingerprint. | Baja · Cubierto hoy por el dedupe (D-S0-7), pero si dos detectores deben coexistir con el mismo slug habría colisión silenciosa (se queda el primero). Revisar al ampliar detectores. | ✅ auditado 2026-07-17 — sin colisión hoy: `generatePsychologyInsights` emite 6 ids distintos y `generateInsights` otros; el dedupe por fingerprint cubre. Riesgo latente, no deuda. |
| `S0/R-1` | S0 | **Fast-path síncrono de intervención** aún no existe; el outbox solo da entrega diferida. C1 sigue sin su mecanismo de "momento del error". | RI-1 / ADR-001 · S7 (productor en `trade.create`) | ✅ resuelto — auditado 2026-07-21. El fast-path **sí existe**: `trade-write-service.ts:375` llama `runIntervention` best-effort ≤2s al realizar pérdidas ("S7 fast-path"), exactamente el SLA de FREEZE-D5; el cliente lo lee vía `intervention.active`. La fila ("aún no existe") quedó vieja con S7. Residual: el lado **entrada** (oversizing en `trade.create`) sigue abierto y ya está trackeado como `OI-7.4`. |
| `S0/R-2` | S0 | **Coste del job a escala** (recompute por usuario × detectores) sin caché incremental de contexto. | RI-4 · S3/S6 (FREEZE-D7) | ✅ auditado 2026-07-21 — **diferido por diseño**, igual que `S0/DT-5` (del que es el gemelo en clave de riesgo): el worker incremental sobre deltas es S6/S7 por FREEZE-D7. Además el riesgo es hoy teórico: prod tiene 137 trades y 3 usuarios (ver `B-05`). No es deuda accionable. |
| `S0/R-3` | S0 | **Dispatcher no programado** → si se programa antes de tener consumidores, drena eventos. Debe programarse **junto con** el primer consumidor (S4). | D-S0-3 · S4 | 🔴 **RIESGO MATERIALIZADO — auditado 2026-07-21.** Pasó justo lo que la fila advertía. El cron `v3-dispatch-events` se agendó en la migración `20260626140000_schedule_v3_crons.sql` y está activo, pero **`registerHandler` no tiene ni un solo call-site** en todo `src/` (solo su propia definición en `event-bus.ts:114`) — los consumidores son S4 y no existen. Y `dispatchPending` trata "sin handler" como éxito (`event-bus.ts:156-157`: lista vacía → `outcome.ok = true` → `processed`), decisión deliberada y documentada ("el catálogo puede adelantarse a sus consumidores sin bloquear la outbox"). **Efecto medido en prod (2026-07-21):** los 7 eventos publicados jamás (`insight.created` ×6 del 26-jun, `commitment.created` ×1 del 28-jun) están **todos en `processed`**, con 0 `pending` y 0 `failed`, sin que ningún consumidor corriera. **Impacto hoy: bajo** (7 eventos de un periodo de pruebas, y no hay consumidor que se los perdiera). **Impacto hacia adelante: permanente** — todo evento publicado desde ahora hasta que aterrice el primer consumidor de S4 se quema y no es replayable. Ver la nota de acción bajo la tabla. |
| `S0/R-4` | S0 | **Rigor estadístico** aún ausente (columnas vacías). Mostrar insights sin confianza puede reintroducir R6 si la UI los trata como ciertos. **No exponer en UI hasta S3.** | RI-3 / ADR-002 · S3 | ✅ cumplido — auditado 2026-07-21. Su premisa ("columnas vacías") ya la contradicen `DT-1`/`DT-2`: `toComputedInsight` rellena `confidence`/`credibleInterval*`/`effectSize` para los detectores con `stat`. Y la condición "no exponer hasta S3" **se respetó**: S3 está hecho y `behavior-loop-panel.tsx:201-202` renderiza `confianza X% · n=Y` **guardado por `i.confidence != null`** y mostrando el tamaño de muestra al lado — que es justo la mitigación que R6 pedía (no presentar el insight como cierto). Residual = cobertura de `stat` (`OI-3.3`/`OI-3.5`). |
| `S0/R-5` | S0 | **Migración de reglas (C6)** intacta — sigue siendo el riesgo alto de S1 (fusión semántica). | RI-2 · S1 | ✅ resuelto — auditado 2026-07-21. Lo cerró el cutover G2 (#129, 2026-07-13): `rules` es fuente única, `automations` archivada. Duplica lo ya registrado en `S1/DT-1`/`S1/R-1`. |
| `S0/R-6` | S0 | **Privacidad de memoria** (ADR-003) registrada pero no implementada; ningún sprint puede introducir memoria plana editable por LLM. | RI-12 · S6 | ✅ invariante cumplido — auditado 2026-07-21. Lo irreversible de ADR-003 es la frontera anti-poisoning ("LLM propone, datos confirman"), y **está en el schema**: la memoria nace con `status = proposed` y solo el usuario la confirma — no hay memoria plana editable por LLM. Coincide con lo que ya declara `GAP-E1` (§1). Lo que falta (cifrado en reposo + opt-out de envío) es explícitamente `OI-6.3`, roadmap, no deuda de S0. |
| `S0/BIZ-1` | S0 | **Aislamiento de datos cross-user (POST-3 del freeze):** ¿el esquema debe permitir aprendizaje poblacional anónimo futuro? Afecta cómo se modelan tablas desde ya. | Habilitar el moat (§7 del Challenge) más tarde = migración de datos + consentimiento. Decidir antes de S4 (cuando nacen `Intervention`/`Commitment`, los datos del moat). | ✅ **ya estaba decidido** — auditado 2026-07-21. `ADR-004` (`ARCHITECTURE.md:455`) está **Aceptada, Decisión B (reservar)**, fechada 2026-06-25 — es decir, se decidió *antes de S4* como el propio ítem exigía. Y no quedó en papel: `users.data_sharing_consent` **existe en prod** (boolean, default `false`, migración `20260625150000`), verificado por SQL. No requiere acción tuya; la fila estaba stale. |
| `S1/OI-1` | S1 | Revisar el **informe de no-mapeo** (`/api/cron/rules-migration-report`) con datos reales: triar `descriptiveWithoutEnforcement` (falsa protección) y `ambiguousAutomations`. | G2 (revisión humana) | ✅ resuelto — 2026-07-13, informe corrido contra prod (paridad espejo 10/10 perfecta, 0 ambiguas, triaje de 13 falsas protecciones aprobado por el usuario); ver spec G2 §2 |
| `S1/OI-2` | S1 | Diseñar y ejecutar el **cutover**: que `runAutomations` (o su sucesor) lea de `rules` (mode/enforce) en vez de `automations`, con test de no-regresión del bloqueo pre-trade. **Sólo tras OI-1.** | post-G2 | ✅ resuelto — 2026-07-13, flip `RULES_SOURCE=rules` verificado en prod (RULE_BLOCKED por UI; `rules.last_fired_at` bumps, automations quieta); no-regresión en `run-rules.test.ts` |
| `S1/OI-3` | S1 | Tras verificar paridad, **deprecar/retirar `automations`** (P9: conservar hasta verificar). | post-cutover | ✅ resuelto — 2026-07-13, rama `feat/g2-rules-cutover`: engine solo-`runRules`, `/reglas` edita `rules`, router/dual-write/informe retirados; tabla `automations` archivada intacta (P9) |
| `S1/OI-4` | S1 | Replay de la migración `20260625130000` en CI. | CI | ✅ resuelto — auditado 2026-07-21. Mismo respaldo que `S0/OI-1`: `supabase db reset` (ci.yml:169) re-aplica **todas** las migraciones desde cero en cada CI, y `20260625130000_v3_s1_unify_rules.sql` está presente. |
| `S1/DT-1` | S1 | **Doble fuente temporal de reglas** (`automations` enforza; `rules` tiene copias inertes). | Media · Inherente a la migración no destructiva. Se resuelve con el cutover (OI-2) + retiro de `automations` (OI-3). Mientras tanto, editar una automatización **no** actualiza su copia en `rules` (la copia es un snapshot del backfill). | ✅ resuelto — cutover G2 2026-07-13: fuente única `rules` (el dual-write de S1.5 mantuvo el espejo; paridad 10/10 verificada antes del flip) |
| `S1/DT-2` | S1 | **Backfill = snapshot**, no sincronización viva. | Media · Si el usuario edita automatizaciones tras la migración, `rules` queda desfasado hasta el cutover. Aceptable porque `rules` es inerte; documentar para no confiar en esas filas antes de G2. | ✅ resuelto — cutover G2 2026-07-13: `rules` es la fuente editable y de enforcement; el snapshot dejó de existir como concepto |
| `S1/DT-3` | S1 | **2 plantillas gated** (`no-size-increase-after-loss`, `no-trade-low-energy`). | Baja · Esperan campos de S2 (contexto trade anterior) y S8 (energía). Activarlas es añadir el campo al registro + `available:true` + `rule`. | ✅ auditado 2026-07-17 — correcto por diseño (FREEZE-P3): `available:false` gatea las 2 plantillas hasta que exista su capacidad (contexto trade anterior / energía S8). No es deuda. |
| `S1/DT-4` | S1 | **`source_commitment_id` sin FK** (Commitment no existe hasta S4). | Baja · Añadir FK cuando nazca `Commitment` (S4/S5). | ✅ resuelto — 2026-07-17. FK `rules.source_commitment_id → commitments(id)` ON DELETE SET NULL + índice (migración `20260717120000`), relaciones Prisma nombradas. Guard defensivo de refs colgantes. ⚠️ **Corrección 2026-07-21:** este cierre decía "hoy la columna está vacía: OI-4.1 sin construir" — **falso**. `linkRule` está construido (`rule-suggestion-service.ts:51`), expuesto en el router y usado por la UI, y **puebla `sourceCommitmentId`** (L63). La columna está vacía porque nadie usó la feature todavía (1 commitment en prod), no porque falte código. |
| `S1/DT-5` | S1 | **Badge sólo en `app/reglas`** (lista de automatizaciones). | Baja · Cuando exista la superficie PROTEGER (S12) y el cutover, el badge debe reflejar `rule.mode` directamente, no `classifyMode(actions)`. | ✅ resuelto — cutover G2 2026-07-13: `/reglas` renderiza `<RuleModeBadge mode={r.mode}>` desde `rules.list` |
| `S1/DT-6` | S1 | **Plantillas de protección aún no expuestas en la galería de UI** (`automations.templates`). | Baja-media · `PROTECTION_TEMPLATES` existe y está testeado, pero la galería actual usa `TEMPLATES` (automatizaciones). Integrarlas en la UI de creación es trabajo de S1.5/S12. | ✅ resuelto — tsc + suite — 3 plantillas de protección en la galería (closeout S0–S2) |
| `S1/R-1` | S1 | **Falsa protección no resuelta hasta G2.** El informe la detecta, pero las reglas CRÍTICA descriptivas siguen sin bloquear hasta el cutover. | RI-2 / R3 · G2 (OI-1/OI-2) | ✅ resuelto — triaje OI-1 2026-07-13: 3 descriptivas tienen protección real en risk-enforcement, 3 no son enforceables hoy (aviso honesto); cutover ejecutado |
| `S1/R-2` | S1 | **Cutover es el momento de máximo riesgo** (cambiar la fuente del bloqueo pre-trade). | RI-2 · OI-2 con test de no-regresión obligatorio | ✅ resuelto — mitigado con flip por env var (rollback sin deploy) + verificación observable en prod + invariante `run-rules.test.ts` |
| `S1/R-3` | S1 | Heredados de S0 sin cerrar: **G1** (replay S0 + spike outbox) y **BIZ-1** (aislamiento de datos cross-user, antes de S4). | OPEN_ITEMS_SPRINT_0 · CI / antes de S4 | ✅ resuelto — auditado 2026-07-21. Fila puramente derivada: **G1** queda cerrado por `S0/OI-1` + `S0/OI-2` y **BIZ-1** por `ADR-004`. Sin contenido propio. |
| `S2/OI-1` | S2 | Mostrar el **incentivo D10** al capturar emoción (`feedbackForEmotion` → "tu WR ansioso es 33% en 6 trades"). | Lógica lista; falta el componente en el formulario de cierre/captura. | ✅ resuelto — 2 tests + render — `EmotionInsight` en el modal de registro (closeout S0–S2) |
| `S2/OI-2` | S2 | **Nudge #10** al cerrar sin emoción (`needsEmotionNudge`). | Lógica lista; falta el prompt 1-tap. | ✅ resuelto — 2026-07-16 (PR #141). El nudge **ya existía**, pero decía "añádelo al editarlo": pedía la señal y te mandaba a otra pantalla a darla, que es justo cómo se pierde. Ahora los chips van **dentro del nudge** y viajan con el cierre (`trades.close` acepta `emotionBefore`, persistido solo si viene: cerrar no revela nada nuevo sobre cómo entraste, así que **nunca pisa** una emoción ya registrada). `needsEmotionNudge` deja de ser código muerto — se evalúa contra el estado al que el trade **está por entrar** (sigue `OPEN` mientras el form está en pantalla; cablearlo con el status vivo lo habría escondido para siempre). De paso: el catálogo de emociones pasó de **6 definiciones a 1** (`domains/trading/emotions.ts`). 4 tests de componente + 4 de router. |
| `S2/OI-3` | S2 | **Pre-fill** de `session`/`riskPct` en el formulario (`deriveSession`/`deriveRiskPct`), editable inline. | Helpers listos; falta llamarlos en el form. | ✅ **ya estaba hecho** (verificado 2026-07-16) — `deriveSession` se llama en `register-trade-modal.tsx:289` y `deriveRiskPct` en `trade-write-service.ts:162` (servidor, cerrando el hueco de import/API que anotaba `S2/DT-1`). El "falta llamarlos" del doc era falso. |
| `S2/OI-4` | S2 | Mostrar **sugerencias de tags** (`suggestTagsFromNote`) como chips confirmables. | Core listo. | ✅ resuelto — 4 tests + render — `NoteTagSuggestions` bajo Notas (closeout S0–S2) |
| `S2/OI-5` | S2 | Inputs de **MAE/MFE** y selector de **regime** en el formulario. | Columnas + input del router listos. | ✅ **ya estaba hecho, y el ítem estaba mal ubicado** (verificado 2026-07-16) — no van "en el formulario" (el de registro crea trades **abiertos**; MAE/MFE son excursiones máximas y **no existen hasta que el trade corrió**). Viven donde corresponde: el **cierre**, en `trade-detail-panel.tsx` (MAE L400, MFE L412, régimen L427), cableados a `trades.close`. |
| `S2/DT-1` | S2 | **`riskPct` se deriva en cliente**, no en servidor. | Media · Si una integración crea trades sin pasar por el form (import/API), `riskPct` quedará null. Fallback: derivar en `trades.create` usando el balance de la cuenta. | ✅ resuelto — tsc + suite — `trades.create` deriva `riskPct` (closeout S0–S2) |
| `S2/DT-2` | S2 | **`sample_size` del feedback emocional es el total por emoción**, sin ventana temporal. | Baja · Aceptable para el incentivo. Una versión "últimas 4 semanas" se apoya en `rollingWindow` (S0) — futuro. | ✅ auditado 2026-07-17 — diferido: `feedbackForEmotion` usa el total por emoción; la versión con ventana se apoya en `rollingWindow` (existe, no cableado aquí). Bajo, aceptable. |
| `S2/DT-3` | S2 | **`deriveSession` ignora timezone**. | Baja · Aproximación editable documentada. Mejorará cuando el trade capture timezone/UTC real. | ✅ auditado 2026-07-17 — aproximación documentada: `deriveSession(openTime)` ignora timezone; mejora cuando el trade capture UTC real. |
| `S2/DT-4` | S2 | **Auto-tagging sólo determinista** (keywords). | Baja · Cobertura limitada de lenguaje; la capa LLM (enriquecimiento) es posterior. | ✅ auditado 2026-07-17 — deliberado (FREEZE-P2): `suggestTagsFromNote` es keyword matcher; la capa LLM de enriquecimiento es posterior. |
| `S2/DT-5` | S2 | **`evaluateChecklist` no está cableado en `trades.create`** para auto-taggear "Off-plan". | Media · La función existe y está testeada; falta invocarla en la mutación para añadir el tag automáticamente. | ✅ resuelto — tsc + suite — `saveChecklistResult` auto-taggea Off-plan (closeout S0–S2) |
| `S2/R-1` | S2 | Si la UI no expone el incentivo (OI-1), C7 vuelve a ser "captura sin retorno" → reaparece R2. **El valor de S2 depende del wiring.** | UI follow-up | ✅ resuelto — auditado 2026-07-21. Fila condicional cuyo antecedente ya no se cumple: `S2/OI-1` está ✅ (`EmotionInsight` en el modal de registro), así que el incentivo **sí** está expuesto y C7 tiene retorno. |
| `S2/R-2` | S2 | Heredados sin cerrar: **gate G2** (cutover de reglas, S1), **gate G1** (replay S0 + spike outbox), **BIZ-1** (aislamiento de datos cross-user, antes de S4). | CI / antes de S4 | ✅ resuelto — auditado 2026-07-21. Derivada: **G2** cerrado por el cutover (#129), **G1** por `S0/OI-1`+`S0/OI-2`, **BIZ-1** por `ADR-004`. Sin contenido propio. |
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
| `OI-4.8` | S4 | **Más specs insight→commitment** (revenge/oversizing/off-plan necesitan sus detectores) | hoy solo `intraday-decay` tiene detector + spec; los otros 3 verificadores existen, faltan sus detectores | ✅ resuelto — 2026-07-17 (PR #144). Verificado en código que era la deuda: `commitment-machine` tenía 4 specs y `verifiers.ts` los 4 verificadores, pero `insights-engine` **solo emitía `intraday-decay`** → `canCommit` solo era true para ese. Añadidos 3 detectores puros (`detectRevengeTrading`/`detectOversizing`/`detectOffPlan`) que emiten los ids exactos; como `toComputedInsight` mapea `id→type`, verificador+compromiso+regla (ya construidos) se encienden sin más cambios. Señal híbrida: gate rico tras-pérdida (revenge=Impulsivo/revengeFlag, oversizing=size>2×avg) + espejo del verifier para off-plan (tags). `stat` Bayesiano omitido a propósito (alarmas de frecuencia, no dos-muestras; R6). 13 tests (3/detector + round-trip que prueba `canCommit`+guard de cobertura de los 4 loops). Suite 1204/1204, tsc/eslint limpios. Desplegado (b6ec448), 0 errores runtime; **vivo pero dormido** hasta que un usuario tenga los patrones (datos de prod planos). Spec+plan en `docs/superpowers/`. |
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

### Acción pendiente de la auditoría del 2026-07-21: `S0/R-3` (outbox drenada sin consumidores)

La ronda de auditoría de los `R-x`/`OI-x` de S0–S2 cerró **12 de 13 filas como stale** (ver la tabla).
La única que sobrevivió es `S0/R-3`, y no como sospecha sino como **riesgo ya materializado**: el cron
`v3-dispatch-events` lleva agendado desde el 26-jun sin que exista **ningún** consumidor registrado,
y `dispatchPending` marca `processed` todo evento sin handler. En prod, los 7 eventos publicados
están los 7 en `processed`.

**Por qué importa aunque hoy el daño sea 0:** no se perdió nada *funcional* (no hay consumidor que
se lo perdiera), pero la outbox dejó de ser un registro replayable. Cuando aterricen los consumidores
de S4, no van a poder reconstruir nada de lo anterior — y todo evento que se publique de aquí a
entonces se quema igual. El coste crece solo con el tiempo.

**Opciones, de menor a mayor esfuerzo:**

1. **Des-agendar `v3-dispatch-events` hasta el primer consumidor de S4.** Es literalmente lo que la
   fila `S0/R-3` prescribía ("programarlo **junto con** el primer consumidor"). Una migración que
   haga `cron.unschedule`. Barato y reversible.
2. **Dejar `pending` los tipos sin handler** en vez de marcarlos `processed`. Preserva la outbox como
   log replayable. Ojo: contradice el comentario deliberado de `event-bus.ts:131-135` y hace crecer
   la cola sin límite, así que necesitaría un criterio de purga.
3. **No hacer nada** y aceptar que la outbox pre-S4 no es replayable. Defendible —
   son 7 eventos de un periodo de pruebas— pero conviene que sea una decisión explícita y no un
   descuido heredado.

Recomendación: **(1)**, por ser exactamente lo que el diseño pedía y costar una migración.

**Resuelto (2026-07-21) con la opción (1):** migración `20260721190000_unschedule_dispatch_events_until_s4.sql`
des-agenda `v3-dispatch-events`. Los productores siguen escribiendo a la outbox; los eventos ahora
**se acumulan en `pending`** en vez de quemarse. Los 7 ya marcados `processed` no se recuperan — la
migración detiene la hemorragia, no la revierte.

> ⚠️ **Deuda que esto crea, a propósito:** la outbox ya no se drena. Si algún día se publican eventos
> a ritmo alto sin que S4 haya aterrizado, `domain_events` crece sin techo. Hoy es irrelevante
> (7 eventos en 4 semanas), pero **el primer consumidor de S4 debe re-agendar el cron** — el bloque
> `cron.schedule` a restaurar está citado en el encabezado de la propia migración.

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

### Auditoría S3–S14 contra código (2026-07-21) — clasificación en 3 pistas

> Segunda ronda de la auditoría. Mismo método: **el código manda, el doc miente.** Las filas
> `OI-x.y` de arriba **no se editaron una por una** (son 69); esta sección es el veredicto
> vinculante y prevalece sobre su columna Estado.
>
> Hallazgo dominante: **casi todo está construido y cableado.** Lo que parecía deuda es en su
> mayoría *maquinaria viva pero dormida* — prod tiene 137 trades y patrones planos, así que los
> detectores no disparan y las tablas quedan vacías. **Vacío ≠ roto.**
>
> ⚠️ **Corregido el 2026-07-21 por #151** (ver "Fixture conductual" más abajo, que **prevalece**
> sobre este párrafo): eran **13 usuarios, no 3** (10 son cuentas QA), y la causa de los patrones
> planos no es el poco volumen sino que **el dato sembrado no tiene correlación temporal**. La
> conclusión ("vivo pero dormido") se sostiene; la causa que se le atribuía, no.

#### Pista A — Deuda técnica (código que existe y está mal)

| Ítem | Evidencia | Nota |
|---|---|---|
| `DataTable` render loop en dev | §3 | Solo dev, no afecta prod. Único ⬜ real de §3. |
| `TD-037` (34 efectos sync-on-open) | `eslint.config.mjs:26-33` | Auditado en Cycle 1, intencionales, diferido al refactor de key-remount. **No re-descubrir.** |
| Comentario stale en `learning-insights-service.ts:6` | dice que el wiring de `computeNextReview` "es la tarea de superficie de S12" | Mentira: ya está cableado en `learning-resources.ts:245`. Borrar el comentario. |

**La pista A está esencialmente vacía.** `TD-018` y `TD-019` se cerraron; no hay deuda estructural pendiente.

#### Pista B — Funcionalidad a medias (construida pero nadie la llama)

El patrón que la auditoría hizo visible: maquinaria testeada sin call-site. Es el pozo real.

| Ítem | Qué existe | Qué falta |
|---|---|---|
| **Outbox sin consumidores** (`S0/R-3`) | `publishEvent` en 5 call-sites | `registerHandler`: **0 call-sites**. Cron pausado por la migración `20260721190000`. El primer consumidor es S4 → **es trabajo de sprint, no limpieza**. |
| **Cobertura de `stat`** (`OI-3.3`, `OI-3.5`) | `proportionEstimate` + `normalEstimate` testeados | `OI-3.5` **cerrado** (ver abajo). Queda `OI-3.3`: los detectores de MEDIAS necesitan un comparador de dos muestras que **no existe** (`normalEstimate` es de una sola). |
| **`expectedImpact`** (`OI-7.3`) | Factor del scoring en `intervention/engine.ts:54` | Es **estático**; no se aprende de `Intervention.outcome`. **No validable hoy**: prod tiene 0 interventions. |

**Cerrado de esta pista (2026-07-21):**

- **`OI-3.5` — cobertura de `stat`.** `detectOverconfidence` ya comparaba la WR de alta confianza
  contra la media global (Bernoulli con baseline) pero no exponía `stat`; ahora sí, y su `n` pasa de
  coarse (20) a por-detector (10). ⚠️ **El ítem sugería "setup concentration" como candidato y esa
  sugerencia es incorrecta**: su métrica es un cociente de DINERO, no `successes/trials`; un
  intervalo Beta-binomial ahí afirmaría certeza que el dato no soporta (**R6**). Los criterios de
  inclusión/exclusión quedaron documentados junto al tipo `InsightStat` en `insights-engine.ts`.

**Corrección — `OI-13.1` NO pertenecía a esta pista.** La primera versión de esta sección afirmaba
que nada consumía `feed_ignores`. **Falso, y el error fue de método**: el grep buscaba
`feedIgnore|listIgnores|signalKey` y un path `domains/today/` que no existe (es
`domains/cognitive/today/`), así que no vio al consumidor, que expone `getIgnoreCounts`. El loop
está **cerrado de punta a punta**: `today.ts:16` (`dismiss` → `recordIgnore`) →
`today-service.ts:141-143` (`getIgnoreCounts` → `s.ignored`) → `feed.ts:71`
(`ignorePenalty` aplicado en el ranking). Las 0 filas en prod significan que nadie descartó nada.
**Va a la Pista D (stale).**

#### Pista C — Roadmap / backlog (no construido, por diseño)

Congelado por FREEZE o esperando su disparador. **No es deuda.**

- **Superficies UI:** `OI-3.1`, `OI-3.2` (mapper + cuadrante institucional), `OI-9.1`, `OI-10.1`, `OI-11.1`, `OI-4.4`, `OI-5.4` → S12/S13 con DS v3.
- **Bloqueado por `SetupEdgeSnapshot`** (que **no existe como modelo**, solo se menciona en comentarios): `OI-4.3` (verificador edge-decay), `OI-10.3`.
- **Enforcement no construido:** `OI-9.2` (bloqueo duro por budget — ojo: `GAP-A1` cerró el *guard* forward-looking, **no** el bloqueo), `OI-7.4` (intervención en `trade.create`), `OI-5.2` (off-plan warn), `OI-8.2` (`no_go` → regla stop).
- **`OI-9.3` (`aggregateCapAmount` como setting de usuario) — reclasificado de Pista B a C el
  2026-07-21.** El código está verificado como genuinamente inerte: es input del router
  (`risk.ts:15-16`), no hay columna en `schema.prisma` ni migración, y ningún llamador lo pasa →
  siempre `null`, así que `aggregateFreezeSignal` sale por el early-return de
  `correlation.ts:98`. **Pero su bloqueo real es una superficie que no existe.** Es un control de
  riesgo *cross-cuenta*: no encaja en `/cuentas` (parámetros por cuenta) y meterlo en `/perfil`
  sería inventarle ubicación para poder tachar una casilla. Nace con **PROTEGER (S13)**, junto a
  `OI-9.1` y `OI-9.2`, que es donde el propio ítem lo scopeaba. **No es deuda: es roadmap con
  dependencia de UI.**
- **Memoria:** `OI-6.3` (cifrado), `OI-6.4`, `OI-6.5`, `OI-6.6` (`thread.summary` — 0 call-sites).
- **Absorción de pantallas (A3):** `OI-11.6`, `OI-13.3`. Verificado en `app/`: `mercados`, `etiquetas` y `notificaciones` **siguen existiendo** como rutas propias, y no hay `/hoy` `/operar` `/analizar` `/proteger` `/mejorar`. Las filas son exactas.
- **Resto:** `OI-10.4`, `OI-10.6`, `OI-11.4` (`transferBaseline`: 0 call-sites), `OI-11.5`, `OI-14.2`..`OI-14.5`, `OI-8.3`, `OI-3.4`.
- **Verificaciones live e2e** (`OI-8.5`, `OI-9.7`, `OI-10.7`, `OI-11.7`, `OI-13.6`): dependen de que existan las superficies. No son trabajo independiente.

#### Pista D — Stale: filas que el código desmiente (cerrar en el doc)

| Fila | Evidencia en código / prod |
|---|---|
| `OI-4.1` `linkRule` | **Construido y completo:** `rule-suggestion-service.ts:51`, expuesto en `behavior.ts:20` y usado por la UI (`behavior-loop-panel.tsx:48`). Y **sí puebla** `sourceCommitmentId` (L63) — la nota de `S1/DT-4` que dice "OI-4.1 sin construir" es **falsa**; la columna está vacía por falta de uso (1 commitment en prod), no por falta de código. |
| `OI-4.2` `suggestRulesFromInsights` | Construido y **corriendo**: llamado desde `recompute-insights.ts:40`. Prod tiene 1 `rule_suggestion` (29-jun) → produjo de verdad. |
| `OI-4.6` scheduling de crons | Los **6** endpoints de `app/api/cron/` tienen su `cron.schedule` en migraciones. Nada pendiente. |
| `OI-4.7` insights poblados en prod | El cron corre; prod tiene 6 insights (26-jun). **Dormido por datos planos, no roto.** |
| `OI-5.5` `generateSuggestions` agendado | Ya corre dentro del cron: `recompute-insights.ts:40`. |
| `OI-6.1` / `OI-7.2` auto-extracción LLM | `proposeMemories` llamado en `coach-memory-service.ts:163` con los hechos extraídos. Coincide con la nota "cerrado por PR #103". |
| `OI-8.1` disposition effect (#40) | `detectHoldingAsymmetry` definido (`psychology-insights.ts:83`) **y llamado** (L147). |
| `OI-11.2` `computeNextReview` | **Cableado** en la mutación de grade: `learning-resources.ts:245`. `GAP-A2` tenía razón; la fila `OI-11.2` no. |
| `OI-13.5` productor de Reinforcement | `planReinforcement` llamado en `commitment-service.ts:194` + `tx.reinforcement.create` (L204). Prod: 0 filas — dormido, no ausente. |
| `OI-14.1` snapshot de `ImprovementScore` | `recordImprovementSnapshotForAll` corre en el cron (`recompute-insights/route.ts:28`). **Prod: 23 filas, la última 2026-07-21 05:15 UTC** = hoy, en el horario del cron. La curva temporal existe. |
| `OI-13.1` telemetría de feed ignorado | **Cableado de punta a punta:** `today.ts:16` (`dismiss` → `recordIgnore`) → `today-service.ts:141-143` (`getIgnoreCounts` → `s.ignored`) → `feed.ts:71` (`ignorePenalty` en el ranking). El decay **no** usa la edad como proxy: usa los ignores reales. 0 filas en prod = nadie descartó nada. |

### Fixture conductual + validación del loop (2026-07-21, PR #151) — corrige el diagnóstico de arriba

> Esta sección **matiza el hallazgo dominante** de la auditoría S3–S14. Aquella concluyó
> "maquinaria viva pero dormida; los detectores no disparan porque prod tiene patrones planos".
> Correcto en la conclusión, incompleto en la causa — y la causa importa, porque cambia qué hay
> que hacer al respecto.

**Los detectores no disparan porque NO HAY PATRÓN QUE DETECTAR, por construcción.** No es falta
de volumen. Verificado contra la BD el 2026-07-21, los 137 trades son dos poblaciones y ninguna
puede activar un detector:

| Origen | n | Emoción | revenge | fomo |
|---|---|---|---|---|
| `seed:psych` (script) | 85 | 85 | 13 | 15 |
| Manuales (reales) | 52 | **0** | **0** | **0** |

- Los **85 sembrados** por `src/scripts/seed-psych-trades.mjs` asignan resultado y emoción por
  tiradas **independientes** (`roll < 0.50` → win; `revenge_flag` desde un `rnd() < 0.55`).
  `revengeFlag` **no depende de haber perdido el trade anterior**: es ruido con forma de
  psicología. Los detectores de secuencia buscan correlación temporal y ahí no hay ninguna.
- Los **52 reales** no capturaron psicología en absoluto.
- El seed etiqueta `'fomo'`/`'revenge'` en **minúscula**; `detectOffPlan` busca
  `{Off-plan, Impulsivo, Revanche}`. **Cero solape** → off-plan no podía disparar ni por accidente.

**Consecuencia práctica:** sembrar *más* trades con ese script no habría despertado nada. Y
"conseguir un usuario con volumen" tampoco basta por sí solo si ese usuario no captura emoción
— los 52 trades manuales lo demuestran.

**Correcciones al estado registrado:**

- Prod tiene **13 usuarios, no 3**. Diez son cuentas de QA (`s2qa+`, `s4qa+`, `s7v+`… todas del
  26-jun, 0 trades). Reales hay 3, y **solo la cuenta demo tiene trades**.
- El **último trade de todo el sistema es del 2026-06-19**. El sistema lleva más de un mes sin que
  nadie lo ejercite.

**Defecto encontrado y arreglado (PR #151):** `bySymbolDate` (`insights-engine.ts:89`) ordenaba
`date → id`. Como `id` es un UUID, *"el trade que sigue a una pérdida"* se resolvía por orden
**alfabético** dentro del mismo día, no cronológicamente. Afectaba a los tres detectores
sensibles a secuencia: `detectLosingStreak`, `detectRevengeTrading`, `detectOversizing`. Ahora
ordena `date → openTime → id`, alineado con `sortByDateTime` de `verifiers.ts:53`.

- **Por qué llevaba invisible:** los tests existentes usan ids `${d}-1..-4` con horas
  `08:00..11:00` — orden alfabético y cronológico **coinciden por accidente**, así que ningún test
  podía distinguirlos.
- **Alcance real:** el 73 % de los trades de prod (100 de 137) vive en días con 2+ operaciones,
  así que el bug mal-secuenciaba la mayoría de los datos reales. **Medido antes/después:** los
  pares tras-pérdida marcados como revancha pasan de 6 a 5 (9.8 % → 8.2 %). **Ningún insight
  cambia**, porque ambos valores están muy por debajo del umbral del 30 % — coherente con que el
  dato sea ruido.

**Lo que añadió el PR:** un generador determinista de escenarios conductuales
(`src/__tests__/support/behavior-scenario.ts`) con cuotas exactas y self-check, más **40 tests**
(13 de self-check + 2 de ordenamiento + 17 de dominio + 8 de integración) que fijan la cadena
`insight → commitment → rule → verificación → reinforcement` y la decisión de intervención.
**Es la primera vez que los cuatro detectores disparan en cualquier entorno.**

**Hallazgo fijado por sus tests:** `linkRule` lanza `NotEnforceableError` para `off-plan` —
`proposeRuleForCommitment` solo mapea 3 de las 4 métricas. Es **por diseño**: off-plan se conoce
al *etiquetar* el trade, no antes de abrirlo, así que un `enforce` ahí sería falsa protección (R3).
**3 de los 4 compromisos son respaldables con regla, uno no.**

**Lo que NO cierra, y conviene no leer de más:** un fixture prueba que la maquinaria funciona, no
que el producto tenga valor. **OI-7.3** sigue sin ser validable (0 filas en `interventions`; se
ejerció el camino puro de decisión, no `runIntervention`) y **S0/R-3** sigue abierto (sin
consumidor S4; el test fija que los eventos se acumulan en `pending`, que es lo correcto hoy).

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

- ✅ **Agendar el cron del digest cognitivo (C4).** — **YA HECHO**; esta entrada estaba obsoleta.
  La migración `20260710120000_schedule_cognitive_digest.sql` (2026-07-10) lo agendó y CI la aplicó
  a producción. Verificado contra prod el 2026-07-16: `cron.job` tiene `v3-cognitive-digest`
  (`0 6 * * 1`, `active = true`), aplicada según `supabase_migrations.schema_migrations`, y
  `cron.job_run_details` registra una corrida `succeeded` el lunes 2026-07-13 06:00 UTC.
  `app_settings` (app_url + cron_secret) está bien configurado: el resto de los crons devuelve 200
  en `net._http_response`.

  **Ojo — no emite nada todavía, y es correcto:** no hay ninguna notificación con
  `dedupe_key like 'cognitive-digest%'` porque `buildCognitiveDigest` marca `hasContent = false`
  en semanas vacías (P3/P4: no molestar). Con los datos actuales de prod las tres fuentes están
  vacías: `improvement_scores` lleva 7 días idéntico (65.0744…, delta = 0), `commitment_checks` = 0
  en 14 días, y `memory_patterns` = 0. Con un trader realmente activo el delta se movería y sí
  dispararía. Consecuencia práctica: el digest está vivo pero **dormido** hasta que haya actividad
  real — no confundir su silencio con una falla.
- ⛔ **Protección de contraseñas filtradas en Supabase Auth — NO es un toggle pendiente, es una
  decisión de gasto.** Verificado el 2026-07-21: la organización `Trading Journal`
  (`ooxhrosjbyztwtmmyefl`) está en plan **`free`**, y los docs de Supabase dicen textualmente
  *"Leaked password protection is available on the Pro Plan and above"*. El control **no existe en
  el dashboard** con este plan, así que la entrada anterior ("toggle en el dashboard") describía
  una acción imposible y llevaba meses leyéndose como un descuido. El advisor de seguridad lo
  seguirá reportando como `WARN` mientras el proyecto siga en free; eso es esperado, no una
  regresión. **Decisión registrada:** con 1 usuario real y ~0 tráfico no justifica el upgrade
  (~$25/mes). Reabrir cuando haya usuarios reales con contraseña propia.
  Ruta para cuando aplique: `/dashboard/project/jpojusluihjjsjvcubdp/auth/providers?provider=Email`.

- 🟡 **Tres avisos del advisor de seguridad sin triar** (detectados 2026-07-21, ninguno urgente):
  `app_settings` tiene **RLS habilitado y cero políticas** (INFO — la tabla la leen los crons vía
  service role, así que hoy no rompe nada, pero conviene una política explícita o documentar el
  porqué); `pg_net` y `vector` están instaladas en el schema `public` (WARN ×2).

## 3. Deuda técnica

> Fuente: `TECHNICAL_DEBT.md`, del 2026-06-05 (borrado en la consolidación; ver historial de git). v3 pudo haber cerrado parte de esta deuda desde
> entonces; no se afirma que siga abierta salvo verificación puntual anotada abajo.

| ID | Título | Tipo | Prioridad | Estado |
|---|---|---|---|---|
| `TD-018` | Extraer lógica de negocio inline del router `trades.ts` (~924 LOC) a `trade-service` | Refactor | P3 | ✅ resuelto — 2026-07-14: orquestación extraída a `src/server/services/trades/` (serializers, embedding-service, dashboard-service, trade-read-service, trade-write-service); el router quedó en 180 LOC (zod + delegación). El **cálculo** ya vivía en `domains/` (deuda sobre-estimada en ese eje, como anticipaba §1). `dashboardStats` ganó su primer test directo (partición practice). Suite 1168/1168 + tsc + eslint. |
| `TD-019` | Cliente Supabase creado por-request en el contexto tRPC | Refactor/infra | P3 | ✅ resuelto — 2026-07-16: la deuda estaba **mal caracterizada**. `ctx.supabase` es un cliente HTTP stateless de `@supabase/ssr`, no una conexión a Postgres: no hay pool que gestionar (Prisma ya maneja el suyo). El costo real era `auth.getUser()` en `createTRPCContext()`, un round-trip de red al Auth server en **cada** llamada tRPC. Sustituido por `getClaims()`, que verifica la firma ES256 del JWT contra el JWKS que auth-js cachea process-wide (10 min) → sin red en proceso caliente. Verificado que el proyecto usa claves asimétricas (JWKS expone ES256); con el secreto legacy HS256 `getClaims()` habría hecho fallback a red y no habría servido de nada. Mismo cambio aplicado al gate de auth de páginas (`proxy.ts`, que en Next 16 reemplaza a `middleware.ts` y corre en runtime Node): el refresh de sesión se preserva porque `getClaims()` sigue pasando por `getSession()`, que rota el token expirado y reescribe las cookies. De paso se eliminó código muerto en `proxy.ts` (header de respuesta `x-user-id` que nadie leía y que habría sido un bypass spoofeable si se cableaba). |
| `TD-037` | ~22 efectos "sync-on-open" (setState sincrónico en effect) | Refactor render | P3 | 🟡 **auditado y aceptado, diferido** (aclarado 2026-07-16; antes decía "sin verificar", lo cual era incorrecto) — no hace falta auditoría manual ni grep: **eslint ya lo mide**, son **34** avisos de `react-hooks/set-state-in-effect`. Y `src/eslint.config.mjs:26-33` documenta que **ya se auditaron en el Cycle 1**: son sync-on-open / bootstrap de localStorage **intencionales**, y la regla se bajó a `warn` a propósito para que los *errores* de eslint queden reservados a bugs reales. Sigue **tracked para el refactor de key-remount de v3**. O sea: no es deuda sin diagnosticar, es una decisión consciente con fecha de revisión. |
| `DataTable dev render loop` | Re-render infinito solo en dev; columnas responsivas solo en build prod. No afecta prod. Pre-existente a v3. | Bug conocido (dev-only) | — | ⬜ sin verificar |

## 4. Backlog

> Fuente: `BACKLOG.md`, del 2026-06-05 (borrado en la consolidación; ver historial de git). Misma advertencia de frescura que la deuda técnica: v3
> pudo haber implementado parte de esto; no se afirma que siga pendiente sin verificar.

**P1 — Próximo (v2.1)**

| ID | Tarea | Esfuerzo | Estado |
|---|---|---|---|
| `B-01` | Generar iconos PWA PNG (192/512) y verificar `apple-touch-icon` en iOS | S | ✅ hecho (verificado 2026-07-16) — `src/public/icons/` tiene `icon-192.png`, `icon-512.png` y `apple-touch-icon.png`. Queda sin verificar solo el render en iOS real. |
| `B-02` | Añadir `eslint` como gate de CI | S | ✅ **hecho — 2026-07-16**: step `Lint` (`pnpm exec eslint .`) en el job de code gates, tras el TypeScript check. Falla **solo en errores**, a propósito: `eslint.config.mjs` reserva los errores para bugs reales y deja los avisos conocidos/aceptados (TD-037 y cía.) como warnings — hoy son **75 warnings / 0 errores** (medido sobre `origin/main` el 2026-07-16; la entrada decía 74), así que un `--max-warnings=0` rompería CI de entrada y pelearía contra esa decisión deliberada. Si en algún momento hay que frenar el crecimiento de warnings, la vía es un ratchet `--max-warnings=75`, no convertir reglas en error. |
| `B-03` | E2E Playwright en CI (smoke tests ya scaffolded) | M | ✅ hecho (verificado 2026-07-16) — job `E2E (authenticated)` corre y pasa 10/10 contra el usuario QA sembrado; los specs se auto-skipean si faltan `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`, pero los secrets están puestos, así que sí ejercita el flujo real. |
| `B-04` | Wire de error tracker (Sentry) para runtime | M | ✅ hecho **y activado en prod** — 2026-07-17 (PR #143). `@sentry/nextjs` 10.66 cableado con convenciones de Next 16 (`instrumentation.ts` + `instrumentation-client.ts`). Se mergeó inerte (sin DSN = no-op); el usuario puso las 5 env vars en Vercel (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT` para source maps). **Verificado contra prod (2026-07-17):** el build de `b6ec448` logueó `[@sentry/nextjs] Successfully uploaded source maps to Sentry` → token/org/project válidos y DSN horneado en el bundle → captura cliente+servidor activa con stack traces legibles. Postura de privacidad deliberada: `sendDefaultPii:false` + `stripRequestPii`, Session Replay OFF, `tracesSampleRate:0`. **CERRADO 2026-07-21: el usuario confirmo el evento end-to-end en sentry.io.** No quedan pendientes. |
| `B-05` | Test de carga a 1000+ trades; activar/medir `TradeStatsCache` | M | 🟡 **medido — 2026-07-16.** El cache **está construido y cableado** (`dashboard-service` lookup+write, TTL 5 min, invalidación) pero **nunca ha corrido**: `trade_stats_cache` tiene **0 filas en prod** (`ANALYTICS_CACHE_ENABLED` no está en `true` allí). **Su invalidación estaba incompleta** — solo trades invalidaba; `accounts`/`setups`/`markets` no, en ninguna de sus 18 mutaciones → prender el flag habría servido dashboards rancios 5 min. **Cerrado en PR #138** con el middleware `dashboardMutation` + guard estático. **Números** (arnés `src/scripts/bench-dashboard-cache.test.ts`, `BENCH=1`, BD local): a **1000 trades** OFF 110.7 ms / **cold 211.5 ms** / warm 8.0 ms (13.8×); a **137 trades** (la carga real) OFF 33.5 ms / **cold 79.9 ms** / warm 5.5 ms (6.1×). **Ojo con el cold: un miss cuesta ~2× lo que no tener cache** (paga cómputo + escritura JSON), y como cada mutación invalida, un trader activo caería en cold seguido → el cache lo dejaría *más lento*. **Contexto de escala:** prod tiene **137 trades en total**, 3 usuarios, máx 137/usuario. Los índices están bien (`trades_user_status_date_idx`). Prender el flag hoy es optimización prematura; queda **seguro** de prender (tras #138) cuando exista un usuario con volumen real. **La mitad que sí valía se hizo (PR #140):** `getDashboardStats` iba **5 veces en serie** a la BD (incl. la fila de `user` pedida DOS veces, y el lookup de cache *después* de una query que no necesitaba). Consolidado a **2 rondas paralelas** → medido contra prod, misma máquina/red, cache off: **963 ms → 420 ms** (2.3×, n=7). Acelera a todos hoy, sin flag ni staleness. Verificado por UI en prod. |

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
| `B-11` | Implementar features IA configurables pero no consumidas (trade/psychology/learning analysis) | L | ✅ **resuelto por la vía barata — 2026-07-16 (PR #137)**. Las perillas por funcionalidad se renderizan desde `ACTIVE_AI_FEATURES`, así que las 3 inertes (`trade_analysis`, `review_generation`, `learning_insights`) dejan de ofrecerse. **Hallazgo no registrado antes:** el concepto ya existía — `ACTIVE_AI_FEATURES` estaba definida y el panel "Diagnóstico IA" de la misma tarjeta ya filtraba por ella; solo las perillas editables nunca se cablearon (la página ofrecía 8 controles y 60px más abajo informaba que 4 estaban vivas). **Y la lista estaba stale**: omitía `psychology_analysis`, que sí tiene call-site → el diagnóstico *sub-reportaba*. Corregido + guard de drift (`__tests__/lib/active-ai-features.test.ts`) que deriva el set activo de los call-sites reales y falla si discrepan. Las 3 claves **no** se borran del enum (`parseFeatureModels` lee overrides ya persistidos) y `save()` sigue iterando `AI_FEATURES` porque la mutación reemplaza `featureModels` entero. El "fix caro" queda descartado, no diferido: `learning_insights` no tiene capa LLM alguna (el servicio es determinista) y `review_generation` duplica `weekly_reviews` (que ya sirve reviews semanales *y* mensuales) — implementarlas sería inventar features, no completar cableado. |
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
Continúo el proyecto Trading Journal. v3.1/v3.2 cerrados. main está limpio (sin ramas
ni PRs abiertos). Últimas piezas mergeadas:

  POST-6 (#128) · G2 cutover (#129) · TD-018 (#130) · DT-4 drift check (#131)
  · grafo graphify (#132) · TD-019 (#133) · auditoría STATUS (#134) · B-02 eslint gate (#135)
  · B-11 ocultar perillas IA inertes (#137) · B-05 cache invalidation + consolidación de
  queries (#138/#140) · DT-4 real (#139) · S2/OI-2 emoción 1-tap (#141)
  · B-04 Sentry activado en prod (#143) · OI-4.8 loops de compromiso (#144)
  · auditoría S0–S2 (#146) · S0/R-3 unschedule del dispatcher (#148)
  · auditoría S3–S14 + clasificación en 3 pistas (#149) · OI-3.5 stat (#150)
  · fixture conductual + validación del loop e2e (#151)

No hay nada a medias esperando merge. Arrancá eligiendo trabajo nuevo, no retomando.

Lee primero, en este orden:
  1) docs/STATUS.md        (estado, pendientes, checklist de QA)
  2) docs/PROJECT_GUIDE.md (qué es el producto)
  3) docs/ARCHITECTURE.md  (principios/decisiones/entidades congelados)

Confirma al arrancar que tienes acceso a gh, Vercel MCP, Supabase MCP y .env (handoff §0).

ESTADO DE LA DEUDA — auditado contra CÓDIGO el 2026-07-21 (§1, "Auditoría S3–S14",
3 pistas). Leé esa sección antes que las 109 filas de la tabla: PREVALECE sobre su
columna Estado. Resumen:

- Pista A (deuda técnica): CERRADA salvo el bug dev-only de DataTable (no afecta prod,
  el usuario pidió dejarlo) y TD-037 (diferido a conciencia; NO lo re-descubras).
  #151 añadió y cerró un ítem que la auditoría no había visto: bySymbolDate ordenaba
  por UUID en vez de por hora (los tests no podían cazarlo porque sus fixtures alinean
  ambos órdenes por accidente).
- Pista B (funcionalidad a medias): 3 ítems, y NINGUNO es limpieza —
    · Outbox sin consumidores (S0/R-3): publishEvent en 5 call-sites, registerHandler en 0.
      Cron des-agendado por la migración 20260721190000, así que los eventos ya se ACUMULAN
      en pending en vez de quemarse. Cerrarlo = construir el 1er consumidor de S4 = sprint.
      El primer consumidor DEBE re-agendar el cron (bloque citado en el header de la migración).
    · OI-3.3: los detectores de MEDIAS necesitan un comparador de dos muestras que NO existe
      (normalEstimate es de una sola). OI-3.5 ya se cerró en #150.
    · OI-7.3 (expectedImpact estático): NO validable hoy — prod tiene 0 interventions.
- Pista C (roadmap): todo lo demás. Incluye OI-9.3, reclasificado de B a C: el código
  es inerte de verdad, pero su bloqueo es la superficie PROTEGER (S13), no código.

DATO QUE REORDENA PRIORIDADES (afinado por #151 — lee §1 "Fixture conductual"):
casi todo está construido y cableado; lo que el doc pintaba como pozo era maquinaria
VIVA PERO DORMIDA. Pero la causa NO es "poco volumen": es que NO HAY PATRÓN QUE
DETECTAR, por construcción. Los 137 trades = 85 sembrados con psicología por tiradas
INDEPENDIENTES (revengeFlag no depende de haber perdido antes → cero correlación
temporal, que es justo lo que buscan los detectores) + 52 manuales SIN psicología
alguna. Y el seed etiqueta en minúscula mientras detectOffPlan busca Off-plan/
Impulsivo/Revanche: cero solape. Sembrar más con ese script no despertaría nada.

Prod: 13 usuarios (10 son cuentas QA del 26-jun con 0 trades; reales 3, y solo la
demo tiene trades). Último trade de TODO el sistema: 2026-06-19. insights=6 (jun),
reinforcements=0, interventions=0, feed_ignores=0, commitments=1. VACÍO ≠ ROTO.

El cuello de botella no es código: es que nadie ejercita el sistema. Ojo con la
conclusión fácil: "conseguir un usuario con volumen" NO basta por sí solo — los 52
trades reales ya existentes no capturaron ni una emoción. Hace falta un usuario que
además USE la captura psicológica. #151 dejó un fixture que prueba que la maquinaria
funciona, pero un fixture no sustituye eso.

TRAMPA DE MÉTODO (me costó 2 hallazgos falsos el 2026-07-21): NUNCA concluyas "nadie
llama a X" desde un grep del NOMBRE de X. Grepeá los IMPORTS DEL MÓDULO
(`from ".*mi-servicio"`) —captura a todo consumidor use el símbolo que use— verificá
que el path exista y mirá el exit code, y ABRÍ el consumidor antes de afirmar nada.
Así se cayeron OI-4.1 (linkRule estaba completo) y OI-13.1 (el loop de feed_ignores
estaba cerrado: today.ts:16 → today-service.ts:141-143 → feed.ts:71). Un grep vacío
acusa al grep, no al código. El hook-guard de .claude/settings.json existe para
forzar graphify antes de grep: si no lo ves dispararse, algo lo desactivó.

Reglas de trabajo (estables desde hace varias sesiones):
- Trabaja desde origin/main; una rama por pieza; PR + CI verde + merge yo mismo (gh).
- TDD para dominios puros; migraciones DUALES (SQL en supabase/migrations + modelo
  prisma) con `npx prisma generate`; RLS per-usuario en tablas nuevas.
- Corre la suite vitest COMPLETA antes de cada push (hoy: 1204 tests). No un subconjunto.
- Re-verifica vs CÓDIGO antes de construir. Esto NO es ceremonia: en 2026-07-16, cuatro
  entradas del doc estaban mal (TD-019 mal caracterizada, el cron ya estaba hecho, B-01/B-03
  ya hechos, B-11 mal en dos ejes). El doc miente más seguido que el código.
- Verifica vs BD/UI real: smoke con .env para lógica; Playwright + Vercel MCP (bypass SSO)
  para UI; usuario demo ariaoc89@gmail.com (pw S12bVerify!2026, = E2E_USER).
- Node 20 (.nvmrc; engines >=20.12.0). Binarios desde src/ con `pnpm exec` o npx.
- CI ahora LINTEA (step "Lint" = `pnpm exec eslint .`, falla solo en errores; hay 74
  warnings aceptados a propósito — ver eslint.config.mjs antes de "arreglarlos").
- Tras cada pieza, resume en 3 ejes: backend / observable-en-UI / razón de ser.

GOTCHA crítico de migraciones: migrate-deploy (ci.yml, job "Apply migrations to
production") corre SOLO en el run del SHA del merge a main (~5 min). `gh run list` justo
tras mergear suele cazar un run anterior — identifica el run por headSha == HEAD y espera
ESE `migrate-deploy: success` antes del smoke post-merge (verifica que la tabla exista).

GOTCHA de graphify (RE-CONFIRMADO 2026-07-17 — el "NO se reprodujo" de #143 fue un
espejismo, NO te fíes de él): `graphify update .` a secas SÍ huerfaniza la capa semántica.
Medido hoy contra el grafo curado (#143), justo tras OI-4.8: **INFERRED 119 → 49, doc→código
107 → 0 (TODOS perdidos), doc→doc 643 → 264, mientras los NODOS SUBEN 3410 → 3577.** Por eso
la guardia anti-shrink (cuenta nodos) nunca lo frena: la pérdida es 100% de edges y silenciosa.
El re-measure de #143 que dio "84→84 / 119→119" fue un caso afortunado (poco cambió ese día),
no la regla. **Vía correcta:** NO commitees el resultado de `update .` a secas. Restaurá el
curado (`git checkout -- graphify-out/`, o el respaldo que el propio update deja en
`graphify-out/<fecha>/`) y fusioná preservando la capa semántica (extracción semántica con
API key, o build_merge), midiendo ANTES de commitear. Medir: contar links con
`confidence==="INFERRED"` y los que cruzan docs↔código vía el mapa nodo→`source_file`
(script usado hoy: cuenta inferred/doc2code/huérfanos desde graph.json). En OI-4.8 (#144) el
grafo se dejó **curado a propósito, sin los 3 nodos nuevos** de detectores, antes que
degradarlo. Ojo: `.graphifyignore` excluye tests/`*.config.ts`/Prisma generado a propósito.

GOTCHA del entorno local (medido 2026-07-21): @sentry/nextjs y puppeteer-core están
declarados en package.json pero AUSENTES de node_modules en la máquina de desarrollo
(el pnpm install se atasca en esta red). Provocan 2 fallos de la suite y 9 errores de
tsc que NO son regresiones. Antes de alarmarte por una suite roja en local, comprueba
si los fallos son "Cannot find module" de esos dos paquetes. En CI pasan.

GOTCHA de TD-019: el fix de auth rinde SOLO porque el proyecto usa claves JWT asimétricas
(su JWKS sirve ES256). Si alguna vez se rota al secreto legacy HS256, getClaims() vuelve a
salir a la red en cada request y el fix se anula EN SILENCIO, sin que nada falle.

Gotcha de credenciales QA: la password del usuario demo fue restaurada el 2026-07-13 al
valor documentado abajo y el GH secret E2E_USER_PASSWORD re-sincronizado. Si el login
e2e falla con "Email o contraseña incorrectos", sospecha rotación posterior.

QUÉ HACER AHORA: el paso acordado es la SIMULACIÓN DE TRADER en aria vía Playwright
(ver §7, prompt aparte). aria fue vaciada de trades a propósito para eso. Su función
declarada es ser banco de simulación: validar funcionalidades pensadas para un trader
profesional, con datos sintéticos pero realistas. No es contaminar la muestra — es su
propósito. Si esa simulación ya se hizo, los candidatos siguientes son, por orden:
re-verificar Pista C con el método de imports · fixture nivel 3 para desbloquear
OI-7.3 · primer consumidor S4 del outbox (S0/R-3).
```

**Datos útiles para la próxima sesión:**
- **Supabase project ref:** `jpojusluihjjsjvcubdp`. **Organización `ooxhrosjbyztwtmmyefl`, plan
  `free`** — relevante porque varias features de Auth (p. ej. protección de contraseñas
  filtradas) exigen Pro y por tanto NO son accionables desde el dashboard hoy (ver §2).
- **Fixture conductual (#151):** `src/__tests__/support/behavior-scenario.ts` genera historiales
  con patrón real. `buildScenario(DIRTY_PROFILE)` despierta los 4 detectores; `CLEAN_PROFILE` los
  calla. Úsalo antes de "arreglar" un detector que parezca muerto — puede que solo le falten datos
  con estructura. Corre `pnpm exec vitest run __tests__/behavior/` para verlo.
- **Vercel:** projectId `prj_qKKQQLDmGREOf0GYHqA4H95tdsFs`, teamId `team_H1wCGwK6JxmFhFUsBf8zd3M8`.
  Preview SSO se saltea con `get_access_to_vercel_url` (MCP).
- **Prod:** www.tjournalx.com. **Usuario demo/E2E:** ariaoc89@gmail.com / `S12bVerify!2026` (GH
  secret `E2E_USER_PASSWORD` igualado). UID demo: `5c69e364-3819-4df7-abf0-f484794250ed`.
- **Migraciones v3.2 aplicadas:** `improvement_scores` (E19), `memory_episodes` (E13, pgvector),
  `memory_patterns` (E14), `memory_identity` (E15), `feed_ignores` (C3).
- **Crons existentes (todos agendados y activos):** dispatch-events, recompute-insights
  (+snapshot improvement +patterns), evaluate-commitments, learning-digest, reviews-digest,
  **cognitive-digest** (`v3-cognitive-digest`, lunes 06:00 UTC — agendado por la migración
  `20260710120000`; ya NO está pendiente, la entrada anterior estaba obsoleta). El digest está
  **vivo pero dormido**: no emite nada porque salta semanas vacías por diseño y las tres fuentes
  están planas en prod. Su silencio no es una falla.
- **Verificar un cron de verdad:** `cron.job_run_details` marca `succeeded` en cuanto
  `net.http_post` **encola** la petición — no prueba que el HTTP funcionara. La respuesta real
  está en `net._http_response` (TTL corto, se purga), y en última instancia el efecto observable
  del servicio.

## 7. Prompt: simulación de trader profesional en aria (Playwright)

> Tarea acordada el 2026-07-21, pendiente de ejecutar. Copia y pega esto **después** del prompt
> de retoma de §6.

```
TAREA: simular a un trader profesional operando en la cuenta aria, vía Playwright contra
PROD, para validar de punta a punta las funcionalidades que v3 promete y que NUNCA se han
ejercitado con un humano delante.

EL PLAN COMPLETO, POR FASES, ESTÁ EN:
  docs/superpowers/plans/2026-07-21-simulacion-trader-aria.md
Léelo entero antes de empezar. Este bloque es solo el encuadre.

POR QUÉ ESTA CUENTA Y POR QUÉ SINTÉTICO. aria (ariaoc89@gmail.com) es el BANCO DE
SIMULACIÓN del proyecto: su función declarada es validar funcionalidades pensadas para un
trader profesional. Ninguno de los dos lo es todavía — el objetivo es llegar a serlo usando
este journal. Así que datos sintéticos ahí NO contaminan la muestra: son su propósito.

QUÉ SE BORRA Y QUÉ NO (decidido 2026-07-21): se borran SOLO los 85 trades tageados
`seed:psych` (ruido sin correlación temporal, ver §1). Los 52 manuales SE CONSERVAN: su
vacío de campos cualitativos —0 emociones, 0 notas, 0 calidad de ejecución— es la única
evidencia que existe de cómo se comportó un humano ante este producto. Exportarlos a CSV
antes igualmente. NO se toca el usuario, ni sus cuentas, ni sus setups (CI E2E depende).

LA REGLA QUE AHORRA HORAS: NO metas 32 trades a mano. Separa las dos actividades —
validar los INPUTS (5-6 trades a mano, con captura en cada punto: ahí está el valor) y
alcanzar los UMBRALES (~30 trades por script, reusando el generador de #151, que ya
produce correlación temporal real). Del 6º trade en adelante, el formulario no enseña
nada nuevo.

EL ERROR QUE NO SE PUEDE REPETIR (costó dos sesiones, ver §1 "Fixture conductual"):
el seed anterior (scripts/seed-psych-trades.mjs) asignaba resultado y emoción por tiradas
INDEPENDIENTES — revengeFlag salía de un rnd(), no de haber perdido el trade anterior. Eso
produjo 85 trades que PARECÍAN señal psicológica y eran ruido, y el doc lleva meses
concluyendo "patrones planos" a partir de ellos. Los detectores buscan CORRELACIÓN
TEMPORAL; sin ella no disparan, por muchos trades que haya.

Por tanto: al simular, opera COMO UN TRADER, no como un generador. El estado emocional debe
SEGUIRSE de la secuencia, no sortearse:
  · pierdes → tilt → el siguiente trade entra antes de tiempo, con más tamaño y peor nota
  · ganas 2 seguidos → exceso de confianza → subes riesgo sin setup A+
  · 3 pérdidas seguidas en el día → ahí debe saltar la intervención de cascada
Si al terminar los detectores no disparan, la primera hipótesis es que la simulación no tuvo
estructura, no que el código esté roto.

MARCADO OBLIGATORIO: cada trade que registres lleva el tag `sim:<fecha>` (p. ej.
`sim:2026-07-22`). Cuesta lo mismo y dentro de tres meses sigue siendo distinguible de un
dato humano. Sin el tag, esta simulación es indistinguible de uso real y se repite el
malentendido que originó todo esto. También permite deshacer:
DELETE FROM trades WHERE user_id='5c69e364-3819-4df7-abf0-f484794250ed' AND 'sim:<fecha>' = ANY(tags)

NO TOQUES: el usuario, sus cuentas ni sus setups. El job "E2E (authenticated)" de CI corre
10/10 contra aria; si desaparece la estructura, CI se pone rojo por una razón que no tiene
nada que ver con el cambio que estés haciendo.

CÓMO. Usa la skill webapp-testing (Playwright). Prod: www.tjournalx.com.
Credenciales: ariaoc89@gmail.com / S12bVerify!2026. UID 5c69e364-3819-4df7-abf0-f484794250ed.

VOLUMEN, calculado sobre la línea base REAL que queda tras borrar los 85 (52 trades, 22
pares tras-pérdida con 1 ofensor, 7 trades tardíos, tamaño medio 0.97):
  · intraday-decay: hacen falta >=10 tardíos; hoy hay 7  -> ~8 días x 4 trades
  · off-plan:       >=20% del total                      -> ~17 trades tageados
  · revenge:        >=30% de post-pérdida (base 1/22)    -> ~12 revanchas tras pérdida
  · oversizing:     >=20% de post-pérdida                -> ~8 trades a >2x la media
Total ~32 trades sobre 8-9 días. Con menos NO dispara nada, y eso no sería un hallazgo.

QUÉ OBSERVAR Y REPORTAR (con captura de pantalla en cada punto):
 1. Registro: ¿se derivan solos session y riskPct? ¿aparecen las sugerencias de tags al
    escribir la nota (NoteTagSuggestions)? ¿y el EmotionInsight al elegir emoción?
 2. Cierre: ¿aparece el nudge de emoción a 1 toque (PR #141, mergeado el 16-jul y ejercitado
    CERO veces)? ¿los chips viajan con el cierre sin mandarte a otra pantalla?
 3. Los inputs de MAE/MFE y el selector de régimen viven en el CIERRE (trade-detail-panel),
    no en el registro. Verifica que estén y se guarden.
 4. Tras >=20 trades: dispara el cron de recompute e inspecciona /analytics
    (BehaviorLoopPanel). ¿Aparecen insights con su badge "confianza X% · n=Y"? ¿Se activa el
    CTA de comprometerse? ¿Se puede respaldar el compromiso con una regla?
 5. OJO con off-plan: linkRule lo RECHAZA con NotEnforceableError, y es correcto (no es
    prevenible pre-trade). 3 de los 4 compromisos son respaldables con regla, uno no.
 6. Si logras 3 pérdidas seguidas en un mismo día, comprueba si salta la intervención de
    cascada (fast-path de trade-write-service, <=2s). Sería la PRIMERA fila de la tabla
    interventions, que hoy está vacía y por eso OI-7.3 es no-validable.

LO QUE ESTO SÍ PRUEBA: que el mecanismo funciona de punta a punta. Cierra la verificación
live de S2/OI-1, S2/OI-2 y S2/OI-4, que llevan desde julio marcados "resuelto" sin que nadie
los haya visto en vivo.
LO QUE NO PRUEBA: que a un trader le compense el gesto de capturar. Eso solo lo contesta
alguien operando de verdad. No lo escribas como si lo hubiera probado.

AL TERMINAR: reporta en 3 ejes (backend / observable-en-UI / razón de ser), actualiza §1 de
STATUS.md con lo que hayas encontrado, y anota explícitamente lo que NO pudiste verificar.
```
