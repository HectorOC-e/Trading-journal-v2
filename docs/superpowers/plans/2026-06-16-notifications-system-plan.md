# Plan de implementación — Epic 1 · Notificaciones

Spec: `docs/superpowers/specs/2026-06-16-notifications-system-design.md`. Rama: `feat/notifications-system`.
Cada fase se verifica (typecheck + tests) y se commitea por separado.

## Fase 0 — Schema + migración
- `prisma/schema.prisma`: modelos `Notification`, `NotificationPreference`; relaciones en `User`.
- `supabase/migrations/20260616140000_notifications.sql`: tablas + índices, **índice único parcial**
  `CREATE UNIQUE INDEX … (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`.
- `prisma generate`; typecheck.
- **Acepta:** schema compila, cliente Prisma regenerado, SQL replayable.

## Fase 1 — Catálogo + AppError
- `lib/messages/{types,catalog,resolve}.ts`; `lib/errors/app-error.ts` (+ `toUserMessage` evolucionando `error-formatter.ts`).
- **Acepta:** `resolveMessage(code,params,lang)` interpola y hace fallback en→es; tests unit verdes.

## Fase 2 — emit + router
- `server/services/notifications/emit.ts` (persist/prefs/quiet-hours/dedupe-upsert, **P0 bypass**).
- `server/trpc/routers/notifications.ts` (`list/unreadCount/markRead/markAllRead/archive/preferences`); registrar en el root router.
- Call-site `ACCOUNT_LOCKED` en `risk-enforcement.ts`.
- **Acepta:** tests de router (scoping/markRead/unreadCount) y de emit (dedupe/prefs) verdes.

## Fase 3 — Toasts
- `lib/notify.ts` + `components/notifications/toast.tsx` (Dirección B, 6 tipos, prioridad→duración).
- Configurar `<Toaster>` en `app/layout.tsx`; migrar call-sites `toast.*` clave a `notify(code)`.
- **Acepta:** toasts renderizan por código; typecheck/lint verdes.

## Fase 4 — Centro (panel + página)
- Reescribir `notification-bell.tsx`; `center-panel.tsx`, `notification-item.tsx`; reescribir `/notificaciones`.
- Retirar la derivación de `lib/notifications.ts` (fin de reglas-como-notificación).
- **Acepta:** bell muestra unreadCount real; panel y página leen del router.

## Fase 5 — Móvil
- `center-sheet.tsx` (bottom sheet framer-motion), swipe-actions en item, toasts abajo, háptico P0/P1, a11y.
- **Acepta:** sheet arrastrable, swipe Leído/Archivar, targets ≥44px.

## Fase 6 — IA
- Actualizar `lib/ai/app-knowledge.ts`; evaluar tool read-only `get_recent_notifications`.
- **Acepta:** conocimiento IA congruente con el catálogo; sin contradicciones.

## Fase 7 — Pruebas
- Suite unit + typecheck + lint; **webapp-testing** con `ariaoc89@gmail.com` (toast → centro → leído → archivar → swipe móvil), consola limpia.
- **Acepta:** todo verde; PR a `main`.
