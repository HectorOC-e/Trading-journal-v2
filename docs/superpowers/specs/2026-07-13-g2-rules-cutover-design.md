# G2 — Cutover de enforcement a `rules` y retiro de `automations`

- **Fecha:** 2026-07-13
- **Cierra:** gate **G2** (C6/FREEZE-D8), `S1/OI-1`, `S1/OI-2`, `S1/OI-3`; de rebote `OI-5.1` (reglas del loop visibles en `/reglas`) y `S1/DT-5` (badge lee `rule.mode`).
- **Enfoque elegido:** A — flip por env var primero (ops, rollback instantáneo), retiro de `automations` después (rama de código).

## 1. Contexto y estado real verificado (2026-07-13)

La deuda estaba sobre-estimada en STATUS.md. Verificado contra código:

- `runRuleEngine()` (`src/domains/rules/engine.ts:119`) ya es el entrypoint de los 3 call
  sites de `trades.ts` (pre-create + 2 post-triggers) y rutea por `RULES_SOURCE === "rules"`
  (default: `automations`).
- `runRules()` ya existe con semántica idéntica a `runAutomations()` y test de no-regresión
  (`run-rules.test.ts`, "G2 cutover invariant").
- Dual-write ya cableado en TODAS las mutaciones del router `automations`
  (create/update/duplicate/toggle/delete/reorder → `rule-sync.ts`).
- Consumidores de `prisma.automation` en todo src/: `engine.ts`, `routers/automations.ts`,
  `migration-report.ts`. Nada más.
- `rulesRouter` ya existe (`routers/rules.ts`) pero solo con CRUD descriptivo
  (name/severity/enabled; sin trigger/conditions/actions).

## 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13)

Corrido contra prod (`jpojusluihjjsjvcubdp`) vía SQL equivalente a `buildNoMappingReport`:

| Métrica | Valor |
|---|---|
| Automatizaciones (2 usuarios) | 10 |
| Filas en `rules` | 27 (10 espejos + 17 sin origen automatización) |
| **Paridad espejo** | **perfecta: 0 faltantes, 0 drift** (name/enabled/priority/trigger/conditions/actions) |
| Automatizaciones ambiguas (enabled sin acciones) | 0 |
| "Falsa protección" reportada | 13 |

Triaje de las 13 (aprobado por el usuario):

- **1 falso positivo del informe:** "Enfriamiento tras una pérdida" — regla del loop,
  `mode=enforce`, trigger `TRADE_PRE_CREATE`, acción BLOCK (`minsSinceLastLoss < 15`).
  El informe solo cruza contra `automations` por nombre (es anterior a las reglas del loop).
  Es la regla que EMPIEZA a bloquear con el flip — comportamiento deseado. El contexto
  pre-trade sí calcula `minsSinceLastLoss` (`src/domains/rules/context.ts:56`).
- **12 = 6 descriptivas × 2 usuarios** (sin duplicados por usuario), todas warn sin
  trigger/acciones. 3 ya tienen protección real por otra vía (`risk-enforcement.ts`:
  maxTradesPerDay, pérdida diaria, símbolos permitidos); 3 no son enforceables hoy
  (noticias, fuera de sesión, promediar). Siguen como warn: el flip no les quita nada
  porque nunca enforzaron.

**Conclusión del gate: sin bloqueadores.**

> **✅ FASE 1 EJECUTADA Y VERIFICADA (2026-07-13).** `RULES_SOURCE=rules` seteado en Vercel y
> redeployado por el usuario. Smoke vs prod (Playwright + SQL): trade tras pérdida fresca del
> usuario demo → toast `RULE_BLOCKED`, trade no creado. Prueba de fuente: `rules."Enfriamiento
> tras una pérdida"` (regla del loop, existe SOLO en `rules`) disparó (`last_fired_at`
> 2026-07-13 19:45) junto a `rules."Bloquear revenge trade"`; la automatización homónima quedó
> quieta (19-jun). Fixture de pérdida borrado tras el smoke. Nota: la contraseña del usuario QA
> fue restaurada a la documentada y el secret `E2E_USER_PASSWORD` re-sincronizado vía `gh`.

## 3. Fase 1 — Flip (ops, sin código)

1. Usuario setea `RULES_SOURCE=rules` en Vercel (Production) y redeploya.
2. Smoke en prod con el usuario demo: crear automatización con BLOCK vía UI (la UI
   transitoria sigue editando `automations`; el dual-write la espeja), intentar trade que
   la viole → bloqueado.
3. **Prueba observable de que la fuente flipeó:** `rules.last_fired_at` se actualiza y
   `automations.last_fired_at` queda quieto.
4. Efecto esperado: el cooldown anti-revenge del loop pasa a bloquear para su dueño.
5. **Rollback fase 1:** quitar la env var (sin deploy).

## 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`)

Ningún cambio de capacidad para el usuario: mismo `/reglas`, mismo builder, mismas
plantillas. Cambia el almacenamiento (tabla `rules`) y el router que sirve la página.

### Engine
- Queda solo `runRules`. Se eliminan `runAutomations`, `runRuleEngine` y
  `rulesSourceIsUnified`. Los call sites de `trades.ts` llaman `runRules` directo.

### Router `rules` (ampliar a paridad con `automations`)
- `list`: exponer campos ejecutables (trigger/conditions/actions/priority/category/
  lastFiredAt/sourceAutomationId), resolviendo el workaround TS2589 anotado en el archivo
  (select escalar + tipo de salida explícito/cast).
- `create`/`update`: aceptar campos ejecutables; `mode` derivado con `classifyMode(actions)`;
  `severity` derivada del mode (como hace `rule-sync` hoy) salvo override explícito.
- Añadir: `duplicate`, `reorder`, `templates` (fusiona `TEMPLATES` + `PROTECTION_TEMPLATES`),
  `createFromTemplate` → crea en `rules`.
- `seedDefaults` se mantiene (descriptivas de bienvenida).

### UI `/reglas`
- `trpc.automations.*` → `trpc.rules.*` en `page.tsx` y componentes.
- Badge de modo lee `rule.mode` directo (cierra S1/DT-5).
- Las reglas del loop aparecen en la lista con su badge de origen ya existente
  (cierra OI-5.1).

### Se elimina
- `rule-sync.ts` y sus llamadas (el dual-write muere con la doble fuente).
- `routers/automations.ts` + registro en `root.ts`.
- `migration-report.ts` + ruta `/api/cron/rules-migration-report` (propósito cumplido:
  gate OI-1 cerrado; git conserva la historia).
- De `unification.ts`: se conserva `classifyMode` (en uso); se poda el código del informe
  y conversores que queden muertos, con sus tests.

### Se conserva (archivo, P9)
- Tabla `automations` y modelo Prisma intactos, sin lecturas ni escrituras. Sin migración
  destructiva. Un drop posterior sería un sprint trivial cuando haya confianza prolongada.
- `source_automation_id` en las rules espejo, como trazabilidad.

## 5. Testing y verificación

- **TDD:** tests del router `rules` ampliado (CRUD ejecutable, templates, derivación de
  mode/severity, duplicate/reorder), tests de engine actualizados (la no-regresión pasa a
  ser la semántica de `runRules` sola: BLOCK, addTags/removeTags, prioridad, lastFiredAt,
  descriptivas excluidas por el filtro de trigger).
- **Pre-push:** `npx tsc --noEmit` + `npx vitest run` (suite completa) + `npx eslint` desde
  `src/` — 0 errores (el error ambiental de `puppeteer-core` local es conocido y ajeno).
- **Post-merge en prod:** `/reglas` lista y edita (incluida la regla del loop), crear regla
  BLOCK desde plantilla → trade violador bloqueado, `rules.last_fired_at` bumps.
- Migración: no hay (fase 2 no toca esquema).

## 6. Rollback y riesgos

- **Fase 1:** quitar `RULES_SOURCE` en Vercel. Instantáneo.
- **Fase 2:** revert del merge; `automations` quedó intacta, revertir restaura el mundo
  anterior. **Ventana unidireccional documentada:** reglas creadas/editadas durante el
  periodo rules-only no existen en `automations`; tras un revert habría que recrearlas
  (aceptado — volumen actual: 10 automatizaciones, 2 usuarios).
- Riesgo residual: divergencia semántica sutil entre `runRules` y el comportamiento
  histórico — mitigado por el test de invariante existente y el smoke observable de
  fase 1 antes de tocar código.
