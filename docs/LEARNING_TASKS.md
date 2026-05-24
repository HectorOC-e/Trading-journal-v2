# LEARNING TASKS — Sección Aprendizaje

> **Generado:** 2026-05-24  
> **Fuente:** LEARNING_REMEDIATION_PLAN.md + auditoría de código  
> **Branch:** `claude/epic-darwin-1XZTX`  
> **Referencia encuesta:** preguntas P4-P17 de LEARNING_SURVEY (ver LEARNING_REMEDIATION_PLAN.md)

---

## Leyenda

| Símbolo | Estado |
|---------|--------|
| `[ ]` | Pendiente |
| `[/]` | En progreso |
| `[x]` | Completado |
| `[!]` | Bloqueado |
| `[?]` | Condicional — depende de encuesta |

| Símbolo | Prioridad |
|---------|-----------|
| 🔴 | CRÍTICA |
| 🟠 | ALTA |
| 🟡 | MEDIA |
| 🟢 | BAJA |

---

## FASE 0 — Correcciones Críticas

---

### TASK-L001
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`  
**Fase:** 0 — Bug fix

**Descripción:**  
Persistir los datos del modal "Revisar recurso" a la base de datos. Actualmente `learned`, `howToApply`, `insights`, `rating` se descartan silenciosamente en cada guardado.

**Causa raíz:**  
No existe tabla `resource_reviews` en el schema. El modal captura datos correctos pero `handleSave()` solo ejecuta `toggle.mutate()` y cierra.

**Cambios requeridos:**
1. Completar TASK-L003 (tabla `resource_reviews`) primero
2. Añadir mutation `trpc.learningResources.createReview` al modal
3. Conectar `form.learned`, `form.howToApply`, `form.insights`, `form.rating` al payload de la mutation
4. Actualizar `resource.rating` con el valor del review al guardar
5. Después de guardar con éxito: `invalidate` de `learningResources.list`

**Validaciones:**
- [ ] Abrir modal "Revisar", escribir en los 3 campos, guardar
- [ ] Verificar en Supabase Studio que el registro existe en `resource_reviews`
- [ ] El rating del recurso en la lista se actualiza
- [ ] El campo `nextReviewAt` se calcula y persiste si `reviewType` tiene intervalo

**Dependencias:** TASK-L003, TASK-L005  
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (`RevisarRecursoModal.handleSave`)
- `src/server/trpc/routers/learning-resources.ts` (nuevo procedure `createReview`)

---

### TASK-L002
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`  
**Fase:** 0 — Bug fix

**Descripción:**  
Implementar el menú de 3 puntos (`···`) en `ResourceCard`. Actualmente el botón es visible pero sin `onClick` — no hace nada.

**Acciones mínimas del menú (no dependen de encuesta):**
```
✏️ Editar recurso
🗑️ Eliminar (con confirmación)
✅ Marcar como completado (solo si status ≠ COMPLETED)
🗄️ Archivar (→ status ABANDONED, sin borrar)
⭐ Favorito (toggle)
```

**Acciones condicionales (activar según encuesta):**
```
🔄 Programar review → si encuesta valida spaced repetition (P9/P11)
🏆 Marcar como dominado → si status = COMPLETED o IN_REVIEW
🔗 Vincular a setup → si encuesta valida conexión (P12)
```

**Implementación sugerida:** dropdown posicionado con `position: absolute`, cierre con click outside. No requiere librería externa — shadcn/ui `DropdownMenu` si está disponible, sino implementación manual.

**Validaciones:**
- [ ] Click en `···` abre el dropdown
- [ ] Click fuera cierra el dropdown
- [ ] Editar abre modal de edición con datos pre-llenados
- [ ] Eliminar muestra confirmación antes de borrar
- [ ] Archivar cambia status a ABANDONED y el recurso desaparece de la lista principal
- [ ] Favorito actualiza el estado visualmente sin reload

**Dependencias:** TASK-L005 (para `updateStatus`, `toggleFavorite`)  
**Archivos afectados:**
- `src/components/aprendizaje/resource-card.tsx`
- `src/app/aprendizaje/page.tsx` (callbacks para editar/eliminar)

---

### TASK-L003 *(requerido por TASK-L001)*
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`  
**Fase:** 1 — Arquitectura (desbloqueador de Fase 0)

**Descripción:**  
Migración de schema: añadir campos nuevos a `learning_resources` y crear tabla `resource_reviews` en Prisma + Supabase.

**Campos nuevos en `learning_resources`:**
```prisma
status          String    @default("PENDING")
progressType    String?
totalUnits      Int?
currentUnits    Int?
nextReviewAt    DateTime? @db.Date
reviewInterval  Int?
isFavorite      Boolean   @default(false) @map("is_favorite")
rating          Int?
```

**Nueva tabla `resource_reviews`:**
```prisma
model ResourceReview {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  resourceId    String   @map("resource_id") @db.Uuid
  learned       String   @default("")
  howToApply    String   @default("") @map("how_to_apply")
  insights      String[]
  rating        Int      @default(0)
  masteryLevel  Int      @default(1) @map("mastery_level")
  reviewType    String   @default("manual") @map("review_type")
  nextReviewAt  DateTime @db.Date @map("next_review_at")
  createdAt     DateTime @default(now()) @map("created_at")

  user     User             @relation(fields: [userId],     references: [id], onDelete: Cascade)
  resource LearningResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@index([userId, nextReviewAt])
  @@index([resourceId])
  @@map("resource_reviews")
}
```

**SQL Supabase (ejecutar en orden):**
```sql
-- 1. Nuevos campos en learning_resources
ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS progress_type   TEXT,
  ADD COLUMN IF NOT EXISTS total_units     INTEGER,
  ADD COLUMN IF NOT EXISTS current_units   INTEGER,
  ADD COLUMN IF NOT EXISTS next_review_at  DATE,
  ADD COLUMN IF NOT EXISTS review_interval INTEGER,
  ADD COLUMN IF NOT EXISTS is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating          INTEGER;

-- 2. Migrar progreso existente: si progressPct > 0 → IN_PROGRESS, si 100 → COMPLETED
UPDATE learning_resources
  SET status = CASE
    WHEN progress_pct >= 100 THEN 'COMPLETED'
    WHEN progress_pct > 0    THEN 'IN_PROGRESS'
    ELSE 'PENDING'
  END;

-- 3. Nueva tabla resource_reviews
CREATE TABLE IF NOT EXISTS resource_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id    UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  learned        TEXT NOT NULL DEFAULT '',
  how_to_apply   TEXT NOT NULL DEFAULT '',
  insights       TEXT[] NOT NULL DEFAULT '{}',
  rating         INTEGER NOT NULL DEFAULT 0,
  mastery_level  INTEGER NOT NULL DEFAULT 1,
  review_type    TEXT NOT NULL DEFAULT 'manual',
  next_review_at DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS en resource_reviews
ALTER TABLE resource_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resource_reviews_user" ON resource_reviews
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5. Índices
CREATE INDEX IF NOT EXISTS resource_reviews_user_date_idx
  ON resource_reviews(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS resource_reviews_resource_idx
  ON resource_reviews(resource_id);
```

**Validaciones:**
- [ ] `npx prisma generate` sin errores
- [ ] `tsc --noEmit` sin errores
- [ ] `list_tables` MCP confirma `resource_reviews` con `rls_enabled: true`
- [ ] Registros existentes en `learning_resources` migrados a status correcto

**Dependencias:** Ninguna  
**Archivos afectados:**
- `src/prisma/schema.prisma`
- Nueva migración en Supabase

---

### TASK-L004
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 0 — Bug fix

**Descripción:**  
Implementar modal de edición de recursos. El router `learningResources.update` existe pero la página nunca lo invoca.

**Comportamiento:**  
El modal de edición es idéntico al de creación pero con datos pre-llenados. Se abre desde el menú `···` (TASK-L002 opción "Editar").

**Cambios requeridos:**
1. Reutilizar el JSX del modal de creación con estado `editMode: boolean` y `editTarget: ResourceFromDB | null`
2. Al abrir en modo edición, precargar todos los campos del formulario
3. El botón "Guardar" llama `trpc.learningResources.update.useMutation()` en lugar de `create`

**Validaciones:**
- [ ] Abrir edición de recurso existente → campos pre-llenados correctamente
- [ ] Cambiar título y guardar → lista se actualiza
- [ ] Cambiar tags → tags actualizados en BD
- [ ] Cancelar no guarda cambios

**Dependencias:** TASK-L002 (para abrir desde menú)  
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx`

---

## FASE 1 — Arquitectura Base

---

### TASK-L005
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`  
**Fase:** 1 — API

**Descripción:**  
Añadir procedimientos tRPC faltantes al router `learningResources`.

**Procedimientos a añadir:**

```typescript
// 1. Guardar review con persistencia real
createReview: protectedProcedure
  .input(z.object({
    resourceId:   z.string().uuid(),
    learned:      z.string().min(1),
    howToApply:   z.string().default(""),
    insights:     z.array(z.string()).default([]),
    rating:       z.number().int().min(0).max(5),
    masteryLevel: z.number().int().min(1).max(5).default(3),
    reviewType:   z.enum(["day1","week1","month1","month3","manual"]).default("manual"),
  }))

// 2. Actualizar progreso con unidades
updateProgress: protectedProcedure
  .input(z.object({
    id:           z.string().uuid(),
    currentUnits: z.number().int().min(0),
    totalUnits:   z.number().int().positive().optional(),
    progressType: z.enum(["manual","pages","minutes","sessions"]).optional(),
  }))
  // Calcula progressPct, actualiza status automáticamente

// 3. Actualizar estado
updateStatus: protectedProcedure
  .input(z.object({
    id:     z.string().uuid(),
    status: z.enum(["PENDING","IN_PROGRESS","COMPLETED","IN_REVIEW","MASTERED","ABANDONED"]),
  }))

// 4. Historial de reviews
listReviews: protectedProcedure
  .input(z.string().uuid())  // resourceId
  .query(...)

// 5. Toggle favorito
toggleFavorite: protectedProcedure
  .input(z.string().uuid())

// 6. Stats para panel derecho
stats: protectedProcedure
  .query(async ({ ctx }) => {
    // Calcular: completedThisMonth, pendingReviews, urgentToday, estimatedHoursWeek
  })
```

**Validaciones:**
- [ ] `tsc --noEmit` sin errores
- [ ] `createReview` persiste en `resource_reviews` y actualiza `learning_resources.rating`
- [ ] `updateProgress` calcula `progressPct` correctamente (currentUnits/totalUnits × 100)
- [ ] `updateProgress` actualiza `status` automáticamente según progreso

**Dependencias:** TASK-L003  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts`

---

## FASE 2 — Funcionalidades Core

---

### TASK-L006
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 2 — UI

**Descripción:**  
Actualizar el formulario de "Añadir recurso" para mostrar campos de progreso contextuales por tipo (no slider genérico).

**Lógica por tipo:**

| Tipo | Campos de progreso en formulario |
|------|----------------------------------|
| VIDEO | "Minutos vistos" + "Duración total (min)" |
| PODCAST | Igual que VIDEO |
| LIBRO | "Página actual" + "Total páginas" |
| DRILL | "Sesiones completadas" + "Sesiones objetivo" |
| BACKTEST | Igual que DRILL |
| NOTA | Sin campos de progreso — solo badge de estado |
| HERRAMIENTA | Sin campos de progreso — solo badge de estado |

**Comportamiento:**  
Al cambiar el `type` en el selector, el área de progreso se re-renderiza con los campos adecuados. El `progressType` se infiere automáticamente del tipo (`VIDEO` → `minutes`, `LIBRO` → `pages`, etc.).

**Validaciones:**
- [ ] Seleccionar VIDEO → aparecen campos "Minutos vistos / Duración total"
- [ ] Seleccionar LIBRO → aparecen campos "Página actual / Total páginas"
- [ ] Seleccionar NOTA → desaparecen campos de progreso
- [ ] Al guardar, `progressType`, `totalUnits`, `currentUnits` se persisten en BD
- [ ] `progressPct` se calcula correctamente en el backend

**Dependencias:** TASK-L003, TASK-L005  
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (sección del formulario de progreso)

---

### TASK-L007
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 2 — UI

**Descripción:**  
Actualizar `ResourceCard` para mostrar progreso con unidades reales.

**Behavior actual:** `"Progreso: 25%"` + barra  
**Behavior nuevo:**
- VIDEO: `"1h 30m de 10h · 15%"` + barra
- LIBRO: `"120 de 350 páginas · 34%"` + barra
- DRILL: `"8 de 20 sesiones · 40%"` + barra
- NOTA: Badge de estado (`LEÍDO` / `APLICADO`) sin barra

Añadir badge de estado al card: pill coloreado en la esquina superior derecha según status.

```
PENDING      → gris       "Pendiente"
IN_PROGRESS  → azul       "En progreso"
COMPLETED    → verde      "Completado"
IN_REVIEW    → naranja    "Revisar"
MASTERED     → verde vivo "Dominado"
ABANDONED    → gris tenue "Archivado"
```

Si `nextReviewAt` está presente y es ≤ hoy + 3 días: mostrar countdown `"Review en 2 días"` en naranja.

**Validaciones:**
- [ ] Card de VIDEO con `currentUnits=90, totalUnits=600` muestra `"1h 30m de 10h · 15%"`
- [ ] Badge de status correcto para cada estado
- [ ] Countdown de review en naranja cuando `nextReviewAt ≤ hoy + 3 días`
- [ ] Card de NOTA sin barra de progreso

**Dependencias:** TASK-L003, TASK-L006  
**Archivos afectados:**
- `src/components/aprendizaje/resource-card.tsx`

---

### TASK-L008
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 2 — UI

**Descripción:**  
Añadir control inline de actualización de progreso en el card (sin abrir modal).

**Comportamiento:**  
En el footer del card, junto al botón "Revisar", añadir un pequeño control para actualizar el progreso sin abrir ningún modal:
- Para VIDEO/PODCAST/LIBRO: mini input numérico `[  90  ] / 600 min` con botón confirmar
- El valor se actualiza en tiempo real en la barra
- Al confirmar, llama `trpc.learningResources.updateProgress.useMutation()`

**Justificación UX:**  
El flujo más frecuente es: "terminé de ver más del video, quiero actualizar el progreso". Abrir un modal completo para eso tiene demasiada fricción.

**Validaciones:**
- [ ] El input de progreso es visible en el footer del card
- [ ] Al escribir un número y presionar Enter (o click en check), el progreso se actualiza
- [ ] Si `currentUnits >= totalUnits`, el status cambia automáticamente a COMPLETED
- [ ] La barra de progreso se anima al nuevo valor

**Dependencias:** TASK-L005 (`updateProgress`), TASK-L007  
**Archivos afectados:**
- `src/components/aprendizaje/resource-card.tsx`

---

## FASE 3 — Sistema de Review

---

### TASK-L009
**Prioridad:** 🟠 ALTA  
**Estado:** `[?]`  
**Fase:** 3 — Spaced repetition  
**Condición:** Activar si encuesta P9 responde A/B mayoritariamente

**Descripción:**  
Implementar la lógica de cálculo de `nextReviewAt` en el procedimiento `createReview`.

**Lógica:**
```typescript
const INTERVALS = { day1: 1, week1: 7, month1: 30, month3: 90 }

function nextReviewDate(reviewType: string, masteryLevel: number): Date {
  const base = INTERVALS[reviewType as keyof typeof INTERVALS] ?? 7
  const days = masteryLevel <= 2 ? Math.ceil(base / 2) : base
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
```

Al guardar un review → actualizar `learning_resources.nextReviewAt` + `learning_resources.reviewInterval`.

**Validaciones:**
- [ ] Review con `masteryLevel=5` en `week1` → `nextReviewAt = hoy + 7`
- [ ] Review con `masteryLevel=1` en `week1` → `nextReviewAt = hoy + 4`
- [ ] `learning_resources.nextReviewAt` actualizado después de crear review
- [ ] Card muestra countdown correcto

**Dependencias:** TASK-L001, TASK-L005  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (`createReview`)

---

### TASK-L010
**Prioridad:** 🟡 MEDIA  
**Estado:** `[?]`  
**Fase:** 3  
**Condición:** Activar si encuesta P9 responde A/B mayoritariamente

**Descripción:**  
Actualizar el modal de review para incluir selector de intervalo y nivel de maestría.

**Cambios al `RevisarRecursoModal`:**
1. Añadir selector "¿Qué tan bien lo dominas?" (escala 1-5 con labels)
2. Añadir selector de `reviewType` si P11 valida intervalos configurables por recurso
3. Mostrar la fecha calculada del próximo review antes de guardar

**Validaciones:**
- [ ] El modal muestra el nivel de maestría antes de guardar
- [ ] Se calcula y muestra "Próximo review: 15 jun 2026" dinámicamente
- [ ] Al guardar, el `nextReviewAt` correcto se persiste

**Dependencias:** TASK-L001, TASK-L009  
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (`RevisarRecursoModal`)

---

## FASE 4 — Panel Derecho Real

---

### TASK-L011
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 4 — Stats

**Descripción:**  
Implementar el procedimiento `learningResources.stats` y conectarlo al panel lateral.

**Datos que debe calcular:**
```typescript
{
  // Sin condición de encuesta:
  totalResources:     number
  completedThisMonth: number
  pendingReviewsCount: number
  urgentToday:        ResourceSummary[]  // nextReviewAt <= today
  resourcesByStatus:  Record<string, number>

  // Condicional P6 (horas):
  estimatedHoursThisWeek: number  // suma de currentUnits actualizados esta semana / 60

  // Condicional P15 (streak):
  currentStreak: number
  bestStreak:    number
}
```

**Sección "Foco del día":**  
Lógica: si hay urgentToday[0] → ese recurso. Si no → IN_PROGRESS con mayor progressPct. Si no → PENDING más antiguo.

**Validaciones:**
- [ ] `completedThisMonth` cuenta solo recursos completados en el mes actual
- [ ] `urgentToday` incluye solo recursos con `nextReviewAt <= hoy`
- [ ] "Foco del día" muestra el recurso correcto según prioridad

**Dependencias:** TASK-L003, TASK-L005  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (procedure `stats`)
- `src/app/aprendizaje/page.tsx` (panel derecho)

---

### TASK-L012
**Prioridad:** 🟡 MEDIA  
**Estado:** `[?]`  
**Fase:** 4  
**Condición:** Activar si encuesta P15 valida streaks (A/B/E mayoritario)

**Descripción:**  
Implementar cálculo de racha de aprendizaje real.

**Definición de racha:**  
Un día cuenta si el usuario completó al menos 1 review (`resource_reviews.created_at`) o actualizó progreso (`learning_resources.updated_at`) en ese día calendario.

**Cálculo en el backend:**
```typescript
// En learningResources.stats:
const reviewDates = await ctx.prisma.resourceReview.findMany({
  where: { userId: ctx.userId },
  select: { createdAt: true },
  orderBy: { createdAt: 'desc' },
})
// contar días consecutivos hacia atrás desde hoy
```

**Validaciones:**
- [ ] La racha es 0 si el usuario no tiene reviews
- [ ] La racha es 1 si el último review fue ayer o hoy
- [ ] La racha se rompe si no hay actividad en un día
- [ ] El panel derecho muestra el número correcto

**Dependencias:** TASK-L001, TASK-L011  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (procedure `stats`)
- `src/app/aprendizaje/page.tsx` (sección racha en panel derecho)

---

## FASE 5 — Conexión Aprendizaje↔Trading

---

### TASK-L013
**Prioridad:** 🟡 MEDIA  
**Estado:** `[?]`  
**Fase:** 5  
**Condición:** Activar solo si encuesta P12 responde A mayoritariamente

**Descripción:**  
Implementar relación many-to-many entre `LearningResource` y `Setup`.

**Schema:**
```prisma
model LearningResource {
  linkedSetups Setup[] @relation("ResourceSetups")
}
model Setup {
  linkedResources LearningResource[] @relation("ResourceSetups")
}
```

**Nuevos procedimientos:**
```typescript
learningResources.linkSetup:   { input: { resourceId, setupId } }
learningResources.unlinkSetup: { input: { resourceId, setupId } }
learningResources.listBySetup: { input: { setupId } }
```

**UI:**  
Opción "Vincular a setup" en el menú `···`. Abre selector de setups del usuario (dropdown con `trpc.setups.list`). Los setups vinculados aparecen como chips en el card.

**Validaciones:**
- [ ] Vincular recurso a setup → chip visible en el card
- [ ] Desvincular → chip desaparece
- [ ] Desde el Playbook, un setup muestra los recursos vinculados

**Dependencias:** TASK-L002 (menú `···`), TASK-L003  
**Archivos afectados:**
- `src/prisma/schema.prisma`
- `src/server/trpc/routers/learning-resources.ts`
- `src/components/aprendizaje/resource-card.tsx`

---

## FASE 6 — Gamificación

---

### TASK-L014
**Prioridad:** 🟢 BAJA  
**Estado:** `[?]`  
**Fase:** 6  
**Condición:** Activar si encuesta P16 responde A/B/C/E mayoritariamente

**Descripción:**  
Implementar objetivos semanales de aprendizaje con widget en el panel derecho.

**Si P16-E (configurable):** Añadir campo `weeklyGoalMinutes Int?` en settings de usuario.  
**Si P16-A (tiempo):** Meta fija en horas + progreso de la semana actual.

**Validaciones:**
- [ ] Widget muestra progreso vs meta semanal
- [ ] Se reinicia automáticamente cada lunes
- [ ] Si es configurable, la meta se guarda por usuario

**Dependencias:** TASK-L011  

---

### TASK-L015
**Prioridad:** 🟢 BAJA  
**Estado:** `[?]`  
**Fase:** 6  
**Condición:** Activar si encuesta P17 incluye A o C mayoritariamente

**Descripción:**  
Implementar resumen semanal por email (si P17-C) o notificaciones push (si P17-A).

**Si solo P17-B (visual):** Esta tarea NO se implementa — los indicadores visuales ya están cubiertos en TASK-L007 y TASK-L011.

**Nota:** Notificaciones push requieren service worker + FCM. Email requiere integración con Resend. Evaluar scope real después de encuesta.

**Dependencias:** TASK-L011, TASK-L012  

---

## Resumen de Prioridades

| Prioridad | Tasks |
|-----------|-------|
| 🔴 CRÍTICA | TASK-L001, TASK-L002, TASK-L003, TASK-L005 |
| 🟠 ALTA | TASK-L004, TASK-L006, TASK-L007, TASK-L008, TASK-L009, TASK-L011 |
| 🟡 MEDIA | TASK-L010, TASK-L012, TASK-L013 |
| 🟢 BAJA | TASK-L014, TASK-L015 |

## Orden de Ejecución Recomendado

```
Sprint 1 (sin encuesta — bugs críticos + arquitectura):
  TASK-L003 → TASK-L005 → TASK-L001 → TASK-L002 → TASK-L004

Sprint 2 (sin encuesta — core UX):
  TASK-L006 → TASK-L007 → TASK-L008 → TASK-L011

Sprint 3 (post-encuesta — spaced repetition):
  TASK-L009 → TASK-L010 → TASK-L012  [si P9 A/B]

Sprint 4 (post-encuesta — conexiones y gamificación):
  TASK-L013  [si P12 A]
  TASK-L014  [si P16 A/B/C/E]
  TASK-L015  [si P17 A/C]
```

---

*Backlog generado a partir de auditoría técnica real del código fuente. Cada task incluye archivo específico, comportamiento objetivo, validaciones concretas y condiciones de encuesta.*
