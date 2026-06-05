# Technical Debt — Trading Journal v2

> Solo deuda técnica real, refactors pendientes y riesgos técnicos. Última actualización: 2026-06-05.
> Ningún ítem abierto tiene impacto funcional ni de integridad de datos.

## Deuda abierta
| ID | Título | Tipo | Prioridad | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| TD-018 | Extraer lógica de negocio inline del router `trades.ts` (~924 LOC) a `trade-service` | Refactor | P3 | L (~8h) | Mantenibilidad; sin impacto funcional |
| TD-019 | Cliente Supabase creado por-request en el contexto tRPC | Refactor/infra | P3 | M (~4h) | Rendimiento a escala; pooling |
| TD-037 | ~22 efectos "sync-on-open" (setState sincrónico en effect) | Refactor render | P3 | M | Solo warnings de lint; render correcto |

## Riesgos técnicos
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración no aplicada en prod | Baja | Alto | `supabase db push` en el pipeline; esquema reproducible (`db reset`) |
| Claves IA no configuradas | Media | Feature off | Degradación elegante (ya implementada) |
| Cache del Service Worker stale tras deploy | Media | UI vieja | Bump del nombre de cache por deploy (B-09) |
| Volumen alto (1000+ trades) | Baja | Rendimiento | Analítica pre-agregada server-side + `TradeStatsCache` (flag) |
| Charts no incluidos en PDF | Baja | Cosmético | Solo tablas; captura de charts pendiente (B-06) |

## Notas de diseño con deuda conocida
- **Features IA fantasma**: `trade_analysis`, `psychology_analysis`, `learning_insights`, `review_generation` son configurables en la UI pero **no se consumen** por ningún call-site LLM (solo `ai_chat`, `weekly_reviews`, `embeddings`). La resolución ya está lista; falta implementar el consumo (B-11). No eliminadas para no perder configuración guardada.
- **Funciones env-only en `lib/ai/config.ts`** (`detectProvider`, `isAnyKeyConfigured`, `isEmbeddingAvailable`, `getCoachModel`, `getWeeklySummaryModel`, `getEmbeddingModel`) quedaron sin uso tras centralizar en `resolve-provider.ts` (solo `getProviderKey` se usa como fallback de entorno). Candidatas a limpieza.
- **Responsive**: breakpoints presentes pero sin QA en device-farm.

## Deuda cerrada recientemente (referencia)
- Divergencia esquema↔migraciones (tabla `user_ai_configs` faltante) → resuelta migrando a Supabase CLI como sistema único.
- Capa de consumo IA leía solo env vars → resuelta con `resolve-provider` (honra claves persistidas).
- Render purity (Date.now en render), ARIA, IDOR en `ai-embed`, KPIs sobre datos paginados, discipline score con 3 implementaciones → resueltas.
