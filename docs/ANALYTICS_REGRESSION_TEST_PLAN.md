# Analytics Intelligence — Regression Test Plan

> Fecha: 2026-06-05. Marca: [ ] pendiente · [x] pasa · [!] falla.

## 0. Build & tipos
- [ ] `prisma generate && pnpm exec tsc --noEmit` sin errores.
- [ ] `pnpm test` verde (incl. `insights-engine.test.ts`; `feature-models` espera 8 features).
- [ ] `next build` ok.

## 1. Dashboard intacto (NO debe cambiar)
- [ ] `/dashboard` carga igual que antes (Portfolio/Operador/Disciplina/Playbook).
- [ ] Ningún widget/métrica del Dashboard cambió.
- [ ] `/psicologia` sigue funcionando (usa `tab-disciplina`).

## 2. Analytics — secciones (QUÉ)
- [ ] `/analytics` carga con sub-nav de 8 secciones + filtro de periodo.
- [ ] **Performance**: Net P&L, WR, Profit Factor, Expectancy, avgR, avgWin/Loss, holding coherentes con los trades.
- [ ] **Riesgo**: peor drawdown, sparkline de equity y tabla de cuentas (dd/límite/estado) correctos; cuenta bloqueada se marca.
- [ ] **Cuentas**: comparativa balance/netPnl/trades/WR por cuenta.
- [ ] **Setups**: ranking por netPnl con WR/avgR/rachas; setups sin trades no aparecen.
- [ ] **Mercados**: netPnl/WR/avgR por símbolo, ordenado.
- [ ] **Psicología**: disciplineScore, violationRate, FOMO/revancha, P&L por emoción.
- [ ] **Objetivos**: barras de progreso semanal vs metas; "sin objetivo" cuando no hay meta.
- [ ] **Retiros**: total, nº, impacto %, barras por mes.
- [ ] Cambiar el periodo (7D…Todo) recalcula todas las secciones.

## 3. AI layer (POR QUÉ / QUÉ HACER)
- [ ] El panel de IA muestra insights deterministas (tarjetas por categoría/severidad) tras cargar.
- [ ] Con pocos trades (<20) no aparecen insights ruidosos ("sin señales fuertes").
- [ ] Con datos suficientes aparecen insights con título + detalle + recomendación + evidencia.
- [ ] Una cuenta bloqueada genera un insight **crítico** ordenado primero.
- [ ] Botón "Generar análisis" → narrativa IA en streaming con secciones Qué/Por qué/Qué hacer.
- [ ] Sin API key configurada → mensaje claro apuntando a Perfil → Configuración de IA (no 500 genérico).
- [ ] La narrativa usa el periodo seleccionado.

## 4. AI settings wiring
- [ ] Perfil → Modelos de IA muestra "Inteligencia Analytics" como feature configurable.
- [ ] Cambiar el modelo del feature `analytics_insights` afecta la narrativa de Analytics.
- [ ] El fallback global se usa si el primario falla (probar con clave inválida en primario).
- [ ] Diagnósticos de IA listan `analytics_insights` como activo.

## 5. Integridad de datos (motor determinista)
- [ ] `generateInsights` no produce insights bajo el mínimo de muestra (unit).
- [ ] Intraday decay, concentración de setup, racha perdedora, cuenta bloqueada detectados (unit).
- [ ] Insights críticos se ordenan antes que info (unit).

## 6. Rendimiento / conexiones
- [ ] Cargar `/analytics` no dispara errores de pool (overview+insights cacheados con staleTime).
- [ ] El bundle limita a 1000 trades (no timeouts con históricos grandes).

## 7. Responsive
| Vista | Móvil | Tablet | Desktop |
|---|---|---|---|
| Sub-nav 8 secciones (wrap) | [ ] | [ ] | [ ] |
| Stat grids | [ ] | [ ] | [ ] |
| Tablas (scroll-x en móvil) | [ ] | [ ] | [ ] |
| Panel IA | [ ] | [ ] | [ ] |

## 8. Compatibilidad
- [ ] Coach (`/api/ai-coach`), reviews y embeddings siguen funcionando.
- [ ] Routers existentes sin regresión (trades, accounts, setups, withdrawals…).
