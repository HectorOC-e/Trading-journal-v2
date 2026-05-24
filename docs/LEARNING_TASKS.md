# LEARNING TASKS — Sección Aprendizaje

> **Generado:** 2026-05-24  
> **Actualizado con encuesta:** 2026-05-24 — encuesta completada (18 respuestas)  
> **Fuente:** LEARNING_REMEDIATION_PLAN.md + auditoría de código  
> **Branch:** `claude/epic-darwin-1XZTX`  
> **Resultados encuesta:** P4=min, P5=pág, P6=A(hrs), P7=B(ses+score), P8=B, P9=B(✅activado), P10=B, P11=D(intervalo por recurso), P12=A(✅activado), P13=A(killer feature), P14=B, P15=E(calidad), P16=E(configurable), P17=B+C+E(visual+email, NO push)

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
                          // PENDING | IN_PROGRESS | COMPLETED | IN_REVIEW | MASTERED | ABANDONED
progressType    String?   // 'manual' | 'pages' | 'minutes' | 'sessions'
totalUnits      Int?      // páginas | minutos | sesiones objetivo
currentUnits    Int?      // páginas leídas | minutos vistos | sesiones hechas
avgScore        Decimal?  @map("avg_score")   // P7-B: score promedio de sesiones DRILL
nextReviewAt    DateTime? @db.Date
reviewInterval  Int?      // P11-D: días al próximo review, configurable por recurso
isFavorite      Boolean   @default(false) @map("is_favorite")
rating          Int?      // valoración 1-5 del review más reciente
completedAt     DateTime? @map("completed_at") // para métricas de impacto (TASK-L016)
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
  ADD COLUMN IF NOT EXISTS avg_score       DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS next_review_at  DATE,
  ADD COLUMN IF NOT EXISTS review_interval INTEGER,
  ADD COLUMN IF NOT EXISTS is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating          INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;

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
**Estado:** `[ ]`  
**Fase:** 3 — Spaced repetition  
**Activado por:** P9-B (reminder visual) + P11-D (intervalo por recurso — NO intervalos fijos globales)

**Descripción:**  
Implementar la lógica de cálculo de `nextReviewAt` en el procedimiento `createReview`, usando el `reviewInterval` del recurso (configurable por el usuario en el editor de cada recurso) en lugar de intervalos fijos globales.

**Arquitectura (P11-D):**  
Cada recurso tiene su propio `reviewInterval` (días). El usuario define cuántos días quiere entre reviews de ese recurso específico al crearlo o editarlo (campo "Cada cuántos días revisar", default: 7). Al guardar un review, `nextReviewAt` se calcula así:

```typescript
function nextReviewDate(reviewInterval: number, masteryLevel: number): Date {
  let days: number
  if (masteryLevel <= 2) {
    // No dominado → repetir más pronto (mitad del intervalo)
    days = Math.max(1, Math.ceil(reviewInterval / 2))
  } else if (masteryLevel >= 4) {
    // Bien dominado → espaciar más (1.5× el intervalo)
    days = Math.round(reviewInterval * 1.5)
  } else {
    // Neutral → usar el intervalo configurado
    days = reviewInterval
  }
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
```

Al guardar un review → actualizar `learning_resources.nextReviewAt`.

**Cambio en formulario (TASK-L006):**  
Añadir campo "Revisar cada X días" (number input, default 7) al formulario de creación/edición. Este valor se guarda en `reviewInterval`.

**Validaciones:**
- [ ] Recurso con `reviewInterval=14`, `masteryLevel=5` → `nextReviewAt = hoy + 21`
- [ ] Recurso con `reviewInterval=14`, `masteryLevel=1` → `nextReviewAt = hoy + 7`
- [ ] Recurso con `reviewInterval=14`, `masteryLevel=3` → `nextReviewAt = hoy + 14`
- [ ] `learning_resources.nextReviewAt` actualizado después de crear review
- [ ] Card muestra countdown correcto
- [ ] Si `reviewInterval` es null, usar default de 7 días

**Dependencias:** TASK-L001, TASK-L005  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (`createReview`)
- `src/app/aprendizaje/page.tsx` (formulario creación — campo `reviewInterval`)

---

### TASK-L010
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`  
**Fase:** 3  
**Activado por:** P9-B + P11-D

**Descripción:**  
Actualizar el modal "Revisar recurso" para incluir nivel de maestría y mostrar la fecha calculada del próximo review.

**Cambios al `RevisarRecursoModal`:**
1. Añadir selector "¿Qué tan bien lo dominas?" (escala 1-5 con labels: 1=Confundido, 2=Parcial, 3=Entiendo, 4=Fluido, 5=Dominado)
2. Mostrar dinámicamente la fecha calculada: "Próximo review: 15 jun 2026" — calculada con `reviewInterval` del recurso y el mastery level seleccionado
3. **NO** añadir selector de `reviewType` fijo (días: 1/7/30/90) — ese modelo fue descartado por P11-D. El intervalo se configura en el recurso, no en cada review.

**Validaciones:**
- [ ] El modal muestra el selector de nivel de maestría (1-5)
- [ ] La fecha del próximo review se actualiza en tiempo real al mover el selector
- [ ] Al guardar, el `nextReviewAt` correcto se persiste en BD
- [ ] Si el recurso no tiene `reviewInterval`, usa 7 días como default

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
**Estado:** `[ ]`  
**Fase:** 4  
**Activado por:** P15-E (solo calidad — streaks basados en reviews completados, NO en logins ni updates de progreso)

**Descripción:**  
Implementar cálculo de racha de aprendizaje basada en reviews de calidad.

**Definición de racha (P15-E — calidad sobre cantidad):**  
Un día cuenta ÚNICAMENTE si el usuario creó al menos 1 review en `resource_reviews` ese día calendario. Actualizar el slider de progreso NO cuenta para la racha. La racha mide reflexión activa, no consumo pasivo.

**Cálculo en el backend:**
```typescript
// En learningResources.stats:
const reviewDates = await ctx.prisma.resourceReview.findMany({
  where: { userId: ctx.userId },
  select: { createdAt: true },
  orderBy: { createdAt: 'desc' },
})
// Extraer días únicos (YYYY-MM-DD en la timezone del usuario)
// Contar días consecutivos hacia atrás desde hoy
// Si el último día de review es ayer o hoy → racha activa
// Si el último día fue hace ≥ 2 días → racha = 0
```

**Display:**  
"Racha: 12 días de review" — no llamarla "streak de aprendizaje" para evitar confusión con logins.

**Validaciones:**
- [ ] La racha es 0 si el usuario no tiene ningún review
- [ ] Actualizar progreso de un recurso NO incrementa la racha
- [ ] La racha es 1 si el último review fue hoy o ayer
- [ ] La racha se rompe si no hay reviews en 2 días consecutivos
- [ ] El panel derecho muestra el número correcto
- [ ] `bestStreak` histórico se calcula correctamente

**Dependencias:** TASK-L001, TASK-L011  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (procedure `stats`)
- `src/app/aprendizaje/page.tsx` (sección racha en panel derecho)

---

## FASE 5 — Conexión Aprendizaje↔Trading

---

### TASK-L013
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 5  
**Activado por:** P12-A ("muy útil, contexto de origen del setup") — ACTIVADO CON ALTA PRIORIDAD

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
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`  
**Fase:** 6  
**Activado por:** P16-E (el usuario define sus propias metas — NO metas predefinidas)

**Descripción:**  
Implementar objetivos semanales de aprendizaje configurables por el usuario.

**Arquitectura (P16-E):**  
El usuario define su propia meta semanal (por defecto: 5 horas/semana). El campo `weeklyGoalMinutes Int?` se añade al modelo `User` (o tabla separada de preferencias).

**Cambios requeridos:**
1. Añadir `weeklyGoalMinutes Int? @map("weekly_goal_minutes")` al model `User` en schema Prisma
2. SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal_minutes INTEGER DEFAULT 300;`
3. Nuevo procedure: `trpc.user.updateLearningGoal` (o en settings existentes)
4. Widget en panel derecho: barra de progreso semana actual vs meta configurada
5. Botón "Editar meta" que abre un input inline para cambiar el valor

**Cálculo de progreso semanal:**  
Suma de `currentUnits` actualizados esta semana (lunes-domingo) para recursos tipo `minutes`. Dividir entre 60 para convertir a horas.

**Display:**
```
Esta semana: 3h 20m  ████████░░  Meta: 5h  [Editar meta]
```

**Validaciones:**
- [ ] Widget muestra progreso vs meta del lunes al domingo actual
- [ ] La meta se guarda por usuario y persiste entre sesiones
- [ ] El progreso se reinicia automáticamente cada lunes
- [ ] Editar meta actualiza la barra en tiempo real

**Dependencias:** TASK-L011  
**Archivos afectados:**
- `src/prisma/schema.prisma` (campo en `User`)
- `src/server/trpc/routers/learning-resources.ts` (incluir en `stats`)
- `src/app/aprendizaje/page.tsx` (widget en panel derecho)  

---

### TASK-L015
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]` *(parcial — email + alerta inactividad SÍ, push NO)*  
**Fase:** 6  
**Activado por:** P17-C (email semanal ✅) + P17-E (alerta inactividad ✅) — P17-A (push) ❌ NO implementar

**Descripción:**  
Implementar resumen semanal por email y alerta de inactividad. Las notificaciones push quedan fuera de scope.

**Scope confirmado:**
- ✅ **Email semanal** (P17-C): Resumen cada lunes con recursos completados la semana anterior, reviews pendientes y progreso semanal vs meta. Integración con Resend via Supabase Edge Function.
- ✅ **Alerta de inactividad** (P17-E): Si el usuario no tiene ningún review en 7 días → email con "No has revisado ningún recurso en una semana. Tu próximo review pendiente es: [recurso]".
- ❌ **Push notifications** (P17-A): NO implementar — requiere service worker + FCM, complejidad innecesaria dado que P17-A no fue la respuesta principal.

**Implementación mínima (email):**
1. Supabase Edge Function `weekly-learning-summary` disparada por `pg_cron` cada lunes 9:00 AM
2. Query: usuarios con ≥1 recurso en los últimos 30 días
3. Para cada usuario: calcular stats de la semana anterior
4. Enviar via Resend con plantilla HTML simple

**Validaciones:**
- [ ] Edge Function desplegada y testeable manualmente
- [ ] El email incluye: recursos completados, reviews pendientes, progreso semanal
- [ ] La alerta de inactividad se dispara solo si no hay reviews en los últimos 7 días
- [ ] El usuario puede desactivar los emails desde sus preferencias

**Dependencias:** TASK-L011, TASK-L012, TASK-L014  
**Archivos afectados:**
- Nueva Edge Function en Supabase
- `src/prisma/schema.prisma` (campo `emailNotifications Boolean @default(true)` en User)  

---

---

### TASK-L016
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`  
**Fase:** 5 — Conexión Aprendizaje↔Trading  
**Activado por:** P13-A ("Setup 72% WR desde que estudiaste X" — killer feature) + P18 (aprendizaje no separado del trading real)

**Descripción:**  
Calcular y mostrar el winrate de cada setup vinculado DESDE que el usuario completó el recurso asociado. Es la métrica que cierra el loop entre aprendizaje y resultados reales.

**El dato objetivo:**
```
"El Doble Techo tiene 72% WR (18/25 trades) desde que completaste
 'ICT Liquidity Sweeps' el 15 mar 2026"
```

**Requiere:**
- `learning_resources.completedAt` (ya incluido en TASK-L003 — se puebla cuando `status` → COMPLETED)
- La relación many-to-many `LearningResource ↔ Setup` de TASK-L013
- Acceso a `trades` de ese setup filtrados por `trade.date > completedAt`

**Nuevo procedimiento:**
```typescript
learningResources.setupImpact: protectedProcedure
  .input(z.string().uuid())  // resourceId
  .query(async ({ ctx, input }) => {
    const resource = await ctx.prisma.learningResource.findUniqueOrThrow({
      where: { id: input, userId: ctx.userId },
      select: { completedAt: true, linkedSetups: { select: { id: true, name: true } } },
    })
    if (!resource.completedAt) return []

    return Promise.all(
      resource.linkedSetups.map(async (setup) => {
        const trades = await ctx.prisma.trade.findMany({
          where: {
            userId: ctx.userId,
            setupId: setup.id,
            date: { gte: resource.completedAt! },
          },
          select: { outcome: true },
        })
        const wins = trades.filter(t => t.outcome === 'WIN').length
        return {
          setupId: setup.id,
          setupName: setup.name,
          totalTrades: trades.length,
          wins,
          winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : null,
          completedAt: resource.completedAt,
        }
      })
    )
  })
```

**Display:**  
Panel inferior del detalle de recurso (o tooltip en hover del chip de setup vinculado):
```
📊 Impacto en trading
Doble Techo  72% WR (18/25) desde 15 mar 2026
ICT OB        65% WR (13/20) desde 15 mar 2026
```

Si `completedAt` es null: "Completa este recurso para empezar a medir su impacto."  
Si `trades.length < 5`: "Pocos datos — necesitas al menos 5 trades para estadística confiable."

**Validaciones:**
- [ ] Recurso sin `completedAt` → mensaje "Completa el recurso primero"
- [ ] Recurso completado con setup vinculado y ≥1 trade posterior → WR correcto
- [ ] Trades anteriores a `completedAt` no se cuentan
- [ ] Muestra aviso de "pocos datos" si `totalTrades < 5`

**Dependencias:** TASK-L003 (`completedAt`), TASK-L013 (relación many-to-many)  
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (procedure `setupImpact`)
- `src/app/aprendizaje/page.tsx` (panel de detalle de recurso)
- `src/components/aprendizaje/resource-card.tsx` (chips de setups vinculados)

---

## Resumen de Prioridades

> **Encuesta completada — todos los condicionales resueltos.**

| Prioridad | Tasks |
|-----------|-------|
| 🔴 CRÍTICA | TASK-L001, TASK-L002, TASK-L003, TASK-L005 |
| 🟠 ALTA | TASK-L004, TASK-L006, TASK-L007, TASK-L008, TASK-L009, TASK-L011, TASK-L013, TASK-L016 |
| 🟡 MEDIA | TASK-L010, TASK-L012, TASK-L014 |
| 🟢 BAJA | TASK-L015 |

## Orden de Ejecución Recomendado

```
Sprint 1 — Bugs críticos + arquitectura:
  TASK-L003 → TASK-L005 → TASK-L001 → TASK-L002 → TASK-L004

Sprint 2 — Core UX + progreso real:
  TASK-L006 → TASK-L007 → TASK-L008 → TASK-L011

Sprint 3 — Spaced repetition (ACTIVADO P9-B):
  TASK-L009 → TASK-L010 → TASK-L012

Sprint 4 — Conexión aprendizaje↔trading (ACTIVADO P12-A + P13-A):
  TASK-L013 → TASK-L016

Sprint 5 — Gamificación (ACTIVADO P16-E + P17-C):
  TASK-L014 → TASK-L015
```

---

*Backlog generado a partir de auditoría técnica real del código fuente. Cada task incluye archivo específico, comportamiento objetivo, validaciones concretas y condiciones de encuesta.*
