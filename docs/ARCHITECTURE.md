# Architecture — Trading Journal v2

> Cómo funciona el sistema por dentro. Última actualización: 2026-06-05.
> Refleja el estado **real** del código (`src/`), no un diseño objetivo.

---

## 1. Stack

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

## 2. Layering (actual)

La refactorización a dominios (antes "target") **ya está implementada**:

```
Browser
  └── Page Component (layout + wiring de tabs/modales)
        ├── Hooks de dominio / queries tRPC
        └── tRPC Client
              └── tRPC Router (auth + validación Zod + delega)
                    └── Domain Service (lógica de negocio)
                          ├── Formula Engine (funciones puras)  → lib/formulas/
                          └── Prisma → Supabase PostgreSQL
```

### Estructura de código (`src/`)
```
src/
  app/                      # 13 rutas: dashboard, trades, cuentas, playbook, reviews,
                            #   aprendizaje, retiros, reglas, mercados, etiquetas, perfil, login
    api/                    # rutas HTTP: ai-coach, ai-embed, ai-test, import/*
  server/trpc/routers/      # 17 routers (thin: auth + input + delega a servicios)
  domains/
    trading/services/       # trade-service, account-service, prop-firm-guard,
                            #   risk-engine, csv-import, mt4-parser
    analytics/              # ai-context + services/: dashboard-analytics, setup-analytics,
                            #   discipline-service, pattern-detector, analytics-cache
    learning/services/      # review-scheduler, streak-service, decay-detector
    profile/services/       # profile-service
  lib/
    formulas/               # Formula Engine (puro): performance, win-rate, risk,
                            #   drawdown, discipline, setup, utils
    ai/                     # resolve-provider, chat, embeddings, coach-service,
                            #   config, feature-models, resolve-model, key-encryption, health-check
    supabase/ trpc/ generated/ (prisma client)
  prisma/schema.prisma      # modelos (solo para generar el cliente; NO prisma migrate)
  components/  hooks/  types/  __tests__/
supabase/migrations/        # fuente única de migraciones (Supabase CLI)
```

---

## 3. Frontend

- **App Router** de Next.js; páginas como contenedores de layout + wiring. La analítica pesada **no** se computa en `useMemo` sobre datos crudos: se consume pre-agregada del servidor.
- **Tipos**: se derivan de `RouterOutputs` de tRPC (no se mantiene un `types/index.ts` a mano para entidades).
- **Estado servidor**: React Query vía tRPC con `staleTime` en queries caras.
- **Tema/UX**: tema claro/oscuro/sistema, acento configurable, modo daltónico; persistido (precedencia BD).
- **PWA**: manifest + service worker (instalable, offline de lectura). Iconos PNG 192/512.

---

## 4. Backend / API

- **tRPC** con `protectedProcedure`: el `userId` se extrae de la sesión, **nunca** del input del cliente.
- Routers delgados: auth + parseo Zod + delegan a servicios de dominio.
- **17 routers**: `trades`, `accounts`, `account-logs`, `setups`, `markets`, `rules`, `trade-tags`, `trading-sessions`, `weekly-reviews`, `monthly-reviews`, `learning-resources`, `withdrawals`, `goals`, `preferences`, `profile`, `ai-config`, `ai-settings`.
- **Rutas HTTP** (`app/api/`): `ai-coach` (SSE streaming), `ai-embed` (embeddings, con guard IDOR), `ai-test` (test de conexión IA), `import/mt4`.

---

## 5. Base de datos / Migraciones

- **PostgreSQL gestionado por Supabase** (proyecto `jpojusluihjjsjvcubdp`, Postgres 17). RLS en todas las tablas de aplicación.
- **Prisma** para todo el acceso a datos (adapter PrismaPg); el cliente Supabase solo para Auth. Prisma se usa **únicamente** para generar el cliente tipado (`prisma generate`) — **nunca** `prisma migrate`.
- **Sistema de migraciones = Supabase CLI**, fuente única en `supabase/migrations/` (rastreado en prod por `supabase_migrations.schema_migrations`).

### Política de cambios de BD (obligatoria)
**Ningún cambio de esquema se hace a mano** (SQL Editor, psql, dashboard, ni `apply_migration` ad-hoc). Todo cambio (tablas, columnas, constraints, índices, RLS, funciones, seeds) es una migración versionada en el repo. El esquema debe poder recrearse desde cero solo con el repo:

```bash
supabase migration new <nombre>   # crea supabase/migrations/<timestamp>_<nombre>.sql
supabase db reset                 # recrea el esquema replayendo TODO desde cero
supabase db push                  # aplica pendientes al remoto vinculado
```
Las consultas de **solo lectura** (inspección/diagnóstico) sí están permitidas.

### Aplicación automática (CI/CD)
El workflow `.github/workflows/ci.yml` aplica las migraciones automáticamente y de forma **antierrores**:
1. **`migrate-validate`** (cada PR/push): levanta un Supabase local y **replaya todas las migraciones desde cero** (`supabase db reset`). Una migración rota o fuera de orden falla aquí, antes de tocar prod.
2. **`migrate-deploy`** (solo push a `main-principal`, tras `checks` + `migrate-validate`): `supabase db push` (idempotente — solo aplica las pendientes), con `--dry-run` previo como preview.

Sin secrets nuevos: el apply usa `supabase db push --db-url` reutilizando el `DATABASE_URL` que el CI ya usa (sin login/access token). La conexión debe ser **directa/session (puerto 5432)**, no el pooler de transacciones (6543); si `DATABASE_URL` es el pooler, añadir un secret `SUPABASE_DB_URL` con la conexión directa.

> ¿Por qué en GitHub y no en el build de Vercel? El Root Directory de Vercel es `src/`, pero las migraciones viven en `supabase/` en la raíz del repo — quedan **fuera** del contexto de build de Vercel. Además, los preview deploys correrían el build (riesgo de mutar prod) y Vercel no puede validar "replay desde cero". GitHub Actions hace checkout del repo completo y valida en aislamiento.

Aun así, **nunca** se edita la BD a mano: el cambio siempre nace como migración versionada en el repo.

### Modelo de dominio (resumen)
```
User (root)
 ├── Account (PERSONAL|PROP_FIRM|DEMO_*|BACKTEST|QA; status ACTIVE|PAUSED|INACTIVE|LOST;
 │    │        dd{Daily,Weekly,Monthly,Total}Pct; phase; ddModel; maxTradesPerDay; allowedSymbols; lock)
 │    ├── Trade (OPEN|CLOSED|CANCELLED)
 │    │    └── TradeEvent (inmutable: OPEN|STOP_MOVE|TRAIL_STOP|TAKE_PROFIT_MOVE|PARTIAL_CLOSE|SCALE_IN|NOTE)
 │    ├── WeeklyReview / MonthlyReview
 │    └── Withdrawal ── AccountLog (append-only: CREATED|PHASE_CHANGE|WITHDRAWAL|STATUS_CHANGE|NOTE)
 ├── Setup (LONG|SHORT|AMBAS; ACTIVO|EN_PRUEBA|PAUSADO|DESCARTADO; checklists; versiones)
 │    └── LearningResource (M2M _ResourceSetups)
 ├── LearningResource (SRS: reviewInterval, nextReviewAt) ── ResourceReview (inmutable)
 ├── Rule (CRÍTICA|MENOR|INFORMACIÓN; violaciones por tags)
 ├── Market · UserAiSettings · UserAiConfig (keys IA cifradas) · email_log
```

---

## 6. Motores (engines)

### Formula Engine — `lib/formulas/` (funciones puras, testeadas)
Cálculo centralizado y determinista. Módulos: `performance` (net P&L, profit factor, expectancy, Sharpe), `win-rate` (criterio único `pnl > 0`), `risk` (R-multiple), `drawdown`, `discipline`, `setup`, `utils` (fechas UTC: `getISOWeekKey`). Reglas clave:
- P&L = `(close − entry) × size` (LONG) / `(entry − close) × size` (SHORT) − comisión.
- R-Multiple = `rawPnl / (|entry − stop| × size)`, null si distancia de stop = 0.
- SCALE_IN: nuevo avg entry = `(oldEntry×oldSize + price×added) / newSize`.

### Risk Engine — `domains/trading/services/risk-engine.ts` + `prop-firm-guard.ts`
Calcula drawdowns (diario/semanal/mensual/total) y hace **enforcement en el límite de mutación**: `trades.create` valida contra los límites de la cuenta prop-firm (pérdida diaria, nº de trades, símbolos permitidos). Al alcanzar un límite, la cuenta se **bloquea** (lock) hasta desbloqueo manual. Usa `lib/formulas/drawdown.ts`.

### Rule Engine — `rules` router + tags de comportamiento
Reglas de comportamiento de primera clase (`Rule`). Las violaciones se rastrean vía tags en trades (`Off-plan`, `Impulsivo`, …) y alimentan el discipline score y el costo de indisciplina.

### Analytics — `domains/analytics/`
Todo agregado **server-side** (no O(n²) en cliente):
- `dashboard-analytics.ts` → `trades.dashboardStats`: equity curves, P&L por fecha, win rate, Sharpe, profit factor, expectancy, matriz de sesión, estado prop-firm.
- `setup-analytics.ts`: win rate / avg R / equity curve por setup, salud, lifecycle.
- `discipline-service.ts`: discipline score (implementación única centralizada).
- `pattern-detector.ts`: patrones de comportamiento (reglas).
- `analytics-cache.ts`: `TradeStatsCache` (feature-flag para alto volumen).
- `ai-context.ts`: `buildTraderContext` para el coach IA.

---

## 7. Integraciones IA — `lib/ai/`

**Punto único de resolución: `resolve-provider.ts`.** Decide, por usuario y feature: **provider + modelo + API key**.

- **Orden de key** (por provider): clave persistida del usuario en `user_ai_configs` (descifrada, AES-256-GCM) → variable de entorno → ninguna (`source: user|env|none`).
- **Orden de modelo/provider**: override por feature → modelo global por defecto → ladder por `costPriority` (quality/speed/cost); más fallback global opcional.
- `streamChat` y `embedText` reciben **provider + apiKey explícitos** (no leen `process.env` ni adivinan provider por el nombre del modelo).
- **Providers**: OpenRouter, Anthropic, OpenAI (los tres OpenAI-compatibles salvo Anthropic que usa su SDK). Embeddings vía OpenAI/OpenRouter (Anthropic no tiene API de embeddings).
- **Features que consumen LLM hoy** (`ACTIVE_AI_FEATURES`): `ai_chat` (coach), `weekly_reviews` (resumen), `embeddings` (búsqueda semántica de notas). Las demás features del configurador (`trade_analysis`, `psychology_analysis`, `learning_insights`, `review_generation`) son configurables pero **aún no consumidas**.
- **Diagnóstico/health**: `aiConfig.diagnostics` (config efectiva + estado de keys) y `aiConfig.healthCheck` (conectividad real) + `lib/ai/health-check.ts`.
- **Cifrado de keys**: `key-encryption.ts` (AES-256-GCM, `AI_KEY_ENCRYPTION_SECRET` 64-char hex). Degradación elegante sin claves.

---

## 8. Flujo de datos (ejemplo: cerrar un trade)

```
UI close-trade-modal → tRPC trades.close (auth + Zod)
  → trade-service: P&L + R-multiple (Formula Engine)
  → crea TradeEvent (inmutable)
  → risk-engine: recalcula drawdowns; si se rompe límite → lock de cuenta + AccountLog
  → invalida queries → dashboard re-lee dashboardStats (server-agregado)
  → (fire-and-forget) ai-embed: embebe notas vía resolveEmbeddingCall
```

---

## 9. Seguridad

- **Auth en 3 capas**: proxy middleware (Next.js) valida JWT Supabase + `protectedProcedure` (userId de sesión) + RLS en Postgres (`(select auth.uid()) = user_id`).
- **IDOR**: patrón `where: { id, userId }` en update/delete; guard de userId en `ai-embed`.
- **Validación**: Zod en todos los inputs tRPC; SQL parametrizado (sin inyección).
- **Rate limiting** en endpoints IA (Upstash Redis, fallback in-memory).
- **Secrets server-only**: `CRON_SECRET` (edge functions), `RESEND_API_KEY`, service role key; claves IA cifradas en BD. Cap de 16KB en body de webhooks.

---

## 10. Servicios compartidos / Infra

```
Vercel → Next.js (proxy middleware + Node para API/páginas)
Supabase (jpojusluihjjsjvcubdp)
  ├── PostgreSQL (schema public + auth) — RLS
  ├── Edge Functions → weekly-learning-summary (weekly + inactivity)
  ├── pg_cron (agenda las edge functions)
  └── Auth (JWT + OAuth)
Resend (email transaccional)
Upstash Redis (rate limiting; opcional)
```

### ADRs vigentes
- **ADR-001** tRPC sobre REST (type-safety end-to-end).
- **ADR-002** Prisma para datos; Supabase client solo para Auth.
- **ADR-003** Trails inmutables (TradeEvent, AccountLog).
- **ADR-004** Streak materializado en User (O(1)).
- **ADR-005** Idempotencia de email vía UNIQUE `(user_id, email_type, week_key)`.
- **ADR-006** Detección de decay en la query `stats` (no cron).
- **ADR-007** Analítica de dashboard server-side — **implementado**.
- **ADR-008** Enforcement de reglas prop-firm en `trades.create` — **implementado** (risk-engine).
- **ADR-009** Migraciones vía Supabase CLI como sistema único (ver §5).
- **ADR-010** Resolución de IA centralizada en `resolve-provider.ts`, honrando claves persistidas (ver §7).

---

Referencia histórica de diseño extendido (visión a 6 meses, specs de fórmulas, diseño detallado de IA) en `docs/archive/`.
