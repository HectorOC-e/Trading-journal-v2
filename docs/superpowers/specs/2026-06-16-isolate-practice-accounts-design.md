# Aislamiento de cuentas de práctica (demo / backtest)

**Fecha:** 2026-06-16
**Rama:** `feat/isolate-practice-accounts`
**Estado:** Aprobado para implementación

## Problema

El P&L, balance y equity de cuentas demo y backtesting (normales o de prop firm)
no son reales y no permiten retiros, pero hoy se agregan junto a las cuentas
reales en dashboard, analytics, psicología y en el análisis de la IA. Esto
contamina las estadísticas reales del trader (un win de demo infla el P&L real,
etc.).

A la vez, la **conducta** sí es real aunque la cuenta sea de práctica: el trader
igual siente FOMO, igual rompe su plan, igual hace revenge trading. Por eso la
psicología/disciplina sí debe contar la práctica.

## Principio rector — el eje "realidad"

- **Financiero** (P&L, equity, balances, símbolos, estado prop-firm, retiros y
  métricas de rendimiento como win rate / R / sesiones / setups): **por defecto
  solo cuentas reales**; se incluye la práctica solo con un toggle explícito.
- **Conductual** (psicología, disciplina, emociones, rupturas de plan, A+ vs
  estándar): **siempre incluye todas las cuentas**, con identificación visible.
- **IA**: consciente de la distinción; **nunca** presenta P&L/balance/equity de
  práctica como rendimiento real. Por defecto resume rendimiento real y reporta
  la práctica aparte y etiquetada.

## Clasificación (derivada de `Account.type`, sin migración)

| type            | realidad   |
|-----------------|------------|
| `PERSONAL`      | real       |
| `PROP_FIRM`     | real       |
| `DEMO_PERSONAL` | práctica   |
| `DEMO_PROP`     | práctica   |
| `BACKTEST`      | práctica   |
| `QA`            | práctica   |

`PROP_FIRM` cuenta como real: la evaluación/funded tiene consecuencias y retiros
reales. `DEMO_PROP` es práctica.

## Arquitectura

### 1. Clasificador (única fuente de verdad)

Nuevo módulo `src/domains/trading/account-reality.ts`:

```ts
export type AccountReality = "real" | "practice"
const PRACTICE_TYPES = new Set(["DEMO_PERSONAL", "DEMO_PROP", "BACKTEST", "QA"])
export function isPracticeType(type?: string | null): boolean
export function accountReality(type?: string | null): AccountReality
```

Nadie hardcodea tipos sueltos; todo deriva de aquí.

### 2. Servidor — dashboard (`trades.ts` → `dashboardStats`)

- Nuevo input `includePractice: boolean` (default `false`).
- `practiceIds = Set(accounts.filter(isPracticeType).map(id))`.
- Si se selecciona una sola cuenta (`input.accountId`) o `includePractice`, no se
  filtra (el usuario eligió explícitamente).
- `financialTrades` / `financialAccounts` excluyen práctica salvo lo anterior.
- Builders **financieros/rendimiento** (`buildKpis`, `buildAccountStats`,
  `buildEquityCurve`, `buildPnlByDate`, `buildPnlBySymbol`, `buildSessionStats`,
  `buildHourStats`, setups, `buildPropFirmStatus`, `recentTrades`,
  `buildExecutionStats`) usan `financialTrades` + `financialAccounts`.
- Builder **conductual** (`buildDiscipline`) usa **todas** las trades.
- La clave de caché incluye el alcance: `${period}:${accountId}:${scope}`.

### 3. Servidor — analytics / psicología (`analytics.ts`)

- Las series financieras/rendimiento respetan `includePractice`.
- La psicología/disciplina agrega todas las cuentas siempre, con desglose
  real/práctica para identificación.

### 4. IA (`ai-context.ts`, `coach-tools.ts`, system prompt)

- Cada cuenta/trade que ve la IA lleva su `reality`.
- `get_performance_summary` separa real vs práctica (default real).
- Regla de system prompt: *nunca presentar P&L/balance/equity de práctica como
  rendimiento real; por defecto resumir real, reportar práctica aparte.*

### 5. Cliente / UX

- Hook `usePracticeToggle()` con persistencia en `localStorage`
  (`tj.includePractice`), default `false`. Sin migración.
- Toggle "Incluir práctica (demo/backtest)" en cabecera de Dashboard y Analytics;
  se pasa como `includePractice` a las queries.
- Se conservan los badges `TYPE_META` (color/icono) para distinguir práctica.
- Con el toggle off y existiendo cuentas de práctica: caption "Excluyendo N
  cuentas de práctica".
- La tarjeta de disciplina del dashboard indica que incluye práctica.

## Sin migración de BD

La realidad se deriva de `type`; el toggle vive en `localStorage`. No hay cambios
de esquema, en línea con la regla de "solo migraciones versionadas".

## Tests

- `account-reality.test.ts`: tabla tipo→realidad.
- `dashboard-analytics.test.ts`: la partición excluye práctica del financiero por
  defecto y la incluye con el flag; la disciplina siempre cuenta todo.

## Bordes

- `QA`: práctica (excluida por defecto). Ocultarla de selectores = follow-up.
- FX: la partición es consistente con la conversión de divisa existente.
- Usuario solo con cuentas de práctica: vistas financieras vacías con aviso para
  activar el toggle.
