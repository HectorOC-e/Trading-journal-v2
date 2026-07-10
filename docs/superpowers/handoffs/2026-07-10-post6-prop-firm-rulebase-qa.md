# Handoff QA — POST-6 Prop-Firm Rulebase

- **Rama:** `feat/post6-prop-firm-rulebase` (subida a `origin`, 10 commits, HEAD `e98ca48`)
- **Fecha:** 2026-07-10
- **Plan:** `docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md`
- **Spec:** `docs/superpowers/specs/2026-07-10-post6-prop-firm-rulebase-design.md`
- **Estado de la máquina:** validado tras la caída forzada del 10-jul. Sin trabajo perdido, git íntegro.

## Validación local (post-caída)

| Check | Resultado |
|-------|-----------|
| `prisma generate` | ✅ OK (offline) |
| `tsc --noEmit` | ✅ Limpio salvo 1 error ambiental preexistente (`puppeteer-core` no instalado localmente, en `server/services/reviews/render-pdf.ts` — ajeno a post6) |
| `vitest run` | ✅ **1176/1176** en 134 archivos |
| `eslint` | ✅ **0 errores** (74 warnings preexistentes, ninguno en archivos post6) |

---

## ⛔ BLOQUEANTE para QA de UI: la capa frontend está incompleta

El sprint terminó con **backend/engine completo** pero **la UII de Tasks 9 y 10 no se implementó/commiteó** (no lo causó la caída — el último commit `e98ca48` hizo backend + panel base y el sprint no llegó al picker). Concretamente:

### Task 9 — picker de preset + toggle enforceMode en modales de cuenta → **NO HECHO**
- `propFirmPresets.list` está **registrado** en el router (`src/server/trpc/root.ts:72`) pero **ningún componente cliente lo consume**.
- `enforceMode` **no aparece en ningún `.tsx`** → el toggle WARN/ENFORCE no existe en `create-account-modal.tsx` / `edit-account-modal.tsx`.
- Faltan también en los modales: campo `consistencyPct`, toggle `noWeekendHolding`, wiring de `presetId`.
- (Los modales **sí** tienen ya campos manuales preexistentes: `ddDailyPct`, `ddTotalPct`, `targetPct`, `ddModel`, `phase`, `minDays`, `maxTrades` — pero se rellenan a mano, sin catálogo.)

### Task 10 — filas nuevas en el panel del dashboard → **PARCIAL**
- El panel `src/app/dashboard/components/prop-firm-rules.tsx` está cableado (`tab-portfolio.tsx:316`) pero **solo renderiza filas preexistentes** (max DD total, pérdida diaria, trades/día, símbolos).
- **No** renderiza las filas post6: trailing drawdown, consistency, weekend-holding, phase-progress — aunque el backend ya las calcula (`buildPropFirmExtras` en `src/domains/trading/services/prop-firm-status.ts`, mergeadas en `dashboard-analytics.ts:153` vía `& PropFirmExtras`).

**Implicación:** el flujo end-to-end del plan ("preset picker → cuenta → panel dashboard") **no es ejercitable por UI todavía**. QA por Playwright de ese flujo está bloqueado hasta cerrar Tasks 9/10-UI.

---

## ✅ Lo que SÍ está listo y es testeable ahora

**Backend / engine (todo con tests unitarios verdes):**
- Migración `supabase/migrations/20260710140000_post6_prop_firm_rulebase.sql`: tabla catálogo `prop_firm_presets` (RLS: authenticated read-only) + columnas nuevas en `accounts` (`consistency_pct`, `no_weekend_holding`, `enforce_mode` default `WARN`, `preset_id`) + seed de 3 firmas (idempotente `on conflict do nothing`).
- Router `propFirmPresets.list` (`src/server/trpc/routers/prop-firm-presets.ts`).
- Catálogo tipado espejo del seed: `src/domains/trading/data/prop-firm-presets.ts`.
- 4 funciones del engine en `src/domains/trading/services/prop-firm-guard.ts`: `checkTrailingDrawdown`, `checkConsistency`, `checkWeekendHolding`, `phaseProgress`.
- `buildPropFirmExtras` (status extendido para el dashboard).
- Guard ENFORCE al crear trade: `enforceMode === "ENFORCE"` bloquea (reusa `locked`) en `risk-enforcement.ts` / `trades.ts`.
- Router `accounts` acepta los campos nuevos (`presetId`, `enforceMode`, `consistencyPct`, `noWeekendHolding`).

**Cómo QA puede ejercitar esto sin la UI del picker:**
1. Correr la suite: `cd src && npx vitest run` (cubre las 4 reglas + `buildPropFirmExtras` + input del router).
2. El panel del dashboard renderiza sus filas base si una cuenta prop-firm ya tiene los campos poblados (vía seed/DB o mutación directa del router `accounts`).
3. El guard ENFORCE es verificable a nivel de API/tests aunque no haya toggle en la UI.

---

## ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan)

### (a) Números de firma marcados `-- VERIFY`
Son **placeholders** — el spec §8 hace al usuario la fuente de verdad. Verificar contra la web oficial antes de merge:

| Firm | Program | Phase | acct_size | dd_daily% | dd_total% | model | target% | min_days | consistency% |
|------|---------|-------|-----------|-----------|-----------|-------|---------|----------|--------------|
| FTMO | Challenge | PHASE_1 | 100k | 5 | 10 | FIXED | 10 | 4 | — |
| FTMO | Challenge | PHASE_2 | 100k | 5 | 10 | FIXED | 5 | 4 | — |
| FTMO | Challenge | FUNDED | 100k | 5 | 10 | FIXED | — | — | — |
| Topstep | Trading Combine | PHASE_1 | 50k | — | 4 | TRAILING | 6 | 2 | 50 |
| Topstep | Trading Combine | FUNDED | 50k | — | 4 | TRAILING | — | — | 50 |
| MyFundedFX | Evaluation | PHASE_1 | 100k | 5 | 10 | FIXED | 8 | — | 40 |
| MyFundedFX | Evaluation | FUNDED | 100k | 5 | 10 | FIXED | — | — | 40 |

> Nota Topstep: expresa límites en **dólares**, almacenados como % del account_size de 50k ($2000 trailing = 4%, $3000 target = 6%). Al mantener el balance de la cuenta = 50k, los % resuelven a los dólares correctos.
> Al cambiar números: actualizar **ambos** — la migración SQL **y** el catálogo tipado `prop-firm-presets.ts` (hay un test que exige que coincidan).

### (b) Rojo del e2e en CI antes de la corrida de QA
- El job `e2e` de `.github/workflows/ci.yml` hace `test.skip` cuando faltan `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` → se queda **verde/omitido** hasta añadir esos secrets.
- El rojo esperado al activarlo suele ser la **anon key de Supabase rotada** (ver memoria `e2e-supabase-env-blocker.md`). Rotar/actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` (y credenciales del usuario QA) antes de encender la suite.

---

## Deploy / migración

- La migración se aplica **automáticamente vía CI al hacer merge a `main`** (job `migrate-deploy`, tras `checks` + `migrate-validate`). No aplicar a mano.
- `migrate-validate` reproduce todas las migraciones desde cero en cada PR — el seed idempotente (`on conflict do nothing`) está diseñado para sobrevivir el replay.

---

## Prompt listo para pegar — completar la UI (Tasks 9 + 10) en sesión nueva

```
Estoy en la rama feat/post6-prop-firm-rulebase. El backend del rulebase prop-firm
está completo y con tests verdes, pero la UI quedó pendiente. Completa (TDD donde aplique):

TASK 9 — modales de cuenta (src/app/cuentas/modals/create-account-modal.tsx y
edit-account-modal.tsx), solo para tipos prop-firm (isPropFirmLike):
  - Componente nuevo src/app/cuentas/components/prop-firm-preset-picker.tsx:
    tres selects en cascada Firm → Program → Phase desde
    trpc.propFirmPresets.list.useQuery(). onApply(preset) rellena
    ddDailyPct, ddTotalPct, ddModel, targetPct, minTradingDays, consistencyPct,
    noWeekendHolding, maxTradesPerDay y setea presetId; prefill initialBalance
    desde preset.accountSize si está vacío/0 (editable). Opción "Personalizado"
    limpia presetId y deja edición manual.
  - Toggle enforceMode (WARN default / ENFORCE), visible solo para prop-firm.
  - Campos consistencyPct y noWeekendHolding en el form; wire al mutation
    create/update (el router accounts ya los acepta).

TASK 10 — panel src/app/dashboard/components/prop-firm-rules.tsx:
  - Añadir filas: trailing drawdown (RuleBar con a.trailing.usedPct + modelo),
    consistency (solo si a.consistency != null), indicador weekend-holding,
    y bloque phase-progress (target% + daysDone/minDays) usando a.phase.
  - Verificar que trades.dashboardStats.propFirmStatus expone esos extras al
    componente (buildPropFirmExtras / PropFirmExtras); si no, propagarlos.

Cierre: cd src && npx tsc --noEmit && npx vitest run && npx eslint  (0 errores).
Luego commit + push de la rama (NO merge a main).
```

## Prompt listo para pegar — corrida QA Playwright (tras cerrar la UI)

```
Rama feat/post6-prop-firm-rulebase con la UI prop-firm ya completa. Ejecuta QA e2e:
  1. Confirmar E2E_USER_EMAIL/PASSWORD y NEXT_PUBLIC_SUPABASE_ANON_KEY vigentes
     (ver docs .../memory e2e-supabase-env-blocker; anon key posiblemente rotada).
  2. cd src && pnpm run build && pnpm start, luego pnpm e2e.
  3. Flujo a cubrir: crear cuenta prop-firm eligiendo un preset (Firm→Program→Phase)
     → verificar que rellena los límites y el balance → activar ENFORCE → intentar
     crear un trade que viole el límite y comprobar el bloqueo → ver el panel
     "Reglas Prop Firm · progreso" en el dashboard con las filas trailing/consistency/
     weekend/phase.
  Screenshots a /tmp/e2e-shots. Patrón de login/selectores: src/__tests__/e2e/flows-authed.spec.ts.
```
