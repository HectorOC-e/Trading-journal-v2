# PRODUCT_MASTER_PLAN.md
### Trading Journal v3 — Plan Maestro de Producto y Arquitectura

> Documento 1/8. Fuente vinculante: `docs/auditoria-producto-trading-journal-v2.md`.
> Roles asumidos: Principal Product Architect · Principal UX · Staff Engineer · Trading Psychologist · Quant Researcher · AI Product Lead.

---

## 0. Tesis del producto

Trading Journal v2 es hoy un **journal de élite con analítica determinista** que **registra** bien pero **no cambia** al trader. v3 invierte la relación: el registro deja de ser el fin y pasa a ser el **combustible de un loop de mejora**. La unidad de valor ya no es "el trade guardado" sino **"el cambio de comportamiento verificado"**.

**Pregunta de validación única (aplicada a cada feature, pantalla y dato):**
> ¿Esto aumenta la probabilidad de que el trader **gane dinero**, **preserve capital**, **mejore disciplina** o **acelere aprendizaje**?
Si la respuesta es no → eliminar / rediseñar / absorber (bajo aprobación).

---

## 1. Estado actual (AS-IS)

### 1.1 Arquitectura de aplicación
- **Next.js (build propio interno)** + tRPC + Prisma/Postgres (Supabase) + pgvector (embeddings). Tailwind con tokens CSS (`globals.css`, temas claro/oscuro + paletas).
- **11 módulos** como rutas: Dashboard, Trades, Cuentas, Playbook, Psicología, Reviews, Aprendizaje, Reglas, Etiquetas, Notificaciones, Mercados (+ Perfil, Retiros).
- **Dominios** (`src/domains`): analytics, learning, profile, rules, trading.
- **Servicios** (`src/server/services`): reviews, notifications, email, tags.

### 1.2 Capacidades reales (verificadas en código)
| Capa | Qué hace hoy | Evidencia |
|---|---|---|
| Motores deterministas | 18 detectores (5 patrón, 7 analytics, 6 psicología) | `pattern-detector.ts`, `insights-engine.ts`, `psychology-insights.ts` |
| Reglas/Automatizaciones | Bloqueo **pre-trade real** + tag/notify | `rules/engine.ts`, triggers `TRADE_PRE_CREATE/CREATED/CLOSED/UPDATED` |
| AI Coach | Chat agéntico, 10 tools read-only, prompt-caching, separación práctica/real | `coach-agent.ts`, `coach-tools.ts`, `ai-context.ts` |
| Analytics | KPIs (WR, PF, expectancy R/$, Sharpe, rachas), equity, sesiones, símbolos | `dashboard-analytics.ts` |
| Reviews | Weekly (KPIs+deltas+texto IA), Monthly (commitments arrastrados), trayectoria | `weekly-report.ts`, `monthly-goals.ts` |
| Playbook | Salud de setup + sugerencias (PAUSE/REVIEW_EDGE) sobre WR últimos 20 | `setups.ts`, `setup.ts` |
| Aprendizaje | SRS + sesiones + vínculo recurso→setup | `learning` domain |

### 1.3 Limitaciones estructurales (los 8 críticos de la auditoría)
- **C1** Coach reactivo puro (sin iniciativa).
- **C2** Sin memoria entre conversaciones.
- **C3** Sin análisis longitudinal / ventanas rodantes.
- **C4** Métricas institucionales ausentes (max DD, MAE/MFE, Sortino/Calmar/Kelly, distribución R).
- **C5** Loop de reviews no se cierra (texto que muere).
- **C6** Dualidad Reglas vs Automatizaciones (riesgo de falsa protección).
- **C7** Captura psicológica opcional → motores ciegos.
- **C8** Insights no se historian ni se accionan.

---

## 2. Estado futuro (TO-BE)

### 2.1 Modelo mental: 5 superficies cognitivas + 2 subsistemas
El producto deja de ser "11 pestañas de datos" y pasa a **5 superficies orientadas a la decisión**, atravesadas por **2 subsistemas transversales** que son el verdadero núcleo.

```
                ┌──────────────────────────────────────────────────────────┐
   TRANSVERSAL  │  AI COACH v3  (memoria · proactividad · intervención)     │
                │  BEHAVIOR ENGINE  (Insight→Compromiso→Regla→…→Refuerzo)    │
                └──────────────────────────────────────────────────────────┘
   SUPERFICIES   ┌─────────┬─────────┬──────────┬──────────┬──────────┐
                 │  HOY    │ OPERAR  │ MEJORAR  │ PROTEGER │ ANALIZAR │
                 │ (Coach) │ (Trade) │(Improve) │ (Risk)   │(Analyze) │
                 └─────────┴─────────┴──────────┴──────────┴──────────┘
```

### 2.2 Definición de cada superficie

**① HOY — el cockpit diario (home).**
Inspiración: Superhuman (foco), Granola (resumen accionable), Linear (inbox), Raycast (command).
Contiene: feed del coach proactivo (intervenciones, refuerzos), **compromisos del día** (Behavior Engine), repasos SRS que vencen, **presupuesto de riesgo de hoy**, check-in de estado pre-sesión, KPIs de hoy/semana con Δ. Absorbe: **Notificaciones** (→ feed), parte de **Dashboard** (hoy), **Aprendizaje › Hoy**.
Función: *qué hago hoy para mejorar y no romperme*.

**② OPERAR — captura y ejecución.**
Inspiración: Linear (entrada rápida), Stripe (precisión de formularios).
Contiene: registro de trade con **psicología inline** (no opcional silenciosa), **checklist de setup obligatorio**, **bloqueo de reglas en tiempo real**, captura MAE/MFE, eventos. Absorbe: **Trades**, **Psicología (captura)**, reglas pre-trade.
Función: *capturar con calidad y ser protegido en el momento del error*.

**③ MEJORAR — el motor de mejora.**
Inspiración: Duolingo (loop de hábito), Notion (estructura), Replit (iteración).
Contiene: **Reviews con loop cerrado** (verificación semana a semana), **Playbook** (edge/drift/evolución), **Aprendizaje** (SRS con transferencia medida). Aquí viven los **compromisos**. Absorbe: **Reviews + Playbook + Aprendizaje**.
Función: *convertir lo aprendido en cambio verificado*.

**④ PROTEGER — capital y riesgo.**
Inspiración: Stripe (claridad de límites), Linear (estados).
Contiene: **Cuentas/prop firms**, **Reglas unificadas** (descriptivo + enforcement = uno), **riesgo de ruina**, **proyecciones de fase**, **presupuesto de riesgo**, retiros, correlación multi-cuenta. Absorbe: **Cuentas + Reglas + Retiros**.
Función: *no morir; pasar la fase; saber cuánto puedo arriesgar hoy*.

**⑤ ANALIZAR — profundidad cuantitativa.**
Inspiración: Vercel (densidad legible), Perplexity (respuesta directa).
Contiene: **analítica longitudinal** (ventanas rodantes, régimen, edge decay, calibración), métricas institucionales, **edge por instrumento** (absorbe Mercados), **tag analytics** (absorbe Etiquetas), modelo de mejora del trader. Absorbe: **Analytics + Dashboard (profundo) + Mercados + Etiquetas**.
Función: *entender por qué, con rigor, y decidir qué cambiar*.

### 2.3 Perfil/Settings
**Perfil** no es una superficie cognitiva: es **Ajustes** (cuenta, IA keys, temas, notificaciones, datos). Accesible desde el shell, no desde la navegación principal.

---

## 3. Mapa de transformación de módulos

| Módulo v2 | Destino v3 | Acción | Dato útil preservado |
|---|---|---|---|
| Dashboard | HOY (hoy) + ANALIZAR (profundo) | **Fusiona/divide** | KPIs → Hoy con Δ; gráficos → Analizar accionables |
| Trades | OPERAR | **Reubica + enriquece** | +psico inline, +checklist, +MAE/MFE |
| Psicología | OPERAR (captura) + ANALIZAR (insights) + HOY (check-in) | **Disuelve en el loop** | Detectores → insights accionables |
| Playbook | MEJORAR | **Reubica + enriquece** | +edge por R, +drift, +curva temporal |
| Reviews | MEJORAR | **Reubica + cierra loop** | +verificación, +compromisos |
| Aprendizaje | MEJORAR | **Reubica + mide transferencia** | +impacto causal, +SRS adaptativo |
| Reglas | PROTEGER | **Fusiona con Automations** | Un solo "Reglas" con badge bloquea/avisa |
| Cuentas | PROTEGER | **Reubica + enriquece** | +proyección, +riesgo ruina, +budget |
| Retiros | PROTEGER | **Absorbe** | Política de retiros sugerida |
| Notificaciones | HOY | **Absorbe (feed)** | +priorización adaptativa, +intervenciones |
| Mercados | ANALIZAR | **Absorbe → edge por instrumento** | "tu WR/expectancy por símbolo + podar" |
| Etiquetas | ANALIZAR + Ajustes | **Absorbe** | Tag analytics (P&L/R por tag) + edición en Ajustes |
| Perfil | Ajustes (shell) | **Degrada de superficie** | Igual, fuera de la nav principal |

**Nace nuevo:** Behavior Engine (subsistema), Coach Memory + Proactividad (subsistema), Risk/Prop projection engine, Longitudinal analytics engine, Intervention surface.

**Desaparece como pantalla independiente:** Dashboard, Notificaciones, Mercados, Etiquetas (su valor reaparece dentro de las superficies). **Ninguna pierde su dato** (decisión: "absorber").

---

## 4. Modelo de dominio futuro (nuevas entidades)

> Detalle de campos en `BEHAVIOR_ENGINE_V3.md`, `AI_COACH_V3.md`, `ANALYTICS_V3.md`. Resumen aquí.

| Entidad nueva | Propósito | Doc dueño |
|---|---|---|
| `Insight` (persistido) | Insight con timestamp, estado, severidad, métrica, ventana (C8) | ANALYTICS/BEHAVIOR |
| `Commitment` | Núcleo del loop: origen, texto, regla vinculada, ventana de verificación, resultado | BEHAVIOR |
| `CommitmentCheck` | Evaluación periódica de cumplimiento de un compromiso | BEHAVIOR |
| `CoachMemory` | Hechos del trader, resúmenes de conversación, preferencias | AI_COACH |
| `CoachThread` / `CoachMessage` | Persistencia de conversaciones (hoy efímeras) | AI_COACH |
| `Intervention` | Evento de intervención proactiva (trigger, severidad, respuesta del trader) | AI_COACH |
| `PreSessionCheckin` | Estado pre-sesión (mood, energía, sueño) + veredicto go/no-go | AI_COACH/BEHAVIOR |
| `RiskBudget` (derivado/persistido) | Presupuesto de riesgo del día por cuenta | PROTEGER/ANALYTICS |
| `SetupEdgeSnapshot` | Edge del setup en el tiempo (WR/expectancy/avgR rolling) | ANALYTICS |
| `MarketRegimeTag` (o campo en Trade) | Régimen del trade (tendencia/rango/volatilidad) | ANALYTICS |
| `TradeExcursion` (campos en Trade) | MAE/MFE | ANALYTICS/OPERAR |
| `InstrumentEdge` (derivado) | Edge por símbolo (absorbe Mercados) | ANALYTICS |
| `RuleSuggestion` | Propuesta de regla generada por un insight | BEHAVIOR |

**Cambios en entidades existentes:**
- `Trade`: +`maePrice`/`mfePrice` (o `maeR`/`mfeR`), +`regime`, +`riskPct` (derivable), +`checklistResultId` obligatorio por setup.
- `Rule` + `Automation`: **fusión** en un único modelo `Rule` con `mode: "enforce" | "warn"`, `conditions`, `actions`, `trigger`. Migración de datos.
- `WeeklyReview`/`MonthlyReview`: relación con `Commitment` (verificación).
- `LearningResource`: +`transferBaseline` (snapshot de edge del setup al vincular) para medir transferencia.

---

## 5. Brechas (TO-BE − AS-IS) priorizadas

| Brecha | Severidad | Habilita |
|---|---|---|
| No existe Behavior Engine (loop) | **Bloqueante** | C5, C8, retención, núcleo del producto |
| Coach sin memoria/proactividad/escritura | **Bloqueante** | C1, C2, diferenciación #1 |
| Sin primitiva de ventanas rodantes | **Bloqueante** | C3, casi todo lo longitudinal |
| Insights no persistidos | Alta | C8, alertas, "mejoró/empeoró" |
| Métricas institucionales | Alta | C4, credibilidad prop |
| Captura psico opcional | Alta | C7, alimenta motores |
| Reglas/Automations duales | Media-alta | C6, confianza |
| Sin proyección/riesgo de ruina prop | Alta | público prop firm |
| Sin régimen/drift | Media | contexto del edge |
| Re-arquitectura de navegación (5 superficies) | Alta | toda la UX v3 |

---

## 6. Dependencias (orden lógico de habilitación)

```
Persistencia de Insights ──┐
Ventanas rodantes (prim.) ──┼─→ Behavior Engine ──→ Coach proactivo/intervención
Fusión Rule/Automation ─────┘                  └─→ Reviews loop cerrado
Captura psico (no opcional) ─→ Psychology v3 ───→ Detectores ricos
Métricas institucionales ───→ Analytics v3 ────→ Risk/Prop projections
Design System v3 ───────────→ 5 superficies ───→ Toda la UI
Coach Memory (tablas) ──────→ Coach v3 ────────→ Mentoría longitudinal
```
DAG completo en `IMPLEMENTATION_ORDER.md`.

---

## 7. Re-arquitectura técnica necesaria

1. **Nueva capa `domains/behavior`** (Behavior Engine): entidades, máquina de estados, servicios de verificación, jobs.
2. **`domains/analytics` v3**: submódulo `longitudinal/` con primitiva `rollingWindow`, detectores de régimen/drift/decay/calibración, `risk/` (ruina, proyección, budget).
3. **`lib/ai` v3**: `coach-memory.ts`, `coach-proactive.ts` (worker sobre triggers), `coach-tools.ts` extendido con **write-tools con permiso**, persistencia de threads.
4. **`domains/rules` v3**: unificación Rule/Automation; `rule-suggestions.ts` (insight→regla).
5. **Jobs/colas**: scheduler para verificación de compromisos, recálculo de insights, digests proactivos, snapshots de edge. (Hoy hay CI/email; v3 necesita workers.)
6. **Shell de navegación v3**: 5 superficies + command palette (Raycast-style) + capa de intervención (overlay global del coach).
7. **Eventos de dominio**: `trade.created/closed`, `insight.created`, `commitment.broken/kept`, `account.dd_breach` → bus interno que alimenta coach proactivo y Behavior Engine (existe `coach-bus.ts` como semilla).

---

## 8. Requisitos no funcionales

- **Rendimiento IA/coste:** `buildTraderContext` (~12 queries) debe cachearse e incrementalizarse; el worker proactivo debe correr sobre deltas, no full-scan. Presupuesto de tokens por usuario/día.
- **Privacidad:** memoria del coach y check-ins son datos sensibles; cifrado en reposo, borrables por el usuario (ya hay `key-encryption.ts` para keys IA).
- **Determinismo primero:** todo insight tiene un cálculo determinista testeable; el LLM solo narra/conversa sobre datos ya calculados (patrón actual, se mantiene).
- **Migración sin pérdida:** fusiones de modelos con migraciones idempotentes (CI ya valida replay desde cero — `migrate-validate`).
- **Accesibilidad/Motion:** respeta `prefers-reduced-motion` (ya presente); intervenciones nunca bloquean lectura crítica sin alternativa.

---

## 9. Riesgos de producto y mitigación

| Riesgo (auditoría) | Mitigación en v3 |
|---|---|
| R1 "Pantalla bonita, hábito ausente" | Behavior Engine como núcleo; cada insight termina en compromiso verificable |
| R2 Captura psico opcional colapsa IA | Captura inline con fricción mínima + nudges; check-in pre-sesión |
| R3 Dualidad reglas = falsa protección | Fusión a un modelo con badge explícito enforce/warn + migración |
| R4 Coste/latencia IA | Caché de contexto, worker sobre deltas, presupuesto de tokens |
| R5 Sobre-notificación | Priorización adaptativa + límite diario + agrupación (Hoy feed) |
| R6 Métricas pseudo-causales | Transferencia con baseline antes/después; etiquetar correlación≠causa |
| **Nuevo:** alcance enorme | Sprints incrementales con valor por sprint; ver SPRINT_PLAN |
| **Nuevo:** re-arquitectura de nav rompe hábitos | Migración progresiva + onboarding guiado a las 5 superficies |

---

## 10. Métricas de éxito del producto (North Star + drivers)

**North Star:** *% de traders con mejora verificada de disciplina y expectancy a 90 días.*

| Driver | Métrica |
|---|---|
| Gana dinero | Δ expectancy (R y $) rolling 4w; % con expectancy>0 sostenido |
| Preserva capital | nº violaciones de DD evitadas por bloqueo; max DD rolling |
| Disciplina | score de disciplina rolling; tasa de cumplimiento de compromisos |
| Aprendizaje | transferencia (Δ edge del setup tras dominar recurso); racha de estudio |
| Retención/hábito | DAU/WAU, días con check-in, compromisos activos por usuario |
| Coach | % intervenciones aceptadas; % insights→acción |

---

## 11. Qué NO haremos (anti-alcance, para evitar dilución)
- No ejecución de órdenes ni conexión de bróker en vivo (no somos un EMS). El coach **observa y protege**, no opera.
- No señales de mercado ni "qué comprar". El producto mejora **al trader**, no predice el mercado.
- No social/copy-trading en v3.
- No backtesting de estrategias de mercado (sí "modo práctica" ya existente para conducta).

> Estos límites preservan la tesis: *mejoramos al trader, no sustituimos su criterio de mercado.*
