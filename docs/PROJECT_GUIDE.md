# Project Guide — Trading Journal v3.2

> **Punto de entrada único para cualquier desarrollador.** Si lees solo un documento, que sea este.
> Última actualización: 2026-07-09.

---

## 1. ¿Qué es?

Trading Journal es una **capa cognitiva sobre el bróker que cambia el comportamiento del trader** — no "otra app de métricas". v2 era un journal que registraba, reflejaba y enseñaba; v3 lo convirtió en un sistema que **observa, entiende, interviene y enseña**: la unidad de valor ya no es el trade guardado, sino **el cambio de comportamiento verificado** (principio congelado `FREEZE-P1` en `ARCHITECTURE.md`).

El principio de diseño de v3 fue "se construyó el cerebro antes que la piel": la lógica pura y testeada (motores de comportamiento, analítica institucional, memoria, intervención) aterrizó primero, invisible; la UI la hizo observable después. v3.2 añadió el quinto eje — hacer visible esa memoria y cerrar el bucle con el trader ("el compañero cognitivo").

En una frase: captura cada trade, revela patrones de comportamiento que el trader no ve, hace cumplir las reglas que se comprometió a seguir, interviene en el momento del error (no en el post-mortem), recuerda con rigor, y mide honestamente si el trader está mejorando.

## 2. ¿Qué NO es?

- **NO** es una integración con broker (no hay feed de P&L en vivo; los trades se registran manual o por CSV).
- **NO** es un servicio de señales ni una plataforma social.
- **NO** es un ejecutor de algos (solo analítica, sin order routing).
- **SÍ** es un vault privado de un solo trader con analítica server-side, enforcement de reglas y aprendizaje por repetición espaciada — ahora enriquecido con un motor de comportamiento, intervención en el momento del error y memoria de coach de 4 capas.

## 3. Usuarios objetivo

| Persona | Perfil | Necesidad clave |
|---|---|---|
| Retail Learner | <1 año, discrecional, cuenta personal | Formación de hábito, enforcement de reglas |
| Prop Firm Candidate | 1-3 años, challenge estructurado | Cumplimiento de drawdown, consistencia |
| Funded Trader | 2+ años, gestiona capital | Refinamiento del edge, analítica de rendimiento |
| System Trader | Backtesting de setups | Correlación estudio ↔ rendimiento del setup |

---

## 4. Módulos y rutas

### Módulos v2 (base)

| Módulo | Ruta | Qué hace |
|---|---|---|
| **Dashboard** | `/dashboard` | 4 pestañas (Portfolio, Operador, Disciplina, Playbook); analítica server-side |
| **Trades** | `/trades` | Ciclo de vida del trade, import CSV, filtros, psicología por trade |
| **Cuentas** | `/cuentas` | CRUD de cuentas, fases prop-firm, drawdown, audit log |
| **Playbook / Setups** | `/playbook` | Setups con checklists, versiones+diff, sparklines, salud, lifecycle |
| **Reviews** | `/reviews` | Reviews semanales y mensuales con discipline score y resumen IA |
| **Aprendizaje** | `/aprendizaje` | Recursos + repetición espaciada (SRS), decay, rachas |
| **Retiros** | `/retiros` | CRUD de retiros con transiciones de estado |
| **Reglas** | `/reglas` | CRUD de reglas de comportamiento + tracking de violaciones |
| **Mercados** | `/mercados` | Watchlist de símbolos |
| **Etiquetas** | `/etiquetas` | CRUD de tags personalizados |
| **Perfil / Settings** | `/perfil` | Perfil, configuración de IA, tema, preferencias, metas |
| **IA Coach** | drawer global | Chat en streaming con contexto del trader |

### Lo que v3 y v3.2 añadieron

| Pieza | Dónde vive en la UI | Qué hace | Por qué existe |
|---|---|---|---|
| **Behavior engine** | `BehaviorLoopPanel` en `/analytics` | Cadena `insight → compromiso → regla → verificación → refuerzo`. Convierte un insight ("operas peor tras 2 pérdidas seguidas") en un compromiso medible que el sistema verifica al cierre de la ventana | Cierra el bucle entre detectar un patrón y cambiarlo de verdad, no solo señalarlo |
| **Intervenciones** | `InterventionOverlay` global | Motor determinista (cascada de pérdidas, revancha, sobredimensionamiento, drawdown) que interrumpe **en caliente**, en el momento del error, no en el post-mortem; aceptar la intervención puede crear una regla | El valor está en interrumpir cuando el error está ocurriendo, no en analizarlo días después |
| **Memoria del coach** | drawer del coach (🧠 `CoachMemoryPanel` / `CoachMemoryLayers`) | Memoria jerárquica de 4 capas — episódica (momentos concretos), semántica (patrones confirmados por datos, nunca por el LLM solo), identidad (perfil editable del trader) y de mejora (serie temporal) — visible y editable | Un coach que olvida no sirve; uno que "recuerda" alucinaciones es peligroso. La frontera anti-envenenamiento garantiza que solo lo confirmado por datos entra a memoria de largo plazo |
| **Índice de mejora** | tab "Mejora" en `/analytics` | `ImprovementScore`: índice compuesto 0–100 con drivers, régimen (experimental) y coste de la indisciplina; historizado día a día ("vs hace N días") | Una cifra honesta de "¿estoy mejorando?", descompuesta en factores accionables, no una métrica de vanidad |
| **Reglas unificadas enforce/warn** | `/reglas` (badge de modo) | `Rule` fusiona el viejo `Automation`: `mode('enforce'|'warn')`, con origen trazable (compromiso/insight) | Una regla de bloqueo real (enforce) y un aviso (warn) son cosas distintas; antes vivían en dos modelos duplicados |
| Superficies **ANALIZAR / PROTEGER / MEJORAR** | detrás del flag `tj.v3Shell` (OFF por defecto) | Reorganizan la analítica institucional (S3), el motor de riesgo (S9) y la inteligencia de playbook (S10/S11) por lo que el trader *hace*, no por tablas | Absorbe las 11 pantallas v2 sin perder dato; preparación para el rediseño de navegación completo (aún no activado) |
| **Feed HOY** | `TodayFeed` + `RiskBudgetMeter` | Señales priorizadas del día (compromisos, riesgo, refuerzos) con floor crítico | Responde "¿qué muevo hoy para mejorar y no romperme?" cada mañana |
| **Check-in pre-sesión** | formulario de check-in | Mood/energía/sueño → veredicto go/caution/no_go | El estado mental predice el desempeño; un go/no-go honesto antes de operar previene sesiones que no debieron abrirse |
| **Write-tools del coach con permiso** | panel del bucle ("el coach te propone") | El coach puede `propose_rule` o `propose_commitment`, pero quedan inertes hasta que el trader los confirma | El sistema propone, el usuario dispone — nunca escritura sin confirmación explícita |
| **Digest cognitivo semanal** | notificación "Tu semana cognitiva" (opt-outable) | Delta de mejora + compromisos + patrón nuevo, 1 notificación semanal deduplicada | El sistema busca proactivamente al trader sin incordiar cuando no hay nada que decir |

Detalle funcional completo por pieza (sprint a sprint) → ver historial de git (`RECAP_V3_V32`).

---

## 5. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js App Router + React | 16.2.x / 19.2.x |
| API | tRPC (end-to-end types) | 11.x |
| ORM | Prisma + adapter PrismaPg | 7.8.x |
| Base de datos | Supabase PostgreSQL | 17 |
| Auth | Supabase Auth + JWT (proxy middleware) | — |
| Background | Supabase Edge Functions (Deno) + `pg_cron` | — |
| Email | Resend | — |
| Charts | Recharts | 3.x |
| Validación | Zod | 4.x |
| Búsqueda semántica | pgvector (embeddings) | — |
| Hosting | Vercel (app) + Supabase (DB) | — |

---

## 6. Mapa de código

La refactorización a dominios (`src/domains/`) es la estructura vigente; v3 la extendió con un bounded context nuevo (`cognitive/`) y varios dominios propios del motor de comportamiento:

```
src/
  app/                          # rutas Next.js: dashboard, trades, cuentas, playbook, reviews,
                                 #   aprendizaje, retiros, reglas, mercados, etiquetas, perfil, analytics, login
    api/cron/                   # recompute-insights, dispatch-events, rules-migration-report,
                                 #   evaluate-commitments, cognitive-digest (Bearer CRON_SECRET)
  server/trpc/routers/          # routers thin: auth + input + delega a servicios (incluye behavior.ts, coach.ts)
  domains/
    cognitive/
      events/                  # event-types.ts (catálogo EV), event-bus.ts (outbox: publishEvent/
                                 #   dispatchPending/planEventTransition)
      intervention/            # motor de scoring + fatiga (Intervention Engine)
      memory/                  # 4 capas + context assembler
      coach/                   # orquestador + agente + tools
    behavior/                  # verifiers.ts, commitment-machine.ts (deriveSpec/evaluateResult),
                                 #   reinforcement.ts — loop de mejora, puro
    analytics/
      longitudinal/            # rolling-window.ts (primitiva longitudinal)
      institutional/           # bayes.ts, drawdown.ts, r-distribution.ts, risk-ratios.ts,
                                 #   mae-mfe.ts, benchmark.ts, pnl-heatmap.ts (puro)
      insights/                # insight-reconcile.ts, insight-store.ts, recompute-insights.ts
      services/                # dashboard-analytics, setup-analytics, psychology-insights, etc.
    rules/                     # unification.ts (tipos + classifyMode), protection-templates.ts,
                                 #   rule-write.ts (escritura), engine.ts (runRules — fuente única post-G2)
    trading/services/          # trade-derivation, capture-rules, note-tag-suggester, emotion-feedback,
                                 #   account-service, prop-firm-guard, risk-engine, csv-import, mt4-parser
    learning/services/         # review-scheduler, streak-service, decay-detector
    profile/services/          # profile-service
  server/services/
    behavior/                  # commitment-service.ts (createCommitmentFromInsight/evaluateCommitment/
                                 #   evaluateWindowCommitments/carryOverCommitments + outbox)
    memory/                    # memory-episode-service.ts
  components/
    behavior/                  # behavior-loop-panel.tsx (montado en /analytics)
    trades/                    # emotion-insight.tsx, note-tag-suggestions.tsx
    rules/                     # rule-mode-badge.tsx (enforce/warn)
  lib/
    formulas/                  # Formula Engine puro: performance, win-rate, risk, drawdown, discipline, setup
    ai/                        # resolve-provider, chat, embeddings, coach-service, coach-tools,
                                 #   feature-models, key-encryption, health-check
    supabase/ trpc/ generated/  # cliente Supabase, contexto tRPC, Prisma client
supabase/migrations/            # incluye outbox+insights, unify rules, trade capture, consent,
                                 #   behavior (commitments/commitment_checks/reinforcements),
                                 #   improvement_scores, memory_episodes (pgvector), memory_patterns,
                                 #   memory_identity, feed_ignores
```

---

## 7. Dónde está todo

Esta es la fuente de verdad consolidada. Solo 4 documentos vivos:

| Documento | Responde |
|---|---|
| **PROJECT_GUIDE.md** (este) | Qué es, qué no es, usuarios, módulos, stack, mapa de código |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Cómo funciona por dentro — el freeze v3.1 (principios, decisiones, entidades, eventos, subsistemas) + los 5 ADRs que lo fundamentan |
| **[STATUS.md](STATUS.md)** | Estado vivo: checklist de QA pendiente, ops pendientes, deuda técnica, backlog, roadmap reservado |
| **[CHANGELOG.md](CHANGELOG.md)** | Historial consolidado de cambios |

Material histórico adicional (auditoría de producto que motivó el freeze v3.1) → **[auditoria-producto-trading-journal-v2.md](auditoria-producto-trading-journal-v2.md)**.

Todo lo demás que existió bajo `docs/v3/`, `docs/archive/` y `docs/superpowers/` (sprints, specs, informes de arquitectura previos) queda recuperable en el historial de git; se consolidó en los 4 documentos de arriba para evitar que la documentación vuelva a divergir del código.
