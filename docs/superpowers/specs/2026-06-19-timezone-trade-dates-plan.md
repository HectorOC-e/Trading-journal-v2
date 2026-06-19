# Plan · Fix de timezone en fechas de trades y dashboard

**Fecha:** 2026-06-19
**Estado:** PENDIENTE — solo instrucciones, sin implementar.
**Rama:** `fix/timezone-trade-dates` (creada desde `main`).

> Esta rama existe únicamente para arrancar el trabajo en una sesión futura. No hay
> cambios de código todavía. Ver "Cómo retomar" al final.

## Problema (confirmado)

El campo `timezone` del perfil **se guarda y valida**, pero **solo lo consume el
subsistema de emails/notificaciones**. La lógica de fechas de trades y del dashboard
trabaja en **UTC**, ignorando la tz del usuario. Para un usuario en `America/Tegucigalpa`
(UTC−6), un trade hecho ~23:00 hora local se registra/visualiza como el **día siguiente**.

## Ubicaciones afectadas (verificar líneas; referenciadas por símbolo)

1. **`src/components/trades/register-trade-modal.tsx`** — el valor por defecto del campo
   `date` del formulario usa `new Date().toISOString().slice(0,10)` → **fecha UTC**, no local.
   (Buscar `toISOString().slice(0, 10)` en el objeto `INITIAL`.)
2. **`src/server/trpc/routers/trades.ts`** —
   - El "hoy" del dashboard: `now.toISOString().slice(0,10)` (UTC). También `monthStart`/`weekStart`/`periodFrom` derivados con `toISOString`.
   - `create`: guarda `date: new Date(input.date)` = **medianoche UTC** del día.
   (Buscar `toISOString().slice(0, 10)` y `new Date(input.date)`.)
3. **`src/domains/analytics/services/dashboard-analytics.ts`** — agrupa por semana con
   `getISOWeekKey(new Date(t.date))` (UTC). (Buscar `getISOWeekKey`.)
4. **Helpers ya existentes** `localDateISO(now, tz)` y `localHour(now, tz)` en
   `src/server/services/email/send-learning-digest.ts` — reutilizables; conviene extraerlos.

## Plan de remediación

1. **Util compartida** `src/lib/datetime/local.ts`: mover/exponer `localDateISO(now, tz)` y
   `localHour(now, tz)` (con `Intl.DateTimeFormat`, zona horaria IANA). Hacer que
   `send-learning-digest.ts` importe desde ahí (sin duplicar).
2. **Formulario de trade**: la fecha por defecto debe ser la **fecha local del usuario**
   (`localDateISO(new Date(), userTimezone)`). Obtener la tz del perfil
   (`trpc.profile.get` ya la expone) en `register-trade-modal.tsx`.
3. **Fronteras del dashboard** (`trades.ts` y/o `dashboard-analytics.ts`): calcular
   "hoy / inicio de semana / inicio de mes / rango de N días" en la **tz del usuario**,
   no en UTC. Pasar la tz al cálculo (el router ya tiene `ctx.userId`; cargar `user.timezone`).
4. **Representación de `Trade.date`**: mantener como **local-date string** ("YYYY-MM-DD",
   = "día de trading") y documentar que NO es un instante UTC. Auditar lecturas que asuman
   UTC (p. ej. `new Date(t.date)` en agrupaciones — usar parsing consistente con la convención).
5. **Invalidar caché de analytics** al cambiar tz: ya existe el gancho
   `invalidateAnalyticsCacheIfNeeded` (se dispara con `timezone`); confirmar cobertura.
6. **Tests** (los corre el usuario): trade a las 23:00 local cae en el día local correcto;
   "hoy/semana/mes" del dashboard respetan la tz; usuario en UTC no cambia comportamiento.

## Alcance / cuidado
- NO cambiar la semántica de emails/notificaciones (ya usan tz correctamente).
- Es un fix de **correctitud de datos**; ojo con trades históricos ya guardados en UTC
  (decidir si se reinterpretan o se dejan; documentar). Probablemente dejar históricos
  como están y solo corregir de aquí en adelante + la visualización de fronteras.

## Cómo retomar (próxima sesión)

```
git checkout fix/timezone-trade-dates
git pull
# Lee este archivo y arranca por el paso 1 (util compartida).
```

Sugerencia de arranque para Claude:
> "Retoma el plan de `docs/superpowers/specs/2026-06-19-timezone-trade-dates-plan.md`
>  en la rama `fix/timezone-trade-dates`. Empieza por el paso 1 (extraer `localDateISO`/
>  `localHour` a `src/lib/datetime/local.ts`) y sigue el plan. Yo corro las pruebas."
