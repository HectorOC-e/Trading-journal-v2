# POST-6 — Base de reglas prop-firm como activo central (moat)

> Diseño validado · 2026-07-10 · rama `feat/post6-prop-firm-rulebase`
> Contexto: `docs/STATUS.md §5/§6(b)`, `docs/ARCHITECTURE.md` (POST-6, handle *"`Rule` unificado
> soporta condiciones por firma"*), `ARCHITECTURE_CHALLENGE.md §7.1` (el moat).

## 1. Objetivo y valor

Convertir el conocimiento de las reglas de cada prop-firm en un **activo curado y central** (el
moat): un catálogo mantenido de firmas/programas/fases con sus reglas exactas, que **auto-configura**
una cuenta y alimenta el enforcement. Hoy cada usuario teclea los números a mano; el candidato prop
gana disciplina cuando la app conoce las reglas de SU firma y las vigila por él.

Alcance de este sprint (confirmado en brainstorming): **ambos** ejes —catálogo curado **y** los tipos
de regla que ese catálogo exige.

## 2. Estado actual (de qué partimos)

`Account` (`src/prisma/schema.prisma:109`) **ya tiene** la mayoría de campos prop-firm:
`ddDailyPct/ddWeeklyPct/ddMonthlyPct/ddTotalPct`, `targetPct`, `ddModel` (`FIXED|TRAILING`),
`phase` (`PHASE_1|PHASE_2|FUNDED|NONE`), `maxTradesPerDay`, `allowedSymbols`, `minTradingDays`, y el
mecanismo de bloqueo `locked/lockReason/lockedAt` (HALLAZGO 1B).

`prop-firm-guard.ts` (`src/domains/trading/services/`) enforca hoy, como funciones puras:
`checkLossLimit` (diaria/semanal/mensual, desde balance inicial), `checkTradeCountLimit`,
`checkSymbolAllowlist`. El dashboard muestra el progreso vía `trades.dashboardStats.propFirmStatus`
(`prop-firm-rules.tsx`).

**Lo que NO existe y este sprint construye:**
- La **lógica** de trailing drawdown (el flag `ddModel=TRAILING` existe; el cálculo que sigue al pico
  de equity, no).
- La **regla de consistencia** (ningún día > X% del profit total) — sin campo ni cálculo.
- La **restricción de holding** de fin de semana — sin campo ni cálculo.
- El **catálogo** de firmas.

## 3. Decisión arquitectónica — Snapshot (Approach A)

Al crear/editar una cuenta, el usuario elige *firma → programa → fase*; el preset **copia sus valores
a los campos que la cuenta ya tiene** (+ los nuevos). El enforcement lee de la cuenta (camino actual).
El catálogo es la **fuente curada de auto-relleno**, no un acoplamiento vivo.

- **Por qué A y no B (referencia viva por FK):** una referencia viva haría que corregir el catálogo
  mañana **mutara silenciosamente los límites de un challenge en curso** — inaceptable. El snapshot
  aísla cada cuenta de cambios futuros del catálogo.
- **Approach C (snapshot + aviso "preset actualizado, ¿revisar?")** queda como *enhancement* POST, no
  en este sprint.

## 4. Modelo de datos

### 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario)

Campos: `id`, `firm` (p.ej. "FTMO"), `program` (p.ej. "Challenge"), `phase`
(`PHASE_1|PHASE_2|FUNDED`), `accountSize` (opcional), y el bloque de reglas —
`ddDailyPct, ddTotalPct, ddModel, targetPct, minTradingDays, consistencyPct, noWeekendHolding,
maxTradesPerDay`— más metadatos de honestidad: `sourceUrl`, `verifiedAt`, `version`, `enabled`.

- **RLS:** `SELECT` para todo usuario autenticado; `INSERT/UPDATE/DELETE` solo `service_role` (base
  para un panel de admin futuro). Es data compartida, no lleva `user_id`.
- Sembrada por migración + seed desde `prop-firm-presets.ts`.

### 4.2 Campos nuevos en `Account` (los que faltan)

- `consistencyPct Decimal?` — límite de consistencia (ningún día > X% del profit total). `null` = sin
  regla.
- `noWeekendHolding Boolean @default(false)` — prohíbe mantener posición en fin de semana.
- `enforceMode String @default("WARN")` — `WARN | ENFORCE` (ver §6).
- `presetId String?` — traza de qué preset se aplicó (auditoría/UX). **Sin FK dura** — no acopla la
  cuenta al catálogo (coherente con el snapshot).

### 4.3 Migración

**Dual**: SQL en `supabase/migrations/<ts>_post6_prop_firm_rulebase.sql` + modelo en `schema.prisma`,
seguido de `npx prisma generate`. Validada por el replay-from-scratch de CI (job `migrate-validate`).

## 5. Motor de enforcement (dominio puro, TDD)

Funciones nuevas en `prop-firm-guard.ts`, cada una con tests escritos primero:

- `checkTrailingDrawdown(equityCurve, initialBalance, limitPct, model)` — si `model=TRAILING`, el
  límite sigue al **pico** de equity realizada; si `FIXED`, desde el inicial. Devuelve violación
  `TRAILING_DRAWDOWN` / `MAX_DRAWDOWN`.
- `checkConsistency(dailyPnls, totalProfit, consistencyPct)` — violación si algún día ganador supera
  `consistencyPct%` del profit total.
- `checkWeekendHolding(openDate, closeDate)` — violación si la posición cruzó un fin de semana.
- `phaseProgress(targetPct, minTradingDays, realized)` — estado de paso de fase (profit target +
  días operados). **Informativo, nunca bloquea.**

Estas funciones se cablean en el guard pre-trade existente (para las bloqueables) y en el cómputo de
`propFirmStatus` del dashboard (para estado/progreso).

**Limitación conocida (documentada):** el enforcement usa **equity realizada / journaleada** (trades
cerrados), no el flotante en vivo de posiciones abiertas. Pre-trade se conoce la equity realizada
actual, no el unrealized. Es un journal, no un feed de broker en tiempo real. Se anota como límite; el
flotante en vivo es futuro (dependería de datos de broker, POST-4-adyacente).

## 6. Enforcement WARN/ENFORCE

`Account.enforceMode` gobierna qué pasa cuando un trade violaría una regla bloqueable de la firma:

- `WARN` (default): muestra banner/estado, **deja pasar** (respeta autonomía — FREEZE-D13).
- `ENFORCE`: **reusa el mecanismo `locked`** existente (rechaza el trade/import, igual que el lock de
  loss-limit de HALLAZGO 1B), con `lockReason` = el tipo de violación.

**Decisión de diseño confirmada:** el modo se guarda como **campo de `Account`** (mirroring de la
semántica `Rule.mode` `warn|enforce`), **no** materializando cada regla prop como fila `Rule`. Es
mucho más simple y respeta el modelo inline actual de la cuenta. (Reglas-prop como filas `Rule` sería
más trabajo y no aporta valor este sprint.)

Reglas informativas (profit target, min días, consistencia retrospectiva) nunca bloquean; solo
alimentan estado.

## 7. UX (todo por UI — habilita el QA posterior sin inyectar a BD)

- **Modal de cuenta** (`create/edit-account-modal.tsx`): selector *Firma → Programa → Fase* que
  auto-rellena los campos de reglas (editables tras aplicar). Opción **"Personalizado"** = el
  comportamiento manual actual. Al aplicar, se setea `presetId` y `enforceMode` (con toggle WARN/ENFORCE).
- **Dashboard** (`prop-firm-rules.tsx`): extender para mostrar trailing DD, consistencia, holding de
  fin de semana y una **barra de progreso de fase** (profit target + min días operados).

## 8. Catálogo seed — v1: 3 firmas ancla

Data tipada en `src/domains/trading/data/prop-firm-presets.ts`, sembrada a la tabla. Cubre 3
arquetipos para probar que el modelo generaliza:

- **FTMO** — Challenge 2 fases + Funded; DD diario 5% / total 10% **fijo**; target 10%/5%; min días.
- **Topstep** — futuros; DD **trailing** (sigue al pico); consistencia.
- **MyFundedFX** — one/two-step moderno; consistencia.

Cada preset lleva `sourceUrl` + `verifiedAt`. **Los números exactos los verifica el usuario** antes de
merge; el spec deja la estructura y valores plausibles marcados como *a verificar*. El resto de firmas
se añade luego vía la tabla, sin deploy.

## 9. Testing / calidad

- TDD para las 4 funciones puras del motor (§5) — tests antes de implementación.
- Suite **vitest completa** antes de cada push (no un subconjunto).
- Migración validada por replay-from-scratch en CI (`migrate-validate`).
- `tsc --noEmit` + build verdes.

## 10. Fuera de alcance (YAGNI / POST)

- Panel de admin del catálogo (la RLS ya lo deja preparado).
- Presets aportados por usuarios / comunidad.
- Restricción de trading en noticias (necesita datos de mercado externos = POST-4).
- Acoplamiento vivo catálogo↔cuenta (Approach C).
- Equity flotante en vivo (unrealized) para enforcement.

## 11. Resumen de decisiones confirmadas

| # | Decisión |
|---|---|
| Núcleo | Ambos: catálogo curado + tipos de regla que exige |
| Catálogo | Tabla en BD (ref global, RLS solo-lectura), sembrada; admin futuro |
| Tipos nuevos | Trailing DD · profit target/min días · consistencia · holding fin de semana |
| Enforcement | `enforceMode` por cuenta (WARN default / ENFORCE), reusa `locked` |
| Acoplamiento | Snapshot (A): el preset copia valores a la cuenta |
| Modo | Campo de `Account`, no filas `Rule` |
| Seed v1 | 3 firmas ancla: FTMO, Topstep, MyFundedFX (números verificados por el usuario) |
