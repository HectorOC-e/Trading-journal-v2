<div align="center">

# 📈 Trading Journal

**La capa cognitiva sobre tu broker.** No es una hoja de cálculo glorificada ni "otra app de métricas" — es un sistema que **observa, entiende, interviene y enseña**: captura cada trade, revela patrones de comportamiento que no ves, te interrumpe en caliente cuando estás por equivocarte, hace cumplir tus reglas y mide tu mejora en el tiempo.

```
Insight → Compromiso → Regla → Verificación → Refuerzo → (mejor) Trade
```

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%2017%20+%20pgvector-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Estado: v3.1 cerrado** (14/14 sprints · 100% de la auditoría · 3 gates) **+ v3.2 en curso** (compañero cognitivo, 5 ejes vivos).

</div>

---

## 🧠 La tesis

v3 convirtió el journal (v2: captura + analítica) en una **capa cognitiva que cambia el comportamiento del trader** — y la unidad de valor pasó a ser **"el cambio de comportamiento verificado"**, no "el trade registrado".

> Principio rector: cada pantalla cumple una función. Ningún gráfico que no produzca una decisión. Ningún insight que no termine en una acción: **regla, hábito, compromiso, aprendizaje o protección.**

El diseño construyó **el cerebro antes que la piel**: la lógica (pura y testeada) aterrizó invisible y la UI la hizo observable después.

---

## ✨ Qué hace

### El núcleo cognitivo

| Sistema | Qué hace |
|---|---|
| 🔁 **Behavior Engine** | El loop: un **insight** se vuelve **compromiso** medible, que puedes blindar con una **regla** de bloqueo pre-trade; el sistema **verifica** al cierre de la ventana y **refuerza** (ratio variable). Convierte "deberías operar menos" en algo que el sistema mide y hace cumplir. |
| 🤖 **AI Coach** | Memoria jerárquica de 4 capas (episódica con pgvector · semántica · identidad · mejora) con **frontera anti-envenenamiento** (el LLM propone, tú/los datos confirman). Propone reglas y compromisos **con tu permiso** (`propose_rule` / `propose_commitment`). Vía Claude / OpenAI / OpenRouter. |
| 🚨 **Intervención** | Motor **determinista** (cascada de pérdidas · revancha · sobredimensionamiento · drawdown + scoring + fatiga) con fast-path en el cierre de trade (≤2s). Te interrumpe **en el momento del error**; aceptar la intervención crea una regla protectora. |
| 📊 **Analítica institucional** | Drawdown, distribución de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap — con **bandas de confianza bayesianas** (estimador con shrinkage). Honestidad estadística: 30 trades no son "57% win rate", son una estimación con incertidumbre. |
| 🛡️ **Riesgo & Prop** | Riesgo de ruina (analítico + Monte Carlo), proyección de paso de fase, presupuesto diario con reset, correlación multi-cuenta, política de retiros — todo en bandas. Responde "¿cuánto puedo arriesgar hoy sin reventar la cuenta?". |
| 📐 **Playbook intelligence** | Decadencia del edge con significancia de Welch, deriva definición-vs-ejecución, evolución por ventana móvil, comparación de variantes A/B. Avisa cuando un setup que funcionaba empieza a morir. |
| 🎓 **Aprendizaje & transferencia** | Edge por instrumento y por tag (oro/veneno), transferencia estudio↔trading (asociación, nunca causa), SRS adaptado al desempeño, tarjetas de error. |
| 🌟 **ImprovementScore** | La North Star: índice compuesto 0–100 con drivers accionables, curva temporal ("vs hace N días") y coste de la indisciplina. |

### Las 5 superficies cognitivas

Reorganizadas por **lo que el trader hace**, no por tablas (tras flag `tj.v3Shell`; OFF = navegación v2 idéntica):

**HOY** (feed priorizado: "¿qué muevo hoy para mejorar y no romperme?") · **OPERAR** (captura con checklist, MAE/MFE, auto-tagging, psicología) · **ANALIZAR** (institucional + edges) · **PROTEGER** (presupuesto de riesgo + ruina + proyección de fase) · **MEJORAR** (decay/drift del setup + índice de mejora).

### Fundamentos transversales

- 🚦 **Cuentas multi-tipo** (prop-firm / real / demo / backtest) con medidores en vivo de pérdida diaria/semanal/mensual y drawdown vs límite, y **auto-bloqueo** al romper un límite. Separación práctica/real como **invariante**.
- 📨 **Bus de eventos con outbox** (productores → consumidores desacoplados) + **crons** (pg_cron → pg_net → `/api/cron/*` con Bearer secret).
- 🔔 **Notificaciones** P0–P3 con preferencias por categoría · **Digest cognitivo semanal** · catálogo de **tags** con color/icono/categoría.

> Catálogo de features en [`docs/FEATURES.md`](docs/FEATURES.md) · recorrido completo de v3/v3.2 en [`docs/v3/RECAP_V3_V32.md`](docs/v3/RECAP_V3_V32.md).

---

## 🏗️ Stack

- **Frontend** — Next.js 16 (App Router) · React 19 · Tailwind 4 · Radix UI · Recharts · Framer Motion
- **API** — tRPC 11 end-to-end typesafe · Zod 4
- **Datos** — Prisma 7 · Supabase (Postgres 17 + **pgvector**) · Supabase Storage + Edge Functions
- **IA** — Anthropic / OpenAI / OpenRouter (coach, intervención, memoria, embeddings)
- **Estado** — TanStack Query · Zustand
- **Tests** — Vitest (unit, TDD) · Playwright (E2E)

---

## 🚀 Cómo iniciar el proyecto

> **Requisitos:** Node **20.12+** (ideal: el del [`.nvmrc`](.nvmrc) — `nvm use`), [pnpm](https://pnpm.io) 10+, y un proyecto Supabase (o Postgres local).
>
> ⚠️ El toolchain (Vitest 4 / Next 16) **no arranca con Node 18**. Si ves un error tipo `does not provide an export named 'styleText'`, estás en una versión vieja: corre `nvm use` en la raíz del repo.

El código de la app vive en [`src/`](src). Los comandos de la app se corren **desde `src/`**.

### 1. Clonar e instalar

```bash
git clone https://github.com/HectorOC-e/Trading-journal-v2.git
cd Trading-journal-v2
nvm use            # toma la versión de Node del .nvmrc (instálala con `nvm install` si falta)
cd src
pnpm install
```

### 2. Variables de entorno

Copia el ejemplo de la raíz del repo y rellena tus claves:

```bash
cp ../.env.example .env
```

Mínimo para arrancar en local:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión Postgres/Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth en cliente |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `OPENROUTER_API_KEY` *o* `ANTHROPIC_API_KEY` *o* `OPENAI_API_KEY` | AI Coach + intervención + memoria + resumen semanal (al menos una) |
| `CRON_SECRET` | Bearer que protege las rutas `/api/cron/*` (jobs del bus de eventos y del behavior engine) |

> ⚠️ Nunca subas tu `.env` — ya está en `.gitignore`. Solo se versiona `.env.example`.

### 3. Base de datos

```bash
# Genera el cliente Prisma
pnpm prisma generate
```

El esquema se reproduce desde las migraciones de Supabase (Postgres 17 + pgvector):

```bash
# desde la raíz del repo, con la CLI de Supabase enlazada
supabase link --project-ref <tu-project-ref>
supabase db push      # aplica migraciones pendientes al remoto
# o supabase db reset  # replica todo el esquema desde cero (local)
```

> En producción las migraciones se despliegan **vía CI al mergear a `main`** (job `migrate-deploy`).

### 4. Levantar el dev server

```bash
pnpm dev
```

Abre **[http://localhost:3000](http://localhost:3000)**. ✅

---

## 🧪 Scripts

Todos desde `src/`:

```bash
pnpm dev          # servidor de desarrollo
pnpm build        # gen-theme-css + prisma generate + next build
pnpm start        # servidor de producción
pnpm lint         # eslint
pnpm test         # vitest (unit)
pnpm e2e          # playwright (e2e)
```

---

## 📁 Estructura

```
.
├── src/                       # aplicación Next.js (todo el código)
│   ├── app/                   # rutas App Router (dashboard, trades, cuentas, analytics, …)
│   │   └── api/cron/          # jobs (dispatch-events, recompute-insights, evaluate-commitments, …)
│   ├── components/            # UI (behavior, rules, trades, analytics, risk, playbook, coach…)
│   ├── domains/               # lógica de negocio pura (cerebro), por bounded context
│   │   ├── cognitive/         #   bus de eventos (outbox) + feed HOY
│   │   ├── behavior/          #   verificadores + máquina de compromisos + refuerzo
│   │   ├── analytics/         #   institutional · risk · setups · longitudinal · insights
│   │   ├── rules/             #   unificación + plantillas de protección + engine
│   │   └── trading/           #   derivación de trade + captura + auto-tagging
│   ├── server/                # routers tRPC + servicios (behavior, coach, risk, today…)
│   ├── lib/                   # utilidades, formula engine, risk engine
│   └── prisma/                # schema.prisma
├── supabase/                  # migraciones + edge functions + config
└── docs/                      # arquitectura, features, roadmap, QA, y docs/v3/
```

---

## 📚 Documentación

**Producto actual (v3 / v3.2):**
- [`docs/v3/README.md`](docs/v3/README.md) — índice de las specs maestras de v3
- [`docs/v3/SESSION_HANDOFF.md`](docs/v3/SESSION_HANDOFF.md) — **léeme primero**: estado, mapa de código y próximos pasos
- [`docs/v3/RECAP_V3_V32.md`](docs/v3/RECAP_V3_V32.md) — recorrido sprint-por-sprint (backend · UI · razón de ser)
- [`docs/v3/ARCHITECTURE_FREEZE.md`](docs/v3/ARCHITECTURE_FREEZE.md) — **arquitectura oficial congelada** (fuente de verdad)
- [`docs/v3/AUDIT_FINAL.md`](docs/v3/AUDIT_FINAL.md) — auditoría de cierre de v3.1
- [`docs/v3/MASTER_PRD.md`](docs/v3/MASTER_PRD.md) · [`docs/v3/SPRINT_PLAN.md`](docs/v3/SPRINT_PLAN.md) — PRD + plan de sprints

**Base (v2) y referencia:**
- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/FEATURES.md`](docs/FEATURES.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- [`docs/auditoria-producto-trading-journal-v2.md`](docs/auditoria-producto-trading-journal-v2.md) — la auditoría vinculante que originó v3

---

## 🧭 Invariantes (ningún sprint los rompió)

- **Bloqueo pre-trade** — las protecciones bloquean *antes* de abrir.
- **Separación práctica/real** — demo/backtest no contamina las estadísticas reales.
- **Frontera anti-envenenamiento** — el LLM nunca escribe memoria/identidad directo: propone, los datos/el usuario confirman.
- **Honestidad estadística** — bandas de confianza, "asociación no causa", nada de certeza fingida.
- **Permiso** — el sistema propone, el usuario dispone.

---

<div align="center">
<sub>Vault privado de inteligencia de trading · capa cognitiva sobre el broker · behavior engine · intervención en caliente · rule enforcement · spaced-repetition learning</sub>
</div>
