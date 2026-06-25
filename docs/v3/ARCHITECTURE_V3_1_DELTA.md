# ARCHITECTURE_V3_1_DELTA.md
### Trading Journal v3 → v3.1 — Delta de arquitectura

> Documento de fusión. Integra los hallazgos de `REHYDRATION_REPORT.md` y `ARCHITECTURE_CHALLENGE.md`
> en la arquitectura v3 existente (8 documentos de `docs/v3/`). **No reemplaza** los documentos maestros:
> los **enmienda**. Cada cambio cita su origen (RI-x = riesgo del reporte; §x = sección del challenge) y su
> **gate de obligatoriedad**. No implementa nada.
> Fecha: 2026-06-25 · Rama: `feat/v3-master-plan`.

---

## 0. Cómo leer este documento

- **No cambia el alcance.** Cambia **secuencia, profundidad y fronteras**. Los 14 Epics y la cobertura 100% de la auditoría se mantienen.
- **Clasificación de gating** (la pregunta del usuario):
  - 🚦 **G0 — Obligatorio antes de Sprint 0:** decisiones que, si se toman mal o tarde, obligan a reescribir. Casi todas son **ADRs**, no código.
  - 🛑 **G1 — Obligatorio antes de Sprint 1:** cambios necesarios una vez S0 produce primitivas, antes de tocar reglas/captura.
  - 🕓 **Puede esperar:** mejora calidad/coste/moat pero no bloquea el arranque; se agenda en su sprint natural.
- **Origen de cada cambio:** trazado a `RI-1..12` (riesgos de implementación) y a las secciones §1–§8 del challenge.

### Tabla resumen de gating (índice rápido)
| ID | Cambio | Gate | Origen |
|---|---|---|---|
| D1 | ADR-001: runtime de eventos y entrega | 🚦 G0 | RI-1, §1.1, §2.1 |
| D2 | Separar **Cognitive Engine** de la app Next.js (frontera) | 🚦 G0 | §3(24m·1), §4 |
| D3 | ADR-002: estrategia estadística Bayesiana/jerárquica | 🚦 G0 | RI-3, §1.4, §3 |
| D4 | ADR-003: contrato de privacidad (memoria → LLM externo) | 🚦 G0 | RI-12, §8.16 |
| D5 | `Insight` con campos de confianza/n desde el día 1 | 🚦 G0 | RI-3, §1.4, §6 |
| D6 | Bus de dominio = **entregable propio de S0** (no bullet) | 🚦 G0 | RI-1, §1.1 |
| D7 | Caché incremental de contexto como entregable, no NFR | 🛑 G1 | RI-4, §2.2 |
| D8 | `evaluateCommitment` = librería de verificadores dimensionada | 🛑 G1 | §1.6 |
| D9 | Fusión Rule/Automation como fusión **semántica** (no de filas) | 🛑 G1 | RI-2, §1.2 |
| D10 | C7: bucle de incentivo (dato devuelve valor en el mismo trade) | 🛑 G1 | RI-? , §1.3 |
| D11 | Memoria jerárquica de 4 capas (anti-poisoning) | 🕓 (frontera en G0) | RI-5, §5 |
| D12 | Motor de intervención con scoring formal + fatiga | 🕓 | RI-7, §6 |
| D13 | Coach → orquestador → specialists (por fases) | 🕓 | §4 |
| D14 | Router de modelos + presupuesto de tokens real | 🕓 | RI-4, §3 |
| D15 | Régimen v3.0 = experimental; no exponer proxy circular | 🕓 | RI-6, §1, §2 |
| D16 | Reescribir causalidad (transferencia/ImprovementScore) | 🕓 | RI-9, §1.5 |
| D17 | Refuerzo de ratio variable + soporte de autonomía | 🕓 | RI-7, §6 |
| D18 | Moat: reabrir aprendizaje cross-user (privacy-preserving) | 🕓 (decisión G0) | §7.1 |
| D19 | Moat: base de reglas prop-firm como activo central | 🕓 | §7.2 |
| D20 | Introducir ADRs + registrar decisiones de raíz | 🚦 G0 | RI-11 |

---

## 1. Cambios arquitectónicos recomendados

### D1 — ADR-001: runtime de eventos y entrega 🚦 G0
**Problema:** C1 (coach proactivo, intervención ≤2s) no tiene infra. `coach-bus.ts` es un `window.dispatchEvent` de 9 líneas; el único scheduler es `pg_cron→pg_net→/api/cron/*` (batch horario); no hay push.
**Cambio:** decidir y documentar **antes de escribir nada**:
- Patrón de eventos server: **outbox + Postgres `LISTEN/NOTIFY`** vs **cola (`pg-boss`)** vs **intervención síncrona** en la mutación `trade.create`.
- Canal de entrega al cliente: respuesta síncrona de la mutación vs polling corto vs Realtime/SSE.
- **SLA realista de intervención.** Si el camino barato no da push, degradar el AC de "≤2s push" a "en el siguiente render / polling ≤Ns" — y documentarlo como aceptable (ver D-roadmap).
**Por qué G0:** de esto depende que el único diferenciador difícil exista; elegir mal fuerza reescritura.

### D2 — Separar el Cognitive Engine de la app Next.js 🚦 G0
**Problema:** detección, intervención, bus, jobs y memoria viven dentro del Next.js fork interno. A 24 meses, moverlos a un servicio de eventos = reescritura, no refactor.
**Cambio:** establecer **frontera de módulo limpia** desde v3.0 (`domains/cognitive/` o paquete separado) con un contrato de entrada/salida (eventos in, intervenciones/insights out) **independiente del runtime web**. Empieza como módulo in-repo; la frontera permite extraerlo a servicio sin tocar consumidores.
**Por qué G0:** es una decisión de límites; barata ahora, carísima después.

### D3 — ADR-002: estrategia estadística 🚦 G0
**Problema:** t-test/Mann-Kendall/Monte Carlo per-user a n=20–200 + ~20 detectores rolling = falsos positivos (look-elsewhere). Reintroduce R6.
**Cambio:** adoptar **Bayesiano con shrinkage / priors jerárquicos** (pooling parcial hacia la población de setups/traders) como estándar del motor analítico. Definir umbrales de confianza y corrección por comparaciones múltiples **antes** de construir los detectores que los usan.
**Por qué G0:** ancla todo el motor de §5 de ANALYTICS; cambiarlo después toca todo.

### D20 — Gobernanza: ADRs 🚦 G0
**Cambio:** crear `docs/v3/adr/` y registrar como ADR-000 las 4 decisiones de raíz (con alternativas descartadas y reversibilidad). ADR-001/002/003 = D1/D3/D4.
**Por qué G0:** sin esto, las decisiones críticas siguen siendo prosa irreversible (RI-11).

> **Enmienda a `PRODUCT_MASTER_PLAN.md §7` y `IMPLEMENTATION_ORDER.md §9`:** el "Sprint 0 primer paso" pasa de *"rollingWindow + Insight + bus"* a *"ADR-001/002/003 → luego rollingWindow + Insight + **bus como entregable**"*.

---

## 2. Cambios en AI Coach

### D13 — Evolución por fases a multi-agente 🕓 (Fase 1 = v3.0; resto v3.1+)
**Problema (§4):** un agente monolítico mezcla psicólogo + quant + mentor-prop + narrador de memoria + agente de acción en un prompt → regresión de prompt, contexto sin límite.
**Cambio:**
- **v3.0 (sin cambio):** agente único + tools deterministas (lo que el plan ya propone). **Correcto, se mantiene.**
- **v3.1:** **orquestador + router de intención** que selecciona system-prompt + toolset + modelo por tipo de petición (psico/quant/acción/general). No agentes que conversan; un router a configuraciones especializadas.
- **v3.2:** specialists reales sólo donde el multi-paso lo justifique (Quant, Psychology, Mentor-Prop, Memory Agent en background).
**Enmienda a `AI_COACH_V3.md §2`:** añadir el diagrama objetivo (challenge §4) como "arquitectura destino"; marcar v3.0 como Fase 1 explícita.

### D14 — Router de modelos + presupuesto de tokens 🕓 (diseño en S6, refuerzo de RI-4)
**Cambio:** abstracción de routing por coste/latencia (modelo barato clasifica/decide intervenir; modelo caro narra). Presupuesto de tokens por usuario/día **con algoritmo de degradación definido** (menos contexto, no romper), no la frase actual.
**Enmienda a `AI_COACH_V3.md §12`:** convertir el NFR "presupuesto de tokens" en especificación con política de degradación.

### Invariante reforzado (sin cambio, se sube de rango)
El "LLM narra, no calcula" se eleva a **invariante de seguridad de primer nivel**: el coach **nunca** emite un número que no provenga del motor determinista, y **nunca** confirma memoria semántica/identidad sin verificación de datos (ver D11).

---

## 3. Cambios en Memory System

### D11 — Memoria jerárquica de 4 capas 🕓 contenido / 🚦 G0 la frontera
**Problema:** `CoachMemory { kind, content, confidence }` es plana; a 5 años no soporta razonamiento longitudinal ni evita corrupción (RI-5).
**Cambio (challenge §5):** reemplazar la tabla plana por cuatro capas:
- **Episodic** (`MemoryEpisode`): eventos concretos, append-only, embedding, saliencia con decay.
- **Semantic** (`MemoryPattern`): patrones; `status candidate|confirmed|refuted`; **sólo `confirmed` con soporte determinista** (N episodios), nunca por afirmación del LLM.
- **Identity** (`MemoryIdentity`): 1 registro/usuario, estructurado (rasgos/preferencias/estilo), editable.
- **Improvement** (`MemoryImprovement`): serie temporal (reutiliza `ImprovementScore` + hitos).
- **Context Assembler** con presupuesto: `Identity (siempre) + Semantic relevantes + top-k Episodic + delta Improvement`.
- **Frontera anti-poisoning (LA decisión G0):** *"el LLM propone, los datos confirman"*. Esta frontera debe existir desde el primer commit de memoria aunque las 4 tablas se construyan luego; si S6 nace con memoria plana editable por LLM, migrarla después es doloroso.
**Enmienda a `AI_COACH_V3.md §3`:** sustituir el modelo de datos plano por las 4 capas; añadir la regla de confirmación determinista a §3.2.

### D4 — ADR-003: privacidad del flujo a proveedores LLM 🚦 G0
**Problema (RI-12):** CoachMemory/check-ins (perfil psicológico inferido) viajan a Anthropic/OpenAI/OpenRouter cada request. El plan menciona cifrado en reposo, no el flujo a terceros.
**Cambio:** definir **qué** sale a terceros, opt-out, minimización (no enviar identity completa si no aplica), y consentimiento. Es prerrequisito legal/ético de toda la memoria.
**Por qué G0:** condiciona el modelo de datos de memoria y el consentimiento de onboarding (E13).

---

## 4. Cambios en Intervention Engine

### D12 — Motor de scoring formal + modelo de fatiga 🕓 (diseño antes de S7)
**Problema:** el plan define UX (overlay, 1 activa, cooldown) pero **no el motor de decisión** → if/else → fatiga → R5.
**Cambio (challenge §6):** introducir scoring explícito:
```
priority = severity × urgency × confidence × expectedImpact × (1 − fatiguePenalty)
intervenir si priority ≥ θ(usuario)   [θ adaptativo desde Identity Memory]
```
- **Cuándo NO intervenir:** `confidence` baja → insight, no alarma; `urgency` baja → HOY feed; trader cumpliendo compromiso → silencio.
- **Override duro:** acercamiento a DD total prop **siempre** interviene (ignora θ y fatiga).
- **Anti-fatiga:** token-bucket de interrupción/día (las críticas no consumen), decay por tipo ignorado, "silencio ganado", agrupación diaria.
- **`expectedImpact` aprendido** de `Intervention.outcome` histórico (lo que separa Profesional de Elite).
**Enmienda a `AI_COACH_V3.md §4.2` y `DESIGN_SYSTEM_V3.md §10.4`:** añadir el modelo de scoring como capa de decisión previa al overlay; el overlay sigue igual.

### D17 — Modelo conductual: ratio variable + autonomía 🕓
**Problema (RI-7, Trading Psychologist):** refuerzo binario positivo/correctivo + "bloquear y nombrar fallos" → evasión; el trader desactiva enforce o deja de registrar (R2 por otra puerta).
**Cambio:** adoptar explícitamente **refuerzo de ratio variable** (no felicitar cada trade) y **lenguaje no-coercitivo / soporte de autonomía** (Self-Determination Theory). El "silencio ganado" de D12 es parte de esto.
**Enmienda a `BEHAVIOR_ENGINE_V3.md §4.4` (`reinforce`):** el refuerzo deja de ser determinista 1:1 con el resultado; usa cadencia de ratio variable.

---

## 5. Cambios en Analytics

### D3 (aplicado) — Bayesiano/jerárquico como base 🚦 G0 (decisión) / por-sprint (uso)
Todos los detectores de §5–§8 de `ANALYTICS_V3.md` (edge decay, drift, calibración, ruina, proyección prop, mejora) **consumen** la decisión de D3. Reescribir, en ANALYTICS_V3:
- **§5.1 Edge decay:** sustituir "Welch t-test ligero" por estimación con shrinkage hacia la población de setups; reportar intervalo creíble, no p-value.
- **§8.1/8.2 Riesgo de ruina / proyección prop:** marcar como **no estacionario**; reportar **distribución / banda**, nunca un punto ("72%") sin mostrar inestabilidad del modelo (el coach no debe citar puntos falsos).

### D5 — `Insight` lleva confianza/n desde el día 1 🚦 G0
**Problema:** sin `confidence`/`sampleSize` en el `Insight` persistido (S0), el motor de intervención (D12) y la verificación no pueden distinguir señal de ruido más tarde → retrofit doloroso.
**Cambio:** el `Insight` de S0 incluye `sampleSize`, `confidence`/`credibleInterval`, `effectSize`. **Enmienda a `ANALYTICS_V3.md §12` y `BEHAVIOR_ENGINE_V3.md §2.1`.**

### D15 — Régimen v3.0 = experimental 🕓
**Problema (RI-6):** proxy de régimen derivado del propio P&L es circular (confunde régimen con rendimiento).
**Cambio:** no exponer el proxy como señal de producto en v3.0; marcarlo `experimental` o adelantar datos de mercado (ATR) — lo que abre dependencia de fuente externa, a decidir. **Enmienda a `ANALYTICS_V3.md §7` y `MASTER_PRD.md E14.US1`** (degradar el AC a "etiqueta manual" hasta tener señal exógena).

### D16 — Causalidad honesta 🕓
**Problema (RI-9):** transferencia (#31) e ImprovementScore (#41) son pre/post sin control → confundidos.
**Cambio:** diseño dentro-sujeto / interrupted time-series; **no llamar "transferencia" a una correlación** en la UI. **Enmienda a `ANALYTICS_V3.md §11` y `MASTER_PRD.md E9.C1`:** renombrar y etiquetar; reportar n y confound conocidos.

---

## 6. Cambios en Behavior Engine

### D8 — `evaluateCommitment` como librería de verificadores 🛑 G1
**Problema (§1.6):** el plan trata el mapeo insight→métrica→evaluador como "un mapa determinista, empezar con 5 tipos", pero el producto promete que **cualquier** insight ofrece "comprometerme". La masa real de ingeniería es una librería de verificadores que crece con cada detector.
**Cambio:** dimensionar y especificar el **contrato de verificador** (`Verifier<insightType> → {metricKey, evaluate(window) → observedValue, evidence}`); definir el subconjunto inicial (5) **y** la política para insights sin verificador (offer "comprometerme" sólo si existe verificador; el resto → "anotar"/"estudiar"). **Enmienda a `BEHAVIOR_ENGINE_V3.md §4.1/§4.3`.**

### D9 — Fusión Rule/Automation es **semántica** 🛑 G1
**Problema (RI-2):** `Rule` (descriptivo) y `Automation` (ejecutable) no mapean 1:1; "sin pérdida" es cierto para filas, no para significado → riesgo de `warn` decorativas (R3 con otra forma).
**Cambio:** S1 debe (a) clasificar cada `Rule` v2 en `enforce`/`warn`, (b) reconciliar cada `Automation` con nombre/severidad, (c) **dry-run con informe de las que no mapean** y decisión humana, no migración ciega. **Enmienda a `SPRINT_PLAN.md S1` y `MASTER_PRD.md E6.US1`.**

### D5 (aplicado) — `Insight` persistido con confianza (ver §5).

### Invariantes que se conservan (sin cambio)
"Ningún insight sin CTA", "ningún compromiso sin verificación", "verificación objetiva" se mantienen — pero **acotados por D8**: la CTA "comprometerme" sólo aparece donde hay verificador; donde no, la CTA es "estudiar/anotar" (sigue sin morir como texto, pero no promete verificación que no puede dar).

---

## 7. Cambios en Roadmap

> Enmienda a `IMPLEMENTATION_ORDER.md` y `PRODUCT_MASTER_PLAN.md §6/§7`.

### 7.1 Nueva fase previa: **Fase A0 — Decisiones (pre-S0)**
Antes de cualquier código:
```
A0: ADR-000 (decisiones de raíz) · ADR-001 (eventos/entrega) ·
    ADR-002 (estadística) · ADR-003 (privacidad LLM)
    + frontera Cognitive Engine + invariante de Insight(confianza)
```
**Gate G0** (nuevo, antes del actual G1). Sin A0, S0 arranca sobre supuestos no decididos.

### 7.2 Ruta crítica corregida
```
A0 ▶ S0 ▶ S4 ▶ S5 ▶ S6 ▶ S7 ▶ S12 ▶ S13 ▶ S14
```
La ruta crítica del *valor* (S0→S4→S5) no cambia. La del *diferenciador* (S6→S7) ahora descansa sobre A0 (eventos) y la frontera D2, no sobre supuestos.

### 7.3 Reclasificación de SLA de la intervención
Si A0/ADR-001 concluye que el push barato no es viable, el AC de intervención se **degrada formalmente** de "≤2s push" a "siguiente render / polling ≤Ns" en `MASTER_PRD.md E2.US2` y `AI_COACH_V3.md §4.3`. Decisión documentada, no incumplimiento silencioso (riesgo 12m #1).

### 7.4 Moat como track estratégico paralelo (no sprint)
- **D18 (cross-user, privacy-preserving):** decisión estratégica en A0 (¿se diseña el modelo de datos para permitir aprendizaje poblacional anónimo en el futuro?). Si la respuesta es "quizá", el aislamiento estricto **no** se cierra en el schema. Implementación: muy posterior.
- **D19 (base de reglas prop-firm):** elevar a activo central; **sprint propio** insertado tras S9 (o dentro), de modelado por firma.

### 7.5 Gates revisados
| Gate | Tras | Qué valida (nuevo o cambiado) |
|---|---|---|
| **G0 (nuevo)** | A0 | ADRs firmados; frontera Cognitive Engine; camino de eventos elegido con coste; SLA de intervención fijado |
| G1 | S0 | Primitivas + Insight(confianza) + **un evento `trade.created` llega a un consumidor server fiable** |
| G2 | S1 | Migración Rule/Automation con **informe de no-mapeo** revisado (no sólo replay) |
| G3 | S5 | Loop end-to-end, con verificadores acotados (D8) |
| G4 | S7 | Intervención con scoring+fatiga (D12), no if/else |
| G5 | S12 | 5 superficies |
| G6 | S14 | v3.1 completo; causalidad etiquetada honestamente (D16) |

---

## 8. Cambios en Sprints

> Enmienda a `SPRINT_PLAN.md`. Sólo se listan los sprints que cambian.

### Sprint −1 / **A0 (nuevo, no es código)** 🚦 G0
**Entregables:** ADR-000/001/002/003; definición de frontera Cognitive Engine; contrato de evento mínimo; decisión de SLA de intervención; decisión de aislamiento de datos (D18).
**Validación:** documentos firmados; spike técnico que prueba el camino de eventos elegido (1 evento `trade.created` → consumidor server) **a coste medido**.

### Sprint 0 — Fundaciones (enmendado) 🚦 G0
**Cambios:**
- "Extiende `coach-bus.ts`" → **"construye el bus de dominio server"** (D6) según ADR-001. Es **un entregable propio**, no un bullet.
- `Insight` persistido nace con `sampleSize/confidence/effectSize` (D5).
- Estructura de carpetas refleja la frontera Cognitive Engine (D2).
**Validación añadida:** entrega de evento fiable (criterio de G1).

### Sprint 1 — Reglas (enmendado) 🛑 G1
**Cambios:** fusión **semántica** con dry-run + **informe de no-mapeo** revisado por humano (D9), no migración ciega. Gate G2 actualizado.

### Sprint 2 — Captura (enmendado) 🛑 G1
**Cambios:** C7 se cierra con **bucle de incentivo** (D10): al registrar emoción, el trade muestra de vuelta valor inmediato ("tu WR histórico entrando 'ansioso'"). No basta "menos taps".

### Sprint 3 — Métricas institucionales (enmendado) 🕓
**Cambios:** caché incremental de `buildTraderContext` empieza aquí como **entregable** (D7); métricas de riesgo reportan **bandas/intervalos creíbles** (D3), no puntos.

### Sprint 6 — Coach memoria (enmendado) 🕓 (frontera G0)
**Cambios:** memoria nace **jerárquica** (4 capas, D11) o, como mínimo, con la **frontera "LLM propone, datos confirman"** desde el primer commit; nunca memoria plana editable por LLM. Router de modelos y presupuesto de tokens con degradación (D14).

### Sprint 7 — Proactividad/intervención (enmendado) 🕓
**Cambios:** incluye el **motor de scoring + fatiga** (D12) como capa de decisión; refuerzo de ratio variable (D17). El SLA es el fijado en A0 (D-roadmap 7.3).

### Sprint 9 — Riesgo & Prop (enmendado) 🕓
**Cambios:** proyecciones como distribución no estacionaria (D3/§3); insertar (aquí o adyacente) el **track de base de reglas prop-firm** como activo (D19).

### Sprints 11 / 14 — Aprendizaje & Mejora (enmendado) 🕓
**Cambios:** causalidad honesta (D16): renombrar "transferencia"→"asociación (correlación, n)"; ImprovementScore con confounds etiquetados. Régimen experimental (D15) en S14.

---

## 9. Resumen ejecutivo del delta

**Lo que NO cambia:** alcance, los 14 Epics, cobertura 100% de la auditoría, las primitivas deterministas (rollingWindow, métricas, el estado del loop), la fase 1 del coach.

**Lo que cambia (y por qué importa):**
1. **Nace una Fase A0 de decisiones (G0)** con 4 ADRs. La más crítica: **ADR-001 (eventos/entrega)**, de la que depende que C1 — el corazón del producto — exista.
2. **El Cognitive Engine se separa de la app** desde el día 1 (frontera), para que la evolución a multi-agente y a servicio no sea reescritura.
3. **El rigor se vuelve real:** Bayesiano/jerárquico, `Insight` con confianza desde S0, proyecciones como bandas, causalidad etiquetada — mata el R6 que el plan reintroducía.
4. **La memoria y la intervención dejan de ser "una tabla" y "un overlay"** y pasan a ser sistemas (jerarquía anti-poisoning; scoring con fatiga).
5. **El moat se nombra explícitamente** (cross-user privacy-preserving + reglas prop-firm) y condiciona una decisión de datos en A0.

**Si sólo se adopta una cosa antes de Sprint 0:** **ADR-001 + la frontera del Cognitive Engine (D1+D2)**. Es lo que decide si el producto puede intervenir en tiempo real y si a 24 meses hay evolución o reescritura.

---

### Apéndice — Mapa cambio → documento maestro a enmendar
| Cambio | Documento(s) a editar cuando se implemente |
|---|---|
| D1, D2, D6, D20 | `IMPLEMENTATION_ORDER.md`, `PRODUCT_MASTER_PLAN.md §6/§7`, nuevo `adr/` |
| D3, D5, D15, D16 | `ANALYTICS_V3.md §5/§7/§8/§11/§12`, `MASTER_PRD.md E9/E14` |
| D4, D11, D13, D14 | `AI_COACH_V3.md §2/§3/§12` |
| D12, D17 | `AI_COACH_V3.md §4`, `DESIGN_SYSTEM_V3.md §10.4`, `BEHAVIOR_ENGINE_V3.md §4.4` |
| D8, D9 | `BEHAVIOR_ENGINE_V3.md §4`, `SPRINT_PLAN.md S1`, `MASTER_PRD.md E6.US1` |
| D7, D10 | `SPRINT_PLAN.md S2/S3`, `AI_COACH_V3.md §12` |
| D18, D19 | `PRODUCT_MASTER_PLAN.md §11 (anti-alcance)` — requiere reabrir decisión |
