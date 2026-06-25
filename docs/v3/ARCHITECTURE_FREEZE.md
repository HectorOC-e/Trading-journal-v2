# ARCHITECTURE_FREEZE.md
### Trading Journal v3.1 — Arquitectura oficial congelada

> **Documento canónico. Fuente de verdad arquitectónica.**
> Consolida y **resuelve** la auditoría (`auditoria-producto-trading-journal-v2.md`), las specs v3 (`docs/v3/*`),
> el `REHYDRATION_REPORT.md`, el `ARCHITECTURE_CHALLENGE.md` y el `ARCHITECTURE_V3_1_DELTA.md`.
> Donde esos documentos discrepan o dejan una decisión abierta, **este documento decide**.
>
> **Regla de control de cambios:** todo cambio arquitectónico futuro DEBE referenciar un ID de este documento
> (`FREEZE-Pxx` principio, `FREEZE-Dxx` decisión, `FREEZE-Exx` entidad, `FREEZE-EVxx` evento) y declarar si lo
> respeta, lo extiende o lo revoca. Revocar una **decisión irreversible (§11.1)** requiere un nuevo freeze (v3.2).
>
> Estado: **CONGELADO para implementación.** Versión: v3.1.0 · Fecha: 2026-06-25 · Rama base: `feat/v3-master-plan`.
> No implementa código. Define qué se implementará.

---

## 0. Alcance de la congelación

**Se congela:** principios, mapa de módulos, bounded contexts y sus fronteras, catálogo de entidades, catálogo de eventos, y el diseño de los cinco subsistemas núcleo (Memoria, Coach, Analytics, Behavior Engine, Intervention Engine).

**NO se congela (sigue siendo trabajo de sprint):** firmas de funciones, esquemas de tabla a nivel de columna, tokens de UI, copy, y los detalles internos de cada detector. Esos viven en las specs v3 y se ajustan dentro de las fronteras de este freeze.

**Invariantes heredados de v2 que NINGÚN sprint puede romper** (test de no-regresión obligatorio):
- El **bloqueo pre-trade real** (`rules/engine.ts`) sigue funcionando.
- La **separación práctica/real** (dinero demo no contamina track record).
- El cifrado de credenciales de IA (`key-encryption.ts`).

---

## 1. Principios (FREEZE-P)

| ID | Principio | Implicación vinculante |
|---|---|---|
| **P1** | **La unidad de valor es el cambio de comportamiento verificado**, no el trade guardado. | Toda feature pasa el test: *¿aumenta P(ganar dinero / preservar capital / mejorar disciplina / acelerar aprendizaje)?* Si no → no entra. |
| **P2** | **Determinismo primero; el LLM narra, no calcula.** | Ningún número mostrado o citado por el coach puede originarse en el LLM. Todo proviene del motor determinista de Analytics. Invariante de seguridad. |
| **P3** | **Rigor honesto sobre muestras retail.** | Estadística Bayesiana/jerárquica con shrinkage (no frecuentismo per-user). Nunca un punto sin banda. Correlación nunca se nombra "causa". |
| **P4** | **Calma por defecto; la intervención es la única interrupción.** | Se interviene sólo ante riesgo real, con scoring y fatiga. Silencio por defecto. |
| **P5** | **El cerebro (Cognitive Engine) es independiente de la piel (app web).** | La inteligencia vive tras una frontera limpia, extraíble a servicio sin reescritura. |
| **P6** | **El LLM propone, los datos confirman.** | Memoria semántica/identidad sólo se confirma con soporte determinista, nunca por afirmación del LLM. Evita corrupción a 5 años. |
| **P7** | **Ningún insight muere como texto** (acotado por verificador, ver D7). | Todo insight ofrece una acción: comprometerse (si hay verificador), activar regla, estudiar o anotar. |
| **P8** | **Privacidad y autonomía como diseño, no como add-on.** | Datos psicológicos minimizados hacia terceros; refuerzo de soporte de autonomía, no coerción. Memoria editable/borrable. |
| **P9** | **Cada migración es reversible hasta verificación.** | Las fusiones de modelo conservan el dato original; toda migración valida replay-desde-cero (CI). |

---

## 2. Módulos (mapa físico)

El producto se organiza en **5 superficies cognitivas** (UI) sobre **bounded contexts** (lógica). Las superficies absorben las 11 pantallas v2 sin perder dato (decisión "absorber").

| Superficie (UI) | Función | Absorbe de v2 |
|---|---|---|
| **HOY** | Qué hago hoy para mejorar y no romperme | Notificaciones, Dashboard (hoy), Aprendizaje (hoy) |
| **OPERAR** | Capturar con calidad; ser protegido en el error | Trades, Psicología (captura), reglas pre-trade |
| **MEJORAR** | Convertir lo aprendido en cambio verificado | Reviews, Playbook, Aprendizaje |
| **PROTEGER** | No morir; pasar la fase; cuánto puedo arriesgar | Cuentas, Reglas, Retiros |
| **ANALIZAR** | Entender por qué, con rigor | Analytics, Dashboard (profundo), Mercados, Etiquetas |
| *(Ajustes)* | Configuración (no es superficie cognitiva) | Perfil, edición de tags, keys IA |

Carpetas físicas (enmienda a `ANALYTICS_V3.md §13` y `PRODUCT_MASTER_PLAN.md §7`):
```
src/domains/
  cognitive/        ← NUEVO bounded context raíz (Cognitive Engine, P5)
    events/         bus de dominio (outbox + dispatcher)   [FREEZE-D1]
    intervention/   motor de scoring + fatiga              [§9]
    memory/         4 capas + context assembler            [§6]
    coach/          orquestador + agente(s) + tools         [§7]
  behavior/         ← NUEVO: loop de mejora                 [§8]
  analytics/        longitudinal/ institutional/ setups/ psychology/
                    regime/ risk/ instrument/ tags/ improvement/ insights/  [§? ANALYTICS_V3 §13]
  rules/            unificado Rule (enforce/warn)           [FREEZE-D8]
  trading/ learning/ profile/   (existentes, enriquecidos)
```

> **`lib/coach-bus.ts` (helper cliente de 9 líneas) NO es el bus.** Se conserva sólo como atajo de UI ("preguntar al coach"). El bus de dominio nace nuevo en `domains/cognitive/events/`.

---

## 3. Bounded contexts y fronteras (FREEZE-D, parte 1)

```
┌──────────────────────────────────────────────────────────────────────┐
│  WEB APP (Next.js fork)  — la "piel"                                   │
│  superficies · tRPC · formularios · overlays                          │
└───────────────┬───────────────────────────────────────┬──────────────┘
                │ comandos (mutations)                   │ lee proyecciones
                ▼                                        ▲
┌──────────────────────────────┐        ┌────────────────┴──────────────┐
│  TRADING / RULES (OLTP)      │ evento │  COGNITIVE ENGINE  (P5)        │
│  Trade, Account, Rule…       │───────▶│  events · intervention ·      │
│  bloqueo pre-trade (sync)    │ outbox │  memory · coach               │
└──────────────────────────────┘        └───────┬───────────────────────┘
                │                                │ consume eventos + analytics
                ▼                                ▼
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  BEHAVIOR ENGINE             │◀──────▶│  ANALYTICS (determinista, P2) │
│  Insight→Commitment→Rule→…   │        │  longitudinal · risk · edge   │
└──────────────────────────────┘        └───────────────────────────────┘
```

**Reglas de frontera (vinculantes):**
- **FREEZE-D2 — Cognitive Engine aislado (irreversible como *frontera*; reversible como *topología de despliegue*).** Cognitive Engine se comunica con el resto **sólo** por (a) eventos de dominio entrantes y (b) lectura de proyecciones/Analytics. No comparte transacciones con OLTP. Empieza in-repo como módulo; puede extraerse a servicio sin tocar consumidores.
- **FREEZE-D3 — Analytics es puro y sin efectos.** Calcula; no escribe estado de negocio (sólo snapshots/insights vía job). Es la única fuente de números (P2).
- **FREEZE-D4 — Behavior Engine es el dueño del loop.** Posee `Commitment`/`CommitmentCheck`/`Reinforcement`. Lee Analytics para verificar; no recalcula métricas él mismo.
- **El bloqueo pre-trade permanece síncrono** en el contexto Trading/Rules (no cruza al Cognitive Engine; latencia y fiabilidad first).

---

## 4. Eventos (FREEZE-EV) — el sistema nervioso

### 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001)
**Decisión:** **Outbox transaccional + dispatcher**, con **dos caminos de entrega**:

1. **Camino durable (backbone):** cada mutación de dominio escribe el evento en una tabla `DomainEvent` (outbox) **en la misma transacción** que el cambio de negocio. Un dispatcher (disparado por `pg_cron`/`pg_net` ya existente, o por `LISTEN/NOTIFY`) entrega a los consumidores del Cognitive Engine y del Behavior Engine. **Idempotente, at-least-once.**
2. **Camino rápido (fast-path síncrono) para intervención in-trade:** la mutación `trade.create/close` ejecuta **en línea** los detectores deterministas de la ventana del día (no LLM en el camino crítico, P2/NFR) y, si dispara intervención, la devuelve **en la respuesta de la mutación**. Esto entrega el "momento del error" sin canal push.

**Consecuencia para el SLA (FREEZE-D5):** el AC "intervención ≤2s push" se **redefine oficialmente** como: *la intervención in-trade se entrega en la respuesta de la mutación que la origina (síncrona, ≤2s); el resto de señales (tendencia, refuerzo) llegan vía outbox al feed de HOY en el siguiente render o poll.* No hay websockets en v3.1. (Realtime/SSE = decisión postergada §11.3.)

### 4.2 Catálogo de eventos congelado
| ID | Evento | Productor | Consumidores | Camino |
|---|---|---|---|---|
| EV1 | `trade.created` | Trading | intervención (fast-path), behavior, analytics-snapshot | rápido + outbox |
| EV2 | `trade.closed` | Trading | igual que EV1 | rápido + outbox |
| EV3 | `insight.created` | Analytics/job | behavior (oferta de compromiso), HOY feed, coach | outbox |
| EV4 | `insight.resolved` | Analytics/job | HOY feed, improvement | outbox |
| EV5 | `commitment.created` | Behavior | HOY, coach memory | outbox |
| EV6 | `commitment.kept` / `commitment.broken` / `commitment.partial` | Behavior | refuerzo, improvement, coach | outbox |
| EV7 | `rule.fired` | Rules engine | HOY feed, intervención | rápido (ya síncrono) + outbox |
| EV8 | `account.dd_breach` / `account.dd_approach` | Rules/Risk | intervención (**override duro**), PROTEGER | rápido + outbox |
| EV9 | `checkin.submitted` | OPERAR | coach, behavior (compromisos del día) | outbox |
| EV10 | `intervention.responded` | Intervention | improvement, modelo de `expectedImpact` | outbox |

**FREEZE-D6 — el outbox es la única fuente de verdad de "qué pasó".** Ningún consumidor reacciona a un cambio sin un evento. Esto habilita reproceso, auditoría y extracción futura a servicio.

---

## 5. Entidades (FREEZE-E) — catálogo congelado

> Campos a nivel de columna se afinan en sprint; la **existencia, dueño y propósito** se congelan aquí. `Trade`/`Rule` enmiendan modelos v2; el resto es nuevo.

### 5.1 Enmiendas a entidades existentes
| ID | Entidad | Cambio congelado | Dueño |
|---|---|---|---|
| E1 | `Trade` | +`maeR`/`mfeR`, +`regime`, +`riskPct` (derivable), +`checklistResultId` (obligatorio por setup) | Trading |
| E2 | `Rule` | **unificado** con `Automation`: `mode('enforce'\|'warn')`, `conditions`, `actions`, `trigger`, `sourceCommitmentId?`, `sourceInsightId?` | Rules |
| E3 | `WeeklyReview`/`MonthlyReview` | relación con `Commitment` (verificación, arrastre) | Behavior/Reviews |
| E4 | `LearningResource` | +`transferBaseline` (snapshot de edge al vincular) | Learning |

### 5.2 Entidades nuevas
| ID | Entidad | Propósito | Dueño |
|---|---|---|---|
| **E5** | `DomainEvent` (outbox) | registro durable de eventos (FREEZE-D1/D6) | cognitive/events |
| **E6** | `Insight` | insight persistido **con `sampleSize`, `confidence`/`credibleInterval`, `effectSize`** (delta D5), `status('active'\|'resolved'\|'committed')`, `windowFrom/To` | Analytics |
| **E7** | `Commitment` | núcleo del loop: `sourceInsightId?`, `metricKey`, `target`, `comparator`, `window`, `ruleId?`, `status`, `createdVia` | Behavior |
| **E8** | `CommitmentCheck` | evaluación con `observedValue`, `result`, `evidence(json)` | Behavior |
| **E9** | `Reinforcement` | refuerzo `positive\|corrective`, canal, cadencia (ratio variable, D17) | Behavior |
| **E10** | `RuleSuggestion` | propuesta de regla desde insight | Behavior/Rules |
| **E11** | `Intervention` | `trigger`, `scores(severity/urgency/confidence/expectedImpact)`, `shownAt`, `response`, `outcome` | Intervention |
| **E12** | `PreSessionCheckin` | mood/energía/sueño + veredicto go/no-go | Cognitive |
| **E13** | `MemoryEpisode` | memoria episódica (append-only, embedding, saliencia) | Memory |
| **E14** | `MemoryPattern` | memoria semántica (`candidate\|confirmed\|refuted`, soporte determinista) | Memory |
| **E15** | `MemoryIdentity` | perfil del trader (1/usuario, estructurado, editable) | Memory |
| **E16** | `MemoryImprovement` | serie temporal de mejora (reusa `ImprovementScore` + hitos) | Memory/Analytics |
| **E17** | `CoachThread` / `CoachMessage` | persistencia de conversación | Coach |
| **E18** | `SetupEdgeSnapshot` | edge del setup en el tiempo (rolling) | Analytics |
| **E19** | `ImprovementScore` (snapshot) | índice compuesto diario + drivers | Analytics |
| **E20** | `RiskBudget` (derivado/persistido) | presupuesto de riesgo del día por cuenta | Analytics/Protect |

**FREEZE-D7 — `Commitment` sólo se ofrece donde existe verificador.** El mapa `insight→metricKey→Verifier` (delta D8) es una **librería de verificadores** con contrato `Verifier(window) → {observedValue, evidence}`. Insights sin verificador ofrecen "estudiar/anotar", no "comprometerme". Subconjunto inicial: 5 tipos de alto valor (revenge, intraday-decay, oversizing, edge-decay, off-plan).

**FREEZE-D8 — la fusión Rule/Automation es semántica.** Migración con dry-run + **informe de no-mapeo** revisado por humano; conservar `Automation` v2 hasta verificar paridad (P9). No migración ciega.

---

## 6. Memoria (FREEZE — subsistema)

**Modelo congelado:** memoria **jerárquica de 4 capas** (no tabla plana). Enmienda a `AI_COACH_V3.md §3`.

| Capa | Entidad | Almacenamiento | Recuperación | Actualización | Uso por el coach |
|---|---|---|---|---|---|
| **Episódica** | E13 | append-only + pgvector + saliencia con decay | híbrida: filtro estructurado + kNN + saliencia | en cada evento; nunca se edita, decae | evidencia concreta |
| **Semántica** | E14 | patrón + `supportEpisodeIds[]` + `status` | sólo `confirmed`, por relevancia al contexto | Memory Agent (background); **`confirmed` requiere N episodios deterministas (P6)** | anticipación |
| **Identidad** | E15 | 1 registro/usuario, estructurado, editable | siempre presente (barata) | lenta, deliberada, editable por el trader | calibra tono/canal/estilo |
| **Mejora** | E16 | serie temporal | por ventana | job diario + hitos | relato "mejor que hace 3 meses" |

**FREEZE-D9 — frontera anti-poisoning (irreversible).** El LLM **nunca** escribe memoria semántica/identidad directamente: la **propone**; el Memory Agent la **confirma contra datos**. Esta frontera existe desde el primer commit de memoria (S6), aunque las 4 tablas se completen después. *Una memoria plana editable por LLM está prohibida por este freeze.*

**FREEZE-D10 — Context Assembler con presupuesto.** El coach recibe `Identity (siempre) + Semantic confirmados relevantes + top-k Episodic por saliencia + delta Improvement`, acotado por presupuesto de tokens. No "toda la memoria".

---

## 7. Coach (FREEZE — subsistema)

**Arquitectura congelada por fases** (enmienda a `AI_COACH_V3.md §2`):
- **v3.1 (lo que se implementa ahora): agente único** + tools deterministas (read) + **write-tools con permiso** (`propose_commitment`, `propose_rule`, `schedule_checkin`, `create_study_card`, `mark_review_ready`). Memoria (§6) + contexto longitudinal por defecto.
- **Destino (v3.2+, postergado §11.3): orquestador + router de intención → specialists** (Quant, Psychology, Mentor-Prop, Memory Agent). El freeze **reserva la frontera** para que esto sea evolución, no reescritura: el coach v3.1 expone un punto de entrada único (`coach.handle(intent, context)`) que un orquestador podrá envolver.

**Invariantes del coach (vinculantes):**
- **FREEZE-D11 — write con confirmación explícita.** El coach nunca ejecuta una escritura sin acción explícita del trader; todo queda auditado (`Intervention`/`CoachAction`).
- **P2 reforzado:** el coach cita números sólo desde Analytics; nunca calcula.
- **FREEZE-D12 — router de modelos.** Modelo barato decide/clasifica/interviene; modelo caro narra. Presupuesto de tokens/usuario/día con degradación elegante definida (menos contexto, no romper). *(Diseño en S6; provider list reversible.)*

---

## 8. Behavior Engine (FREEZE — subsistema, "esto es el producto")

**Cadena congelada:** `INSIGHT → COMPROMISO → REGLA → SEGUIMIENTO → VERIFICACIÓN → REFUERZO`, donde el refuerzo recalibra el siguiente insight.

**Máquina de estados (congelada):** `ACTIVE → {KEPT, PARTIAL, BROKEN, EXPIRED} → feed a ImprovementScore`.
- **Continuous eval** para compromisos con regla `enforce`.
- **Window-end eval** (job) para compromisos sin regla.

**Servicios congelados (contratos, no firmas):** `createCommitmentFromInsight`, `linkRule`, `evaluateCommitment` (vía librería de verificadores, FREEZE-D7), `reinforce` (ratio variable, FREEZE-D13), `suggestRulesFromInsights`, `carryOverCommitments`.

**Invariantes (vinculantes):**
- Ningún compromiso sin verificación; verificación **objetiva** (datos, no autoevaluación).
- **FREEZE-D13 — refuerzo de ratio variable + soporte de autonomía.** No felicitar cada trade; lenguaje no-coercitivo (mitiga evasión, P8). Enmienda a `BEHAVIOR_ENGINE_V3.md §4.4`.
- El refuerzo **siempre** ocurre (positivo o correctivo), nunca silencio tras una ventana cerrada — salvo la cadencia de ratio variable de D13.

---

## 9. Intervention Engine (FREEZE — subsistema)

**Motor de decisión congelado** (enmienda a `AI_COACH_V3.md §4.2` y `DESIGN_SYSTEM_V3.md §10.4`). El overlay de UI no cambia; **se antepone una capa de scoring**:

```
priority = severity × urgency × confidence × expectedImpact × (1 − fatiguePenalty)
intervenir (overlay) sii priority ≥ θ(usuario)        θ adaptativo desde MemoryIdentity
```

**Reglas congeladas:**
- **Cuándo NO intervenir:** `confidence` baja → insight (no alarma); `urgency` baja → HOY feed; trader cumpliendo compromiso → silencio.
- **FREEZE-D14 — override duro de capital.** `account.dd_approach`/`dd_breach` **siempre** interviene, ignora θ y fatiga.
- **Anti-fatiga:** token-bucket de interrupción/día (críticas no consumen); decay por tipo ignorado; "silencio ganado"; agrupación diaria; **máx 1 intervención activa** + cooldown.
- **`expectedImpact` se aprende** de `Intervention.outcome` (E11/EV10) — el salto a "Elite".
- Latencia: la **decisión** de intervenir es determinista (fast-path §4.1); el **texto** puede stream-ear después.

---

## 10. Analytics (FREEZE — subsistema)

**Decisiones congeladas:**
- **FREEZE-D15 — estadística Bayesiana/jerárquica con shrinkage (irreversible como método; priors reversibles).** Resuelve ADR-002. Edge decay, drift, calibración, ruina, proyección prop reportan **intervalos creíbles / bandas**, nunca p-values per-user ni puntos. Mitiga R6.
- **Primitiva `rollingWindow`** (S0) es la base de todo lo longitudinal (C3).
- **`Insight` con confianza/n desde S0** (FREEZE-E6).
- **FREEZE-D16 — proyecciones prop son no estacionarias.** P(pasar fase)/riesgo de ruina se muestran como distribución con su inestabilidad; el coach no cita un punto ("72%") sin banda.
- **FREEZE-D17 — causalidad etiquetada honestamente.** Transferencia de aprendizaje (#31) e ImprovementScore (#41) son **asociación con confounds declarados (n, régimen, tiempo)**; la UI no usa la palabra "causa"/"transferencia" sin diseño causal. Enmienda a `ANALYTICS_V3.md §11`.
- **FREEZE-D18 — régimen v3.0 = experimental.** El proxy derivado del propio P&L es circular; se marca experimental o se basa en **etiqueta manual** hasta tener señal exógena (ATR). Datos de mercado externos = postergado §11.3.

---

## 11. Clasificación de decisiones

### 11.1 Decisiones IRREVERSIBLES (revocar = nuevo freeze v3.2)
Cambiarlas tarde implica reescritura o corrupción de datos. Se comprometen ahora.

| ID | Decisión | Por qué irreversible |
|---|---|---|
| **P2** | Determinismo primero; LLM narra, no calcula | Define toda la frontera Analytics↔Coach; retrofitearlo = rehacer el coach |
| **FREEZE-D1/D6** | Outbox transaccional como única fuente de "qué pasó" | Es el sistema nervioso; meterlo después = reescribir todos los productores |
| **FREEZE-D2** | Frontera del Cognitive Engine (independiente del runtime web) | Evita la reescritura de 24m; la frontera debe nacer limpia |
| **FREEZE-D9 / P6** | "El LLM propone, los datos confirman" en memoria | Memoria plana editable por LLM corrompe a 5 años; migrar después es doloroso |
| **FREEZE-E6** | `Insight` lleva `confidence/sampleSize/effectSize` desde el día 1 | Sin esto, intervención y verificación no distinguen señal de ruido; retrofit toca todo |
| **FREEZE-D15** | Método estadístico Bayesiano/jerárquico | Ancla todo el motor analítico; cambiarlo después toca cada detector |
| **P9** | Reversibilidad de migración (conservar dato original hasta verificar) | Sin esto, una fusión fallida (Rule/Automation) pierde datos sin retorno |

### 11.2 Decisiones REVERSIBLES (cambiables dentro del freeze, sin nuevo freeze)
Se eligen por defecto ahora; un sprint puede cambiarlas referenciando su ID.

| ID | Decisión por defecto | Cambiable a |
|---|---|---|
| FREEZE-D1 (mecanismo) | Dispatcher vía `pg_cron`/`LISTEN-NOTIFY` | cola dedicada (`pg-boss`) si el volumen lo exige |
| FREEZE-D12 | Lista de proveedores LLM y umbrales del router | otros proveedores/modelos |
| FREEZE-D7 | Subconjunto inicial de 5 verificadores | ampliar a más tipos de insight |
| FREEZE-D15 (priors) | Priors concretos / fuerza de shrinkage | recalibrar con datos reales |
| §9 | Pesos del scoring de intervención y θ inicial | recalibrar con `Intervention.outcome` |
| §6 | Esquema de columnas de las 4 capas de memoria | afinar campos (no la jerarquía ni P6) |
| §2 | Estructura de carpetas concreta | reorganizar dentro de la frontera D2 |

### 11.3 Decisiones POSTERGADAS (no se deciden en v3.1; reservadas)
Se reserva la frontera para que sean evolución, no reescritura. Cada una requiere su propio mini-ADR cuando se aborde.

| ID | Decisión postergada | Frontera reservada hoy | Disparador para decidir |
|---|---|---|---|
| POST-1 | **Canal push realtime (websockets/SSE)** | SLA redefinido a síncrono+poll (FREEZE-D5); outbox listo para alimentar SSE | si el feed de HOY necesita tiempo real |
| POST-2 | **Coach multi-agente (orquestador + specialists)** | `coach.handle(intent, ctx)` como punto único (§7) | regresión de prompt / coste del monolito |
| POST-3 | **Aprendizaje cross-user privacy-preserving (el moat profundo)** | **decisión de datos en A0:** no cerrar el aislamiento estricto en el schema si se quiere habilitar después | tracción + masa de datos de `Intervention.outcome`/`Commitment.result` |
| POST-4 | **Datos de mercado externos (régimen real, ATR)** | `regime` como campo en `Trade`; proxy marcado experimental (FREEZE-D18) | cuando régimen manual demuestre valor |
| POST-5 | **Extracción del Cognitive Engine a servicio independiente** | frontera D2 limpia desde el día 1 | cuando serverless no dé para workers persistentes |
| POST-6 | **Base de reglas prop-firm como activo central (moat)** | `Rule` unificado soporta condiciones por firma | sprint dedicado tras S9 |
| POST-7 | **A/B de variantes de setup (#50)** | `SetupVersion` ya existe en schema | tras edge decay/drift estables |

---

## 12. Trazabilidad: cómo este freeze cierra los hallazgos

| Crítico auditoría | Resuelto por (freeze) |
|---|---|
| C1 coach reactivo | FREEZE-D1/D5 (fast-path), §9 (intervención) |
| C2 sin memoria | §6 (4 capas), E17 |
| C3 sin longitudinal | §10 (`rollingWindow`) |
| C4 métricas institucionales | §10 + E1 (MAE/MFE) |
| C5 loop reviews abierto | §8 (Behavior Engine), E3/E7 |
| C6 dualidad reglas | E2 + FREEZE-D8 (fusión semántica) |
| C7 captura psico opcional | E1 + delta D10 (bucle de incentivo) + §9 check-in |
| C8 insights sin historiar | E6 (`Insight` persistido con confianza) |

| Riesgo (auditoría/reporte) | Mitigado por |
|---|---|
| R6 / RI-3 pseudo-rigor | FREEZE-D15/D16/D17 (Bayesiano, bandas, causalidad honesta) |
| RI-1 sin infra de eventos | FREEZE-D1/D5 (outbox + fast-path + SLA redefinido) |
| RI-5 memoria poisoning | FREEZE-D9/P6 |
| RI-7 sobre-intervención | §9 (fatiga) + FREEZE-D13 (autonomía) |
| RI-2 fusión reglas | FREEZE-D8 (semántica, no ciega) |
| 24m reescritura | FREEZE-D2 (frontera Cognitive Engine) |
| Moat débil | POST-3 (cross-user) + POST-6 (prop-firm), fronteras reservadas |

---

## 13. Qué desbloquea la implementación (puerta de salida)

Con este freeze, **A0 (decisiones) está esencialmente resuelto**: las ADR-001/002/003 quedan decididas como FREEZE-D1/D15/D9+§6.privacidad. El equipo puede pasar a **Sprint 0** sin decisiones arquitectónicas abiertas en la ruta crítica.

**Lo único que A0 aún debe producir antes de S0** (porque es decisión de negocio, no de arquitectura):
1. **POST-3 — decisión de aislamiento de datos:** ¿se diseña el schema para permitir aprendizaje cross-user anónimo en el futuro? (sí/no) — afecta el modelo de datos desde S0.
2. **Spike de validación de FREEZE-D1:** probar que un `trade.created` cruza el outbox a un consumidor server de forma fiable y a coste medido (criterio del gate G1).

> **Una frase:** este documento congela la arquitectura en torno a un **outbox + fast-path síncrono** para la intervención, un **Cognitive Engine aislado**, **estadística Bayesiana**, **memoria jerárquica con frontera anti-poisoning** y un **Behavior Engine acotado por verificadores** — y deja explícitamente reservadas (no decididas) las cinco apuestas de futuro (realtime, multi-agente, cross-user, datos de mercado, extracción a servicio) para que sean evolución y nunca reescritura.

---

### Control de versiones del freeze
| Versión | Fecha | Cambio |
|---|---|---|
| v3.1.0 | 2026-06-25 | Freeze inicial. Consolida auditoría + specs v3 + Rehydration + Challenge + Delta. |

*Cualquier PR que altere principios, fronteras, entidades, eventos o subsistemas debe citar el ID afectado y, si toca §11.1, abrir un freeze v3.2.*
