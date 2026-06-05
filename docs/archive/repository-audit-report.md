# Auditoría Técnica Exhaustiva — Trading Journal v2

**Fecha:** 31 de mayo de 2026
**Auditores:** Staff Software Engineer + QA Lead + Product Engineer
**Repositorio:** `/home/user/Trading-journal-v2/src`
**Rama activa:** `claude/epic-darwin-1XZTX`
**Versión del producto:** 2.0

---

## 1. Resumen Ejecutivo

El repositorio implementa un diario de trading de alta fidelidad con arquitectura Next.js 16 (App Router) + tRPC v11 + Prisma 7 + Supabase. El producto cubre flujos críticos de operativa (registro de trades, gestión de cuentas prop firm, playbook de setups, análisis semanal, aprendizaje continuo y AI coaching) y representa un trabajo de ingeniería considerable con buen uso de patrones modernos.

No obstante, la auditoría identifica **37 hallazgos** distribuidos en cuatro niveles de severidad:

| Severidad | Hallazgos | Descripción |
|-----------|-----------|-------------|
| CRÍTICO   | 5         | Bugs o datos incorrectos que impactan la experiencia del usuario hoy |
| ALTO      | 11        | Deuda técnica significativa o funcionalidades incompletas |
| MEDIO     | 13        | Inconsistencias, malas prácticas, riesgo a futuro |
| BAJO      | 8         | Mejoras cosméticas, optimizaciones no urgentes |

Los hallazgos más urgentes son: la **página de Perfil completamente no funcional** (UI desconectada del backend), el **cálculo de KPIs basado en datos paginados** (máximo 50 trades) que produce métricas incorrectas para usuarios con historial amplio, el **TODO bloqueante en phase promotion** (`objectiveMet = false` hardcoded), y la **ausencia del campo `notes_embedding` en el schema de Prisma**.

La cobertura de tests es parcial (11 archivos, todos unitarios, sin cobertura de UI ni e2e). No hay configuración de CI/CD visible en el repositorio auditado.

---

## 2. Arquitectura General

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework Web | Next.js (App Router) | 16.2.6 |
| UI Library | React | 19 |
| Tipado | TypeScript | 5.x |
| API Layer | tRPC | 11 |
| Data Fetching | TanStack Query (React Query) | 5 |
| ORM | Prisma | 7 |
| Base de Datos | PostgreSQL (Supabase) | — |
| Auth + Storage | Supabase SSR | — |
| Edge Functions | Supabase Deno Runtime | — |
| Estado Global | Zustand | 5 |
| Estilos | Tailwind CSS | 4 |
| Gráficas | Recharts | 3 |
| AI Multi-provider | Anthropic / OpenAI / OpenRouter | Anthropic SDK 0.100.1 |
| Email | Resend | — |
| Extensión DB | pgvector | — |
| Testing | Vitest | — |

### Estructura de Directorios

```
src/
├── app/                      # Rutas Next.js App Router (10 páginas)
│   ├── api/                  # Route Handlers (ai-coach, ai-embed, health, import/mt4)
│   ├── dashboard/            # Dashboard principal con 4 tabs
│   ├── trades/               # Lista y filtros de operaciones
│   ├── cuentas/              # Gestión de cuentas prop firm
│   ├── playbook/             # Setup management
│   ├── reviews/              # Weekly reviews
│   ├── aprendizaje/          # Learning resources + SRS
│   ├── reglas/               # Trading rules
│   ├── mercados/             # Market watchlist
│   ├── retiros/              # Withdrawals
│   ├── perfil/               # User profile (INCOMPLETO)
│   └── login/                # Auth
├── server/
│   └── trpc/
│       ├── root.ts           # 10 routers compuestos
│       ├── init.ts           # Context + procedures
│       └── routers/          # Uno por dominio (trades 924 líneas)
├── domains/
│   ├── analytics/            # Cache, dashboard-analytics, pattern-detector
│   ├── learning/             # Decay, scheduler, streak
│   └── trading/              # Account-service, csv-import, prop-firm-guard, trade-service
├── components/               # Componentes React reutilizables
├── lib/                      # Utilities (ai/config, formulas, prisma, supabase)
├── types/                    # index.ts — tipos serializados via RouterOutputs
├── __tests__/                # 11 archivos de test unitarios
├── prisma/
│   └── schema.prisma         # 13 modelos
└── supabase/
    └── functions/            # weekly-learning-summary edge function
```

### Patrones Arquitectónicos Detectados

- **tRPC end-to-end type safety**: los tipos de respuesta se derivan via `RouterOutputs` en `types/index.ts`, eliminando interfaces manuales en la mayoría de los casos.
- **Domain services**: lógica de negocio extraída a `src/domains/` siguiendo separación de responsabilidades (aunque no siempre es usada desde los routers).
- **Materialized streak**: el campo `streak` en `User` se actualiza en cada cierre de trade para O(1) lookup — buen patrón de optimización.
- **SetupVersion snapshots**: inmutabilidad de historial de checklist implementada correctamente.
- **Analytics cache feature-flag**: `TradeStatsCache` activado via `ANALYTICS_CACHE_ENABLED=true` — buen patrón para optimización progresiva.
- **Multi-provider AI**: abstracción en `lib/ai/config.ts` con prioridad OpenRouter > Anthropic > OpenAI.
- **pgvector semantic search**: embeddings de notas almacenados fuera del ORM via raw SQL.

---

## 3. Inventario Funcional

| Módulo | Ruta | Routers tRPC | Estado | Observaciones |
|--------|------|-------------|--------|---------------|
| Dashboard | `/dashboard` | `trades.dashboardStats` | ✅ Funcional | 4 tabs: Portfolio, Operador, Disciplina, Playbook |
| Trades | `/trades` | `trades.list`, `trades.create`, `trades.update`, `trades.close`, `trades.delete` | ✅ Funcional | KPIs calculados sobre primeros 50 trades (bug) |
| Cuentas | `/cuentas` | `accounts.*`, `withdrawals.*`, `accountLogs.list` | ✅ Funcional | Phase promotion con TODO bloqueante |
| Playbook | `/playbook` | `setups.*`, `markets.list` | ✅ Funcional | Sparklines placeholder sin datos reales |
| Weekly Reviews | `/reviews` | `weeklyReviews.*`, `trades.list` | ✅ Funcional | weekTrades filtrado de los primeros 50 trades |
| Aprendizaje | `/aprendizaje` | `learningResources.*` | ✅ Funcional | Casts de tipo forzados (as unknown as) |
| Reglas | `/reglas` | `rules.*` | ✅ Funcional | Auto-seed correcto; 8 reglas por defecto |
| Mercados | `/mercados` | `markets.*` | ✅ Funcional | `market: any` en MarketCard prop |
| Retiros | `/retiros` | `withdrawals.*` | ✅ Funcional | `amount: any; date: any` en tipo inline |
| Perfil | `/perfil` | Ninguno | ❌ No funcional | UI completamente desconectada del backend |
| Login | `/login` | — | ✅ Funcional | Auth via Supabase SSR |
| AI Coach | `/api/ai-coach` | — (Route Handler) | ✅ Funcional | Streaming SSE con contexto del trader |
| Import MT4/cTrader | `/api/import/mt4` | — (Route Handler) | ✅ Funcional | rMultiple no calculado en import |
| AI Embed | `/api/ai-embed` | — (Route Handler) | ✅ Funcional | Embeddings pgvector, best-effort |
| Health Check | `/api/health` | — (Route Handler) | ✅ Funcional | SELECT 1 básico |
| Email Automation | Supabase Edge Function | — | ✅ Funcional | 4 tipos: weekly, inactivity, decay, prop_firm_health |

---

## 4. Revisión UI/UX

| Elemento | Ubicación | Severidad | Descripción |
|----------|-----------|-----------|-------------|
| Página Perfil desconectada | `/perfil/page.tsx` | CRÍTICO | Todos los campos son `useState` locales con valores hardcodeados. "Guardar cambios", "Cambiar contraseña", "Exportar datos", "Cerrar sesión", "Borrar cuenta" no tienen `onClick`. Notificaciones y ajustes de riesgo no se persisten. |
| Sparklines vacíos en Playbook | `/playbook/page.tsx:276-279` | ALTO | `SparklinePlaceholder` renderiza "— sin trades" hardcoded en `SetupCard` y `SetupDrawer`. No hay conexión con datos reales de equity por setup. |
| Botón "Ver registro →" sin handler | `tab-disciplina.tsx:152` | ALTO | Botón visible en el tab de Disciplina sin `onClick`. Dead UI. |
| KPIs sobre datos paginados | `/trades/page.tsx` | CRÍTICO | Strip de KPIs (win rate, net P&L, avg R) se calcula sobre los primeros 50 trades cargados, no sobre el historial completo. Para usuarios con >50 trades los valores son incorrectos. |
| Phase promotion bloqueada | `promote-phase-modal.tsx:41` | CRÍTICO | `objectiveMet = false` hardcoded. El modal siempre muestra estado "objetivo no cumplido", forzando al usuario a ignorar la advertencia para avanzar de fase. |
| Inconsistencia criterio de win | `/trades/page.tsx` vs `/dashboard` | MEDIO | En `/trades` el criterio de "win" es `rMultiple > 0`; en el dashboard es `pnl > 0`. Genera discrepancia en win rate mostrado. |
| Trades filtrados de datos paginados en Reviews | `/reviews/page.tsx` | ALTO | `weekTrades` se filtra desde `trades.list` (máximo 50). En semanas de alto volumen las estadísticas de la review son incompletas. |
| Stats de cuenta sobre primeros 50 trades | `/cuentas/page.tsx` | ALTO | `useAccountStats` computa métricas desde `trpc.trades.list.useQuery()` (no infinite), obteniendo solo los primeros 50 trades. |
| Manejo de error básico | `/dashboard/page.tsx` | BAJO | El botón "Reintentar" llama a `window.location.reload()` en lugar de `refetch()` de React Query. |
| `market: any` en prop | `/mercados/page.tsx:68` | MEDIO | `MarketCard` recibe `market: any` con eslint-disable. Pérdida de type safety. |
| `amount: any; date: any` en Retiros | `/retiros/page.tsx:116-117` | MEDIO | Tipo inline con `any`. |
| Sesiones hardcodeadas en Perfil | `/perfil/page.tsx` | MEDIO | Horarios de sesión (New York 15:30-22:00, London 08:00-16:30, etc.) no son editables. |
| Mobile nav incompleto | `Sidebar.tsx` | BAJO | Bottom nav mobile muestra solo 5 de 10 secciones. Mercados, Playbook, Reglas, Cuentas, Retiros solo accesibles via drawer "Más". |
| Reload en error de dashboard | `dashboard/page.tsx` | BAJO | Usar `window.location.reload()` es un antipatrón en SPA. |

---

## 5. Revisión Técnica

| ID | Archivo | Línea | Severidad | Categoría | Descripción |
|----|---------|-------|-----------|-----------|-------------|
| T-001 | `app/perfil/page.tsx` | Todo | CRÍTICO | Funcionalidad | Módulo de perfil completamente desconectado del backend. Cero llamadas tRPC o fetch. |
| T-002 | `app/trades/page.tsx` | 227-371 | CRÍTICO | Type Safety | 15+ casts `as never` por desajuste entre `SerializedTrade` y props de componentes. |
| T-003 | `prisma/schema.prisma` | — | ALTO | Schema/ORM | Campo `notes_embedding` (vector pgvector) no está en el schema de Prisma. Se gestiona únicamente via raw SQL. Sin migraciones trackeadas por Prisma. |
| T-004 | `prisma/schema.prisma` | — | ALTO | Schema/ORM | Tabla `email_log` (usada por edge function para idempotencia) no está en schema.prisma. Riesgo de desincronización en migraciones. |
| T-005 | `server/trpc/routers/accounts.ts` | ~82 | ALTO | Error Handling | `changeStatus` lanza `throw new Error()` en lugar de `throw new TRPCError()`. El cliente recibe un error genérico 500 sin código tRPC estructurado. |
| T-006 | `server/trpc/routers/accounts.ts` | 163 | MEDIO | Type Safety | `payload: phasePayload as never` para eludir el tipo Json de Prisma. Workaround sin documentar. |
| T-007 | `server/trpc/routers/learning-resources.ts` | ~400 | ALTO | Correctness | `stats` procedure tiene efecto secundario: auto-transiciona recursos `MASTERED→IN_REVIEW` dentro de una query (no mutation). Viola el principio de command/query separation. |
| T-008 | `server/trpc/routers/learning-resources.ts` | ~350 | ALTO | Performance | `resourceImpactRanking` tiene un patrón N+1: itera recursos × setups lanzando 2 queries Prisma por par. En catálogos medianos genera decenas de queries en paralelo. |
| T-009 | `server/trpc/routers/weekly-reviews.ts` | 172-199 | MEDIO | Code Duplication | `prefill` duplica inline el cálculo del discipline score (mismo algoritmo que `computedDisciplineScore`). Dos fuentes de verdad para la misma fórmula. |
| T-010 | `server/trpc/routers/weekly-reviews.ts` | 232-317 | MEDIO | API Design | `generateSummary` (mutation) retorna `{ error: "GENERATION_FAILED" }` con HTTP 200 en lugar de lanzar `TRPCError`. El cliente debe inspeccionar el payload para detectar el fallo. |
| T-011 | `server/trpc/routers/trades.ts` | ~600 | MEDIO | Dead Code | Procedimiento `stats` duplica la lógica de KPIs que ya está en `dashboardStats`. No hay consumidores visibles de `stats`. Deuda técnica acumulada. |
| T-012 | `server/trpc/routers/account-logs.ts` | — | BAJO | Pagination | `list` tiene `take: 50` hardcoded sin paginación. Para cuentas con historial largo el log queda truncado. |
| T-013 | `app/api/ai-coach/route.ts` | 106 | BAJO | Error Handling | `return NextResponse.json({ error: "BAD_REQUEST" }, { status: 500 })` — mensaje de error no corresponde con el status code. |
| T-014 | `app/api/import/mt4/route.ts` | — | ALTO | Data Integrity | `rMultiple` no se calcula en la importación CSV. Todos los trades importados tienen `rMultiple: null`, lo que distorsiona métricas R-múltiplo en el dashboard. |
| T-015 | `lib/ai/config.ts` | ~40 | MEDIO | Config | `getCoachModel()` retorna `claude-sonnet-4-5`. El modelo actual es `claude-sonnet-4-6`. Potencial diferencia de rendimiento/costo. |
| T-016 | `lib/ai/config.ts` | ~50 | MEDIO | Config | `getWeeklySummaryModel()` retorna `claude-haiku-4-5-20251001`. ID de modelo posiblemente incorrecto (fecha en el nombre inusual). |
| T-017 | `app/reglas/page.tsx` | ~200 | BAJO | Hooks | `eslint-disable-next-line react-hooks/exhaustive-deps` en el efecto de auto-seed. Posible cierre estancado (stale closure). |
| T-018 | `app/playbook/page.tsx` | ~900 | ALTO | UX/Feature | Subida de imágenes de setup directa a Supabase Storage sin validación server-side de tipo de archivo ni tamaño. |
| T-019 | `server/trpc/routers/setups.ts` | ~200 | MEDIO | Logic | `lifecycleCheck` solo evalúa setups donde `expectedWr !== null`. Setups sin edge definition definida quedan excluidos del análisis de ciclo de vida silenciosamente. |
| T-020 | `supabase/functions/weekly-learning-summary/index.ts` | ~30 | MEDIO | Security | `CRON_SECRET` check: si la variable es string vacío, se permite toda request (bypass mode activo en dev). Si se despliega sin la variable configurada, endpoint queda abierto. |
| T-021 | `supabase/functions/weekly-learning-summary/index.ts` | ~580 | BAJO | Config | `FROM_EMAIL = "Trading Journal <noreply@resend.dev>"` usa dominio sandbox de Resend, no un dominio verificado. Emails pueden llegar a spam o ser rechazados en producción. |
| T-022 | `app/aprendizaje/page.tsx` | múltiples | MEDIO | Type Safety | `as unknown as LearningResource[]` y `as unknown as ResourceFromDB` indican desajuste entre el tipo generado por tRPC y la interfaz local `LearningResource` en `types/index.ts`. |
| T-023 | `types/index.ts` | ~90 | MEDIO | Maintenance | Interfaz `LearningResource` definida manualmente duplica parcialmente `RouterOutputs["learningResources"]["list"][0]`. Dos fuentes de verdad para el mismo tipo. |

---

## 6. Revisión de Integraciones

### Supabase Auth
- Integración correcta via `@supabase/ssr` con helpers de servidor (`createClient` en Server Components y Route Handlers).
- `createTRPCContext()` en `init.ts` crea un cliente Supabase y obtiene el usuario en **cada request tRPC**. Para volúmenes altos esto supone una llamada a la auth API en cada mutación/query. Considerar cachear la sesión por request lifecycle o usar el `userId` del JWT directamente.

### Supabase Storage
- Dos buckets: `trade-screenshots` y `setup-images`.
- Las imágenes de setups se suben directamente desde el cliente en `playbook/page.tsx` sin pasar por un Route Handler. Esto implica que la API key de Supabase queda expuesta en el bundle del cliente y que no hay validación server-side de tipo MIME o tamaño máximo.
- El borrado de screenshots en `trades.delete` usa `storage.from("trade-screenshots").remove(urls)` — correcto, pero el resultado del borrado no se verifica.

### Supabase Edge Functions
- La función `weekly-learning-summary` (613 líneas, Deno) maneja 4 tipos de notificación mediante un scheduler cron externo.
- La tabla `email_log` usada para idempotencia no está en `schema.prisma`. Debe existir como migración SQL independiente — riesgo de que no esté en el entorno de staging.
- El bypass de `CRON_SECRET` (si es string vacío) es un riesgo de seguridad en producción si la variable no se configura.
- Correcto uso de timezone-aware gating (hora local del usuario antes de enviar).

### pgvector / Embeddings
- El campo `notes_embedding vector(1536)` se gestiona completamente fuera del ORM Prisma mediante `prisma.$executeRaw`.
- La función `scheduleEmbedding()` en `trades.ts` hace `fetch` a `/api/ai-embed` en background (fire-and-forget). Si el servidor procesa la request en el mismo worker de Node.js, no hay garantía de que el fetch complete antes de que la conexión se cierre.
- No existe ningún job de re-embedding en batch para recalcular embeddings cuando cambia el modelo.

### Resend / Email
- Usado solo desde la edge function de Supabase (no desde el backend Next.js directamente).
- `noreply@resend.dev` es el dominio de testing de Resend — en producción se debe configurar un dominio propio.

### Multi-Provider AI
- Abstracción limpia en `lib/ai/config.ts` con `streamChat()` y `embedText()` que delegan al proveedor configurado.
- Prioridad: OpenRouter → Anthropic → OpenAI. Si ninguna key está configurada, `isAnyKeyConfigured()` retorna false y la feature AI se deshabilita gracefully.
- Los IDs de modelo en `getCoachModel()` y `getWeeklySummaryModel()` pueden estar desactualizados.

### Prisma / PostgreSQL
- Prisma 7 con `postgresqlAdapter` (Supabase).
- Los campos `Decimal` (pnl, rMultiple, netPnl, winRate) se serializan correctamente a `number` en las funciones `serialize*`.
- El campo `Json` para `phasePayload` en Account usa `as never` como workaround — considerar definir el tipo correctamente.

---

## 7. Consistencia Entre Módulos

### Inconsistencias detectadas

| Inconsistencia | Módulos afectados | Impacto |
|----------------|-------------------|---------|
| Criterio de "win": `rMultiple > 0` vs `pnl > 0` | `trades/page.tsx` vs `dashboardStats` | Win rate diferente en dos vistas de la misma sesión |
| Cálculo de discipline score duplicado | `computedDisciplineScore` y `prefill` (en `weekly-reviews.ts`) | Si se actualiza la fórmula en un lugar, el otro queda obsoleto |
| Tipo `LearningResource` definido en `types/index.ts` y derivado de `RouterOutputs` | `types/index.ts` vs `learningResources` router | Casts forzados; mantenimiento duplicado |
| `stats` duplica lógica de `dashboardStats` en el router de trades | Mismo archivo, `routers/trades.ts` | Dead code — risk de divergencia |
| Embeddings gestionados fuera de Prisma schema | `schema.prisma` vs uso en `trades.ts` + `ai-embed/route.ts` | Migraciones no trackeadas |
| `email_log` tabla fuera del schema | `schema.prisma` vs edge function | Riesgo en provisioning de nuevos entornos |
| Sesión default en importación CSV hardcodeada a "New York" | `api/import/mt4/route.ts` | Todos los trades importados tienen sesión incorrecta para traders no americanos |
| `accountLogs.list` sin paginación | `account-logs.ts` vs otros routers con cursor pagination | Truncamiento silencioso a 50 registros |

### Puntos de consistencia correcta

- La autenticación via `protectedProcedure` es uniforme en los 10 routers.
- El filtro `userId: ctx.userId` está presente en todas las queries de datos sensibles.
- La serialización de tipos `Decimal` y `Date` se hace consistentemente en las funciones `serialize*`.
- El patrón de `SetupVersion` para snapshots inmutables es consistente con los principios de event sourcing lite.

---

## 8. Oportunidades de Mejora

### Performance

1. **`resourceImpactRanking` N+1**: Reemplazar el loop con queries con `JOIN` via Prisma o una sola query SQL agregada. El impacto actual es `O(recursos × setups)` queries.

2. **Context de tRPC recrea cliente Supabase en cada request**: Considerar usar el `userId` extraído del JWT en el middleware de Next.js y pasarlo como header, evitando la llamada a `supabase.auth.getUser()` por request.

3. **`dashboardStats` es una query monolítica** (lines 100-400 aprox. en trades.ts): Evaluar dividirla en sub-queries paralelas con `Promise.all` indexadas o moverla a la capa de `analytics/services/dashboard-analytics.ts` ya existente.

4. **Analytics Cache** (`TradeStatsCache`): El feature flag `ANALYTICS_CACHE_ENABLED` existe pero no está activado por defecto. Documentar y activar para producción.

### Arquitectura

5. **Perfil de usuario**: Implementar un router `profile` en tRPC con procedures `get`, `update`, `changePassword`, `exportData`, `deleteAccount`. Conectar la página `/perfil`.

6. **Extracción de servicios de dominio**: Los routers `trades.ts` (924 líneas) y `learning-resources.ts` (680 líneas) contienen lógica de negocio que debería vivir en `domains/`. La dirección correcta ya existe (ver `domains/trading/trade-service.ts`), pero no se usa consistentemente.

7. **Separar `stats` procedure dead code**: Eliminar o deprecar `trades.stats` si `dashboardStats` lo reemplaza. Si se mantiene, documentar el caso de uso diferenciado.

### DX / Type Safety

8. **Eliminar `as never` en trades/page.tsx**: Unificar el tipo `SerializedTrade` con los props de los componentes afectados (`TradeDetailPanel`, `EditTradeModal`, etc.) usando `RouterOutputs["trades"]["list"]["items"][0]` directamente.

9. **Eliminar `LearningResource` manual en types/index.ts**: Derivar todo desde `RouterOutputs` para eliminar el desajuste.

10. **`market: any` en MarketCard** y `amount: any` en retiros: Tipar correctamente usando los tipos de `RouterOutputs`.

### Testing

11. **Cobertura de UI**: 0 tests para componentes React. Agregar tests con React Testing Library para los flujos críticos (crear trade, cerrar trade, weekly review form).

12. **Tests e2e**: No hay Playwright ni Cypress. Implementar al menos smoke tests para login, crear trade, y navegar al dashboard.

13. **Tests de integración para routers**: Los tests actuales mockean Prisma. Considerar tests de integración con una DB de test para los routers más complejos (trades, learning-resources).

---

## 9. Deuda Técnica

| ID | Archivo(s) | Severidad | Categoría | Descripción | Esfuerzo est. |
|----|-----------|-----------|-----------|-------------|---------------|
| DT-001 | `app/perfil/page.tsx` | CRÍTICO | Funcionalidad incompleta | Módulo de perfil sin backend. Incluye: guardar perfil, cambiar contraseña, exportar datos, cerrar sesión, borrar cuenta, persistir preferencias de notificaciones y parámetros de riesgo. | 3-5 días |
| DT-002 | `app/trades/page.tsx` | CRÍTICO | Bug de datos | KPIs calculados sobre máximo 50 trades. Requiere endpoint dedicado o usar `dashboardStats` para los totales. | 1 día |
| DT-003 | `cuentas/modals/promote-phase-modal.tsx:41` | CRÍTICO | Bug de lógica | `objectiveMet = false` hardcoded. Implementar comparación real de P&L vs `targetPct` del phase payload. | 0.5 día |
| DT-004 | `prisma/schema.prisma` | ALTO | Schema drift | `notes_embedding` y `email_log` fuera del schema. Crear `model TradeEmbedding` o documentar migration SQL manual; agregar `email_log` como modelo Prisma o en migration. | 1 día |
| DT-005 | `routers/accounts.ts:~82` | ALTO | Error handling | `throw new Error()` debe ser `throw new TRPCError({ code: "BAD_REQUEST", message: "..." })`. | 0.25 día |
| DT-006 | `routers/learning-resources.ts:~400` | ALTO | Performance | N+1 en `resourceImpactRanking`. Reescribir con query SQL agregada o `groupBy` de Prisma. | 1 día |
| DT-007 | `routers/learning-resources.ts` (`stats`) | ALTO | CQRS violation | Auto-transición `MASTERED→IN_REVIEW` dentro de una query. Mover a mutation separada o a un job background. | 0.5 día |
| DT-008 | `api/import/mt4/route.ts` | ALTO | Data integrity | `rMultiple` no calculado en import. Implementar `pnl / initialRisk` o derivarlo del stop loss del trade. | 0.5 día |
| DT-009 | `routers/weekly-reviews.ts` | MEDIO | Code dup | Extraer `computeDisciplineScore(userId, from, to, ctx)` como función compartida usada por `computedDisciplineScore` y `prefill`. | 0.25 día |
| DT-010 | `routers/trades.ts` (`stats` procedure) | MEDIO | Dead code | Deprecar o eliminar `trades.stats` si está reemplazado por `dashboardStats`. Auditar consumidores primero. | 0.25 día |
| DT-011 | `app/playbook/page.tsx:276-279` | MEDIO | Feature incompleta | `SparklinePlaceholder` sin datos reales. Implementar query de equity por setup desde trades filtrados. | 1 día |
| DT-012 | `tab-disciplina.tsx:152` | MEDIO | Dead UI | Botón "Ver registro →" sin `onClick`. Conectar a ruta de trades filtrada por semana o eliminar. | 0.25 día |
| DT-013 | `routers/reviews.ts` + `cuentas/page.tsx` | MEDIO | Bug de datos | Weekrades y account stats filtrados de primeros 50 trades. Requiere query específica por rango de fecha. | 1 día |
| DT-014 | `lib/ai/config.ts` | MEDIO | Config | Actualizar `claude-sonnet-4-5` → `claude-sonnet-4-6`; verificar ID de haiku. | 0.25 día |
| DT-015 | `supabase/functions/weekly-learning-summary` | MEDIO | Security | Hardened `CRON_SECRET` check — rechazar requests si la variable no está configurada. | 0.25 día |
| DT-016 | `app/playbook/page.tsx` | MEDIO | Security | Validar tipo MIME y tamaño máximo de imagen en server-side antes de aceptar uploads a Storage. | 0.5 día |
| DT-017 | `types/index.ts` | MEDIO | Maintenance | Eliminar interfaz `LearningResource` manual; derivar de `RouterOutputs`. | 0.5 día |
| DT-018 | `routers/account-logs.ts` | BAJO | Pagination | Implementar cursor pagination en `accountLogs.list`. | 0.5 día |
| DT-019 | `api/ai-coach/route.ts:106` | BAJO | Error handling | Corregir `{ error: "BAD_REQUEST" }` con `status: 500` — usar mensaje coherente. | 0.1 día |
| DT-020 | `supabase/functions/.../index.ts` | BAJO | Config | Configurar dominio de email verificado en Resend (`noreply@tudominio.com`). | 0.5 día |

**Esfuerzo total estimado: ~14 días de ingeniería**

---

## 10. Backlog Recomendado

### Prioridad P0 — Bugs críticos (Sprint actual)

| ID | Título | Archivos | Estimación |
|----|--------|---------|------------|
| TASK-001 | Fix KPIs en /trades calculados sobre primeros 50 trades | `app/trades/page.tsx`, `routers/trades.ts` | 1 día |
| TASK-002 | Implementar `objectiveMet` real en phase promotion | `cuentas/modals/promote-phase-modal.tsx` | 0.5 día |
| TASK-003 | Reemplazar `throw new Error()` por `TRPCError` en `accounts.changeStatus` | `routers/accounts.ts` | 0.25 día |
| TASK-004 | Calcular `rMultiple` en importación CSV MT4/cTrader | `api/import/mt4/route.ts` | 0.5 día |
| TASK-005 | Unificar criterio de "win" (`pnl > 0`) entre /trades y dashboard | `app/trades/page.tsx` | 0.25 día |

### Prioridad P1 — Funcionalidad crítica faltante (Sprint siguiente)

| ID | Título | Archivos | Estimación |
|----|--------|---------|------------|
| TASK-006 | Implementar backend completo de Perfil (router + procedures) | `server/trpc/routers/profile.ts` (nuevo), `app/perfil/page.tsx` | 3 días |
| TASK-007 | Eliminar side-effect en `learningResources.stats` (mover a mutation) | `routers/learning-resources.ts` | 0.5 día |
| TASK-008 | Corregir N+1 en `resourceImpactRanking` | `routers/learning-resources.ts` | 1 día |
| TASK-009 | Corregir weekTrades y account stats basados en 50 trades | `app/reviews/page.tsx`, `app/cuentas/page.tsx` | 1 día |
| TASK-010 | Conectar "Ver registro →" en tab Disciplina | `app/dashboard/tabs/tab-disciplina.tsx` | 0.25 día |

### Prioridad P2 — Mejoras de calidad (Próximas 2 semanas)

| ID | Título | Archivos | Estimación |
|----|--------|---------|------------|
| TASK-011 | Extraer `computeDisciplineScore` como función compartida | `routers/weekly-reviews.ts` | 0.25 día |
| TASK-012 | Implementar sparklines de equity por setup en Playbook | `app/playbook/page.tsx` | 1 día |
| TASK-013 | Eliminar 15+ casts `as never` en trades/page.tsx | `app/trades/page.tsx`, componentes de trades | 1 día |
| TASK-014 | Mover `LearningResource` type a derivación de RouterOutputs | `types/index.ts`, `app/aprendizaje/page.tsx` | 0.5 día |
| TASK-015 | Actualizar IDs de modelos AI en config | `lib/ai/config.ts` | 0.25 día |
| TASK-016 | Hardened CRON_SECRET check en edge function | `supabase/functions/weekly-learning-summary/index.ts` | 0.25 día |
| TASK-017 | Validación server-side de uploads a Storage | `app/playbook/page.tsx`, crear Route Handler | 0.5 día |
| TASK-018 | Deprecar `trades.stats` dead code | `routers/trades.ts` | 0.25 día |

### Prioridad P3 — Deuda técnica y mejoras (Próximo mes)

| ID | Título | Archivos | Estimación |
|----|--------|---------|------------|
| TASK-019 | Agregar `notes_embedding` y `email_log` al schema Prisma o documentar migrations | `prisma/schema.prisma` | 1 día |
| TASK-020 | Implementar cursor pagination en `accountLogs.list` | `routers/account-logs.ts` | 0.5 día |
| TASK-021 | Activar y documentar `ANALYTICS_CACHE_ENABLED` para producción | `domains/analytics/services/analytics-cache.ts` | 0.5 día |
| TASK-022 | Configurar dominio de email verificado en Resend | Edge function config | 0.5 día |
| TASK-023 | Tipar `market: any` en MarketCard y `amount: any` en retiros | `app/mercados/page.tsx`, `app/retiros/page.tsx` | 0.25 día |
| TASK-024 | Añadir tests de componentes React con React Testing Library | Nuevos archivos `__tests__/components/` | 3 días |
| TASK-025 | Añadir tests e2e con Playwright (smoke: login, crear trade, dashboard) | Nuevo directorio `e2e/` | 2 días |
| TASK-026 | Corregir mensaje de error en `ai-coach/route.ts:106` | `app/api/ai-coach/route.ts` | 0.1 día |

---

## 11. Roadmap de Corrección

### Fase 1 — Bugs Críticos y Seguridad (Semana 1)
**Objetivo:** Eliminar bugs que generan datos incorrectos y riesgos de seguridad.

- [ ] TASK-001: Fix KPIs en /trades (datos paginados)
- [ ] TASK-002: `objectiveMet` real en phase promotion
- [ ] TASK-003: `TRPCError` en `accounts.changeStatus`
- [ ] TASK-004: Calcular `rMultiple` en importación CSV
- [ ] TASK-005: Unificar criterio de win
- [ ] TASK-016: Hardened CRON_SECRET en edge function
- [ ] TASK-017: Validación server-side de uploads

**Criterio de salida:** No hay métricas incorrectas en la UI. Los endpoints protegidos no tienen bypasses de seguridad.

### Fase 2 — Funcionalidad Faltante (Semanas 2-3)
**Objetivo:** Completar módulos que existen en la UI pero no tienen backend.

- [ ] TASK-006: Backend completo de Perfil (router + page)
- [ ] TASK-007: Eliminar side-effect en `learningResources.stats`
- [ ] TASK-008: Corregir N+1 en `resourceImpactRanking`
- [ ] TASK-009: Corregir weekTrades y account stats en Reviews/Cuentas
- [ ] TASK-010: Conectar botón "Ver registro →" en Disciplina
- [ ] TASK-011: Extraer `computeDisciplineScore` compartido
- [ ] TASK-012: Sparklines reales en Playbook

**Criterio de salida:** Todas las páginas tienen funcionalidad real conectada al backend. No hay UI muerta visible.

### Fase 3 — Calidad de Código y Type Safety (Semanas 4-5)
**Objetivo:** Eliminar deuda técnica de tipo y mantenibilidad.

- [ ] TASK-013: Eliminar casts `as never` en trades/page.tsx
- [ ] TASK-014: Unificar tipo `LearningResource`
- [ ] TASK-015: Actualizar IDs de modelos AI
- [ ] TASK-018: Deprecar `trades.stats` dead code
- [ ] TASK-019: Sincronizar schema Prisma con realidad de la DB
- [ ] TASK-020: Paginación en `accountLogs.list`
- [ ] TASK-023: Tipar props `any` en mercados y retiros
- [ ] TASK-026: Corregir mensaje de error en ai-coach

**Criterio de salida:** 0 `as never` en código de aplicación. Schema Prisma refleja el estado real de la DB. TypeScript strict sin supresiones ad-hoc.

### Fase 4 — Observabilidad, Testing y Productización (Semanas 6-8)
**Objetivo:** Preparar el producto para crecimiento sostenible.

- [ ] TASK-021: Activar `ANALYTICS_CACHE_ENABLED` en producción
- [ ] TASK-022: Dominio de email verificado en Resend
- [ ] TASK-024: Tests de componentes React
- [ ] TASK-025: Tests e2e con Playwright
- Configurar CI/CD pipeline (lint, typecheck, tests en cada PR)
- Agregar monitoring/alertas (Sentry o equivalente)
- Documentar variables de entorno requeridas y opcionales (`.env.example`)

**Criterio de salida:** El proyecto tiene CI verde, cobertura de tests >60%, y puede ser desplegado por cualquier miembro del equipo siguiendo la documentación.

---

## 12. Actualización de Documentación

Los siguientes documentos existentes en `/home/user/Trading-journal-v2/docs/` deben actualizarse para reflejar los hallazgos de esta auditoría:

| Documento | Actualización necesaria |
|-----------|------------------------|
| `TASKS.md` | Agregar las 26 tareas del backlog recomendado (TASK-001 a TASK-026). Marcar las tareas ya completadas que se solapen con las existentes. |
| `ARCHITECTURE.md` | Documentar el manejo fuera-de-schema de `notes_embedding` y `email_log`. Agregar sección sobre el patrón de multi-provider AI. |
| `ROADMAP.md` | Incorporar las 4 fases del Roadmap de Corrección. |
| `MASTER_TASKS.md` / `MASTER_REMEDIATION_PLAN.md` | Incorporar DT-001 a DT-020 del inventario de deuda técnica. |
| `DOMAIN_MAP.md` | Actualizar con el módulo `profile` pendiente de implementación. Agregar nota sobre routers que tienen lógica de dominio inline (trades, learning-resources) vs. los que delegan a `domains/`. |

### Variables de entorno a documentar (actualmente no hay `.env.example`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers (al menos una requerida)
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Feature Flags
ANALYTICS_CACHE_ENABLED=false    # activar en producción

# Edge Functions
CRON_SECRET=                      # REQUERIDO en producción, no dejar vacío

# Resend
RESEND_API_KEY=
FROM_EMAIL=                       # usar dominio verificado, no noreply@resend.dev
```

---

*Fin del informe de auditoría — Trading Journal v2 — 31 mayo 2026*
