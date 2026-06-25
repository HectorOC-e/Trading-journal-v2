# ARCHITECTURE_CHALLENGE.md
### Trading Journal v3 — Desafío crítico de arquitectura

> Modo adversarial. **No defiendo la arquitectura.** Asumo que heredo este sistema durante 5 años y mi trabajo es destruirlo intelectualmente antes de que el mercado lo haga.
> Roles simultáneos: **Principal Architect · Staff Engineer · AI Systems Designer · Quant Research Lead · Trading Psychologist · Product Strategist.**
> Anclado en código real (ver `REHYDRATION_REPORT.md §Apéndice`). Donde el plan dice "X cubierto ✔", aquí pregunto *"¿cubierto cómo, y se sostiene a 5 años?"*.

---

## Tesis del desafío (una frase)

> El plan tiene **trazabilidad perfecta y profundidad de ejecución desigual**: resuelve los hallazgos fáciles (deterministas) con solvencia y los hallazgos difíciles (proactividad en vivo, rigor estadístico, causalidad, moat) con **una frase y un check ✔**. Las tres piezas que hacen del producto algo difícil de copiar —intervención en tiempo real, cuantitativo creíble y memoria de mentoría— son exactamente las tres peor especificadas.

---

## 1. Hallazgos incompletamente resueltos

### 1.1 C1 (coach proactivo) está "cubierto" sobre infraestructura que no existe
**Superficial.** El plan marca C1 ✔ en E2/S7. Pero el AC es *"intervención en ≤2s sobre `trade.created`"* y el repo **no tiene runtime de eventos ni canal push**:
- `coach-bus.ts` es un `window.dispatchEvent` de 9 líneas (cliente). El plan dice "extiende `coach-bus.ts`" como si fuera una semilla de bus de dominio. No lo es.
- El único scheduler es `pg_cron → pg_net → HTTP /api/cron/*`, horario, batch. No sirve para "≤2s".
- No hay websockets ni Supabase Realtime. **No hay forma de empujar** una intervención al cliente.

**Lo que falta de verdad:** una decisión de arquitectura (outbox + LISTEN/NOTIFY, o cola, o intervención **síncrona** dentro de la mutación `trade.create`) y su coste. S0 lo reduce a un bullet ("infra de jobs/scheduler"). **Esto no es un detalle de S0: es el cimiento del único diferenciador difícil.**

### 1.2 C6 (fusión Rule/Automation) es una fusión **semántica**, no de schema
**Necesita profundización.** `Rule` (nombre+severidad, descriptivo, lo que ve el coach) y `Automation` (condiciones/acciones/bloqueo ejecutable) **no mapean 1:1**. "Migración sin pérdida" es cierto para las filas, no para el *significado*: cada `Rule` descriptiva sin ejecución se convierte en `warn` huérfana, y cada `Automation` necesita inventar nombre/severidad. El resultado puede ser un modelo unificado lleno de `warn` decorativas — el mismo problema de "falsa protección" (R3) con otra forma. S1 = 1 sprint para esto es optimista.

### 1.3 C7 (captura psico no opcional) ignora el incentivo, no la UI
**Superficial.** El plan resuelve C7 con "captura inline + nudge 1-tap". Pero el problema de v2 nunca fue el número de taps: fue que **rellenar emoción no le devuelve valor inmediato al trader**. Si el dato no produce una respuesta visible *en el mismo trade*, el nudge se ignora igual. Falta el bucle de incentivo ("registraste 'ansioso' → aquí está tu WR histórico cuando entras ansioso, ahora mismo"). Sin eso, C7 se cierra en papel y reaparece en producción.

### 1.4 Los hallazgos cuantitativos (#12, #15, #17, #23, #33, #41) están "cubiertos" con estadística que se rompe a n retail
Ver §3 (Quant). El plan **name-dropea** Welch t-test, Mann-Kendall, Monte Carlo, Kelly, calibración — y los marca ✔ — pero aplicarlos a un trader con 20–200 trades y ~20 detectores rolling produce **ruido con bata de laboratorio**. Esto es el riesgo R6 de la auditoría, **reintroducido por la capa que prometía rigor**.

### 1.5 Causalidad: transferencia de aprendizaje (#31) e ImprovementScore (#41)
**Superficial y peligroso.** Medir "estudiar X mejoró el setup" con un pre/post sin control es un diseño confundido por régimen, tiempo y mean-reversion. El plan lo etiqueta "correlación, con n" — honesto, pero entonces *no es* "transferencia". Llamarlo transferencia en la UI erosiona credibilidad con el usuario sofisticado (el mismo R6).

### 1.6 El Behavior Engine es elegante en el estado, hand-wavy en el verificador
**Necesita profundización.** La máquina de estados (ACTIVE→KEPT/PARTIAL/BROKEN/EXPIRED) es correcta y barata. El **iceberg** es `evaluateCommitment`: traducir cada tipo de insight a un `metricKey` con un evaluador objetivo sobre una ventana, con evidencia. El plan dice "mapa determinista, empezar con 5 tipos". Pero el producto promete que **cualquier** insight ofrece "comprometerme". La masa de ingeniería real es una **librería de verificadores** que crece con cada detector — y no está dimensionada.

---

## 2. Riesgos a 12 meses

**Qué componentes se quedarán cortos:**

1. **El worker proactivo (S7).** Sea cual sea la infra elegida, a 12 meses con volumen real:
   - Si es **síncrona en la mutación**: añade latencia a cada `trade.create` y acopla el camino crítico de escritura a los detectores. Un detector lento o un LLM en el camino = trades que tardan en guardarse.
   - Si es **outbox/cola**: ya no es "≤2s" garantizado; es "lo antes posible". El SLA del AC se incumple silenciosamente.
   - En **serverless (Vercel)**: un bus in-process no existe entre invocaciones. Cada "evento" cruza la base de datos. El coste de I/O por trade se multiplica.

2. **Caché de `buildTraderContext`.** ~12 queries/request hoy, en cada chat y en cada evaluación proactiva. Sin materialización incremental (que es NFR, no entregable), a 12 meses esto es el cuello de botella de coste y latencia. La proactividad lo agrava: corre sin que nadie pregunte.

3. **Presupuesto de tokens.** Memoria (resúmenes LLM) + narración por evento + chat = coste que escala con trades×usuarios. "Degradación elegante" no está diseñada. A 12 meses es el asesino de margen.

4. **El feed de HOY como vertedero.** Absorbe Notificaciones + intervenciones + refuerzos + compromisos + insights + repasos + presupuesto de riesgo. Sin un modelo de priorización fuerte (E11.C1 lo menciona como "adaptativo" sin algoritmo), a 12 meses HOY es ruido y el trader lo ignora — matando la retención que justificaba el rediseño.

**Qué módulos requerirían rediseño en 12 meses:**
- **Régimen (E14.C1)** — el proxy circular v3.0 no sobrevive contacto con usuarios; habrá que meter datos de mercado (v3.1) antes de lo planeado, lo que abre una dependencia de **fuente de datos externa** no contemplada en el anti-alcance.
- **La capa estadística** — si se ancla en frecuentismo, habrá que rehacerla en Bayesiano tras el primer lote de falsos positivos.

**Qué escala mal:**
- El **fan-out de detectores × ventanas rodantes** corriendo en cada trade. 20 detectores × N ventanas × cada evento = O(trades × detectores × ventanas). Sin incrementalización, no escala.

---

## 3. Riesgos a 24 meses

**Decisiones que podrían forzar una reescritura:**

1. **Acoplar la inteligencia al runtime de Next.js (fork interno).** El coach proactivo, el bus, los jobs y el overlay viven dentro de la app Next.js. A 24 meses, mover la inteligencia a un **servicio de eventos independiente** (porque el serverless no da para workers persistentes) es una reescritura, no una refactor. La decisión de **no separar el "cognitive engine" de la "app web" desde el día 1** es la candidata #1 a deuda terminal.

2. **Estadística frecuentista por-setup/por-ventana.** Si se eligió t-test/Mann-Kendall, a 24 meses con miles de usuarios el patrón correcto es un **modelo jerárquico** (pooling parcial: el edge de tu setup se estima encogiendo hacia la población de setups similares). Cambiar de frecuentista per-user a jerárquico cross-user toca **todo** el motor analítico y el modelo de datos.

3. **Memoria del coach como tabla plana de strings.** A 24 meses, una memoria que es `content: String + confidence: Float` sin estructura (episódica/semántica/identidad) no permite razonamiento longitudinal real ni resolución de conflictos. Re-estructurarla con datos en producción es doloroso. (Ver §5.)

4. **Single-tenant por diseño.** El plan scopea fuera todo lo cross-user (social, copy). Pero el **moat** real (§7) es un modelo de mejora **cross-user privacy-preserving**. Si el modelo de datos y la privacidad se diseñan asumiendo aislamiento total por usuario, habilitar aprendizaje poblacional a 24 meses es una migración de datos + consentimiento + arquitectura. Decidir el aislamiento estricto hoy puede cerrar el único moat defendible.

**Cuellos de botella estructurales:**
- **Un solo proveedor LLM en el camino crítico** sin abstracción de routing por coste/latencia/capacidad. El coach ya soporta Anthropic/OpenAI/OpenRouter, pero la proactividad masiva necesita un **router de modelos** (barato para clasificar, caro para narrar). No está diseñado.
- **Postgres como bus + store + analytics + vector.** Cómodo hoy; a 24 meses, el mismo Postgres haciendo LISTEN/NOTIFY, snapshots diarios, pgvector y OLTP es un punto único de saturación.

---

## 4. AI Coach — ¿la arquitectura propuesta es suficiente?

**Veredicto: suficiente para "Profesional", insuficiente por diseño para "Elite", y mal estructurada para evolucionar.**

El plan propone **un agente monolítico** con más tools (read+write) y más contexto (memoria+longitudinal). Eso lo lleva a Profesional. Pero mete responsabilidades incompatibles en un solo prompt:
- **Psicólogo** (empático, cualitativo, cascadas/tilt).
- **Quant** (frío, IC, ruina, proyección prop).
- **Mentor-prop** (reglas de cada firma).
- **Narrador de memoria** (longitudinal).
- **Agente de acción** (write-tools con permiso).

Un solo prompt haciendo las cinco cosas es frágil: el tono del psicólogo contamina el rigor del quant, el contexto crece sin límite, y cada nueva capacidad degrada las anteriores (regresión de prompt).

### ¿Debe evolucionar a multi-agente?
**Sí, pero por fases, y no por moda.** El multi-agente prematuro es su propio antipatrón (latencia, coste, orquestación frágil). La secuencia correcta:

- **Fase 1 (v3.0): agente único + tools deterministas** (lo que el plan ya propone). Correcto para empezar.
- **Fase 2 (v3.1): orquestador + router de intención.** Un router barato clasifica la petición (psico / quant / acción / general) y selecciona **system-prompt + toolset + modelo** especializado. No son agentes que conversan entre sí; es **un orquestador que enruta a configuraciones especializadas**. Bajo coste, gran ganancia de calidad.
- **Fase 3 (v3.2): specialist agents reales** sólo donde el razonamiento multi-paso lo justifique:
  - **Quant Agent** — sandbox sobre el motor determinista; nunca inventa números, compone cálculos.
  - **Psychology Agent** — consume detectores; dueño del tono empático y del check-in.
  - **Mentor-Prop Agent** — dueño de la base de reglas por firma (el activo más defendible, §7).
  - **Memory Agent** — escribe/consolida/resuelve conflictos de memoria (no es parte del coach conversacional; corre en background).

### Arquitectura futura propuesta (objetivo a 24 meses)
```
                         ┌─────────────────────────────────────────┐
   Eventos / Chat  ─────▶│  ORQUESTADOR (router de intención+coste) │
                         └───────┬───────────┬───────────┬─────────┘
                                 ▼           ▼           ▼
                        ┌────────────┐ ┌───────────┐ ┌────────────┐
                        │ Quant Agent│ │ Psych     │ │ Mentor-Prop│  (specialists, stateless,
                        │ (det. calc)│ │ Agent     │ │ Agent      │   sobre motores deterministas)
                        └─────┬──────┘ └─────┬─────┘ └─────┬──────┘
                              └──────────────┼─────────────┘
                                             ▼
                         ┌───────────────────────────────────────┐
                         │  MEMORY SERVICE (jerárquica, §5)        │  ◀── Memory Agent (background:
                         │  episodic · semantic · identity · improv│        consolida, resuelve conflictos)
                         └───────────────────────────────────────┘
                                             ▲
                         ┌───────────────────────────────────────┐
                         │  COGNITIVE ENGINE (servicio separado)   │  ◀── bus de eventos, no Next.js
                         │  detectores · intervención · jobs       │
                         └───────────────────────────────────────┘
```
**Decisión clave que cambia todo:** separar el **Cognitive Engine** (eventos, detección, intervención, memoria) de la **app Next.js** desde v3.0 — aunque empiece como un módulo, con frontera limpia — para que la Fase 2/3 sea evolución y no reescritura (mitiga riesgo 24m #1).

---

## 5. Memory System — diseño de memoria jerárquica completa

El plan propone memoria plana: `CoachMemory { kind, content, confidence }`. **Insuficiente** para mentoría a 5 años. Propongo cuatro capas con roles, almacenamiento, recuperación, actualización y uso distintos.

### 5.1 Episodic Memory — eventos específicos
*"El 12 de marzo doblaste tamaño tras 2 pérdidas y perdiste el día."*
- **Almacenamiento:** `MemoryEpisode { userId, occurredAt, type, payload(json), embedding(vector), salience, links(tradeIds/insightIds) }`. Append-only. pgvector para recuperación semántica.
- **Recuperación:** híbrida — filtro estructurado (tipo+fecha) **+** kNN por embedding **+** score de saliencia (severidad × recencia con decay). Top-k por presupuesto de tokens.
- **Actualización:** se escribe en cada evento de dominio relevante. **Nunca se edita**; se decae (la saliencia baja con el tiempo salvo que se reactive por reincidencia).
- **Uso por el coach:** evidencia concreta ("ya te pasó el 12/03 y el 28/03"). Alimenta la consolidación semántica.

### 5.2 Semantic Memory — patrones descubiertos
*"Tiendes a vengarte del mercado los viernes por la tarde."*
- **Almacenamiento:** `MemoryPattern { userId, statement, supportEpisodeIds[], confidence, firstObserved, lastConfirmed, status('candidate'|'confirmed'|'refuted') }`.
- **Recuperación:** por relevancia al contexto actual (¿es viernes tarde? sube el patrón viernes). Sólo se inyectan patrones `confirmed`.
- **Actualización:** un **Memory Agent** en background consolida episodios → patrones. **Clave anti-poisoning (mitiga RI-5):** un patrón sólo pasa a `confirmed` con **soporte determinista** (N episodios verificables), no por afirmación del LLM. Si nueva evidencia lo contradice → `refuted`, no se borra (historial).
- **Uso por el coach:** anticipación ("hoy es tu día de riesgo viendo tu patrón"). Es el puente a la intervención calibrada.

### 5.3 Identity Memory — perfil del trader
*"Eres swing trader de índices, disciplinado en gestión pero impaciente en entradas; valoras autonomía, rechazas que te bloqueen sin explicación."*
- **Almacenamiento:** `MemoryIdentity { userId, traits(json estructurado), preferences(json), goals, riskProfile, communicationStyle, updatedAt }`. **Un registro por usuario**, estructurado (no strings sueltos).
- **Recuperación:** siempre presente en el contexto (es barato y define tono/política).
- **Actualización:** lenta y deliberada. Cambios de rasgo requieren evidencia sostenida (no un mal día). **Editable por el trader** (transparencia/privacidad, ya exigido por el plan).
- **Uso por el coach:** calibra **tono** (cuánta dureza tolera), **canal** (intervención vs refuerzo) y **estilo** de la mentoría. Es lo que hace que el coach "te conozca" en el mes 6.

### 5.4 Improvement Memory — evolución histórica
*"Hace 3 meses tu disciplina era 52; hoy 71; el driver fue cumplir el cool-down."*
- **Almacenamiento:** `MemoryImprovement` = serie temporal de snapshots (reutiliza `ImprovementScore` diario + hitos: compromisos cumplidos, patrones refutados, reglas que dejaron de dispararse).
- **Recuperación:** por ventana temporal; alimenta el relato longitudinal y la North Star.
- **Actualización:** job diario (snapshot) + eventos de hito (compromiso kept/broken, patrón confirmed/refuted).
- **Uso por el coach:** el relato "eres mejor trader que hace 3 meses, **y aquí está por qué**" — el momento "aha" de retención que la auditoría identifica como faltante.

### 5.5 Ensamblado de contexto (presupuesto)
El coach no recibe "toda la memoria": un **Context Assembler** con presupuesto de tokens selecciona, por capa:
`Identity (siempre) + Semantic confirmados relevantes + top-k Episodic por saliencia+relevancia + delta de Improvement`. Esto resuelve el coste (RI-4) sin perder profundidad. **El LLM nunca escribe memoria semántica/identidad directamente** — la propone, el Memory Agent la confirma contra datos. Esa frontera es lo que evita la corrupción a 5 años.

---

## 6. Intervention Engine — diseño profesional

El plan define la **UX** de intervención (overlay, 1 activa, cooldown) pero **no el motor de decisión**. Sin un scoring formal, "¿intervenir?" queda como reglas if/else que generan fatiga. Propongo un motor explícito.

### 6.1 Cada intervención candidata se puntúa
```
priority = severity × urgency × confidence × expectedImpact × (1 − fatiguePenalty)
```
| Dimensión | Definición | Fuente |
|---|---|---|
| **severity** [0–1] | daño potencial al capital/cuenta (acercarse a DD total > revenge > overtrading leve) | risk engine + tipo de detector |
| **urgency** [0–1] | ventana de acción: ¿el daño ocurre en el próximo trade o en días? | tipo de evento (in-trade vs tendencia) |
| **confidence** [0–1] | fuerza estadística del patrón (n, significancia, saliencia histórica del trader) | analytics + semantic memory |
| **expectedImpact** [0–1] | P(el trader actúe) × beneficio si actúa — **aprendida** de respuestas pasadas (`Intervention.outcome`) | modelo de respuesta histórica |
| **fatiguePenalty** [0–1] | penalización por saturación reciente (ver §6.3) | fatigue model |

Se interviene sólo si `priority ≥ θ`, con **θ adaptativo** por usuario (Identity Memory: cuánta interrupción tolera).

### 6.2 Cuándo intervenir / cuándo NO
**Intervenir (overlay):** `severity` alta **y** `urgency` alta **y** `confidence ≥` umbral. Ej.: 3ª pérdida + oversizing + patrón confirmado → daño inminente, alta confianza.
**NO intervenir (degradar a refuerzo/feed o silencio):**
- `confidence` baja (n insuficiente) → **nunca** alarmar con ruido. Se guarda como insight, no como intervención.
- `urgency` baja (tendencia lenta) → va a HOY como insight accionable, no interrumpe.
- El trader ya está actuando bien (compromiso vigente y cumpliéndose) → silencio (no felicitar cada trade; el refuerzo también fatiga).
- **Override duro:** acercamiento a DD total de la prop firm **siempre** interviene, ignora θ y fatiga (capital first).

### 6.3 Cómo evitar fatiga (lo que el plan no diseña)
1. **Token bucket por usuario/día** de "presupuesto de interrupción". Las críticas de capital no consumen del bucket; el resto sí.
2. **Decay por tipo:** si un tipo de intervención se ignora k veces, su `expectedImpact` baja → deja de dispararse (aprende qué ignoras, como pide #36, pero a nivel intervención).
3. **Silencio ganado:** tras un periodo de disciplina, el coach se calla más (refuerza autonomía — clave psicológica, §abajo).
4. **Agrupación:** múltiples señales del mismo día se consolidan en **una** intervención, no N.
5. **Una activa máximo** (ya en el plan) + cooldown.

### 6.4 Registro para aprendizaje
Cada intervención escribe `Intervention { trigger, scores, shownAt, response('accept'|'dismiss'|'ignore'), outcomeAfter }`. Ese log **entrena `expectedImpact`** y alimenta Improvement Memory. Es lo que separa "Profesional" de "Elite": la intervención se **calibra a tu respuesta histórica**.

> **Crítica psicológica (Trading Psychologist):** el modelo de refuerzo binario del plan (positivo/correctivo) es conductismo ingenuo. El cambio sostenido necesita **soporte de autonomía** (Self-Determination Theory): el coach que **bloquea y regaña** genera evasión (RI-7). El motor de arriba lo mitiga con "silencio ganado" y θ adaptativo, pero el plan debe adoptar explícitamente refuerzo de **ratio variable** y lenguaje no-coercitivo, o el flywheel de datos (C7) se rompe por rechazo.

---

## 7. Moat — ventajas estructurales (no features)

El plan cree que su moat es "el loop de comportamiento + memoria". **Falso a 5 años:** un competidor financiado clona el loop en ~12 meses. Loop y memoria son **per-usuario y replicables**. Moats estructurales reales, en orden de defensibilidad:

1. **Data-network-effect cross-user, privacy-preserving (el moat profundo).**
   *"Traders con tu patrón de revenge-trading que lo corrigieron, lo hicieron activando el cool-down de 30 min y reduciendo tamaño un 40% — funcionó en el 68%."* Esto requiere un **modelo poblacional de qué intervenciones funcionan para qué perfiles**, entrenado sobre el corpus de `Intervention.outcome` + `Commitment.result` de todos los usuarios, con privacidad diferencial. **Cada usuario mejora el coach de los demás.** Es lo único que un competidor no puede copiar sin tener tus datos. **El plan lo prohíbe explícitamente** (anti-alcance: nada cross-user). *Recomendación: no es social; es aprendizaje agregado anónimo. Reabrir esta puerta con privacidad es la decisión estratégica más importante.*

2. **La base de reglas de prop firms como integración (moat aburrido y defendible).**
   Codificar las reglas exactas de cada firma (DD diario, reset horario, consistencia, news lockout, scaling) es trabajo manual, tedioso, que se desactualiza — exactamente lo que crea barrera. El Mentor-Prop Agent sobre una base de reglas mantenida es un activo que cuesta años replicar y que ningún journal generalista tiene. **Subexplotado en el plan** (E2.C7 lo menciona como capacidad del coach, no como activo central).

3. **El grafo de comportamiento verificado como switching cost.**
   A los 6 meses, la memoria de mentoría + el historial de compromisos verificados + la calibración de intervención **son tuyos y no exportables**. Cambiar de producto = empezar de cero la relación. Esto es lock-in legítimo (no oscuro) si se construye la memoria jerárquica de §5. El plan lo tiene como subproducto; debería ser tesis explícita.

4. **Cierre de loop verificado como confianza/credibilidad.**
   Ser el único que demuestra *"este usuario mejoró su expectancy y aquí está la evidencia causal"* (con diseño causal serio, §1.5) es un moat de marca en un mercado lleno de humo. Requiere arreglar la pseudo-causalidad (RI-9), no esconderla.

**Lo que NO es moat (y el plan trata como si lo fuera):** más métricas, más detectores, más gráficos, command palette, motion bonito. Todo copiable en un trimestre.

---

## 8. Cambios recomendados (priorizados)

### 🔴 Críticos (sin esto, el producto no cumple su tesis o se reescribe a 24m)
1. **ADR-001 antes de S0: runtime de eventos y entrega.** Decidir outbox+LISTEN/NOTIFY vs cola vs intervención síncrona, con su SLA real. C1 depende de esto. *(RI-1)*
2. **Separar el Cognitive Engine de la app Next.js** desde v3.0 con frontera limpia, aunque empiece como módulo. Evita la reescritura de 24m. *(riesgo 24m #1)*
3. **ADR-002: estrategia estadística Bayesiana/jerárquica**, no frecuentista per-user. Mitiga el ruido y R6. *(RI-3)*
4. **Reescribir la sección de causalidad** (transferencia, ImprovementScore) con diseño dentro-sujeto / interrupted time-series y lenguaje honesto. No llamar "transferencia" a una correlación. *(RI-9)*
5. **Dimensionar `evaluateCommitment` como una librería de verificadores**, no como "un mapa". Es la masa real del Behavior Engine. *(§1.6)*
6. **Motor de intervención con scoring formal (§6)** y modelo de fatiga, no if/else. Sin esto, fatiga → silenciar todo → R5. *(RI-7)*

### 🟡 Importantes (calidad, coste y defensibilidad)
7. **Memoria jerárquica (§5)** en lugar de tabla plana, con la frontera "LLM propone, datos confirman" (anti-poisoning). *(RI-5)*
8. **Router de modelos** (barato clasifica / caro narra) + diseño real de presupuesto de tokens con degradación. *(RI-4)*
9. **Caché incremental de `buildTraderContext` como entregable de S0/S3**, no NFR difuso.
10. **Reabrir (con privacidad diferencial) el aprendizaje cross-user** — el moat profundo (§7.1). Decisión estratégica, no técnica.
11. **Elevar la base de reglas de prop firms a activo central** (§7.2), con un sprint propio de modelado por firma.
12. **Cerrar C7 con bucle de incentivo** (el dato devuelve valor en el mismo trade), no sólo con menos taps. *(§1.3)*
13. **Régimen v3.0: marcar como experimental o adelantar datos de mercado**; no exponer un proxy circular como señal. *(RI-6)*
14. **Adoptar refuerzo de ratio variable + soporte de autonomía** en el modelo conductual (no bloqueo-y-regaño). *(RI-7)*

### 🟢 Opcionales (mejoran, no bloquean)
15. **Introducir ADRs** (`docs/v3/adr/`) como práctica; registrar las 4 decisiones de raíz con alternativas. *(RI-11)*
16. **Definir el contrato de privacidad del flujo a proveedores LLM** (qué de CoachMemory/check-ins sale a terceros, opt-out). *(RI-12)*
17. **Presupuesto de complejidad de HOY**: límite duro de ítems + algoritmo de priorización explícito antes de S13.
18. **Plan de degradación de SLA de intervención** ("≤2s" → "siguiente render") documentado como aceptable si ADR-001 no da push barato.

---

## Cierre

El plan v3 es **fuerte donde el trabajo es determinista** (longitudinal, métricas institucionales, el estado del loop, la unificación de reglas) y **frágil donde el trabajo es difícil de verdad**: ejecución en tiempo real, rigor cuantitativo a tamaños retail, causalidad honesta, memoria que no se corrompe, y un moat que sobreviva a un competidor financiado.

Ninguno de estos seis cambios críticos reduce el alcance; **cambian la secuencia y la profundidad** para que las tres piezas diferenciadoras (intervención, cuantitativo, mentoría) sean reales y no un check ✔. Si sólo se adopta uno: **ADR-001 (eventos/entrega) más la separación del Cognitive Engine**, porque es la decisión de la que depende que C1 — el corazón del producto — exista, y la que decide si a 24 meses hay evolución o reescritura.
