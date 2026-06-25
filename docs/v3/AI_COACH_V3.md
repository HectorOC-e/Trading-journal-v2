# AI_COACH_V3.md
### Trading Journal v3 — Rediseño integral del AI Coach

> Documento 4/8. Implementa **todos** los hallazgos del apartado AI Coach de la auditoría (§4, C1, C2) y los ítems #1, #6, #13, #25, #28, #47.
> De **"analista que responde" (Útil)** a **"coach que acompaña" (Profesional→Elite)**.

---

## 1. Diagnóstico de partida (verificado en código)
Hoy: chat agéntico (`coach-agent.ts`), 10 tools **read-only** (`coach-tools.ts`), contexto estático rico (`ai-context.ts` + `coach-service.ts`), prompt-caching, separación práctica/real, fallback a stream estático. **Sin** memoria, **sin** iniciativa, **sin** escritura, **sin** longitudinal, **sin** seguimiento.

Los 3 atributos que faltan para ser Profesional: **iniciativa, memoria, capacidad de actuar.**

---

## 2. Arquitectura objetivo

```
                    ┌────────────────────────────────────────────┐
  Eventos de domino │  trade.created/closed · insight.created ·   │
  (coach-bus)  ────▶│  commitment.window_end · account.dd_breach  │
                    └───────────────┬────────────────────────────┘
                                    ▼
                          ┌───────────────────┐      ┌──────────────────┐
                          │ COACH PROACTIVE    │◀────▶│  BEHAVIOR ENGINE  │
                          │ worker (deltas)    │      │  (compromisos)    │
                          └─────────┬─────────┘      └──────────────────┘
                                    ▼
            ┌───────────────────────────────────────────────────┐
            │ Intervention?  → InterventionOverlay (tiempo real) │
            │ Reinforcement? → HOY feed                          │
            └───────────────────────────────────────────────────┘
  Chat (pull)  ─────▶ coach-service v3 ─▶ coach-agent (read+write tools) ─▶ stream
                          ▲   uses: CoachMemory · CoachThread · longitudinal ctx
```

Dos caminos: **PULL** (chat, como hoy pero con memoria + longitudinal + write-tools) y **PUSH** (worker proactivo que vigila eventos y decide intervenir/reforzar).

---

## 3. Memoria del coach (C2, #1)

### 3.1 Modelo de datos
- **`CoachMemory`**: `id, userId, kind ('fact'|'preference'|'summary'|'trait'), content, sourceThreadId?, confidence, createdAt, updatedAt, expiresAt?`.
- **`CoachThread`**: `id, userId, title, createdAt, lastMessageAt, summary?`.
- **`CoachMessage`**: `id, threadId, role, content, toolCalls?, createdAt`.

### 3.2 Ciclo de memoria
1. Al cerrar/idle un thread, un job genera un **resumen** (LLM) y extrae **hechos/preferencias** → `CoachMemory`.
2. Al iniciar cualquier conversación, se inyectan (a) los hechos/preferencias relevantes, (b) los **compromisos activos y su estado**, (c) el resumen de la última conversación.
3. La memoria es **visible y editable** por el trader (transparencia; cumplir privacidad). Borrable.

### 3.3 AC
- Dado un thread previo, Cuando inicio otro, Entonces el coach referencia ≥1 hecho/compromiso real previo.
- La memoria nunca contiene credenciales (regla ya existente) ni datos de práctica como reales.

---

## 4. Proactividad & intervenciones en tiempo real (C1, #1)

### 4.1 Worker proactivo
- Suscrito a eventos de dominio (extiende `coach-bus.ts`). **Opera sobre deltas** (el trade nuevo + ventana del día), no full-scan (NFR coste).
- En cada evento ejecuta los **detectores deterministas** sobre la ventana relevante (reutiliza `pattern-detector`, `psychology-insights`, `insights-engine`, edge-decay) y decide:
  - **Intervención** (overlay) si dispara crítico en vivo: revenge (2ª/3ª pérdida + impulsivo), **cascada/tilt** (E7.C1), oversizing tras pérdida, acercamiento a DD diario.
  - **Refuerzo** (HOY feed) si detecta hábito ganador (racha limpia, compromiso cumplido).
  - **Nada** si no hay señal (silencio por defecto — evita fatiga).

### 4.2 Reglas de intervención (DS §10.4)
- Máx **1 intervención activa**; cooldown configurable; críticas de capital nunca se suprimen.
- Copy: directo + empático + **una** acción protectora + salida con fricción. Ej:
  > "Para. Llevas 2 pérdidas y acabas de doblar tamaño — es tu patrón nº1 de fuga de capital. ¿Cerramos por hoy?" · [Activar bloqueo 60 min] · [Seguir, asumo el riesgo]
- Registra `Intervention{trigger, severity, shownAt, response, outcome}` para aprendizaje y para el modelo de mejora (E14).

### 4.3 AC
- Dado 3ª pérdida del día + tamaño > 2× media, Cuando se guarda el trade, Entonces aparece intervención en ≤2s con acción de bloqueo.
- Si el trader la ignora 3×, el coach lo nombra en la review (sin culpabilizar).

---

## 5. Acción-con-permiso (write-tools) (#13)

El coach pasa de read-only a **read + write con confirmación explícita**. Nuevas tools (toda escritura requiere un paso de confirmación del usuario en UI):
| Tool nueva | Acción | Confirmación |
|---|---|---|
| `propose_commitment` | crea un `Commitment` desde un insight | botón en la respuesta |
| `propose_rule` | crea una `Rule` (enforce/warn) precargada | botón |
| `schedule_checkin` | programa check-in pre-sesión | botón |
| `create_study_card` | crea tarjeta/recurso desde un error recurrente | botón |
| `mark_review_ready` | prepara la review con datos | botón |

**Invariante de seguridad:** el coach **nunca** ejecuta una escritura sin acción explícita del trader; todo queda auditado (`Intervention`/`CoachAction` log). Read-tools actuales se conservan.

---

## 6. Seguimiento de compromisos (C5, #5) — integra Behavior Engine
- El coach **conoce** los compromisos activos y su verificación (lee de `Commitment`/`CommitmentCheck`).
- Cada inicio de sesión y cada review: "la semana pasada te comprometiste a X → cumpliste 3/5 (evidencia)".
- Cuando un compromiso se rompe, el coach abre micro-reflexión y ofrece ajustar la regla. Ver `BEHAVIOR_ENGINE_V3.md`.

---

## 7. Sistema psicológico del coach (§3.3, E7)
- Consume los detectores de psicología v3 (cascadas, calibración de confianza, sesgos extra, mood longitudinal).
- **Check-in pre-sesión** (E7.C5): el coach pide estado; si "rojo", recomienda no operar/reducir tamaño y puede proponer una regla temporal del día.
- Detecta **cascadas de tilt** y es ahí donde interviene más agresivamente (la unidad real del daño).
- Habla de patrones emocionales con **tendencia** ("tu mood viene cayendo 3 semanas"), no solo promedios.

---

## 8. Sistema cuantitativo del coach (#47, #15, #17)
El coach cita **rigor**, no impresiones:
- **Significancia/IC:** "tu WR subió 6pp pero n=18, intervalo amplio — aún no es señal".
- **Proyección prop:** "P(pasar fase) ≈ 72% en ~18 sesiones; tu mayor riesgo es DD diario los martes" (lee de `ANALYTICS_V3` risk engine).
- **Riesgo de ruina** y **trade máximo permitido hoy** dado el budget.
- Todo número proviene del **cálculo determinista** (Analytics v3); el LLM **narra**, no calcula.

---

## 9. Sistema de mentoría (longitudinal) (#25)
- **Longitudinal por defecto:** toda respuesta compara ventana actual vs anterior.
- **Relación en el tiempo:** la memoria + el modelo de mejora del trader (E14) permiten "eres mejor trader que hace 3 meses, y aquí está por qué".
- **Mentor-prop:** conoce las reglas de cada firma del trader y traduce conducta → riesgo de invalidación.

---

## 10. Cambios en el prompt del sistema
Se conserva la base (`coach-service.ts buildSystemPrompt`) y se añade:
- Bloque **MEMORIA** (hechos/preferencias/resumen previo) — dinámico, no cacheado.
- Bloque **COMPROMISOS ACTIVOS + verificación**.
- Bloque **TENDENCIA** (deltas de ventana) en lugar de solo snapshots.
- Instrucciones de **acción-con-permiso** (cómo y cuándo ofrecer botones; nunca escribir sin confirmación).
- Instrucciones cuantitativas (citar n, IC, no afirmar señal sin significancia).
- Se mantiene: español, separación práctica/real, no inventar, no revelar credenciales, LaTeX, prompt-caching del bloque estático (APP_KNOWLEDGE).

---

## 11. Clasificación objetivo y cómo se alcanza
| Nivel | Atributos | Cómo lo logra v3 |
|---|---|---|
| Útil (hoy) | tools read-only + contexto | — |
| **Profesional** | + iniciativa + memoria + acción | §3, §4, §5, §6 |
| **Elite** | + aprende tu patrón y lo previene | E14 (modelo de mejora) + intervención calibrada por respuesta histórica |

---

## 12. NFR del coach (mitiga R4)
- **Caché incremental** de `buildTraderContext` (hoy ~12 queries por request): materializar a una tabla/refresh, e invalidar por evento.
- **Worker sobre deltas**: nunca recalcula toda la historia por un trade.
- **Presupuesto de tokens** por usuario/día con degradación elegante (menos contexto, no romper).
- **Latencia de intervención** objetivo ≤2s (detectores deterministas, no LLM en el camino crítico de la decisión de intervenir; el texto puede stream-ear después).
- **Privacidad:** memoria y check-ins cifrados en reposo, borrables.

---

## 13. Métricas del coach
- % intervenciones aceptadas; % insights→acción; nº compromisos creados desde el coach; tasa de cumplimiento de compromisos asistidos; reducción de cascadas tras intervención; satisfacción (pulgar arriba/abajo por respuesta).

---

## 14. Cobertura de hallazgos (este doc)
C1 ✔(§4) · C2 ✔(§3) · #1 ✔(§4) · #6 ✔(§3) · #13 ✔(§5) · #25 ✔(§9) · #28 ✔(§4.1 refuerzo/digest, con E11) · #47 ✔(§8) · §4.1–4.5 auditoría ✔ (qué hace/qué debería/nivel/capacidades/versión 10x).
