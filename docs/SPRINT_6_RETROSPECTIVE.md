# Sprint 6 Retrospective

**Sprint Duration:** 2026-06-03 (accelerated single-session)  
**Branch:** `claude/epic-darwin-1XZTX`  
**Baseline tests:** 389 | **Post-implementation:** 404 | **Post-QA fixes:** 407  
**Tasks delivered:** TASK-045, TASK-048, TASK-049, TASK-012 (consolidated), TASK-013, TASK-014 + P0.1, P3.1, P3.3  
**QA audit result:** 0 Blocking · 6 Major (all fixed) · 6 Minor (deferred) · 4 Nitpick (deferred)

---

## 1. Qué salió bien

### Entrega de features
Sprint 6 cerró **3 feature tasks + 4 tech-debt items** en una sola sesión:
- Sistema de tema de tres modos (light / dark / system) con sincronización live con el SO (TASK-045).
- Filtros y búsqueda de texto en la lista de reviews (TASK-048): outcome, status, disciplina mínima, "X de Y".
- Sparklines SVG reales en el Playbook con curva de equity, degradado de color y fallback a línea discontinua cuando no hay datos (TASK-049 / TASK-012).
- Widget de metas: anillo dorado, banner de celebración y "+N extra" cuando se supera la meta (P1.3).
- Eliminación completa de los 4 `as never` restantes en `trades/page.tsx` (TD-013 cerrado).
- `LearningResource` derivada de `RouterOutputs` con narrowing de enums (TD-014 cerrado).

### Seguridad y calidad
- **`rotateEncryptionKey`** implementada con DI pura (sin Prisma directo), completamente testable.
- **Rate limiter** con Map en memoria, 5 req/60 s por usuario, `Retry-After` en headers.
- **`QUALITY_GATES.md`** creado: 4 puertas obligatorias (Zod/TS alignment, Browser QA, Integration test, Security review).

### Proceso de QA
La auditoría independiente encontró **6 hallazgos Major** — ninguno era un show-stopper de producción en instancia única, pero todos representaban defectos reales de correctness o seguridad. Todos fueron corregidos en el mismo día.

La separación entre implementación y QA (agente independiente) funcionó bien: el auditor cuestionó correctamente el bug de ícono del Sidebar (M-002) y el memory leak del listener (M-001) que el implementador no había validado explícitamente.

### Cobertura de tests
- 9 tests nuevos para `key-encryption.ts` (encrypt/decrypt, IV aleatorio, tamper detection, secretOverride, maskApiKey, rotateEncryptionKey).
- 6 tests para el rate limiter (algoritmo aislado, correctamente testeado).
- 3 tests adicionales tras QA para validación hex y guard de secretos idénticos.

---

## 2. Qué salió mal

### M-001 — Cleanup del media listener de OS
El `useEffect` que registra el listener de `prefers-color-scheme` **no tenía `return` cleanup**. El listener solo se removía al inicio de la siguiente ejecución del efecto, nunca en unmount. El error no se detectó durante la implementación porque `ThemeProvider` raramente desmonta en producción, lo que lo convirtió en un bug latente.

**Causa raíz:** Falta de un browser QA check específico para memory leaks al toggle de tema. La `QUALITY_GATES.md` ahora incluye esto en Gate 2.

### M-002 — Ícono incorrecto en modo "system"
El Sidebar usaba `theme === "dark"` (el modo setting: light/dark/system) para decidir el ícono sol/luna, en lugar de `resolvedTheme === "dark"` (el tema aplicado real). Con `theme === "system"` y OS en modo claro, mostraba el ícono de luna (incorrecto).

**Causa raíz:** Confusión conceptual entre `ThemeMode` (la preferencia del usuario) y `ResolvedTheme` (el tema aplicado). La variable `theme` se propagó por refactoring sin revisar todos los usos.

### M-003 — Mutation de DB sin debounce
`setTheme` llamaba `updatePrefs.mutate({ theme: t })` síncronamente en cada toggle. Clicks rápidos disparan 3+ mutations concurrentes al DB.

**Causa raíz:** Omisión de una práctica estándar (debounce en persistencia de preferencias de UI). Se añadió timer de 500 ms.

### M-004 — Rate limiter inefectivo en Vercel multi-instancia
La `Map` en memoria se resetea en cada cold start. En Vercel serverless, cada instancia caliente tiene su propio Map, lo que significa que el límite real es `5 × número_de_instancias_calientes`.

**Causa raíz:** Decisión de diseño consciente (Map en memoria es suficiente para un único servidor), pero el contexto de deployment (Vercel serverless) hace que esta suposición sea inválida. La limitación estaba documentada en el completion report pero no se abordó en el sprint.

**Estado:** TODO comment añadido; la solución completa (Upstash Redis) está deferred a Sprint 7.

### M-005 / M-006 — Validación insuficiente de claves de cifrado
`getEncryptionKey` validaba solo longitud (64 chars) pero no validez hex. Un string de 64 `z` pasaría la validación, y `Buffer.from(str, "hex")` produciría un buffer de 0 bytes, lanzando `ERR_CRYPTO_INVALID_KEYLEN` sin indicar que la env var está mal configurada.

Adicionalmente, `rotateEncryptionKey` no guardaba contra `oldSecret === newSecret`, lo que resultaría en una re-encriptación silenciosa con la misma clave (no-op engañoso).

**Causa raíz:** "Confío en el operador que ponga un hex correcto" — suposición razonable pero incorrecta dado que el error de cripto resultante es difícil de diagnosticar.

### Backlog planificado vs. realidad
El Sprint 6 original planeaba TASK-046 (accent color), TASK-050 (goal widget), TASK-051 (custom tags), TASK-052 (onboarding) — pero **todas estas tareas ya estaban completas de Sprint 5**. El backlog no se había actualizado correctamente al cierre de Sprint 5, lo que generó confusión en la planificación de Sprint 6.

**Causa raíz:** El proceso de cierre de sprint no incluía una revisión explícita del backlog antes de planificar el siguiente sprint.

---

## 3. Riesgos pendientes

| ID | Riesgo | Severidad | Estado | Acción en Sprint 7 |
|----|--------|-----------|--------|--------------------|
| R-001 | Rate limiter inefectivo en Vercel multi-instancia (M-004) | Alta | Mitigado parcialmente (eviction + TODO) | Implementar Upstash Redis |
| R-002 | `rotateEncryptionKey` sin semántica transaccional — fallo a mitad deja DB en estado mixto (m-005) | Media | Documentado en Fix Report | Añadir advertencia en runbook de rotación |
| R-003 | Mutations de accounts (`create/update/changeStatus`) retornan `Decimal` sin serializar sobre el wire (m-003) | Media | Abierto como TD-031 | Aplicar `serializeAccount` a todas las mutations |
| R-004 | `prefs.theme` de DB se castea sin validar que esté en `CYCLE` (m-001) | Baja | Abierto como TD-029 | Fix de una línea en Sprint 7 |
| R-005 | Rate limiter test duplica el algoritmo en lugar de importarlo (n-004) | Baja | Abierto como TD-033 | Refactor al extraer `lib/rate-limiter.ts` |
| R-006 | `NEUTRAL` en filtro de reviews solo hace match en `netPnl === 0` exacto (m-004) | Baja | Abierto | Aclarar semántica o renombrar a "Breakeven" |
| R-007 | `accounts.test.ts` mock usa JS number en lugar de `Prisma.Decimal` (m-006) | Baja | Abierto como TD-032 | Usar `new Prisma.Decimal(...)` en mock |

---

## 4. Recomendaciones para Sprint 7

### Prioridad alta

**1. Redis-backed rate limiter (resolución completa de M-004)**  
Provisionar Upstash Redis. Extraer `checkRateLimit` a `src/lib/rate-limiter.ts` con interfaz intercambiable. Reemplazar implementación en-memoria con Upstash sliding-window. Esto también resuelve TD-033 (tests importarían la función real).

**2. TASK-031 — Edit y Delete en ReviewDetailPanel**  
Es P1, lleva 3 sprints deferred. El componente ya existe (`NuevaReviewModal`); la tarea es añadirle modo edición y conectarlo. Esfuerzo M.

**3. TD-002 / TASK-011 — Centralizar `computeDisciplineScore`**  
Sigue siendo CRITICAL (3 implementaciones distintas). El modal de crear review muestra un score distinto al que guarda el servidor. Impacta directamente en la confianza del usuario en la métrica de disciplina.

### Prioridad media

**4. TD-031 — Aplicar `serializeAccount` a todas las mutations de accounts**  
`create`, `update`, `changeStatus`, `changePhase`, `archive` retornan `initialBalance` como string sobre el wire (Decimal sin serializar). Añadir `return serializeAccount(account)` en los 5 endpoints. Esfuerzo XS.

**5. TASK-051 — Custom tags UI**  
Renombrar, eliminar, color-coded tags, merge de duplicados. P2, esfuerzo M.

**6. Review URL persistence**  
Los filtros de reviews (TASK-048) se resetean al navegar. Implementar URL params para preservar estado entre navegaciones.

### Prioridad baja (puede agruparse en un "sprint de limpieza")

**7. TD-029** — Guard `CYCLE.includes` en carga de `prefs.theme` desde DB (1 línea).  
**8. TD-030** — Cambiar `>` a `>=` en condición de ventana del rate limiter (1 línea).  
**9. TD-032** — Usar `new Prisma.Decimal(...)` en mock de `accounts.test.ts`.  
**10. n-002** — Cambiar default de `resolvedTheme` en contexto de `"dark"` a `"light"`.  
**11. n-003** — Simplificar cast en `mock-data/index.ts` de `(<any>[...])` a `[...] as unknown as LearningResource[]`.

### Proceso

**12. Revisión del backlog al cerrar cada sprint**  
Antes de planificar el siguiente sprint, verificar que todas las tareas completadas estén marcadas DONE en `backlog.md`. El error de Sprint 6 (planificar tareas ya completadas en Sprint 5) es evitable con 5 minutos de revisión.

**13. Incluir prueba de deployment en QA checklist**  
M-004 fue detectado en QA pero no bloquea en dev de instancia única. Añadir a Gate 2 del `QUALITY_GATES.md` un ítem de verificación de comportamiento en entorno serverless.

---

## Métricas del Sprint

| Métrica | Sprint 5 | Sprint 6 | Δ |
|---------|----------|----------|---|
| Tests pasando | 389 | 407 | +18 |
| Errores TypeScript | 0 | 0 | — |
| `as never` en app code | 4 | 0 | −4 |
| Items TD abiertos | 8 | 10 | +2 (nuevos de QA) |
| Hallazgos QA Blocking | 4 | 0 | −4 |
| Hallazgos QA Major | 6 | 0 | −6 |
| Hallazgos QA deferred | 11 | 10 | −1 |

---

**Prepared:** 2026-06-03  
**Next Sprint:** Sprint 7 — Redis rate limiter, TASK-031 (review edit/delete), TD-002 (discipline score), TD-031 (mutation serialization)
