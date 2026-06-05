# Analytics AI — Implementation Report

> Implementación de la Analytics Intelligence Platform. Fecha: 2026-06-05.
> Estado: ✅ Implementado · 🟡 Parcial · ⏭️ Diferido.
> Build local no ejecutado (sin `node_modules`); validación final en CI (`prisma generate && tsc && build && tests`).

## 1. Resumen

Se transformó `/analytics` (antes reutilizaba los tabs del Dashboard) en una **plataforma independiente** con 8 secciones + una capa de IA encima. **El Dashboard no se tocó.**

## 2. Archivos nuevos

**Backend / data layer**
- `domains/analytics/services/insights-engine.ts` — motor determinista de insights (puro).
- `domains/analytics/services/analytics-bundle.ts` — `buildAnalyticsBundle` consolida los 8 dominios.
- `server/trpc/routers/analytics.ts` — `overview` + `insights`; registrado en `root.ts`.

**AI**
- `lib/ai/analytics-insights-service.ts` — contexto + resolver + streaming (feature `analytics_insights`).
- `app/api/analytics-ai/route.ts` — endpoint de narrativa IA en streaming.

**Frontend**
- `app/analytics/page.tsx` — reescrito: 8 secciones + sub-nav + filtro de periodo.
- `app/analytics/components/ai-insights-panel.tsx` — insights deterministas + narrativa IA.

**Tests / docs**
- `__tests__/domains/insights-engine.test.ts` — 6 tests del motor.
- 3 docs de Analytics.

## 3. Archivos modificados (mínimos, no-Dashboard)

- `lib/ai/feature-models.ts` — añade feature `analytics_insights`.
- `lib/ai/resolve-provider.ts` — `analytics_insights` a `ACTIVE_AI_FEATURES`.
- `app/perfil/components/ai-models-card.tsx` — label del nuevo feature (Record exhaustivo).
- `__tests__/lib/feature-models.test.ts` — recuento de features 7 → 8.
- `server/trpc/root.ts` — registra `analyticsRouter`.

## 4. Secciones implementadas

| Sección | Estado | Contenido |
|---|---|---|
| Performance | ✅ | Net P&L, WR, Profit Factor, Expectancy, avgR, avgWin/Loss, holding |
| Riesgo | ✅ | Peor drawdown, sparkline de equity, tabla de cuentas (dd / límite / estado) |
| Cuentas (intel) | ✅ | Comparativa balance / netPnl / trades / WR por cuenta |
| Setups (intel) | ✅ | Ranking por netPnl, WR, avgR, rachas (vía `computeSetupStats`) |
| Mercados (intel) | ✅ | netPnl / WR / avgR por símbolo |
| Psicología | ✅ | disciplineScore, violationRate, FOMO/revancha, P&L por emoción |
| Objetivos | ✅ | Progreso semanal vs metas (P&L, trades, disciplina, estudio) |
| Retiros | ✅ | Total, frecuencia, impacto % en P&L, por mes |

## 5. Capa IA

- ✅ **Insights deterministas** (7 detectores) — patrones, correlaciones, anomalías, riesgos, oportunidades, con recomendación accionable. Ejemplos generados: caída de WR intradía, disciplina por día de semana, emoción↔P&L, concentración de setup, impacto de retiros, rachas perdedoras, cuentas bloqueadas.
- ✅ **Narrativa IA** on-demand (streaming) que responde QUÉ/POR QUÉ/QUÉ HACER, usando el bundle completo + las señales deterministas como contexto.
- ✅ **AI Context Engine**: existía (`buildTraderContext`); Analytics añade contexto cruzado vía el bundle (accounts, markets, setups, withdrawals, psicología). El servicio de IA consume ese contexto consolidado.
- ✅ **Profile AI Settings**: el nuevo feature respeta default/feature-model/fallback como el resto (resuelto por `resolveAiCall`).

## 6. Compatibilidad

- **Dashboard**: sin cambios (componentes `tab-*` intactos).
- `/psicologia` sigue usando `tab-disciplina` (no afectado).
- Routers existentes intactos; solo se **añadió** `analytics`.
- Sin migración de BD (todo se deriva de tablas existentes).

## 7. Pendientes / follow-up

- 🟡 **Learning ↔ Results**: correlación directa tiempo-estudio↔rendimiento (hay datos de learning stats; falta el detector).
- 🟡 **Call-sites de features** `trade_analysis` / `psychology_analysis` / `learning_insights` / `review_generation`: configurables en Perfil pero algunos sin un call-site LLM vivo (calculados analíticamente). `analytics_insights`, `ai_chat`, `weekly_reviews`, `embeddings` sí están cableados.
- ⏭️ Gráficos avanzados (heatmaps, distribución de R) — se usa sparkline + barras por ahora.
- ⏭️ Persistir insights/anomalías como eventos (para histórico y "lo que cambió desde la última vez").
- ⏭️ Caché del bundle (hoy `overview` e `insights` construyen el bundle por separado; mitigado con `staleTime`).

## 8. Verificación requerida en CI

1. `prisma generate && tsc --noEmit` (tipos del router + bundle).
2. `pnpm test` (incl. `insights-engine.test.ts` y `feature-models` actualizado a 8).
3. `next build`.
4. Ejecutar `ANALYTICS_REGRESSION_TEST_PLAN.md`.
