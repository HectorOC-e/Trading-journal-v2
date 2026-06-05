# Sprint 7 Retrospective

**Sprint Duration:** 2026-06-03 (accelerated single-session)  
**Branch:** `claude/epic-darwin-1XZTX`  
**Baseline tests:** 407 | **Post-implementation:** 430 | **Post-QA fixes:** 438  
**Tasks delivered:** TASK-031, TASK-011, TASK-051, TASK-058, TASK-060, TASK-064, TASK-073 + rate-limiter abstraction + review URL persistence + TD-029–TD-033  
**QA audit result:** 2 Blocking (both fixed) · 4 Major (all fixed) · 4 Minor (deferred) · 5 Nitpick (deferred)

---

## 1. Qué salió bien

### Cierre completo de P1

Sprint 7 cerró **todos los ítems P1 restantes del backlog**, incluyendo TASK-031 (edit/delete en reviews) que llevaba 3 sprints aplazado. Al cierre de Sprint 7, el backlog muestra **0 ítems P1 abiertos** por primera vez desde el inicio del proyecto. Esto es un hito arquitectural: el deuda funcional crítica está pagada.

### TD-002 CRITICAL finalmente resuelto

La inconsistencia de discipline score (3 implementaciones distintas desde Phase VII) se cerró de forma limpia: `computeDisciplineScore()` vive exclusivamente en `lib/formulas/discipline.ts`, ambas llamadas del router apuntan al mismo export, y el modal de creación ya no computa el score localmente. Un trader que ve score 74 en el modal y score 68 guardado en DB ya no es posible.

### Arquitectura del rate limiter bien ejecutada

La extracción de `lib/rate-limiter.ts` con la interfaz `RateLimiter` es un ejemplo correcto de diseño orientado a interfaces:
- `InMemoryRateLimiter` preserva el comportamiento anterior al 100%
- `UpstashRateLimiter` está listo para cuando se provisionen las env vars
- Los tests importan la clase real en lugar de reimplementar el algoritmo
- La factory hace la decisión en runtime sin overhead en dev

### QA independiente detectó 2 bugs Blocking de seguridad

El proceso de QA independiente identificó B-01 (IDOR en `ai-embed/route.ts`) y B-02 (DoS por body sin límite), que el implementador no había detectado. B-01 es especialmente significativo: cualquier usuario autenticado podía embeber las notas de los trades de otro usuario simplemente enviando un `tradeId` ajeno. El vector era sutil — `user.id` estaba capturado en el branch de auth, pero el flujo de datos no llegaba al `findUnique` posterior.

Esto valida que el patrón de QA independiente (agente separado, sin acceso al contexto de implementación) sigue siendo el mecanismo de detección más efectivo para bugs de seguridad latentes.

### Cobertura de tests proporcional a la complejidad

El sprint añadió 31 tests en total (23 de implementación + 8 de QA):
- 11 tests para `calcSetupHealth()` — exhaustivos: los 4 estados, expectations nulas, boundary de tradeCount, avgR negativo
- 11 tests para `tradeTagsRouter` — cubre casos de borde reales (bigint→number, same-name rename, empty inputs)
- 7 tests para tag validation — cada combinación de violación de esquema
- 1 test para archive audit log `from` field — regression guard específico para M-01

Ningún test es test de relleno. Cada test protege contra una regresión concreta.

### Cierre limpio de 8 ítems de deuda técnica

Además de los features, se cerraron 8 TD items en una sola sesión: TD-002 (CRITICAL), TD-017, TD-020, TD-029, TD-030, TD-031, TD-032, TD-033. Ningún TD nuevo fue creado durante la implementación.

---

## 2. Qué salió mal

### B-01 — IDOR no detectado en implementación

El bug de IDOR (`ai-embed/route.ts`) debería haberse detectado durante la implementación de TASK-058. La estructura del código tiene un problema de alcance de variable evidente: `user.id` capturado dentro de un `else` block y nunca referenciado fuera. Una revisión de flujo de datos (¿toda variable capturada en auth se usa en el acceso a DB?) habría encontrado esto.

**Causa raíz:** El foco durante TASK-058 estaba en añadir soporte de webhook al endpoint existente, no en auditar el flujo de datos del path existente. El implementador asumió que el código previo era correcto.

**Lección:** Cualquier modificación a un route handler de API debe incluir una revisión explícita del flujo de datos: `auth → userId → DB query`. Si el `userId` capturado no aparece en el `WHERE` clause, es una señal de alarma.

### M-01 — Bug de audit log pasado por alto en Sprint 6

El bug del campo `from` en `accounts.archive` (`account.update()` antes de leer `account.status`) existía desde la implementación original del router en Sprint 1. Pasó por 6 sprints de trabajo sin detección porque:
1. El router de accounts nunca tuvo un test para `archive` específicamente
2. La mutación `archive` es menos usada que `changeStatus` (que sí tenía el patrón correcto)
3. El bug no produce error visible — simplemente guarda `from: "INACTIVE"` en lugar del estado previo

**Causa raíz:** El patrón correcto estaba implementado en `changeStatus` (con `findUniqueOrThrow` antes de `update`), pero no se aplicó consistentemente al implementar `archive` — una variante posterior del mismo patrón.

**Lección:** Cuando se añaden múltiples variantes de la misma operación (changeStatus, archive), la revisión debe verificar que los patrones de correctness (pre-fetch antes de mutación) estén aplicados en **todas** las variantes, no solo en la primera.

### Deuda de tests pendiente demasiado tiempo (TD-023)

TD-023 (zero component or integration tests) lleva abierto desde Sprint 1 y sigue sin avance real. En Sprint 7 se programaron TASK-024 (RTL) y TASK-025 (Playwright) pero se aplazaron nuevamente. Sin tests de componente:
- M-02 (unguarded localStorage) solo se detectó porque el QA auditor leyó el código; no hubo test que fallara
- B-01 (IDOR) no podría haber sido detectado por ningún test unitario actual

La ausencia de tests de integración es el riesgo de calidad más grande del proyecto en este momento.

### Rate limiter sigue siendo in-memory en producción

Aunque la abstracción `UpstashRateLimiter` está implementada, el provisioning de Upstash Redis no se completó. En Vercel serverless, el limite real sigue siendo `5 × instancias_calientes`. La infraestructura de código está lista; el bloqueador es operacional (variables de entorno no configuradas).

### TASK-021, TASK-024, TASK-025 aplazados por tercera vez

La activación de `ANALYTICS_CACHE_ENABLED` (TASK-021) y los tests de componente/e2e (TASK-024, TASK-025) llevan múltiples sprints aplazados. Cada sprint los incluye como objetivos y cada sprint los empuja al siguiente por prioridad de features. Existe el riesgo de que estos ítems nunca salgan si no se asigna capacidad explícita.

---

## 3. Riesgos pendientes

| ID | Riesgo | Severidad | Estado | Acción en Sprint 8 |
|----|--------|-----------|--------|--------------------|
| R-001 | Rate limiter in-memory inefectivo en Vercel multi-instancia | Alta | Mitigado en código; pendiente provisioning | Provisionar Upstash Redis; configurar `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| R-002 | TD-023: Zero integration tests — bugs de IDOR y localStorage solo detectados por QA manual | Alta | Abierto desde Sprint 1 | Asignar capacidad dedicada en Sprint 8 para RTL + Playwright (TASK-024, TASK-025) |
| R-003 | TD-018: `trades.ts` tiene 924 líneas — toda la lógica de negocio incrustada en el router | Media | Ongoing — refactor incremental | Extraer al menos `createTrade()` y `closeTrade()` a `trade-service.ts` en Sprint 8 |
| R-004 | TD-019: tRPC context crea nuevo cliente Supabase por request — latencia innecesaria | Media | Abierto | JWT header auth en middleware eliminaría la round-trip de auth por request |
| R-005 | TD-012: `phasePayload as never` en accounts router | Baja | Abierto (XS) | Bundle con Sprint 8 cleanup |
| R-006 | Minor QA findings de Sprint 7 deferred: 4 Minor + 5 Nitpick sin resolver | Baja | Documentados en QA report | Revisar en Sprint 8 planning; decidir cuáles son aceptables permanentemente |
| R-007 | `UpstashRateLimiter` usa `require()` con `as any` — TypeScript no valida la interfaz de Upstash en compilación | Baja | Aceptable hasta que se instalen los paquetes | Instalar `@upstash/ratelimit @upstash/redis` cuando Redis se provisione; reemplazar `require()` por imports |
| R-008 | TASK-021 (`ANALYTICS_CACHE_ENABLED`) aplazado indefinidamente | Baja | TODO desde Sprint 2 | Evaluar si el cache es necesario en producción actual o si se puede eliminar del backlog |

---

## 4. Recomendaciones para Sprint 8

### Prioridad alta

**1. Tests de componente e integración (TASK-024, TASK-025) — deuda técnica crítica**  
El riesgo más grande del proyecto en este momento es la ausencia de tests que detecten bugs de comportamiento. El QA manual encontró B-01 y M-02 en Sprint 7 — ambos habrían sido detectados automáticamente con tests de integración. Propuesta concreta:
- 5 tests RTL mínimos: `RegisterTradeModal` (validación tags), `ReviewDetailPanel` (edit/delete), `DashboardPage` (localStorage fallback), `AccountsPage` (archive audit log), `PlaybookPage` (setup health dot)
- 1 test Playwright: happy path login → create trade → view dashboard

**2. Provisionar Upstash Redis (R-001)**  
El código está listo desde Sprint 7. El bloqueador es operacional. Pasos:
1. Crear cuenta en Upstash (plan gratuito es suficiente para desarrollo)
2. Crear database Redis
3. Añadir `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a las variables de entorno de Vercel
4. Instalar `@upstash/ratelimit @upstash/redis` y actualizar la importación en `rate-limiter.ts`

**3. Accessibility pass (TASK-070) — ya aplazado desde Sprint 7**  
TASK-070 fue stretch goal en Sprint 7 y no se completó. Sprint 8 debe tratarlo como P1 (no stretch) dado que las rutas críticas (dashboard, trades, review modal) aún no tienen `aria-label`, `role="table"`, o focus rings visibles.

### Prioridad media

**4. TASK-042 — Skeleton screens**  
Actualmente todas las pantallas muestran "Cargando…" como texto plano. Con 407+ tests y los features principales estabilizados, es buen momento para hacer esto. `animate-pulse` esqueletos en KPI strip, trade table, y account cards.

**5. TASK-043 — Empty states**  
`Cuentas`, `Trades`, `Playbook`, `Mercados` no tienen estado vacío. Nuevos usuarios ven pantallas en blanco sin instrucción. Añadir icon + headline + CTA en las 4 páginas.

**6. TASK-071 — Monthly review model**  
Aplazado desde Sprint 7 por tamaño. Ahora que TASK-031 (weekly review edit/delete) está completo y el modelo de reviews está maduro, Sprint 8 es el momento natural para añadir el monthly review.

**7. Extracción de lógica de negocio del router (TD-018, partial)**  
`trades.ts` tiene 924 líneas. Propuesta mínima: extraer `createTrade()` y `closeTrade()` como funciones en `src/domains/trading/services/trade-service.ts`. Esto reduce el router a orquestación y hace las reglas de negocio testables en aislamiento.

### Prioridad baja

**8. TASK-021 — `ANALYTICS_CACHE_ENABLED`**  
Llevar este ítem al Sprint 8 planning y decidir explícitamente: activar en producción o eliminar del backlog. La indecisión tiene un coste de mantenimiento.

**9. Revisión de Minor/Nitpick findings de Sprint 7**  
4 Minor findings quedaron deferred. Revisarlos al inicio de Sprint 8 planning:
- Decidir cuáles son aceptables permanentemente (no todo minor es accionable)
- Los accionables, añadirlos como TD items o incluirlos en Sprint 8 cleanup

### Proceso

**10. Automatizar la revisión de flujo de datos en PRs de API routes**  
El bug B-01 (IDOR) refleja un patrón de error recurrente: variable de auth capturada pero no propagada al acceso de datos. Añadir al `QUALITY_GATES.md` un checklist específico para route handlers:
```
Para cada POST/GET handler que requiera auth:
[ ] El userId capturado en la auth branch aparece en el WHERE de TODAS las queries y mutations
[ ] El UPDATE/DELETE tiene userId en la condición, no solo el ID del recurso
```

**11. Prevenir el aplazamiento de TASK-024 por cuarta vez**  
Si Sprint 8 empieza y TASK-024/TASK-025 no están en la primera mitad del sprint, son los primeros candidatos a aplazarse nuevamente. Propuesta: incluirlos en el sprint con dependencia explícita de tiempo (no empezar ningún nuevo feature hasta que al menos 3 RTL tests estén escritos).

---

## Métricas del Sprint

| Métrica | Sprint 6 | Sprint 7 | Δ |
|---------|----------|----------|---|
| Tests pasando | 407 | 438 | +31 |
| Errores TypeScript | 0 | 0 | — |
| `as never` en app code | 0 | 0 | — |
| Items TD abiertos | 10 | 4 | −6 |
| Items P1 abiertos | 2 | 0 | −2 |
| Items P2 abiertos | 5 | 3 | −2 |
| Hallazgos QA Blocking | 0 | 2 | +2 (todos fijados) |
| Hallazgos QA Major | 0 | 4 | +4 (todos fijados) |
| Hallazgos QA deferred | 10 | 9 | −1 |
| Deps actualizadas | — | 6 | next, react, react-dom, @supabase/supabase-js, @tanstack/react-query, eslint-config-next |

---

**Prepared:** 2026-06-03  
**Next Sprint:** Sprint 8 — Accessibility (TASK-070), Monthly Reviews (TASK-071), RTL/e2e tests (TASK-024/025), Upstash Redis provisioning, skeleton screens (TASK-042)
