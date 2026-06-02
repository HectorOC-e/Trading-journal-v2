# EXECUTION_TASKS — Trading Journal v2
> 32 tareas ejecutables. Máximo 4h por tarea. Last Updated: 2026-05-31

## Índice por Prioridad
- [P0 — Crítico](#p0--crítico) · 10 tareas · ~28h
- [P1 — Alto impacto](#p1--alto-impacto) · 11 tareas · ~36h
- [P2 — Mejoras](#p2--mejoras) · 8 tareas · ~24h
- [P3 — Futuro](#p3--futuro) · 4 tareas · ~14h

## Mapa de dependencias
```
TASK-001 ──► TASK-002 ──► (ninguna más)
         └──► TASK-003
         └──► TASK-004
TASK-005 ──── independiente
TASK-006 ──► TASK-007 ──► TASK-008
TASK-009 ──── independiente
TASK-010 ──► (requiere TASK-002)

TASK-011 ──► TASK-012 ──► TASK-013 ──► TASK-014 ──► TASK-015
TASK-016 ──► TASK-017 ──► TASK-018
         └──► TASK-019
TASK-019 ──► TASK-028
TASK-020 ──► TASK-021
```

---

# P0 — Crítico

---

## TASK-001 — Crear módulo canónico `lib/formulas/`

**Prioridad:** P0
**Módulo:** formulas
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Crear `src/lib/formulas/` como directorio canónico de todas las fórmulas financieras, migrando el contenido existente de `src/lib/formulas.ts` y añadiendo las funciones faltantes: `calcWinRate`, `calcDisciplineScore`, `calcMaxDrawdown`.

### Contexto
`src/lib/formulas.ts` existe con `calcExpectancyR`, `calcSharpeRatio`, `calcProfitFactor`, `getISOWeekKey`. Sin embargo, Win Rate tiene 4+ implementaciones inline divergentes, Discipline Score tiene 3, y Max Drawdown está mal etiquetado en la UI. Este task crea la estructura canónica; TASK-002, 003, 004 reemplazan los usos inline.

### Archivos afectados
- `src/lib/formulas/performance.ts` — CREAR: `calcWinRate`, `calcAvgR`, `calcNetPnl`
- `src/lib/formulas/drawdown.ts` — CREAR: `calcMaxDrawdown`
- `src/lib/formulas/discipline.ts` — CREAR: `calcDisciplineScore`
- `src/lib/formulas/utils.ts` — CREAR: mover `getISOWeekKey` desde `formulas.ts`
- `src/lib/formulas/index.ts` — CREAR: re-exporta todo
- `src/lib/formulas.ts` — MODIFICAR: convertir en `export * from "./formulas/index"`

### Implementación
1. Crear `src/lib/formulas/performance.ts`:
```typescript
/** Canonical: a trade is a "win" when pnl > 0. */
export function calcWinRate(trades: { pnl: number | null }[]): number {
  if (trades.length === 0) return 0
  const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
  return parseFloat((wins / trades.length * 100).toFixed(2))
}
export function calcAvgR(trades: { rMultiple: number | null }[]): number {
  if (trades.length === 0) return 0
  return trades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / trades.length
}
export function calcNetPnl(trades: { pnl: number | null }[]): number {
  return parseFloat(trades.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2))
}
```
2. Crear `src/lib/formulas/drawdown.ts`:
```typescript
/** Peak-to-trough on cumulative P&L series. Returns 0 when no drawdown. */
export function calcMaxDrawdown(pnlSeries: number[]): number {
  let peak = 0, maxDD = 0, running = 0
  for (const pnl of pnlSeries) {
    running += pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }
  return maxDD
}
```
3. Crear `src/lib/formulas/discipline.ts`:
```typescript
import { VIOLATION_TAGS } from "@/types"
export function calcDisciplineScore(
  trades: { tags: string[] }[],
  reviewsDone: number,
  pendingReviews: number,
): number {
  const total = trades.length
  if (total === 0 && pendingReviews === 0) return 100
  const violating = trades.filter(t =>
    t.tags.some(tag => VIOLATION_TAGS.includes(tag as never))
  ).length
  const execution = total > 0 ? (total - violating) / total : 1
  const learning  = pendingReviews > 0 ? Math.min(1, reviewsDone / pendingReviews) : 1
  const adherence = violating === 0 ? 1 : Math.max(0, 1 - violating / Math.max(total, 1))
  return Math.round(execution * 50 + learning * 30 + adherence * 20)
}
```
4. Crear `src/lib/formulas/utils.ts` moviendo `getISOWeekKey` desde `formulas.ts`
5. Crear `src/lib/formulas/index.ts`:
```typescript
export * from "./performance"
export * from "./drawdown"
export * from "./discipline"
export * from "./utils"
export { calcExpectancyR, calcSharpeRatio, calcProfitFactor } from "../formulas"
```
6. Reemplazar contenido de `src/lib/formulas.ts` con: `export * from "./formulas/index"`

### Criterios de aceptación
- [ ] `import { calcWinRate, calcMaxDrawdown, calcDisciplineScore } from "@/lib/formulas"` compila sin errores
- [ ] `calcWinRate([{pnl: 100}, {pnl: -50}])` retorna `50`
- [ ] `calcMaxDrawdown([100, -200, 50])` retorna `200` (peak=100, trough=-100, dd=200)
- [ ] `calcDisciplineScore([], 0, 0)` retorna `100`
- [ ] Imports existentes de `@/lib/formulas` siguen funcionando sin cambios

### Riesgos
- **Conflicto `formulas.ts` vs `formulas/`:** TypeScript puede confundirse con el archivo y el directorio del mismo nombre. Verificar que el resolver de módulos prefiere el directorio. Si hay conflicto, renombrar `formulas.ts` a `formulas-legacy.ts` temporalmente.
- **VIOLATION_TAGS import en cliente:** Si `@/types` no es importable desde contexto de cliente, usar `as string[]` cast en el filter.

---

## TASK-002 — Unificar Win Rate: reemplazar todos los usos inline

**Prioridad:** P0
**Módulo:** formulas
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Reemplazar las 4 implementaciones inline de Win Rate con `calcWinRate` de `lib/formulas`. Corregir el bug en `src/app/trades/page.tsx:125` que usa `rMultiple > 0` en lugar de `pnl > 0`, causando que el mismo usuario vea Win Rates diferentes en distintas partes de la app.

### Contexto
4 sitios calculan Win Rate de forma distinta:
- `src/app/trades/page.tsx:125` — usa `(t.rMultiple ?? 0) > 0` ← **INCORRECTO**, diverge del resto
- `src/domains/analytics/services/dashboard-analytics.ts:97` — usa `pnl > 0`
- `src/domains/analytics/services/setup-analytics.ts:67,129,149` — usa `pnl > 0`
- `src/domains/analytics/ai-context.ts:170` — usa `pnl > 0`

### Archivos afectados
- `src/app/trades/page.tsx` — líneas 125-126: cambiar a `calcWinRate`
- `src/domains/analytics/services/dashboard-analytics.ts` — líneas 97, 175
- `src/domains/analytics/services/setup-analytics.ts` — líneas 67, 129, 149
- `src/domains/analytics/ai-context.ts` — línea 170

### Implementación
1. En `src/app/trades/page.tsx`, reemplazar líneas 124-126:
```typescript
// ANTES:
const wins = trades.filter(t => (t.rMultiple ?? 0) > 0).length
const wr   = trades.length ? Math.round((wins / trades.length) * 100) : 0

// DESPUÉS:
import { calcWinRate } from "@/lib/formulas"
const wr   = Math.round(calcWinRate(trades))
const wins = trades.filter(t => (t.pnl ?? 0) > 0).length  // solo para el sub-label
```
2. En `dashboard-analytics.ts:97`, reemplazar el bloque `wins`/`winRate` inline con `calcWinRate(trades)`
3. En `setup-analytics.ts`, reemplazar los tres cálculos inline con `calcWinRate`
4. En `ai-context.ts:170`, reemplazar con `calcWinRate(trades)`
5. Ejecutar `pnpm typecheck` desde `src/`

### Criterios de aceptación
- [ ] `grep -rn "filter.*pnl.*> 0.*length / " src/` devuelve 0 resultados
- [ ] `grep -n "rMultiple.*> 0" src/app/trades/page.tsx` devuelve 0 resultados
- [ ] Win Rate en `trades/page` coincide con el de `dashboard` para el mismo conjunto de trades
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Cambio de valor observable:** El Win Rate en la página de trades cambiará para usuarios que tengan trades con `pnl > 0` pero `rMultiple <= 0`. Es una corrección intencional — documentar en el commit.

---

## TASK-003 — Centralizar Discipline Score

**Prioridad:** P0
**Módulo:** formulas
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Eliminar las 3 implementaciones divergentes de Discipline Score y reemplazarlas con `calcDisciplineScore` de `lib/formulas`. La implementación del modal usa una fórmula completamente distinta a la del router tRPC.

### Contexto
3 implementaciones con fórmulas **diferentes**:
- `src/app/reviews/modals/create-review-modal.tsx:103` — usa `(A+ or Plan tags) / total`. Ignora recursos de aprendizaje. Produce resultados distintos al servidor.
- `src/server/trpc/routers/weekly-reviews.ts` (proc. `computedDisciplineScore`, ~línea 128) — usa `execution×50 + learning×30 + adherence×20`
- `src/server/trpc/routers/weekly-reviews.ts` (proc. `prefill`, ~línea 198) — misma fórmula que `computedDisciplineScore`, duplicada inline

### Archivos afectados
- `src/server/trpc/routers/weekly-reviews.ts` — procs `computedDisciplineScore` y `prefill`
- `src/app/reviews/modals/create-review-modal.tsx` — función `generateWeekReview` (~línea 88)

### Implementación
1. En `weekly-reviews.ts`, importar `calcDisciplineScore` de `@/lib/formulas`
2. En `computedDisciplineScore` (líneas ~128-147), reemplazar el cálculo inline:
```typescript
return {
  score: calcDisciplineScore(trades, reviews.length, pendingReviews),
  breakdown: {
    execution: /* conservar si existe */,
    learning:  /* conservar si existe */,
    adherence: /* conservar si existe */,
  },
  detail: { tradeCount: trades.length, violatingTrades: violating.length, reviewsDone: reviews.length, pendingReviews },
}
```
3. En `prefill` (líneas ~173-199), reemplazar el IIFE de cálculo inline con `calcDisciplineScore(violations, reviews.length, pending)`
4. En `create-review-modal.tsx`, en `generateWeekReview` (~línea 100-105): eliminar el cálculo de `disciplinedCount` y `disciplineScore`. El score debe venir **exclusivamente** del `prefillData.disciplineScore` (ya se usa en línea ~269). Eliminar las líneas 100-105 de esa función.

### Criterios de aceptación
- [ ] `grep -n "disciplinedCount\|offPlanCount" src/app/reviews/modals/create-review-modal.tsx` devuelve 0 resultados
- [ ] El Discipline Score pre-llenado en el modal coincide con el de `computedDisciplineScore` para la misma semana
- [ ] Score con 0 trades y 0 pending reviews retorna 100 (no NaN)
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Efecto colateral en `generateWeekReview`:** Esa función también calcula `winRate` y `netPnl`. Al eliminar solo el discipline score, asegurarse de no romper el resto de la función.

---

## TASK-004 — Corregir KPI "Drawdown" mislabeled

**Prioridad:** P0
**Módulo:** analytics
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
El KPI "Drawdown" en `src/app/trades/page.tsx:165` muestra el peor día P&L (`minDay`), no un drawdown real. Reemplazar con `calcMaxDrawdown` (peak-to-trough sobre P&L acumulado) y actualizar el label.

### Contexto
`src/app/trades/page.tsx:131-167`: el código calcula `minDay = Math.min(0, ...dailyPnl.values())` (peor día único), lo etiqueta como "Drawdown" y sub-label "peor día". El sub-label es honesto pero el label KPI es incorrecto. La fórmula correcta de max drawdown existe en `calcMaxDrawdown` (TASK-001).

### Archivos afectados
- `src/app/trades/page.tsx` — líneas 131-170: reemplazar cálculo y actualizar objeto KPI

### Implementación
1. Importar `calcMaxDrawdown` de `@/lib/formulas`
2. Reemplazar bloque `dailyPnl`/`minDay` (líneas 131-136) con:
```typescript
const sortedPnls = [...trades]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(t => t.pnl ?? 0)
const maxDrawdown = calcMaxDrawdown(sortedPnls)
```
3. Actualizar el objeto KPI (líneas ~165-171):
```typescript
{
  label: "Max Drawdown",
  value: maxDrawdown > 0
    ? `-$${maxDrawdown.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "$0",
  sub: "desde pico",
  trend: "neutral" as const,
  mono: true,
  icon: <Shield size={15} />,
}
```

### Criterios de aceptación
- [ ] El KPI muestra label "Max Drawdown" y sub "desde pico"
- [ ] Para trades `[+100, -200, +50]` el valor es `-$100` (peak 100, mínimo acumulado 0-100=-100, dd=100)
- [ ] Sin trades en pérdida el valor es "$0"
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Trades no ordenados:** Si `trades` del estado no está ordenado por fecha, el drawdown es incorrecto. El `.sort()` inline lo resuelve.

---

## TASK-005 — Fix: SQL injection en `ai-embed` route

**Prioridad:** P0
**Módulo:** ai
**Esfuerzo:** S (1-2h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Corregir el patrón de `$executeRaw` en `src/app/api/ai-embed/route.ts:44-49` que usa interpolación de string para el vector, eludiendo la parametrización de Prisma. Reemplazar con `Prisma.sql` para parametrización correcta.

### Contexto
El código actual en `route.ts:44-49`:
```typescript
await prisma.$executeRaw`
  UPDATE trades
  SET notes_embedding = ${`[${vector.join(",")}]`}::vector
  WHERE id = ${tradeId}::uuid AND user_id = ${user.id}::uuid
`
```
El valor `${`[${vector.join(",")}]`}` construye un string que Prisma interpola **literalmente** en el SQL. El cast `::vector` está dentro del argumento interpolado, no en el SQL estático. Esto es patrón inseguro y puede fallar con valores inesperados.

### Archivos afectados
- `src/app/api/ai-embed/route.ts` — líneas 44-49

### Implementación
1. Añadir import: `import { Prisma } from "@/lib/generated/prisma/client"`
2. Reemplazar el bloque con:
```typescript
const vectorStr = `[${vector.join(",")}]`
await prisma.$executeRaw(
  Prisma.sql`
    UPDATE trades
    SET notes_embedding = ${vectorStr}::vector
    WHERE id = ${tradeId}::uuid
      AND user_id = ${user.id}::uuid
  `
)
```
Nota: `Prisma.sql` tagged template + `$executeRaw(sql)` como función (no tagged template) parametriza todos los valores correctamente. El `::vector` cast es parte del SQL estático, no del valor.

### Criterios de aceptación
- [ ] No hay template literal directamente en `prisma.$executeRaw\`...\`` que interpole el vector como string
- [ ] La ruta retorna `{ ok: true }` con un vector válido de 1536 floats
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **`$executeRaw(Prisma.sql)` vs `$executeRaw\`\``:** Son APIs distintas. La primera acepta un objeto `Sql`, la segunda es tagged template. No mezclar. Verificar que `Prisma.sql` está disponible en la versión de Prisma del proyecto.

---

## TASK-006 — Crear tRPC router `users` con `getProfile` y `updateProfile`

**Prioridad:** P0
**Módulo:** perfil
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Crear `src/server/trpc/routers/users.ts` con procedimientos `getProfile` (query) y `updateProfile` (mutation) que lean y escriban los campos del modelo `User` en DB. Es el prerequisito de 7 features downstream.

### Contexto
El archivo `src/server/trpc/routers/users.ts` **no existe**. Los routers existentes son: `account-logs`, `accounts`, `learning-resources`, `markets`, `rules`, `setups`, `trades`, `trading-sessions`, `weekly-reviews`, `withdrawals`. El modelo `User` en `schema.prisma` tiene: `name`, `timezone`, `baseCurrency`, `language`, `weeklyGoalMinutes`, `emailNotifications` — todos en la DB pero nunca leídos ni escritos desde la UI.

### Archivos afectados
- `src/server/trpc/routers/users.ts` — CREAR
- `src/server/trpc/index.ts` (o el archivo que registra los routers) — añadir `usersRouter`

### Implementación
1. Crear `src/server/trpc/routers/users.ts`:
```typescript
import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const usersRouter = router({
  getProfile: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: {
          id: true, name: true, email: true, role: true,
          timezone: true, baseCurrency: true, language: true,
          weeklyGoalMinutes: true, emailNotifications: true,
          currentStreak: true, bestStreak: true, createdAt: true,
        },
      })
    ),

  updateProfile: protectedProcedure
    .input(z.object({
      name:               z.string().min(1).max(100).optional(),
      timezone:           z.string().optional(),
      baseCurrency:       z.string().length(3).optional(),
      language:           z.enum(["es", "en"]).optional(),
      weeklyGoalMinutes:  z.number().int().min(0).max(10080).optional(),
      emailNotifications: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: ctx.userId },
        data:  input,
      })
    ),
})
```
2. Verificar la estructura del archivo que registra los routers con: `grep -rn "weeklyReviewsRouter\|appRouter" src/server/trpc/ --include="*.ts" -l`
3. Importar y añadir `users: usersRouter` al `appRouter`

### Criterios de aceptación
- [ ] `trpc.users.getProfile.useQuery()` retorna los campos reales del usuario autenticado
- [ ] `trpc.users.updateProfile.useMutation()` persiste cambios en la DB
- [ ] Un usuario no puede actualizar el perfil de otro (garantizado por `where: { id: ctx.userId }`)
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Router index path:** El archivo que registra routers puede ser `src/server/trpc/index.ts` u otro. Verificar antes de modificar.

---

## TASK-007 — Conectar página Perfil al router `users`

**Prioridad:** P0
**Módulo:** perfil
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-006
**Estado:** TODO

### Objetivo
Reemplazar el estado local hardcodeado en `src/app/perfil/page.tsx` con datos reales del router `users`. Hacer que el botón Guardar llame a `users.updateProfile`.

### Contexto
`src/app/perfil/page.tsx` es el único archivo en `src/app/perfil/`. Tiene `useState` con valores por defecto hardcodeados para todos los campos del perfil. Cero llamadas tRPC. Los botones "Eliminar cuenta" y "Exportar datos" no tienen `onClick`.

### Archivos afectados
- `src/app/perfil/page.tsx` — conectar a tRPC, eliminar estado hardcodeado

### Implementación
1. Leer el archivo completo primero para entender la estructura
2. Añadir: `const { data: profile, isLoading } = trpc.users.getProfile.useQuery()`
3. Añadir: `const updateProfile = trpc.users.updateProfile.useMutation({ onSuccess: () => toast.success("Perfil guardado") })`
4. Reemplazar valores hardcodeados en `useState` con `profile?.campo ?? defaultValue`
5. Añadir `useEffect(() => { if (profile) { setName(profile.name); setTimezone(profile.timezone); ... } }, [profile])` para sincronizar cuando carguen los datos
6. El handler del botón "Guardar" llama a `updateProfile.mutate({ name, timezone, baseCurrency, ... })`
7. Añadir `disabled={updateProfile.isPending}` al botón Guardar
8. Para los botones "Eliminar cuenta" y "Exportar datos": añadir `onClick` que muestre `toast.info("Próximamente")`

### Criterios de aceptación
- [ ] La página muestra el nombre y email reales del usuario tras cargar
- [ ] Modificar el nombre y presionar Guardar persiste el cambio (visible tras refresh)
- [ ] Botón Guardar muestra estado de carga durante la mutación
- [ ] No hay `useState` con strings hardcodeados para campos de perfil
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Librería de toast:** Verificar qué librería usa el proyecto (`sonner`, `react-hot-toast`, etc.) con `grep -rn "toast\." src/app/ --include="*.tsx" | head -5` antes de añadir notificaciones.

---

## TASK-008 — Hook `useCurrency()` para propagar `baseCurrency`

**Prioridad:** P0
**Módulo:** perfil
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-006
**Estado:** TODO

### Objetivo
Crear `src/lib/hooks/use-currency.ts` que lea `baseCurrency` del perfil y retorne `formatPnl`. Reemplazar el símbolo "$" hardcodeado en los displays principales de P&L.

### Contexto
Todos los displays de P&L usan "$" literal. El campo `baseCurrency` existe en `User` (default "USD") pero nunca se consume. Un trader europeo que opera en EUR ve "$" en todo.

### Archivos afectados
- `src/lib/hooks/use-currency.ts` — CREAR
- `src/app/trades/page.tsx` — usar `formatPnl`
- `src/app/cuentas/page.tsx` (o el path de cuentas) — idem
- Dashboard principal — idem

### Implementación
1. Crear `src/lib/hooks/use-currency.ts`:
```typescript
"use client"
import { trpc } from "@/lib/trpc/client"  // verificar path exacto

export function useCurrency() {
  const { data: profile } = trpc.users.getProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const currency = profile?.baseCurrency ?? "USD"
  const symbol   = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency

  function formatPnl(amount: number, opts?: { sign?: boolean }): string {
    const prefix = opts?.sign && amount > 0 ? "+" : amount < 0 ? "-" : ""
    const abs    = Math.abs(amount)
    return `${prefix}${symbol}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return { currency, symbol, formatPnl }
}
```
2. En `trades/page.tsx`, importar y usar: `const { formatPnl } = useCurrency()` y reemplazar `"$${netPnl}"` con `formatPnl(netPnl, { sign: true })`
3. Aplicar el mismo reemplazo en las otras páginas con P&L

### Criterios de aceptación
- [ ] Usuario con `baseCurrency = "EUR"` ve "€" en todos los P&L displays
- [ ] P&L positivo con `sign: true` muestra "+€100.00"
- [ ] El hook no dispara múltiples fetches gracias a `staleTime`
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Path de tRPC client:** Verificar el path correcto del cliente tRPC en el proyecto con `grep -rn "from.*trpc.*client" src/app/ --include="*.tsx" | head -3`

---

## TASK-009 — Fix: KPIs calculados sobre datos paginados

**Prioridad:** P0
**Módulo:** analytics
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Añadir un procedimiento `trades.aggregates` que compute KPIs (Net P&L, Win Rate, Avg R) sobre **todos** los trades del usuario, independiente de la paginación. Reemplazar los KPIs calculados localmente en `trades/page.tsx`.

### Contexto
`src/app/trades/page.tsx:123-138`: `netPnl`, `wr`, `avgR` se calculan sobre `trades` (array del estado paginado). Si hay 500 trades y la página muestra 50, el Win Rate visible es el de esos 50 trades. El usuario cree que ve su performance total.

### Archivos afectados
- `src/server/trpc/routers/trades.ts` — añadir procedimiento `aggregates`
- `src/app/trades/page.tsx` — usar `trpc.trades.aggregates.useQuery()` para los KPIs

### Implementación
1. En `trades.ts`, añadir antes del último `})`:
```typescript
aggregates: protectedProcedure
  .input(z.object({ accountId: z.string().uuid().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const trades = await ctx.prisma.trade.findMany({
      where: {
        userId: ctx.userId,
        status: "CLOSED",
        ...(input?.accountId ? { accountId: input.accountId } : {}),
      },
      select: { pnl: true, rMultiple: true },
    })
    const mapped = trades.map(t => ({
      pnl:       t.pnl?.toNumber()       ?? null,
      rMultiple: t.rMultiple?.toNumber() ?? null,
    }))
    return {
      total:   trades.length,
      winRate: calcWinRate(mapped),
      avgR:    calcAvgR(mapped),
      netPnl:  calcNetPnl(mapped),
    }
  }),
```
2. Importar `calcWinRate`, `calcAvgR`, `calcNetPnl` de `@/lib/formulas`
3. En `trades/page.tsx`, añadir: `const { data: agg } = trpc.trades.aggregates.useQuery()`
4. Reemplazar `wr`, `netPnl`, `avgR` calculados localmente con `agg?.winRate ?? 0`, etc.
5. Mostrar skeleton/`"—"` mientras `agg` es `undefined`

### Criterios de aceptación
- [ ] Con 200 trades en DB y paginación de 20, el KPI Win Rate refleja los 200 trades
- [ ] Los KPIs muestran `"—"` durante la carga inicial
- [ ] La query no se re-ejecuta con cada cambio de página
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Performance:** `findMany` sin límite puede ser lento para cuentas con miles de trades. El `select: { pnl, rMultiple }` (solo 2 campos numéricos) minimiza el payload. Para escala mayor, considerar una agregación SQL directa.

---

## TASK-010 — Fix: `objectiveMet` siempre es `false` en cuentas

**Prioridad:** P0
**Módulo:** analytics
**Esfuerzo:** S (1-2h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
El campo `objectiveMet` en el router de cuentas recibe `z.boolean().default(false)` — hardcodeado. Calcular automáticamente comparando `currentBalance` vs `initialBalance + profitTarget`.

### Contexto
`src/server/trpc/routers/accounts.ts:125`: `objectiveMet: z.boolean().default(false)`. La lógica de `!input.objectiveMet && !input.manualOverride` en línea ~130 sugiere que debería calcularse automáticamente, pero la computación no está implementada. Un trader que cumple su objetivo de beneficio sigue viendo `objectiveMet: false`.

### Archivos afectados
- `src/server/trpc/routers/accounts.ts` — añadir cálculo automático en el procedimiento que lo usa

### Implementación
1. Leer el archivo alrededor de las líneas 120-160 para entender el contexto
2. En el procedimiento que recibe `objectiveMet`, añadir before el update/create:
```typescript
// Si no hay override manual, calcular automáticamente
let finalObjectiveMet = input.objectiveMet
if (!input.manualOverride) {
  const account = await ctx.prisma.account.findUniqueOrThrow({
    where:  { id: input.id, userId: ctx.userId },
    select: { profitTarget: true, currentBalance: true, initialBalance: true },
  })
  if (account.profitTarget != null) {
    const target = Number(account.initialBalance) + Number(account.profitTarget)
    finalObjectiveMet = Number(account.currentBalance) >= target
  }
}
```
3. Usar `finalObjectiveMet` en el `data` del update

### Criterios de aceptación
- [ ] Cuenta con `profitTarget=1000`, `initialBalance=10000`, `currentBalance=11001` → `objectiveMet=true`
- [ ] Cuenta con `profitTarget=1000`, `currentBalance=10999` → `objectiveMet=false`
- [ ] Cuenta sin `profitTarget` → `objectiveMet=false`
- [ ] Con `manualOverride=true` el valor del input se respeta

### Riesgos
- **Campos Decimal de Prisma:** `profitTarget`, `currentBalance`, `initialBalance` pueden ser tipo `Decimal`. Usar `Number()` para la comparación.

---

# P1 — Alto impacto

---

## TASK-011 — Migración DB: tabla `UserAiConfig`

**Prioridad:** P1
**Módulo:** ai
**Esfuerzo:** S (1-2h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Añadir el modelo `UserAiConfig` a `schema.prisma` y aplicar la migración en Supabase para habilitar claves de IA encriptadas por usuario.

### Contexto
Las API keys de IA son únicamente env vars del servidor. Para un SaaS multi-tenant cada usuario debe poder configurar sus propias claves. La tabla `user_ai_configs` las almacena encriptadas con RLS.

### Archivos afectados
- `src/prisma/schema.prisma` — añadir modelo `UserAiConfig` y relación en `User`
- Migración SQL aplicada en Supabase

### Implementación
1. Añadir al final de `schema.prisma`:
```prisma
model UserAiConfig {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @unique @db.Uuid @map("user_id")
  provider        String   @default("openrouter")
  encryptedApiKey String?  @map("encrypted_api_key")
  coachModel      String?  @map("coach_model")
  embeddingModel  String?  @map("embedding_model")
  summaryModel    String?  @map("summary_model")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_ai_configs")
}
```
2. Añadir en el modelo `User`: `aiConfig UserAiConfig?`
3. Aplicar en Supabase:
```sql
CREATE TABLE user_ai_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL DEFAULT 'openrouter',
  encrypted_api_key TEXT,
  coach_model       TEXT,
  embedding_model   TEXT,
  summary_model     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_ai_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own ai config" ON user_ai_configs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
4. Ejecutar `pnpm prisma generate` desde `src/`

### Criterios de aceptación
- [ ] `ctx.prisma.userAiConfig.findUnique({ where: { userId } })` compila y ejecuta
- [ ] RLS activo: usuario A no puede leer config de usuario B
- [ ] `pnpm prisma generate` pasa sin errores

### Riesgos
- **No usar `prisma migrate`:** En producción con Supabase, aplicar SQL directamente via MCP o panel, no `prisma migrate deploy` que puede fallar con Supabase.

---

## TASK-012 — Crear `lib/ai/key-encryption.ts`

**Prioridad:** P1
**Módulo:** ai
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-011
**Estado:** TODO

### Objetivo
Implementar encriptación/desencriptación AES-256-GCM para las API keys de IA antes de persistirlas, usando el módulo `crypto` nativo de Node.js.

### Contexto
Las API keys no deben almacenarse en plaintext en DB. AES-256-GCM con IV aleatorio por operación garantiza que incluso dos cifrados del mismo valor producen outputs distintos. La clave maestra proviene de `ENCRYPTION_SECRET` (env var, 32 bytes en hex).

### Archivos afectados
- `src/lib/ai/key-encryption.ts` — CREAR
- `.env.example` — añadir `ENCRYPTION_SECRET`

### Implementación
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET ?? "", "hex")
if (process.env.NODE_ENV !== "test" && SECRET.length !== 32) {
  throw new Error("ENCRYPTION_SECRET must be 64 hex chars (32 bytes)")
}

const ALGO = "aes-256-gcm"

export function encryptKey(plaintext: string): string {
  const iv      = randomBytes(12)
  const cipher  = createCipheriv(ALGO, SECRET, iv)
  const enc     = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag     = cipher.getAuthTag()
  return iv.toString("hex") + tag.toString("hex") + enc.toString("hex")
}

export function decryptKey(encoded: string): string {
  const iv    = Buffer.from(encoded.slice(0, 24), "hex")
  const tag   = Buffer.from(encoded.slice(24, 56), "hex")
  const enc   = Buffer.from(encoded.slice(56), "hex")
  const dec   = createDecipheriv(ALGO, SECRET, iv)
  dec.setAuthTag(tag)
  return dec.update(enc) + dec.final("utf8")
}
```
2. Añadir a `.env.example`: `ENCRYPTION_SECRET=   # openssl rand -hex 32`

### Criterios de aceptación
- [ ] `decryptKey(encryptKey("sk-test-123")) === "sk-test-123"`
- [ ] Dos llamadas a `encryptKey` con el mismo input producen outputs distintos (IV aleatorio)
- [ ] Sin `ENCRYPTION_SECRET` configurado, el servidor lanza error descriptivo en startup
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Test environment:** El check `SECRET.length !== 32` debe omitirse en tests unitarios donde no hay env vars. El `process.env.NODE_ENV !== "test"` guard lo maneja.

---

## TASK-013 — tRPC: `users.getAiConfig` y `users.updateAiConfig`

**Prioridad:** P1
**Módulo:** ai
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-011, TASK-012
**Estado:** TODO

### Objetivo
Añadir procedimientos tRPC para leer y actualizar la config de IA por usuario. `getAiConfig` devuelve la key enmascarada (nunca en plaintext al cliente). `updateAiConfig` encripta antes de persistir.

### Archivos afectados
- `src/server/trpc/routers/users.ts` — añadir `getAiConfig` y `updateAiConfig`

### Implementación
Añadir al router `users.ts`:
```typescript
import { encryptKey, decryptKey } from "@/lib/ai/key-encryption"

getAiConfig: protectedProcedure
  .query(async ({ ctx }) => {
    const config = await ctx.prisma.userAiConfig.findUnique({
      where: { userId: ctx.userId },
    })
    if (!config) return null
    return {
      provider:       config.provider,
      hasApiKey:      config.encryptedApiKey != null,
      apiKeyPreview:  config.encryptedApiKey
        ? "••••" + decryptKey(config.encryptedApiKey).slice(-4)
        : null,
      coachModel:     config.coachModel,
      embeddingModel: config.embeddingModel,
      summaryModel:   config.summaryModel,
    }
  }),

updateAiConfig: protectedProcedure
  .input(z.object({
    provider:       z.enum(["openrouter", "anthropic", "openai"]).optional(),
    apiKey:         z.string().min(10).optional(),
    coachModel:     z.string().optional(),
    embeddingModel: z.string().optional(),
    summaryModel:   z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { apiKey, ...rest } = input
    const data = { ...rest, ...(apiKey ? { encryptedApiKey: encryptKey(apiKey) } : {}) }
    return ctx.prisma.userAiConfig.upsert({
      where:  { userId: ctx.userId },
      create: { userId: ctx.userId, ...data },
      update: data,
    })
  }),
```

### Criterios de aceptación
- [ ] `getAiConfig` nunca devuelve la clave en plaintext (solo `apiKeyPreview: "••••XXXX"`)
- [ ] `updateAiConfig({ apiKey: "sk-test-key" })` persiste encriptado en DB
- [ ] `upsert` funciona tanto para config nueva como actualización
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **apiKey en logs de tRPC:** Si hay middleware que loguea el input, la key aparecerá. Añadir redaction si el proyecto tiene logging middleware.

---

## TASK-014 — Endpoint `POST /api/ai/test-connection`

**Prioridad:** P1
**Módulo:** ai
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-013
**Estado:** TODO

### Objetivo
Crear un endpoint que verifique que la API key configurada por el usuario funciona, haciendo una llamada mínima al proveedor y retornando `{ ok: boolean, error?: string }`.

### Archivos afectados
- `src/app/api/ai/test-connection/route.ts` — CREAR

### Implementación
```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { decryptKey } from "@/lib/ai/key-encryption"

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })

  const config = await prisma.userAiConfig.findUnique({ where: { userId: user.id } })
  if (!config?.encryptedApiKey) return NextResponse.json({ ok: false, error: "NO_KEY" })

  const apiKey  = decryptKey(config.encryptedApiKey)
  const provider = config.provider

  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      })
      return NextResponse.json({ ok: res.ok, error: res.ok ? undefined : await res.text().then(t => t.slice(0, 100)) })
    }
    const baseUrl = provider === "openai" ? "https://api.openai.com" : "https://openrouter.ai/api"
    const res = await fetch(`${baseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
    return NextResponse.json({ ok: res.ok, error: res.ok ? undefined : "INVALID_KEY" })
  } catch {
    return NextResponse.json({ ok: false, error: "NETWORK_ERROR" })
  }
}
```

### Criterios de aceptación
- [ ] Key válida de Anthropic retorna `{ ok: true }`
- [ ] Key inválida retorna `{ ok: false, error: "INVALID_KEY" }` o similar
- [ ] Sin key configurada retorna `{ ok: false, error: "NO_KEY" }`
- [ ] La API key nunca aparece en la respuesta

### Riesgos
- **Consumo de tokens/créditos:** La llamada de test usa 1 token en Anthropic. Documentar esto al usuario en la UI.

---

## TASK-015 — UI: sección "Config de IA" en página Perfil

**Prioridad:** P1
**Módulo:** perfil
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-013, TASK-014
**Estado:** TODO

### Objetivo
Añadir una sección "Configuración de IA" en `src/app/perfil/page.tsx` con: selector de proveedor, input de API key (enmascarado), selectores de modelo por feature, y botón "Probar conexión".

### Archivos afectados
- `src/app/perfil/page.tsx` — añadir sección AI Config

### Implementación
1. `const { data: aiConfig } = trpc.users.getAiConfig.useQuery()`
2. `const updateAiConfig = trpc.users.updateAiConfig.useMutation()`
3. Estado local: `aiProvider`, `apiKeyInput` (vacío si ya tiene), `coachModel`, `embeddingModel`, `summaryModel`
4. UI (añadir como nueva sección en la página):
   - Select "Proveedor": OpenRouter | Anthropic | OpenAI
   - `<input type="password">` para API Key. Si `aiConfig?.hasApiKey`, placeholder `"••••${aiConfig.apiKeyPreview}"` con helper text "Dejar vacío para no cambiar"
   - 3 selects de modelo (Coach, Embeddings, Resumen Semanal) con opciones según proveedor
   - Botón "Probar conexión" → `fetch("/api/ai/test-connection", { method: "POST" })` → toast verde/rojo
   - Botón "Guardar config IA" → `updateAiConfig.mutate({ provider: aiProvider, apiKey: apiKeyInput || undefined, ... })`

### Criterios de aceptación
- [ ] Guardar proveedor + key persiste en DB
- [ ] "Probar conexión" muestra "✓ Conexión exitosa" o "✗ Error: INVALID_KEY"
- [ ] Key existente no se borra al guardar sin tocar el campo
- [ ] La key nunca se muestra en plaintext en la UI

### Riesgos
- **apiKey vacío:** En el handler de guardar, si `apiKeyInput === ""`, no incluir `apiKey` en el payload para no borrar la key existente.

---

## TASK-016 — Migración DB: campos de psicología en Trade

**Prioridad:** P1
**Módulo:** psychology
**Esfuerzo:** S (1-2h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Añadir 4 campos de psicología al modelo `Trade` en Prisma: `emotionPre`, `emotionPost`, `setupConfidence`, `psychNotes`.

### Archivos afectados
- `src/prisma/schema.prisma` — añadir enum `TradeEmotion` y campos al modelo `Trade`
- Migración SQL aplicada en Supabase

### Implementación
1. Añadir enum en `schema.prisma` (antes de los modelos):
```prisma
enum TradeEmotion {
  CALM
  CONFIDENT
  ANXIOUS
  FOMO
  REVENGE
  OVERCONFIDENT
  NEUTRAL
  @@map("trade_emotion")
}
```
2. Añadir campos en el modelo `Trade`:
```prisma
emotionPre      TradeEmotion? @map("emotion_pre")
emotionPost     TradeEmotion? @map("emotion_post")
setupConfidence Int?          @map("setup_confidence")
psychNotes      String?       @map("psych_notes")
```
3. SQL para Supabase:
```sql
CREATE TYPE trade_emotion AS ENUM (
  'CALM','CONFIDENT','ANXIOUS','FOMO','REVENGE','OVERCONFIDENT','NEUTRAL'
);
ALTER TABLE trades
  ADD COLUMN emotion_pre       trade_emotion,
  ADD COLUMN emotion_post      trade_emotion,
  ADD COLUMN setup_confidence  SMALLINT CHECK (setup_confidence BETWEEN 1 AND 5),
  ADD COLUMN psych_notes       TEXT;
```
4. `pnpm prisma generate` desde `src/`

### Criterios de aceptación
- [ ] `ctx.prisma.trade.update({ data: { emotionPre: "FOMO", setupConfidence: 3 } })` compila
- [ ] `setup_confidence = 0` viola el check constraint (retorna error de DB)
- [ ] Trades existentes no se ven afectados (todos los campos son nullable)
- [ ] `pnpm prisma generate` pasa sin errores

### Riesgos
- **Enums en PG son difíciles de modificar:** Si se anticipa añadir valores (ej. "BORED"), es más seguro usar `TEXT` con check constraint. Decidir antes de aplicar la migración.

---

## TASK-017 — UI: sección "Psicología" en formulario de trade

**Prioridad:** P1
**Módulo:** psychology
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-016
**Estado:** TODO

### Objetivo
Añadir una sección colapsable "Psicología" en el formulario de crear/editar trade con selectores de emoción (pre/post), rating de confianza (1-5), y textarea para `psychNotes`.

### Archivos afectados
- Formulario de trade — localizar con: `grep -rn "direction.*LONG\|setupId" src/app/trades/ --include="*.tsx" -l`
- `src/server/trpc/routers/trades.ts` — añadir campos al input de `create` y `update`

### Implementación
1. Localizar el archivo del formulario de trade
2. En el Zod input de `trades.create` y `trades.update`, añadir:
```typescript
emotionPre:      z.enum(["CALM","CONFIDENT","ANXIOUS","FOMO","REVENGE","OVERCONFIDENT","NEUTRAL"]).optional().nullable(),
emotionPost:     z.enum(["CALM","CONFIDENT","ANXIOUS","FOMO","REVENGE","OVERCONFIDENT","NEUTRAL"]).optional().nullable(),
setupConfidence: z.number().int().min(1).max(5).optional().nullable(),
psychNotes:      z.string().max(500).optional().nullable(),
```
3. En el formulario UI, añadir sección colapsable `<details>`:
   - Emoción pre: 7 chips con emojis: 😌 Calma | 💪 Confiado | 😰 Ansioso | 😱 FOMO | 😤 Venganza | 🤩 Sobreconf | 😐 Neutral
   - Emoción post: mismo selector
   - Confianza: 5 botones de radio o estrellas (1-5)
   - `psychNotes`: textarea pequeño (3 filas)
4. En modo edición, pre-llenar con los valores del trade existente

### Criterios de aceptación
- [ ] La sección aparece como `<details>` colapsable en el formulario
- [ ] Crear trade con `emotionPre: "FOMO"` persiste en DB
- [ ] Los campos son opcionales — crear trade sin llenarlos funciona
- [ ] En modo edición, los campos muestran los valores guardados

### Riesgos
- **Enum en tRPC vs Prisma:** Definir una constante compartida `TRADE_EMOTIONS = ["CALM", ...]` y usarla en ambos `z.enum()` y el tipo de Prisma para no duplicar.

---

## TASK-018 — UI: psicología en panel de detalle de trade

**Prioridad:** P1
**Módulo:** psychology
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-017
**Estado:** TODO

### Objetivo
Mostrar los campos de psicología en la vista de detalle de un trade, con badges de emoción y rating de confianza visual.

### Archivos afectados
- Panel de detalle de trade — localizar con: `grep -rn "rMultiple\|R múltiple\|setup.*name" src/app/trades/ --include="*.tsx" -l`
- `src/server/trpc/routers/trades.ts` — verificar que los campos nuevos están en el `select` de `list`

### Implementación
1. Localizar el componente de detalle de trade
2. Verificar que `trades.list` incluye `emotionPre`, `emotionPost`, `setupConfidence`, `psychNotes` en el select (si usa select explícito, añadirlos)
3. Añadir sección condicional en el detalle:
```tsx
const EMOTION_EMOJI: Record<string, string> = {
  CALM: "😌", CONFIDENT: "💪", ANXIOUS: "😰", FOMO: "😱",
  REVENGE: "😤", OVERCONFIDENT: "🤩", NEUTRAL: "😐",
}
{(trade.emotionPre || trade.emotionPost || trade.setupConfidence) && (
  <div className="space-y-1 text-sm border-t pt-2 mt-2">
    {(trade.emotionPre || trade.emotionPost) && (
      <div className="flex gap-1 items-center">
        {trade.emotionPre  && <span title="Pre">{EMOTION_EMOJI[trade.emotionPre]} Pre</span>}
        {trade.emotionPost && <><span>→</span><span title="Post">{EMOTION_EMOJI[trade.emotionPost]} Post</span></>}
      </div>
    )}
    {trade.setupConfidence && <div>{'★'.repeat(trade.setupConfidence)}{'☆'.repeat(5 - trade.setupConfidence)}</div>}
    {trade.psychNotes && <p className="text-muted-foreground italic text-xs">{trade.psychNotes}</p>}
  </div>
)}
```

### Criterios de aceptación
- [ ] Trades sin campos de psicología no muestran la sección
- [ ] El badge de emoción muestra emoji + label "Pre"/"Post"
- [ ] La confianza muestra ★★★☆☆ (filled + empty stars)
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Select en query:** Si el query de detalle tiene `select` explícito y no incluye los nuevos campos, retornará undefined silenciosamente. Verificar con DevTools.

---

## TASK-019 — tRPC router `psychology` con `summary`

**Prioridad:** P1
**Módulo:** psychology
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-016
**Estado:** TODO

### Objetivo
Crear `src/server/trpc/routers/psychology.ts` con el procedimiento `summary` que retorna distribución de emociones, costo del FOMO, y correlación emoción→win rate para un rango de fechas dado.

### Archivos afectados
- `src/server/trpc/routers/psychology.ts` — CREAR
- `src/server/trpc/index.ts` — añadir `psychologyRouter`

### Implementación
```typescript
import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const psychologyRouter = router({
  summary: protectedProcedure
    .input(z.object({
      from:      z.string().date(),
      to:        z.string().date(),
      accountId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId, status: "CLOSED",
          date:   { gte: input.from, lte: input.to },
          ...(input.accountId ? { accountId: input.accountId } : {}),
        },
        select: { pnl: true, emotionPre: true, emotionPost: true, setupConfidence: true },
      })

      // Emotion distribution pre-trade
      const emotionDist: Record<string, number> = {}
      for (const t of trades) {
        if (t.emotionPre) emotionDist[t.emotionPre] = (emotionDist[t.emotionPre] ?? 0) + 1
      }

      // FOMO cost
      const fomoTrades  = trades.filter(t => t.emotionPre === "FOMO")
      const fomoCost    = fomoTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0)

      // Emotion → win rate
      const byEmotion: Record<string, { wins: number; total: number }> = {}
      for (const t of trades) {
        if (!t.emotionPre) continue
        const e = t.emotionPre
        if (!byEmotion[e]) byEmotion[e] = { wins: 0, total: 0 }
        byEmotion[e].total++
        if (Number(t.pnl ?? 0) > 0) byEmotion[e].wins++
      }
      const emotionWinRate = Object.entries(byEmotion).map(([emotion, s]) => ({
        emotion, winRate: s.total > 0 ? parseFloat((s.wins / s.total * 100).toFixed(1)) : 0, trades: s.total,
      }))

      // Confidence by outcome
      const withConf   = trades.filter(t => t.setupConfidence != null)
      const avgConfWin  = withConf.filter(t => Number(t.pnl??0)>0).reduce((s,t,_,a) => s+(t.setupConfidence??0)/a.length, 0) || null
      const avgConfLoss = withConf.filter(t => Number(t.pnl??0)<=0).reduce((s,t,_,a) => s+(t.setupConfidence??0)/a.length, 0) || null

      return {
        emotionDist, fomoCost, fomoTradeCount: fomoTrades.length,
        emotionWinRate, avgConfWin, avgConfLoss, totalTrades: trades.length,
      }
    }),
})
```

### Criterios de aceptación
- [ ] Retorna `{ emotionDist, fomoCost, emotionWinRate }` para un rango válido
- [ ] Sin trades en el rango: retorna `totalTrades: 0` sin errores
- [ ] `fomoCost` negativo cuando los trades FOMO son perdedores
- [ ] `emotionWinRate` incluye todas las emociones que aparecen en el rango

### Riesgos
- **avgConf con reduce vacío:** Si no hay trades con confianza para wins o losses, el `reduce` sobre array vacío retorna `0`. El `|| null` al final convierte el `0` a `null` — pero también convierte un `avgConf` real de 0 (imposible dado que confidence es 1-5) — no hay riesgo real.

---

## TASK-020 — UI: botón "Editar" en weekly review detail

**Prioridad:** P1
**Módulo:** reviews
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Añadir un botón "Editar" al panel de detalle de una weekly review. El modal de creación debe soportar modo edición, pre-llenado con los datos existentes, y conectado al procedimiento `weeklyReviews.update` (que ya existe en el router pero nunca se llama desde la UI).

### Contexto
`src/server/trpc/routers/weekly-reviews.ts:83` tiene el procedimiento `update` funcional. En la UI de `src/app/reviews/` no existe botón de editar ni se llama a `update`. Una vez creada una review, no se puede modificar.

### Archivos afectados
- `src/app/reviews/` — localizar panel de detalle con: `grep -rn "executiveSummary\|executive_summary" src/app/reviews/ --include="*.tsx" -l`
- Modal de review — adaptar para modo edición

### Implementación
1. Localizar el componente que renderiza el detalle de una review
2. Añadir estado: `const [editingReview, setEditingReview] = useState<ReviewType | null>(null)`
3. Añadir botón "Editar" en el header del panel: `<button onClick={() => setEditingReview(review)}>Editar</button>`
4. En el modal de review, añadir prop `editMode?: { review: ReviewType }`:
   - Si `editMode`, pre-llenar todos los campos con `editMode.review.*`
   - El submit handler: si `editMode`, llamar `weeklyReviews.update.mutate({ id: editMode.review.id, ...formData })` en lugar de `create`
5. Añadir mutation: `const updateReview = trpc.weeklyReviews.update.useMutation({ onSuccess: () => { setEditingReview(null); utils.weeklyReviews.list.invalidate() } })`

### Criterios de aceptación
- [ ] El botón "Editar" aparece en cada review del panel de detalle
- [ ] Al hacer click, el modal se abre pre-llenado con los valores actuales
- [ ] Guardar en modo edición llama a `weeklyReviews.update` (verificar en DevTools)
- [ ] La lista de reviews se actualiza tras editar

### Riesgos
- **Modal muy complejo para adaptar:** Si el modal usa estado interno muy acoplado, puede ser más limpio crear un `EditReviewModal` separado que reutilice los mismos campos pero con `update` mutation, en lugar de modificar el modal existente.

---

## TASK-021 — Auto-guardado con debounce en modal de weekly review

**Prioridad:** P1
**Módulo:** reviews
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-020
**Estado:** TODO

### Objetivo
Añadir auto-guardado con debounce de 30 segundos en el modal de weekly review para persistir borradores automáticamente, con indicador de estado en la UI.

### Archivos afectados
- `src/app/reviews/modals/create-review-modal.tsx` — añadir lógica de auto-save

### Implementación
1. Añadir estado: `const [saveStatus, setSaveStatus] = useState<"idle"|"pending"|"saved">("idle")`
2. Añadir ref: `const saveTimer = useRef<ReturnType<typeof setTimeout>>()`
3. Mutation de auto-save: `const autoSave = trpc.weeklyReviews.update.useMutation({ onSuccess: () => setSaveStatus("saved") })`
4. `useEffect` que observa campos del formulario:
```typescript
useEffect(() => {
  if (!editMode?.review?.id) return  // solo auto-save en modo edición
  clearTimeout(saveTimer.current)
  setSaveStatus("pending")
  saveTimer.current = setTimeout(() => {
    autoSave.mutate({ id: editMode.review.id, executiveSummary, whatWorked, toImprove, disciplineScore })
  }, 30_000)
  return () => clearTimeout(saveTimer.current)
}, [executiveSummary, whatWorked, toImprove, disciplineScore])
```
5. Mostrar indicador: `saveStatus === "pending" && <span className="text-xs text-muted-foreground">Guardando...</span>`

### Criterios de aceptación
- [ ] Tras 30s de editar sin guardar manualmente, se guarda automáticamente
- [ ] El indicador muestra "Guardando..." mientras espera y "Guardado ✓" tras éxito
- [ ] El timer se reinicia con cada cambio en los campos
- [ ] No hay auto-save en reviews nuevas (solo en modo edición)

### Riesgos
- **Condición de carrera con save manual:** Si el usuario presiona Guardar mientras el auto-save está pendiente, cancelar `saveTimer.current` en el handler del botón manual.

---

# P2 — Mejoras

---

## TASK-022 — Model registry `lib/ai/models.ts` + fix stale IDs

**Prioridad:** P2
**Módulo:** ai
**Esfuerzo:** S (1-2h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Crear `src/lib/ai/models.ts` con el catálogo de modelos soportados. Actualizar los model IDs stale: `claude-sonnet-4-5` → `claude-sonnet-4-6` en `src/lib/ai/config.ts`.

### Contexto
`src/lib/ai/config.ts` tiene model IDs hardcodeados con versiones desactualizadas. Un registry centralizado permite actualizar en un solo lugar y exponer los modelos en la UI de configuración de IA.

### Archivos afectados
- `src/lib/ai/models.ts` — CREAR
- `src/lib/ai/config.ts` — actualizar referencias de modelos

### Implementación
```typescript
// src/lib/ai/models.ts
export interface ModelDef {
  id: string; displayName: string
  provider: "anthropic" | "openrouter" | "openai"
  capabilities: ("streaming" | "embeddings" | "vision")[]
  contextWindow: number
}
export const MODEL_REGISTRY: ModelDef[] = [
  { id: "claude-sonnet-4-6",           displayName: "Claude Sonnet 4.6",     provider: "anthropic",  capabilities: ["streaming","vision"], contextWindow: 200_000 },
  { id: "claude-haiku-4-5-20251001",   displayName: "Claude Haiku 4.5",      provider: "anthropic",  capabilities: ["streaming"],          contextWindow: 200_000 },
  { id: "openai/gpt-4o-mini",          displayName: "GPT-4o Mini (OpenRouter)", provider: "openrouter", capabilities: ["streaming","embeddings"], contextWindow: 128_000 },
  { id: "gpt-4o-mini",                 displayName: "GPT-4o Mini",           provider: "openai",     capabilities: ["streaming","embeddings"], contextWindow: 128_000 },
  { id: "text-embedding-3-small",      displayName: "Embedding 3 Small",     provider: "openai",     capabilities: ["embeddings"],         contextWindow: 8_192 },
]
```
En `config.ts`: reemplazar `"claude-sonnet-4-5"` con `"claude-sonnet-4-6"` en todas las apariciones

### Criterios de aceptación
- [ ] `grep -rn "claude-sonnet-4-5" src/` devuelve 0 resultados
- [ ] `MODEL_REGISTRY.filter(m => m.capabilities.includes("embeddings"))` retorna los modelos de embedding
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Cambio de comportamiento:** `claude-sonnet-4-6` puede tener diferencias en el formato de respuesta. Verificar que el streaming sigue funcionando tras el cambio.

---

## TASK-023 — Empty states en las 4 páginas principales

**Prioridad:** P2
**Módulo:** ux
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Crear un componente `EmptyState` reutilizable y usarlo en trades, reviews, playbook, y analytics cuando no hay datos.

### Archivos afectados
- `src/components/ui/empty-state.tsx` — CREAR
- `src/app/trades/page.tsx` — añadir `<EmptyState>` cuando `trades.length === 0`
- `src/app/reviews/page.tsx` — idem
- Página de playbook/setups — idem
- Página de analytics/dashboard — idem

### Implementación
```typescript
// src/components/ui/empty-state.tsx
interface EmptyStateProps {
  icon: React.ReactNode; title: string; description: string
  action?: { label: string; onClick: () => void }
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="text-5xl opacity-60">{icon}</div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">{description}</p>
      {action && <button onClick={action.onClick} className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">{action.label}</button>}
    </div>
  )
}
```
En cada página: `{!isLoading && data.length === 0 && <EmptyState icon="📊" title="..." description="..." action={{ label: "...", onClick: ... }} />}`

### Criterios de aceptación
- [ ] Las 4 páginas muestran empty state cuando no hay datos
- [ ] El empty state **no** se muestra durante la carga (verificar `!isLoading`)
- [ ] El CTA abre el modal/acción correspondiente en cada página
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Botón sin styling del proyecto:** Verificar los tokens CSS/clases del proyecto para botones. Usar el componente `Button` existente si hay uno.

---

## TASK-024 — Fix: `inputMode="decimal"` en todos los inputs numéricos

**Prioridad:** P2
**Módulo:** mobile
**Esfuerzo:** XS (< 1h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Añadir `inputMode="decimal"` a todos los inputs de precio, cantidad y P&L en formularios de trade para que iOS/Android muestre el teclado numérico con punto decimal.

### Archivos afectados
- Formularios de trade (localizar: `grep -rn "entryPrice\|exitPrice\|stopLoss\|takeProfit" src/app/ --include="*.tsx" -l`)

### Implementación
1. Buscar todos los inputs numéricos: `grep -rn "type=\"number\"\|placeholder=\"0\.00\"\|placeholder.*price" src/app/ --include="*.tsx" -l`
2. Para cada input de precio/cantidad/P&L, asegurar que tiene:
```tsx
<input type="number" inputMode="decimal" step="any" ... />
```
3. Si hay inputs con `type="text"` para campos numéricos, cambiarlos a `type="number" inputMode="decimal"`

### Criterios de aceptación
- [ ] Todos los inputs de precio/cantidad/P&L tienen `inputMode="decimal"`
- [ ] `grep -rn "entryPrice\|exitPrice\|stopLoss" src/app/ --include="*.tsx"` muestra inputs con `inputMode`
- [ ] En iOS Safari, el campo de precio muestra teclado numérico con punto decimal

### Riesgos
- **`type="number"` con `step`:** Sin `step="any"`, algunos browsers rechazan valores decimales. Añadir `step="any"` a todos.

---

## TASK-025 — Tests unitarios para `lib/formulas/`

**Prioridad:** P2
**Módulo:** formulas
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Crear tests unitarios para todas las funciones en `src/lib/formulas/` cubriendo edge cases: 0 trades, todos wins, todos losses, valores nulos, casos límite.

### Archivos afectados
- `src/lib/formulas.test.ts` — actualizar imports al nuevo path
- `src/lib/formulas/__tests__/performance.test.ts` — CREAR
- `src/lib/formulas/__tests__/drawdown.test.ts` — CREAR
- `src/lib/formulas/__tests__/discipline.test.ts` — CREAR

### Implementación
Para cada función, casos de test mínimos:
- `calcWinRate`: 0 trades → 0; 1 win 1 loss → 50; 2 wins 0 losses → 100; todos null pnl → 0
- `calcMaxDrawdown`: serie vacía → 0; solo ganancias → 0; `[100, -200, 50]` → 200; recuperación completa → 0
- `calcDisciplineScore`: `([], 0, 0)` → 100; todas violaciones, 0 pending → 20; todo limpio → score alto
- `calcSharpeRatio`: 1 trade → null; std=0 → null; `[1, -1]` → 0
- `calcExpectancyR`: sin R → 0; todos positivos → > 0

### Criterios de aceptación
- [ ] Todos los tests pasan con `pnpm test` (verificar el comando exacto primero)
- [ ] Al menos 4 casos de test por función
- [ ] Coverage de `src/lib/formulas/` ≥ 90%

### Riesgos
- **Test runner desconocido:** Verificar con `grep -n "test\|jest\|vitest" src/lib/formulas.test.ts | head -3` antes de escribir los tests.

---

## TASK-026 — Sharpe Ratio en dashboard de analytics

**Prioridad:** P2
**Módulo:** analytics
**Esfuerzo:** S (1-2h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Añadir Sharpe Ratio al dashboard de analytics usando `calcSharpeRatio` de `lib/formulas`, eliminando la implementación inline en `ai-context.ts`.

### Contexto
`calcSharpeRatio` existe en `lib/formulas.ts` pero solo se usa en `src/domains/analytics/ai-context.ts`. El servicio `dashboard-analytics.ts` no lo incluye. Los traders usan Sharpe Ratio como métrica clave de riesgo ajustado.

### Archivos afectados
- `src/domains/analytics/services/dashboard-analytics.ts` — añadir Sharpe al output
- `src/domains/analytics/ai-context.ts` — reemplazar implementación inline con `calcSharpeRatio`
- Dashboard page — añadir KPI chip de Sharpe Ratio

### Implementación
1. En `dashboard-analytics.ts`, añadir al calcular los agregados:
```typescript
const rMultiples = trades.filter(t => t.rMultiple != null).map(t => t.rMultiple!)
const sharpeRatio = calcSharpeRatio(rMultiples)
```
2. Añadir `sharpeRatio: number | null` al tipo de retorno
3. En `ai-context.ts`, reemplazar el cálculo inline de Sharpe con `calcSharpeRatio(rMultiples)`
4. En la page del dashboard, añadir KPI: `value: sharpeRatio != null ? sharpeRatio.toFixed(2) : "—"`

### Criterios de aceptación
- [ ] El dashboard muestra "Sharpe Ratio" cuando hay ≥ 2 trades con rMultiple
- [ ] Muestra "—" con < 2 trades
- [ ] El valor de Sharpe en el dashboard coincide con el del AI Coach
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Diferencia de cálculo con ai-context:** Verificar que `ai-context.ts` usaba la misma función antes de reemplazarla. Si había una implementación custom diferente, alinear ambas.

---

## TASK-027 — Rate limiting en endpoints de IA

**Prioridad:** P2
**Módulo:** ai
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Añadir rate limiting de 20 req/min por usuario en `/api/ai-coach` y `/api/ai-embed` para prevenir abuso y costos de API descontrolados.

### Archivos afectados
- `src/lib/rate-limit.ts` — CREAR
- `src/app/api/ai-coach/route.ts` — añadir check
- `src/app/api/ai-embed/route.ts` — añadir check

### Implementación
```typescript
// src/lib/rate-limit.ts
const windows = new Map<string, number[]>()

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now  = Date.now()
  const hits = (windows.get(key) ?? []).filter(t => now - t < windowMs)
  hits.push(now)
  windows.set(key, hits)
  return hits.length <= limit
}
```
En ambas routes, después del auth check:
```typescript
if (!checkRateLimit(`ai:${user.id}`)) {
  return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })
}
```

### Criterios de aceptación
- [ ] Request 21 dentro de 1 minuto devuelve HTTP 429
- [ ] Request 1 del siguiente minuto devuelve 200
- [ ] Dos usuarios tienen ventanas independientes
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **In-memory no persiste en serverless:** En Vercel, instancias distintas tienen Maps distintos. Documentar esta limitación en el código. Para producción escalable, usar Supabase o Redis como backend de rate limiting.

---

## TASK-028 — Widget de psicología en modal de weekly review

**Prioridad:** P2
**Módulo:** psychology
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-019, TASK-020
**Estado:** TODO

### Objetivo
Añadir un widget colapsable de resumen psicológico en el modal de weekly review mostrando: emoción dominante, costo del FOMO, y trades de alta/baja confianza de la semana.

### Archivos afectados
- `src/app/reviews/modals/create-review-modal.tsx` — añadir widget en el step de análisis

### Implementación
1. Añadir query al montar el modal: `const { data: psych } = trpc.psychology.summary.useQuery({ from: weekStart, to: weekEnd, accountId }, { enabled: !!weekStart })`
2. Calcular `topEmotion`: `Object.entries(psych.emotionDist).sort((a,b) => b[1]-a[1])[0]?.[0]`
3. Añadir en el step de análisis (después del discipline score):
```tsx
{psych && psych.totalTrades > 0 && (
  <details className="border rounded-lg p-3 text-sm">
    <summary className="cursor-pointer font-medium text-muted-foreground">
      🧠 Psicología de la semana
    </summary>
    <div className="mt-2 space-y-1">
      {topEmotion && <p>Emoción dominante: <strong>{EMOTION_EMOJI[topEmotion]} {topEmotion}</strong></p>}
      {psych.fomoTradeCount > 0 && (
        <p>FOMO: <strong className="text-destructive">{psych.fomoTradeCount} trades</strong> (${Math.abs(psych.fomoCost).toFixed(2)} costo)</p>
      )}
    </div>
  </details>
)}
```

### Criterios de aceptación
- [ ] El widget aparece solo cuando hay datos de psicología en la semana
- [ ] Si `psych.totalTrades === 0`, el widget no se muestra
- [ ] Los valores coinciden con `psychology.summary` para el mismo rango de fechas
- [ ] El widget está colapsado por defecto

### Riesgos
- **Query adicional al abrir modal:** Iniciar la query al montar el modal, no al navegar al step, para evitar latencia visible al usuario cuando llega al step de análisis.

---

# P3 — Futuro

---

## TASK-029 — Sistema de temas con CSS custom properties

**Prioridad:** P3
**Módulo:** ux
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-006
**Estado:** TODO

### Objetivo
Implementar infraestructura de theming con CSS custom properties para soportar dark/light/system y color de acento personalizable, leyendo las preferencias del perfil del usuario.

### Archivos afectados
- `src/app/globals.css` — añadir CSS tokens
- `src/lib/hooks/use-theme.ts` — CREAR
- `src/app/layout.tsx` — llamar `useTheme()` en el layout raíz

### Implementación
1. En `globals.css`, añadir bajo `:root`:
```css
:root {
  --color-accent:    oklch(65% 0.2 250);
  --color-accent-fg: oklch(98% 0 0);
  --radius-base:     0.5rem;
}
[data-theme="light"] { --color-bg: oklch(97% 0 0); --color-fg: oklch(10% 0 0); }
[data-theme="dark"]  { --color-bg: oklch(10% 0 0); --color-fg: oklch(95% 0 0); }
```
2. Crear `src/lib/hooks/use-theme.ts`:
```typescript
"use client"
import { useEffect } from "react"
import { trpc } from "@/lib/trpc/client"

export function useTheme() {
  const { data: profile } = trpc.users.getProfile.useQuery(undefined, { staleTime: 10 * 60 * 1000 })
  useEffect(() => {
    if (profile?.accentColor) {
      document.documentElement.style.setProperty("--color-accent", profile.accentColor)
    }
  }, [profile?.accentColor])
}
```
3. Llamar `useTheme()` en el componente raíz del layout

### Criterios de aceptación
- [ ] Cambiar `--color-accent` en DevTools cambia el color de botones/highlights
- [ ] `useTheme()` aplica el color guardado en el perfil al cargar la app
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Conflicto con Tailwind hardcoded:** Si los componentes usan `bg-blue-500` en lugar de `bg-[var(--color-accent)]`, los tokens no tienen efecto. Este task sienta la infraestructura; migrar componentes es trabajo separado.

---

## TASK-030 — PWA: manifest y service worker básico

**Prioridad:** P3
**Módulo:** mobile
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Hacer la app instalable como PWA en iOS/Android añadiendo `manifest.json` y un service worker básico de cache de assets estáticos.

### Archivos afectados
- `public/manifest.json` — CREAR
- `public/sw.js` — CREAR
- `src/app/layout.tsx` — añadir `<link rel="manifest">` y registro del SW

### Implementación
1. Crear `public/manifest.json`:
```json
{
  "name": "Trading Journal",
  "short_name": "TradingJ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
2. Crear `public/sw.js` con precache de assets estáticos (CSS, JS, fonts)
3. En `layout.tsx`, añadir en `<head>`: `<link rel="manifest" href="/manifest.json" />`
4. Añadir script de registro: `navigator.serviceWorker?.register('/sw.js')`
5. Crear iconos básicos de 192x192 y 512x512 en `public/` (pueden ser SVG o PNG simples)

### Criterios de aceptación
- [ ] Chrome DevTools > Application > Manifest muestra el manifest sin errores
- [ ] En Android Chrome aparece el prompt "Añadir a pantalla de inicio"
- [ ] La app se abre en modo standalone tras instalar (sin barra del browser)

### Riesgos
- **Service worker en desarrollo:** El SW puede interferir con hot reload. Registrar solo en `process.env.NODE_ENV === "production"`.

---

## TASK-031 — Setup health score en Playbook

**Prioridad:** P3
**Módulo:** playbooks
**Esfuerzo:** M (2-4h)
**Dependencias:** TASK-001
**Estado:** TODO

### Objetivo
Mostrar un indicador de salud (🟢/🟡/🔴) en cada setup del Playbook comparando WR/R esperado vs real de los últimos 30 días.

### Contexto
El modelo `Setup` ya tiene `expectedWr`, `expectedAvgR`, `minR`, `maxR` (añadidos en Phase VIII). Con esos datos se puede evaluar si el setup está performando según expectativas.

### Archivos afectados
- `src/server/trpc/routers/setups.ts` — añadir procedimiento `healthScore`
- Componente de card de setup en playbook — añadir indicador visual

### Implementación
1. En `setups.ts`, añadir:
```typescript
healthScore: protectedProcedure
  .input(z.object({ setupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const setup = await ctx.prisma.setup.findUniqueOrThrow({
      where: { id: input.setupId, userId: ctx.userId },
      select: { expectedWr: true, expectedAvgR: true },
    })
    const since  = new Date(); since.setDate(since.getDate() - 30)
    const trades = await ctx.prisma.trade.findMany({
      where: { userId: ctx.userId, setupId: input.setupId, status: "CLOSED", date: { gte: since } },
      select: { pnl: true, rMultiple: true },
    })
    const actualWr = calcWinRate(trades.map(t => ({ pnl: t.pnl?.toNumber() ?? null })))
    const status = !setup.expectedWr || trades.length < 5 ? "insufficient"
      : actualWr >= setup.expectedWr ? "green"
      : actualWr >= Number(setup.expectedWr) * 0.8 ? "yellow"
      : "red"
    return { actualWr, expectedWr: setup.expectedWr, status, tradeCount: trades.length }
  }),
```
2. En la card de setup: `{health.status !== "insufficient" && <span>{health.status === "green" ? "🟢" : health.status === "yellow" ? "🟡" : "🔴"}</span>}`

### Criterios de aceptación
- [ ] Setup con `actualWr >= expectedWr` muestra 🟢
- [ ] Setup con `actualWr < 80% expectedWr` muestra 🔴
- [ ] Setup con < 5 trades en 30 días no muestra badge
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **`expectedWr` puede ser null:** Para setups sin expectativas, retornar `status: "insufficient"` y no mostrar badge.

---

## TASK-032 — Extraer `coach-service.ts` del route handler

**Prioridad:** P3
**Módulo:** ai
**Esfuerzo:** M (2-4h)
**Dependencias:** ninguna
**Estado:** TODO

### Objetivo
Extraer la función `buildSystemPrompt` y la lógica de contexto del trader desde `src/app/api/ai-coach/route.ts` a un servicio testeable `src/domains/ai/services/coach-service.ts`. El route handler debe quedar como un adapter delgado de ≤ 50 líneas.

### Contexto
`src/app/api/ai-coach/route.ts` tiene 108 líneas mezclando: auth, construcción de contexto, building del prompt de sistema, y streaming. La función `buildSystemPrompt` (línea 10) contiene lógica de negocio que no es testeable en un route handler.

### Archivos afectados
- `src/domains/ai/services/coach-service.ts` — CREAR
- `src/app/api/ai-coach/route.ts` — reducir a adapter

### Implementación
1. Crear directorio `src/domains/ai/services/` si no existe
2. Crear `coach-service.ts`:
```typescript
import { buildTraderContext } from "@/domains/analytics/ai-context"
import type { PrismaClient } from "@/lib/generated/prisma/client"

export function buildSystemPrompt(ctx: Awaited<ReturnType<typeof buildTraderContext>>): string {
  // Mover el cuerpo de buildSystemPrompt desde route.ts
}

export async function buildCoachContext(userId: string, prismaClient: PrismaClient) {
  const traderCtx = await buildTraderContext(userId, prismaClient)
  return { system: buildSystemPrompt(traderCtx) }
}
```
3. En `route.ts`, reemplazar las funciones inline con:
```typescript
import { buildCoachContext } from "@/domains/ai/services/coach-service"
// ...
const { system } = await buildCoachContext(user.id, prisma)
const readable = await streamChat({ model: getCoachModel(), messages, system })
```

### Criterios de aceptación
- [ ] `route.ts` tiene ≤ 50 líneas tras el refactor
- [ ] `buildSystemPrompt` está en `coach-service.ts` y es importable independientemente
- [ ] El comportamiento del AI Coach no cambia (mismo output)
- [ ] `pnpm typecheck` pasa sin errores

### Riesgos
- **Importar Prisma en un domain service:** `buildTraderContext` ya recibe `prismaClient` como parámetro — mantener ese patrón. No usar el singleton `prisma` directamente en el service para facilitar testing con mocks.

---

*Total: 32 tareas — P0: 10 · P1: 11 · P2: 8 · P3: 4*
*Esfuerzo estimado: P0 ~28h · P1 ~36h · P2 ~24h · P3 ~14h · Total: ~102h*
