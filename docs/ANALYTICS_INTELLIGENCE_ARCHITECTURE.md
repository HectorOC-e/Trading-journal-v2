# Analytics Intelligence Architecture — Trading Journal v2

> Arquitectura del centro de inteligencia del trader. Fecha: 2026-06-05.
> **Dashboard NO se modifica** — Analytics es una plataforma independiente.

## 1. Principio

- **Analytics responde QUÉ** está ocurriendo (datos consolidados, deterministas).
- **La capa IA responde POR QUÉ** ocurre y **QUÉ hacer después** (insights + narrativa).

Analytics **consume** de todos los dominios (Trades, Accounts, Playbooks, Markets, Withdrawals, Reviews, Psychology, Learning, Goals) pero **no los reemplaza**. Cada dominio mantiene su pantalla.

## 2. Capas

```
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND  /analytics                                          │
│  · 8 secciones (Performance, Riesgo, Cuentas, Setups,         │
│    Mercados, Psicología, Objetivos, Retiros)                  │
│  · AiInsightsPanel (insights deterministas + narrativa IA)    │
├──────────────────────────────────────────────────────────────┤
│ tRPC  analytics router                                        │
│  · overview(period) → secciones (QUÉ)                         │
│  · insights(period) → Insight[] determinista (POR QUÉ)        │
│ HTTP  /api/analytics-ai → narrativa IA en streaming           │
├──────────────────────────────────────────────────────────────┤
│ DATA LAYER  domains/analytics/services                        │
│  · analytics-bundle.ts  → buildAnalyticsBundle()              │
│    (consolida los 8 dominios en un bundle tipado)             │
│  · insights-engine.ts   → generateInsights() (puro, testeado) │
│  · setup-analytics, dashboard-analytics, pattern-detector     │
├──────────────────────────────────────────────────────────────┤
│ AI LAYER  lib/ai                                              │
│  · analytics-insights-service.ts → contexto + resolver +      │
│    streamChat (feature: analytics_insights, con fallback)     │
│  · feature-models / resolve-provider (provider+model+key)     │
│  · ai-context.ts (buildTraderContext) — context engine        │
└──────────────────────────────────────────────────────────────┘
```

## 3. Data layer — `buildAnalyticsBundle`

Una sola lectura cruzada (≤1000 trades cerrados + accounts + setups + withdrawals + goals) produce un `AnalyticsBundle` tipado con:

| Sección | Fuente | Métricas |
|---|---|---|
| **performance** | Trades | winRate, profitFactor, expectancy, avgR, netPnl, avgWin/Loss, holding medio |
| **risk** | Trades + Accounts | peor drawdown global, curva de equity, drawdown y límite por cuenta |
| **accounts** (intel) | Accounts + Trades | balance, netPnl, trades, winRate por cuenta (comparativa) |
| **setups** (intel) | Playbooks + Trades | `computeSetupStats` por setup (WR, avgR, netPnl, rachas, holding) |
| **markets** (intel) | Markets + Trades | netPnl/WR/avgR por símbolo |
| **psychology** | Trades (emoción/flags) | disciplineScore, violationRate, FOMO, revancha, P&L por emoción |
| **goals** | User + Trades | objetivos + progreso de la semana |
| **withdrawals** | Withdrawals | total, frecuencia, impacto % sobre P&L, por mes |
| **raw** | — | trades enriquecidos + metadatos para el motor de insights/IA |

## 4. Insights Engine (determinista)

`generateInsights(input)` ejecuta detectores puros (sin LLM), cada uno con umbral mínimo de muestra para no emitir ruido. Categorías: `pattern · correlation · anomaly · risk · opportunity`. Severidades: `critical · warning · positive · info` (ranking de orden).

Detectores actuales:
1. **Intraday decay** — caída de win rate del 3er trade en adelante.
2. **Weekday discipline** — día de la semana con más violaciones.
3. **Emotion ↔ performance** — P&L en estado calmado vs negativo/FOMO/revancha.
4. **Setup concentration** — % de beneficio que concentra tu mejor setup.
5. **Withdrawals ↔ growth** — retiros como % del P&L neto.
6. **Losing streak** — racha de pérdidas consecutivas (anomalía).
7. **Account risk** — cuentas bloqueadas (riesgo crítico).

Cada insight expone: `title · detail · recommendation · evidence · metric`.

## 5. AI Layer

- **Feature nuevo `analytics_insights`** en `AI_FEATURES` → resoluble por provider/model/fallback como el resto.
- `streamAnalyticsInsights()` arma el contexto desde el bundle + las señales deterministas, resuelve el feature con `resolveAiCall` (clave de usuario → env → fallback) y hace `streamChat`.
- System prompt enfocado en **POR QUÉ + QUÉ HACER** (no repetir métricas).
- **AI Context Engine**: ya existía `buildTraderContext` (performance, comportamiento, learning, goals, patterns). El bundle de Analytics amplía el contexto cruzado (accounts, markets, setups, withdrawals, psicología) que la narrativa consume directamente.

## 6. Correlaciones cubiertas

Psychology ↔ Performance (emoción), Rules/Discipline ↔ Results (violationRate), Goals ↔ Results (progreso), Accounts ↔ Drawdowns (dd por cuenta), Withdrawals ↔ Growth (impacto %). Learning ↔ Results queda parcial (tiempo de estudio disponible vía learning stats; correlación directa = follow-up).

## 7. Profile AI Settings → features

`Default Provider`, `Feature Models` y `Fallback` afectan vía `resolveFeatureModel`/`resolveAiCall`:

| Feature | Call-site |
|---|---|
| `analytics_insights` | `/api/analytics-ai` (nuevo) |
| `ai_chat` | Coach (`/api/ai-coach`) |
| `weekly_reviews` | generación de reviews |
| `embeddings` | búsqueda semántica |
| `trade_analysis`, `psychology_analysis`, `learning_insights`, `review_generation` | configurables; call-sites analíticos/aún por cablear (ver report §Pendientes) |

## 8. UX

Estética **TradingView Analytics + Linear Insights + Stripe Analytics**: secciones con sub-nav en píldoras, stat cards con cifras tabulares, tablas comparativas, barras y sparkline de equity, y un panel de IA destacado arriba. No es un panel CRUD ni un chat.

## 9. Responsive

- **Desktop**: grids de 3–4 columnas, tablas completas.
- **Tablet**: grids 2 columnas, tablas con scroll-x.
- **Mobile**: stat cards 2-col, tablas `min-width` con scroll horizontal, sub-nav que envuelve.
