# Epic 1 — Sistema de Notificaciones + Catálogo central de mensajes

**Fecha:** 2026-06-16
**Estado:** Aprobado para implementación (diseño validado en brainstorming)
**Contexto:** Primero de 3 epics de la reestructuración de Reglas/Etiquetas/Notificaciones.
Orden: **(1) Notificaciones + Catálogo** → (2) Etiquetas como entidad → (3) Motor de
Reglas/Automatizaciones. Este spec cubre solo el Epic 1. Las acciones "Enviar
notificación" y "Etiquetar" del motor (Epic 3) se apoyarán en esta fundación.

## Problema

Hoy no hay tabla de notificaciones: `lib/notifications.ts` **deriva** una lista en cada
render desde cuentas bloqueadas + reviews vencidas + **cada Regla activa** (por eso las
reglas aparecen como notificaciones). El "dismiss" vive en localStorage. No hay
historial, leído/no leído, eventos reales, prioridad ni catálogo de mensajes. Los toasts
son `export { toast } from "sonner"` crudo. Los errores se formatean en un
`error-formatter.ts` suelto, sin códigos centralizados.

## Decisiones de diseño (validadas)

1. **Tabla `Notification` persistida dirigida por eventos** (no derivada).
2. **Solo eventos significativos persisten**; los toasts de feedback de acción propia
   (guardado/borrado) son efímeros.
3. **Catálogo unificado i18n-ready** de TODOS los mensajes (success/info/warning/error/
   critical/trading-alert) con código estable + severidad.
4. **Canales modelados** como concepto de primera clase; solo se implementa `in_app`.
5. **Toasts: Dirección B (Elevated)** — tarjeta con sombra, barra de acento lateral por
   tipo, barra de progreso de auto-dismiss, botón de acción sólido en críticos.
6. **Centro: ambas superficies** — panel rápido desde la campana + página `/notificaciones`
   completa (historial, búsqueda, filtros, archivado).
7. **Móvil: bottom sheet + swipe-actions + toasts en zona del pulgar + háptico.**

## Arquitectura

### 1. Modelo de datos (migración Supabase CLI; sin cambios manuales)

```prisma
model Notification {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  code       String                              // clave del catálogo, p.ej. "ACCOUNT_LOCKED"
  type       String                              // SUCCESS|INFO|WARNING|ERROR|CRITICAL|TRADING_ALERT
  priority   String                              // P0|P1|P2|P3
  category   String                              // Cuenta|Reglas|Reviews|Aprendizaje|Trading|Sistema
  title      String
  body       String    @default("")
  params     Json      @default("{}")            // para re-render i18n
  href       String?
  actions    Json      @default("[]")            // [{labelCode, href?|actionCode?, style}]
  channel    String    @default("in_app")        // in_app (email|push futuro)
  dedupeKey  String?   @map("dedupe_key")        // colapsa duplicados, p.ej. "lock:<accountId>"
  groupKey   String?   @map("group_key")
  sourceId   String?   @map("source_id")         // entidad origen (accountId, ruleId, importId…)
  readAt     DateTime? @map("read_at")
  archivedAt DateTime? @map("archived_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, readAt])
  // unicidad por dedupeKey = índice único PARCIAL, creado en el SQL de la migración (ver nota)
  @@map("notifications")
}

model NotificationPreference {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  category    String
  channels    String[] @default(["in_app"])
  minPriority String   @default("P3") @map("min_priority")  // silencia por debajo
  muted       Boolean  @default(false)
  quietStart  String?  @map("quiet_start")        // "22:00"
  quietEnd    String?  @map("quiet_end")          // "07:00"
  timezone    String   @default("America/New_York")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category])
  @@map("notification_preferences")
}
```

**Dedupe:** como muchas filas tendrán `dedupeKey = null`, la unicidad se implementa con un
índice único **parcial** `CREATE UNIQUE INDEX … ON notifications (user_id, dedupe_key) WHERE
dedupe_key IS NOT NULL`, escrito a mano en el SQL de la migración (Prisma no expresa índices
parciales). `emitNotification` hace el upsert manualmente: si llega un `dedupeKey`, busca la
fila `(userId, dedupeKey)` y la actualiza (refresca `createdAt`, limpia `readAt`); si no
existe, inserta.

### 2. Catálogo central de mensajes — `lib/messages/`

`catalog.ts` (registro en código, no BD):

```ts
export interface MessageDef {
  type: NotifType; priority: Priority
  category?: NotifCategory               // requerido si persist:true; efímero → "Sistema"
  persist: boolean                       // true → puede crear fila Notification
  es: { title: string; body?: string }   // plantillas con {param}
  en?: { title: string; body?: string }
  actions?: { labelCode: string; href?: string; actionCode?: string; style?: "primary"|"ghost" }[]
}
export const MESSAGES = {
  TRADE_SAVED:          { type:"SUCCESS",  priority:"P3", persist:false, es:{title:"Trade guardado", body:"{symbol} · {r} registrado"} },
  ACCOUNT_LOCKED:       { type:"CRITICAL", priority:"P0", persist:true,  category:"Cuenta", es:{title:"Cuenta {name} bloqueada", body:"{reason}"}, actions:[{labelCode:"VIEW_ACCOUNT", href:"/cuentas", style:"primary"}] },
  RISK_LIMIT_EXCEEDED:  { type:"WARNING",  priority:"P1", persist:true,  category:"Cuenta", es:{…} },
  RULE_FIRED:           { type:"WARNING",  priority:"P1", persist:true,  category:"Reglas", es:{…} },   // emitido por el motor (Epic 3)
  WEEKLY_REPORT_READY:  { type:"SUCCESS",  priority:"P2", persist:true,  category:"Reviews", es:{…} },
  IMPORT_DONE:          { type:"INFO",     priority:"P2", persist:true,  category:"Sistema", es:{…} },
  REVIEW_OVERDUE:       { type:"WARNING",  priority:"P2", persist:true,  category:"Aprendizaje", es:{…} },
  // …errores: GENERIC_ERROR, NETWORK_ERROR, VALIDATION_ERROR, WITHDRAWAL_EXCEEDS_BALANCE, …
} satisfies Record<string, MessageDef>
export type MessageCode = keyof typeof MESSAGES
```

(Snippet ilustrativo; el catálogo completo se enumera en implementación. Las entradas con
`{…}` siguen el mismo patrón que `ACCOUNT_LOCKED`/`TRADE_SAVED`.)

`resolve.ts`: `resolveMessage(code, params, lang)` → `{ type, priority, category, title, body, actions }`
con interpolación de `{param}` y fallback `en→es`. Única fuente para editar copy, severidad
y códigos.

### 3. Errores centralizados — `lib/errors/app-error.ts`

```ts
export class AppError extends Error {
  constructor(public code: MessageCode, public params: Record<string,unknown> = {}) { super(code) }
}
export function toUserMessage(err: unknown, lang): { code, title, body, type } // evoluciona error-formatter.ts
```
Los routers tRPC lanzan `AppError(code, params)`. El cliente mapea código→catálogo en sus
`catch`, mostrando el mensaje correcto y reportando el código. Migrar gradualmente los
`throw new TRPCError` de mensajes de cara al usuario a `AppError` (los códigos existentes
como "saldo disponible" pasan a `WITHDRAWAL_EXCEEDS_BALANCE`).

### 4. Emisión dirigida por eventos — `server/services/notifications/emit.ts`

```ts
emitNotification(prisma, userId, code, { params?, sourceId?, dedupeKey?, href?, lang? })
```
1. Lee la entrada del catálogo (type/priority/category/persist).
2. Si `persist` y pasa las preferencias del usuario (canal `in_app` activo, prioridad ≥
   `minPriority`, no `muted`, no en quiet hours) → **upsert** de `Notification` (dedupe por
   `dedupeKey`; un re-disparo actualiza `createdAt`/limpia `readAt`). **P0 siempre se emite**:
   ignora `muted`, `minPriority` y quiet hours (no es silenciable).
3. Devuelve el payload resuelto (para que el cliente, si corresponde, también haga toast).

**Call-sites iniciales:** `risk-enforcement.ts` (cuenta auto-bloqueada → `ACCOUNT_LOCKED`),
import terminado (`IMPORT_DONE`), reporte semanal listo (`WEEKLY_REPORT_READY`), reviews
vencidas (`REVIEW_OVERDUE`, emitido al cruzar la fecha, no recalculado). El motor de reglas
(Epic 3) emitirá `RULE_FIRED`. **Las reglas dejan de ser notificaciones**: solo su disparo
genera una.

### 5. Prioridad → comportamiento

| Prioridad | Toast | Persiste | Háptico |
|---|---|---|---|
| P0 Crítico | persistente (`duration:Infinity`, `dismissible:false`), requiere acción/cierre | sí (no silenciable) | fuerte |
| P1 Alto | ~8s | sí | suave |
| P2 Medio | ~5s | sí | — |
| P3 Bajo | ~3s auto-dismiss | normalmente no | — |

### 6. tRPC — `server/trpc/routers/notifications.ts`

`list({cursor, filter})`, `unreadCount`, `markRead(id)`, `markAllRead`, `archive(id)`,
`preferences.get`, `preferences.update`. Todo scoped por `ctx.userId`. Reemplaza `rules` como
fuente de notificaciones.

## Frontend

### 7. Toasts — Sonner (lib de Emil Kowalski) + contenido Dirección B

- `lib/notify.ts`: `notify(code, params?)` lee el catálogo y lanza un toast Sonner con
  contenido custom (`components/notifications/toast.tsx`, Dirección B: sombra, barra de
  acento lateral por tipo, barra de progreso, icono por tipo, botón sólido en P0).
- Prioridad → config Sonner (duration/dismissible). Stack con escala + expand-on-hover (default
  de Sonner). Dedupe visual por `dedupeKey`.
- Reemplaza todos los `toast.*` crudos por `notify(code)`; el `<Toaster>` de `app/layout.tsx`
  se configura (posición: bottom en móvil, bottom-right en desktop; `richColors` off — usamos
  estilo propio; `closeButton`).

### 8. Centro — panel + página

- `components/notifications/center-panel.tsx` (desktop, dropdown de la campana): agrupación por
  tiempo (Hoy/Esta semana), acento por prioridad, punto de no-leída, chips de filtro, footer
  "Ver todas".
- `app/notificaciones/page.tsx` (reescrito): centro completo — búsqueda, filtros
  (tipo/categoría/prioridad/leído), archivado, marcar todas, historial paginado.
- `components/layout/notification-bell.tsx` (reescrito): badge de `unreadCount`; abre el panel
  (desktop) o el bottom sheet (móvil).
- `components/notifications/notification-item.tsx`: fila reutilizable (panel + página + sheet).

### 9. Móvil — bottom sheet + swipe (framer-motion)

- `components/notifications/center-sheet.tsx`: bottom sheet arrastrable (drag handle,
  swipe-down para cerrar) con spring.
- `notification-item` en móvil: **swipe-actions** (← Leído / Archivar) con drag-x + snap.
- Toasts anclados abajo; swipe lateral para descartar (Sonner).
- Háptico vía `navigator.vibrate` en P0/P1 (guardado tras feature-check). Targets ≥44px,
  navegación por teclado y `aria-live` para a11y.

### 10. Animaciones (Emil Kowalski)

Sonner ya aporta el feel de Emil para toasts. Para sheet/swipe/lista uso **framer-motion**
(ya en deps `^12.40.0`): springs cortos (~150–250ms), easing consistente, motion con
propósito, respeto a `prefers-reduced-motion`. Nada gamificado.

## IA + conocimiento de la app

- Actualizar `lib/ai/app-knowledge.ts`: cómo funcionan ahora notificaciones, centro,
  prioridades P0–P3 y dónde se configuran (preferencias por categoría).
- Evaluar una coach-tool **read-only** `get_recent_notifications(limit)` para que el coach
  pueda referenciar eventos recientes ("te bloquearon la cuenta el martes"). Decisión final en
  el plan; si se añade, va en `coach-tools.ts` scoped por `userId` y se documenta en el system
  prompt.
- Mantener congruencia: ningún texto del coach debe contradecir el catálogo de mensajes.

## Estructura de archivos

```
lib/messages/{catalog,resolve,types}.ts
lib/errors/app-error.ts            (+ evolución de lib/error-formatter.ts → toUserMessage)
lib/notify.ts
server/services/notifications/emit.ts
server/trpc/routers/notifications.ts
components/notifications/{toast,notification-item,center-panel,center-sheet}.tsx
app/notificaciones/page.tsx        (reescrito)
components/layout/notification-bell.tsx (reescrito)
lib/notifications.ts               (retirar la derivación; conservar solo helpers aún usados)
prisma/schema.prisma + supabase/migrations/<ts>_notifications.sql
```

## Tests

- **Unit:** `resolveMessage` (interpolación, fallback en→es); `emitNotification` (respeta
  persist/prefs/quiet-hours/dedupe-upsert); `AppError`/`toUserMessage` (mapeo código→mensaje).
- **Router:** `notifications` (scoping por usuario, markRead/markAllRead/archive, unreadCount).
- **E2E / webapp-testing** con `ariaoc89@gmail.com`: disparar un toast (acción), abrir el
  centro, marcar leído, archivar, swipe en móvil; revisar consola sin errores.

## No-objetivos (fuera del Epic 1)

- Email/push reales (solo se modela el canal).
- Motor de reglas / builder visual (Epic 3) — aquí solo se deja el call-site `RULE_FIRED`.
- Realtime (websocket/Supabase Realtime): se usa polling con `staleTime`; el modelo queda
  realtime-ready para después.
- Entidad Etiquetas (Epic 2).

## Riesgos / notas

- **Migración:** índice único parcial por `dedupeKey` se escribe a mano en el SQL (Prisma no lo
  expresa). Sin cambios manuales en BD: todo vía `supabase/migrations/` (regla del repo).
- **Reemplazo de toasts:** hay muchos call-sites `toast.*`; migrar a `notify(code)` en lotes,
  empezando por crear códigos para los mensajes existentes.
- **No romper el bell actual** durante la transición: feature-flag o reemplazo atómico del
  proveedor de notificaciones.
