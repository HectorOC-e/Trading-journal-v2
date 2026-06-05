# Features — Trading Journal v2

> Catálogo de funcionalidades por módulo. Última actualización: 2026-06-05.
> **Estado:** ✅ Listo · ⚠️ Parcial · ❌ Pendiente
> Verificado contra código (no contra docs). Completitud global ~93% (feature-complete).

---

## Dashboard
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| 4 pestañas (Portfolio, Operador, Disciplina, Playbook) | ✅ | Vista unificada de inteligencia | `dashboard-analytics`, `trades.dashboardStats` |
| Analítica server-side | ✅ | Agregación pre-computada (sin O(n²) en cliente) | Analytics |
| Filtro de período (7d/1M/3M/6M/1Y/ALL) | ✅ | — | dashboardStats |
| KPIs (Net P&L, Win Rate, Avg R, Sharpe, Profit Factor, Expectancy) | ✅ | Criterio win rate unificado (`pnl>0`) | Formula Engine |
| Curva de equity multi-cuenta + comparación | ✅ | Portfolio tab | Accounts |
| P&L diario apilado por cuenta | ✅ | — | — |
| Widget de progreso de metas | ✅ | Anillos de progreso semanal | `goals` |
| Estado de cumplimiento prop-firm | ✅ | DD usado, pérdida diaria, trades usados | Risk Engine |
| Persistencia de tab/grain | ✅ | — | `preferences` |
| Detección de patrones (UI) | ⚠️ | `pattern-detector` existe; superficie en UI limitada | Analytics |

## Trades
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Registrar trade (manual) | ✅ | Entrada, SL, TP, size, dirección, setup, tags, notas, screenshots | `trade-service` |
| Ciclo de vida (open→partial→close) | ✅ | P&L + R-multiple al cerrar | Formula Engine |
| Editar / eliminar trade | ✅ | — | — |
| TradeEvents (scale-in / partial / notas) | ✅ | Trail inmutable; SCALE_IN recalcula avg entry | — |
| Import CSV (MT4 / cTrader) | ✅ | Con deduplicación; R-multiple y sesión correctos | `csv-import`, `mt4-parser` |
| Lista con paginación cursor + filtros | ✅ | Por cuenta, setup, sesión, dirección, fecha | — |
| Panel de detalle + timeline de eventos | ✅ | — | — |
| Screenshots (Supabase Storage) | ✅ | Upload validado server-side; lightbox | Storage |
| Campos de psicología por trade | ✅ | emotionBefore, fomo/revenge flags, confianza, calidad | Schema |
| Enforcement prop-firm en create | ✅ | Pérdida diaria, nº trades, símbolos permitidos | Risk Engine |
| Skeleton / empty states | ✅ | — | — |

## Accounts (Cuentas)
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| CRUD de cuentas | ✅ | — | `account-service` |
| Tipos (PERSONAL/PROP_FIRM/DEMO_*/BACKTEST/QA) | ✅ | — | Schema |
| Estados (ACTIVE/PAUSED/INACTIVE/LOST) | ✅ | `LOST` requiere nota | — |
| Límites de drawdown (D/W/M/Total) + modelo FIXED/TRAILING | ✅ | — | Risk Engine |
| Fases prop-firm (PHASE_1→PHASE_2→FUNDED) + chequeo de objetivo | ✅ | — | — |
| Bloqueo de cuenta por límite de riesgo | ✅ | Lock + desbloqueo manual | Risk Engine |
| AccountLog (audit append-only, paginado) | ✅ | CREATED/PHASE_CHANGE/WITHDRAWAL/STATUS_CHANGE/NOTE | — |
| KPIs de cuenta (server-side) | ✅ | — | Analytics |

## Playbook / Setups
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| CRUD de setups (color, dirección, checklists, imágenes) | ✅ | — | `setups` |
| Checklists A+/estándar | ✅ | — | — |
| Versionado + diff de snapshots | ✅ | Historial inmutable (+/− items) | — |
| Campos de edge (expectedWr, expectedAvgR, minR, maxR) | ✅ | — | — |
| Ciclo de vida (ACTIVO/EN_PRUEBA/PAUSADO/DESCARTADO) + sugerencias | ✅ | — | `setup-analytics` |
| Métricas + sparklines de equity por setup | ✅ | — | `setup-analytics` |
| Matriz de rendimiento por sesión | ✅ | — | — |
| Vincular recursos de aprendizaje (M2M) | ✅ | — | Learning |

## Reviews
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Reviews semanales (config→análisis) | ✅ | Discipline score, reflexión, resumen IA | `weekly-reviews` |
| Reviews mensuales con prefill | ✅ | — | `monthly-reviews` |
| Borradores + indicador | ✅ | — | — |
| Editar/eliminar review | ✅ | — | — |
| Resumen IA | ✅ | Usa provider/key del usuario; manejo de error correcto | AI (`resolve-provider`) |
| Discipline score auto | ✅ | Implementación única (`discipline-service`) | — |
| Filtros de review | ✅ | — | — |

## Psychology
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Mood/energía pre-sesión (1–5) | ✅ | `TradingSessionLog` | `trading-sessions` |
| Emoción/flags por trade (FOMO, revenge, confianza, calidad) | ✅ | Campos estructurados | Trades |
| Correlación mood ↔ P&L | ✅ | Chart en tab Disciplina | Analytics |
| Insights de patrones de comportamiento | ✅ | `pattern-detector` | Analytics |
| Costo de indisciplina / rachas limpias | ✅ | — | Rule Engine |

## Analytics
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Agregación server-side (`dashboardStats`) | ✅ | Equity, P&L, drawdown, sesión, prop-firm | `dashboard-analytics` |
| Métricas por setup | ✅ | — | `setup-analytics` |
| Cache de analítica (feature-flag) | ⚠️ | `TradeStatsCache`; flag off por defecto | — |
| Búsqueda semántica de notas (pgvector) | ✅ | Embeddings per-usuario | AI embeddings |

## Learning (Aprendizaje)
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| CRUD de recursos (7 tipos) | ✅ | — | `learning-resources` |
| Repetición espaciada (SRS) | ✅ | 5 niveles de maestría, scaling por rating | `review-scheduler` |
| Detección de decay (MASTERED→IN_REVIEW) | ✅ | En query `stats` | `decay-detector` |
| Rachas (UTC-correctas) | ✅ | Materializadas en User | `streak-service` |
| Impact ranking (estudio→edge) | ✅ | Correlación setup ↔ recurso | Analytics |
| Email semanal de aprendizaje | ✅ | Edge function (4 tipos de notificación) | Resend, pg_cron |

## AI
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Coach Chat (streaming SSE) | ✅ | Contexto del trader inyectado | `coach-service`, `resolve-provider` |
| Multi-provider (OpenRouter/Anthropic/OpenAI) | ✅ | Resolución centralizada | `resolve-provider` |
| Claves per-usuario cifradas (AES-256-GCM) | ✅ | `user_ai_configs` | `key-encryption` |
| Selección de modelo por feature + fallback + costPriority | ✅ | `user_ai_settings` | `feature-models` |
| Test de conexión por proveedor | ✅ | Botón "Probar conexión" | `ai-test`, `health-check` |
| Diagnóstico + Health Check de IA | ✅ | Config efectiva + conectividad real | `aiConfig.diagnostics/healthCheck` |
| Embeddings (búsqueda de notas) | ✅ | Per-usuario | `resolveEmbeddingCall` |
| Degradación elegante sin claves | ✅ | — | — |
| Features IA adicionales (trade/psych/learning analysis) | ❌ | Configurables pero no consumidas aún (features fantasma) | — |
| Tracking de uso/costo | ❌ | Sin `AiUsageLog` | — |

## Profile / Settings
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Ver/editar perfil (persistido) | ✅ | Nombre, zona horaria, idioma, divisa, metas | `profile-service` |
| Cambiar contraseña / exportar datos / eliminar cuenta | ✅ | Funcionales | — |
| Configuración de IA (keys, modelos, diagnóstico) | ✅ | — | AI |
| Tema (claro/oscuro/sistema) | ✅ | Persistido (precedencia BD) | `preferences` |
| Acento configurable + modo daltónico | ✅ | — | — |
| Metas (disciplina, trades/P&L/min semanales) | ✅ | — | `goals` |
| Notificaciones por email | ✅ | — | — |

## Rules · Markets · Withdrawals · Reports
| Funcionalidad | Estado | Descripción | Dependencias |
|---|---|---|---|
| Reglas: CRUD + tracking de violaciones por tags | ✅ | severidad CRÍTICA/MENOR/INFORMACIÓN | `rules` |
| Etiquetas: CRUD de tags personalizados | ✅ | — | `trade-tags` |
| Mercados: watchlist CRUD + filtros | ✅ | — | `markets` |
| Retiros: CRUD + transiciones (SOLICITADO→EN_PROCESO→PAGADO/RECHAZADO) + KPIs | ✅ | Genera AccountLog | `withdrawals` |
| Reports: export PDF (print-based, tablas) | ✅ | Charts en PDF pendiente | — |
| Onboarding: checklist 4 pasos | ✅ | Anillo de progreso, dismissible | — |
| PWA (instalable, offline lectura) | ✅ | Manifest + SW + iconos PNG | — |

---

## Resumen de completitud (por módulo)
Auth/Security 100% · Cuentas 98% · Mercados 96% · Trades 96% · Dashboard 95% · Playbook 95% · Reviews 92% · Aprendizaje 92% · Retiros 92% · Perfil 92% · Etiquetas 92% · Onboarding 90% · Portfolio 88% · Reglas 88% · PDF 85% · Responsive 85% · IA Coach ~90% (subió tras honrar claves per-usuario) · PWA 80%.

Pendientes y futuro → [ROADMAP.md](ROADMAP.md) · [BACKLOG.md](BACKLOG.md). Calidad → [QA_STATUS.md](QA_STATUS.md).
