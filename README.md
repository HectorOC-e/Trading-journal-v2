<div align="center">

# 📈 Trading Journal v2

**La capa cognitiva sobre tu broker.** No es una hoja de cálculo glorificada — es un coach activo que captura cada trade, revela patrones de comportamiento que no ves, hace cumplir tus reglas y mide tu aprendizaje en el tiempo.

```
Trade → Journal → Reflect → Learn → Improve → Trade
```

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%2017-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## ✨ Qué hace

| Módulo | Descripción |
|---|---|
| 📊 **Dashboard** | 4 vistas (Portfolio · Operador · Disciplina · Playbook). KPIs server-side: Net P&L, Win Rate, Avg R, Sharpe, Profit Factor, Expectancy. Curva de equity multi-cuenta. |
| 📝 **Trades** | Ciclo de vida open→partial→close con P&L y R-multiple. Import CSV (MT4 / cTrader) con dedup. Screenshots, campos de psicología, timeline de eventos inmutable. |
| 🏦 **Cuentas** | Multi-cuenta, prop-firm y reales. Enforcement de drawdown, pérdida diaria, nº trades y símbolos permitidos. |
| 🧠 **Psicología** | Emoción antes/después, flags FOMO/revenge, confianza y calidad por trade. |
| 📐 **Reglas + Playbook** | Setups con checklist; las reglas se hacen cumplir al registrar el trade. |
| 🤖 **AI Coach** | Análisis y resumen semanal vía Claude / OpenAI / OpenRouter. Embeddings para búsqueda semántica. |
| 🎓 **Aprendizaje** | Recursos con repetición espaciada para cerrar el bucle de mejora. |

> Catálogo completo en [`docs/FEATURES.md`](docs/FEATURES.md) · Guía de arquitectura en [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md).

---

## 🏗️ Stack

- **Frontend** — Next.js 16 (App Router) · React 19 · Tailwind 4 · Radix UI · Recharts
- **API** — tRPC 11 end-to-end typesafe · Zod
- **Datos** — Prisma 7 · Supabase (Postgres 17) · Supabase Storage + Edge Functions
- **Estado** — TanStack Query · Zustand
- **Tests** — Vitest · Playwright

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
| `OPENROUTER_API_KEY` *o* `ANTHROPIC_API_KEY` *o* `OPENAI_API_KEY` | AI Coach + resumen semanal (al menos una) |

> ⚠️ Nunca subas tu `.env` — ya está en `.gitignore`. Solo se versiona `.env.example`.

### 3. Base de datos

```bash
# Genera el cliente Prisma
pnpm prisma generate
```

El esquema se reproduce desde las migraciones de Supabase (Postgres 17):

```bash
# desde la raíz del repo, con la CLI de Supabase enlazada
supabase link --project-ref <tu-project-ref>
supabase db push      # aplica migraciones pendientes al remoto
# o supabase db reset  # replica todo el esquema desde cero (local)
```

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
pnpm build        # prisma generate + next build
pnpm start        # servidor de producción
pnpm lint         # eslint
pnpm test         # vitest (unit)
pnpm e2e          # playwright (e2e)
```

---

## 📁 Estructura

```
.
├── src/                  # aplicación Next.js (todo el código)
│   ├── app/              # rutas App Router (dashboard, trades, cuentas, …)
│   ├── components/       # UI
│   ├── domains/          # lógica de negocio por dominio
│   ├── server/           # routers tRPC
│   ├── lib/              # utilidades, formula engine, risk engine
│   └── prisma/           # schema.prisma
├── supabase/             # migraciones + edge functions + config
└── docs/                 # arquitectura, features, roadmap, QA
```

---

## 📚 Documentación

- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) — punto de entrada único
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — diseño del sistema
- [`docs/FEATURES.md`](docs/FEATURES.md) — catálogo de funcionalidades
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

---

<div align="center">
<sub>Vault privado de inteligencia de trading · server-side analytics · rule enforcement · spaced-repetition learning</sub>
</div>
