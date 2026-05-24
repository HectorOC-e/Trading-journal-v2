# LEARNING REMEDIATION PLAN — Sección Aprendizaje

> **Generado:** 2026-05-24  
> **Fuente:** Auditoría técnica de `src/app/aprendizaje/page.tsx`, `src/components/aprendizaje/`, `src/server/trpc/routers/learning-resources.ts`, schema Prisma, y análisis UX/producto  
> **Branch:** `claude/epic-darwin-1XZTX`

---

## Índice de Fases

| # | Fase | Prioridad | Tipo | Bloquea encuesta |
|---|------|-----------|------|-----------------|
| 0 | [Correcciones Críticas](#fase-0--correcciones-críticas) | 🔴 CRÍTICA | Bug fixes + CRUD básico | No |
| 1 | [Arquitectura Base](#fase-1--arquitectura-base) | 🔴 ALTA | Schema + API | No |
| 2 | [Funcionalidades Core](#fase-2--funcionalidades-core) | 🟠 ALTA | Progreso real + Status | No |
| 3 | [Sistema de Review](#fase-3--sistema-de-review) | 🟠 MEDIA | Spaced repetition | **Sí — depende P9/P11** |
| 4 | [Panel Derecho Real](#fase-4--panel-derecho-real) | 🟡 MEDIA | Stats + Analytics | Parcial — depende P6 |
| 5 | [Conexión Aprendizaje↔Trading](#fase-5--conexión-aprendizajetrading) | 🟡 MEDIA | Vinculación recurso↔setup | **Sí — depende P12/P14** |
| 6 | [Gamificación](#fase-6--gamificación) | 🟢 BAJA | Streaks + Goals | **Sí — depende P15/P16/P17** |

---

## Estado de encuesta

> La encuesta UX/Product Discovery debe completarse antes de iniciar Fases 3, 5 y 6.  
> Las Fases 0, 1 y 2 pueden ejecutarse en paralelo con la distribución de la encuesta.

---

## FASE 0 — Correcciones Críticas

**Objetivo:** Eliminar bugs reales y funcionalidades rotas que degradan la experiencia actual.  
**No requiere validación de encuesta.**

---

### Problema 0.1 — Datos del modal "Revisar" se descartan silenciosamente

**Sistema afectado:** `src/app/aprendizaje/page.tsx` — función `RevisarRecursoModal.handleSave()`

**Problema detectado:**  
El modal captura 5 campos de valor real (`learned`, `howToApply`, `insights`, `rating`, `linkedReviewId`) pero `handleSave()` solo llama `toggle.mutate()` condicionalmente y cierra el modal. Los datos se descartan en cada guardado. El usuario cree que está persistiendo su aprendizaje — no lo hace.

```typescript
// Código actual — datos ignorados:
function handleSave() {
  if (form.markDone && resource != null && resource.markedForReview) {
    toggle.mutate(resource.id)  // solo esto se ejecuta
  }
  onOpenChange(false)          // form.learned / insights / rating → basura
  setForm(emptyRevisarState())
}
```

**Causa raíz:** No existe tabla `resource_reviews` en el schema. El router no tiene procedimiento `createReview`.

**Riesgo:** 🔴 CRÍTICO — El usuario pierde trabajo intelectual. Confianza rota con la funcionalidad.

**Dependencias:** Requiere Problema 1.1 (nueva tabla) antes de poder arreglar.

---

### Problema 0.2 — Menú `···` completamente no funcional

**Sistema afectado:** `src/components/aprendizaje/resource-card.tsx` — botón `MoreHorizontal`

**Problema detectado:**  
El botón tiene aria-label `"Más opciones"` y aparece en hover, pero no tiene `onClick`. No existe dropdown, no existe estado de menú abierto, no hay ninguna acción conectada. El usuario hace click — nada ocurre.

```typescript
// Código actual:
<button
  className="text-[var(--ink-3)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 ..."
  aria-label="Más opciones"
  // ← sin onClick, sin estado, sin dropdown
>
  <MoreHorizontal size={15} />
</button>
```

**Riesgo:** 🟠 ALTO — El usuario espera interacción. El botón visible sin función daña la percepción de calidad.

**Acciones mínimas para el menú:**
- Editar recurso
- Eliminar recurso (con confirmación)
- Marcar como completado (si progressPct < 100)
- Archivar (estado ABANDONED sin borrar)

---

### Problema 0.3 — Sin capacidad de edición de recursos

**Sistema afectado:** `src/app/aprendizaje/page.tsx` — no existe modal de edición

**Problema detectado:**  
El router `learningResources.update` existe y está implementado correctamente, pero la página nunca lo llama. No existe ningún modal ni flujo de edición. Un typo en el título o cambio de autor requiere borrar y recrear el recurso.

**Riesgo:** 🟠 ALTO — CRUD básico incompleto.

---

### Problema 0.4 — "Racha de aprendizaje" muestra dato incorrecto

**Sistema afectado:** `src/app/aprendizaje/page.tsx` línea 559

**Problema detectado:**  
```typescript
// Código actual:
<div ... style={{ background: "var(--accent)" }}>
  {resources.length}  ← muestra total de recursos, no días de racha
</div>
<p>...{resources.length} recursos añadidos</p>
```
El número en el círculo es `resources.length` — un contador de recursos totales presentado visualmente como una racha. No tiene ninguna lógica de días consecutivos.

**Riesgo:** 🟡 MEDIO — Métrica engañosa que pierde credibilidad cuando el usuario la analiza.

---

## FASE 1 — Arquitectura Base

**Objetivo:** Añadir al schema y a la API las estructuras de datos necesarias para soportar el sistema completo.  
**No requiere validación de encuesta.**

---

### Problema 1.1 — Schema insuficiente para reviews y progreso real

**Sistema afectado:** `src/prisma/schema.prisma` — modelo `LearningResource`

**Schema actual:**
```prisma
model LearningResource {
  progressPct     Int?     // slider 0-100, sin unidades
  notes           String   // notas de creación, no de review
  // ← sin tabla de reviews
  // ← sin status
  // ← sin progressType/totalUnits/currentUnits
  // ← sin nextReviewAt
}
```

**Schema objetivo:**
```prisma
model LearningResource {
  // Campos existentes (sin cambios)
  id, userId, title, type, author, source, date, notes, tags, markedForReview, createdAt, updatedAt

  // Campos nuevos:
  status          String    @default("PENDING")
                            // PENDING | IN_PROGRESS | COMPLETED | IN_REVIEW | MASTERED | ABANDONED
  progressType    String?   // 'manual' | 'pages' | 'minutes' | 'sessions'
  totalUnits      Int?      // páginas totales | minutos totales | sesiones objetivo
  currentUnits    Int?      // páginas leídas | minutos vistos | sesiones completadas
  nextReviewAt    DateTime? @db.Date
  reviewInterval  Int?      // días hasta próximo review: 1 | 7 | 30 | 90
  isFavorite      Boolean   @default(false) @map("is_favorite")
  rating          Int?      // última valoración 1-5 (del review más reciente)

  reviews         ResourceReview[]

  @@map("learning_resources")
}

model ResourceReview {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  resourceId    String   @map("resource_id") @db.Uuid
  learned       String   @default("") @map("learned")
  howToApply    String   @default("") @map("how_to_apply")
  insights      String[] @default([])
  rating        Int      @default(0)
  masteryLevel  Int      @default(1) @map("mastery_level") // 1-5
  reviewType    String   @default("manual") @map("review_type")
                         // 'day1' | 'week1' | 'month1' | 'month3' | 'manual'
  nextReviewAt  DateTime @db.Date @map("next_review_at")
  createdAt     DateTime @default(now()) @map("created_at")

  user     User             @relation(fields: [userId],     references: [id], onDelete: Cascade)
  resource LearningResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@index([userId, nextReviewAt])
  @@index([resourceId])
  @@map("resource_reviews")
}
```

**Notas de migración:**
- `progressPct` se mantiene por compatibilidad pero se convierte en campo computado para tipos con unidades
- `status` se inicializa a `"PENDING"` para todos los registros existentes
- Añadir RLS en `resource_reviews` al momento de crear la tabla

---

### Problema 1.2 — Router sin procedimientos para reviews ni progreso por unidades

**Sistema afectado:** `src/server/trpc/routers/learning-resources.ts`

**Procedimientos faltantes:**

```typescript
// Persistir un review completo
learningResources.createReview: {
  input: { resourceId, learned, howToApply, insights[], rating, masteryLevel, reviewType }
  returns: ResourceReview + actualiza resource.nextReviewAt + resource.rating
}

// Actualizar progreso por unidades (VIDEO/LIBRO/PODCAST)
learningResources.updateProgress: {
  input: { id, currentUnits, totalUnits?, progressType? }
  returns: { progressPct: computed, status: computed, resource }
  // progressPct = Math.round(currentUnits / totalUnits * 100)
  // status auto-transición: 0 → PENDING, 1-99 → IN_PROGRESS, 100 → COMPLETED
}

// Actualizar estado explícitamente
learningResources.updateStatus: {
  input: { id, status: 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'IN_REVIEW'|'MASTERED'|'ABANDONED' }
}

// Historial de reviews de un recurso
learningResources.listReviews: {
  input: { resourceId }
  returns: ResourceReview[]
}

// Estadísticas del panel derecho
learningResources.stats: {
  returns: {
    totalResources: number
    completedThisMonth: number
    pendingReviews: number        // nextReviewAt <= today
    urgentReviews: ResourceSummary[]
    estimatedHoursThisWeek: number // suma de minutos/60 para recursos actualizados esta semana
    currentStreak: number          // depende de encuesta P15
    resourcesByStatus: Record<status, number>
  }
}

// Toggle favorito
learningResources.toggleFavorite: { input: id }
```

---

## FASE 2 — Funcionalidades Core

**Objetivo:** Implementar el sistema de progreso real por tipo y el ciclo de estados del recurso.  
**No requiere validación de encuesta.**

---

### Problema 2.1 — Progreso sin unidades semánticas

**Sistema afectado:** `src/app/aprendizaje/page.tsx` + `src/components/aprendizaje/resource-card.tsx`

**Problema detectado:**  
El slider de 0-100 no tiene unidades. "50% de un video" no dice nada — ¿es 30 minutos o 5 horas? La barra de progreso en el card tampoco muestra unidades.

**Comportamiento objetivo por tipo:**

| Tipo | progressType | Formulario | Display en card |
|------|-------------|------------|-----------------|
| VIDEO | `minutes` | "Minutos vistos / Total minutos" | "1h 30m de 10h · 15%" |
| PODCAST | `minutes` | Igual que VIDEO | "45m de 1h 20m · 56%" |
| LIBRO | `pages` | "Página actual / Total páginas" | "120 de 350 páginas · 34%" |
| DRILL | `sessions` | "Sesiones hechas / Objetivo" | "8 de 20 sesiones · 40%" |
| BACKTEST | `sessions` | Igual que DRILL | "3 de 10 sesiones · 30%" |
| NOTA | — | Sin barra. Solo badge de estado | Badge: LEÍDO / APLICADO |
| HERRAMIENTA | — | Sin barra. Solo badge de estado | Badge: EN_USO / DOMINADA |

**Para el formulario de "Añadir recurso":**  
Cuando el usuario selecciona VIDEO, el campo "Progreso" se convierte en dos inputs: `[Minutos vistos]` + `[Duración total]`. El formulario actual tiene un slider genérico — reemplazarlo por campos contextuales por tipo.

---

### Problema 2.2 — Sin sistema de estados del recurso

**Sistema afectado:** `src/prisma/schema.prisma`, `src/components/aprendizaje/resource-card.tsx`

**Problema detectado:**  
No existe campo `status`. La única diferenciación es `progressPct`. Esto no distingue entre:
- Un recurso al 0% que el usuario planea empezar (PENDIENTE)
- Un recurso que el usuario abandonó conscientemente (ABANDONADO)
- Un recurso al 100% que aún no fue reflexionado (COMPLETADO)
- Un recurso que el usuario domina y aplica (DOMINADO)

**Transiciones válidas:**
```
PENDING     → IN_PROGRESS  (cuando currentUnits > 0)
IN_PROGRESS → COMPLETED    (cuando progressPct = 100 o usuario lo marca manual)
COMPLETED   → IN_REVIEW    (automático si nextReviewAt está configurado)
IN_REVIEW   → MASTERED     (cuando masteryLevel >= 4 en el review)
IN_REVIEW   → IN_PROGRESS  (cuando masteryLevel <= 2 — necesita más estudio)
cualquiera  → ABANDONED    (acción explícita del usuario — no borrar)
ABANDONED   → PENDING      (restaurar desde archivo)
```

---

## FASE 3 — Sistema de Review (Spaced Repetition)

**Objetivo:** Implementar el ciclo de revisión inteligente.  
⚠️ **Requiere validación de encuesta: preguntas P8, P9, P10, P11.**

---

### Decisión condicional de encuesta:

| Resultado P9 | Acción |
|--------------|--------|
| Mayoría A/B | Implementar spaced repetition completo con intervalos automáticos |
| Mayoría C/D | Solo mostrar "última vez revisado hace X días" — sin intervalos automáticos |

| Resultado P11 | Acción |
|---------------|--------|
| A (intervalos fijos) | `nextReviewAt = hoy + interval[reviewType]` (1/7/30/90 días) |
| D (por recurso) | Campo `reviewInterval` configurable en el editor del recurso |

---

### Problema 3.1 — Lógica de cálculo de próximo review

**Si encuesta valida spaced repetition:**

```typescript
const REVIEW_INTERVALS = {
  day1:   1,
  week1:  7,
  month1: 30,
  month3: 90,
} as const

function calcNextReviewAt(reviewType: string, masteryLevel: number): Date {
  const today = new Date()
  let days: number

  if (masteryLevel <= 2) {
    // No dominado → repetir más pronto
    days = reviewType === 'day1' ? 1 : REVIEW_INTERVALS[reviewType] / 2
  } else if (masteryLevel >= 4) {
    // Bien dominado → avanzar al siguiente intervalo
    const next = { day1: 'week1', week1: 'month1', month1: 'month3', month3: 'month3' }
    days = REVIEW_INTERVALS[next[reviewType] ?? 'month3']
  } else {
    days = REVIEW_INTERVALS[reviewType] ?? 7
  }

  today.setDate(today.getDate() + days)
  return today
}
```

---

### Problema 3.2 — Modal de review sin persistencia (ver Fase 0)

Una vez que la tabla `resource_reviews` exista y el procedimiento `createReview` esté implementado, el modal actual puede conectarse sin cambios de UI sustanciales. El formulario ya captura los campos correctos.

---

## FASE 4 — Panel Derecho Real

**Objetivo:** Reemplazar las métricas decorativas con datos reales y accionables.

---

### Sección 1: Foco del día (nueva)

Lógica de prioridad:
1. Si hay reviews con `nextReviewAt = today` → mostrar ese recurso
2. Si no → mostrar el recurso `IN_PROGRESS` con mayor `progressPct` (más cercano a completarse)
3. Si no hay IN_PROGRESS → mostrar el PENDING más antiguo

### Sección 2: Reviews urgentes (mejorar existente)

Actualizar de lista plana a lista con countdown:
```
⚡ HOY: "Mark Douglas Cap 5" → [Revisar]
📅 En 3 días: "ICT Killzones" → [Ver]
📅 Esta semana: 2 más
```

### Sección 3: Estadísticas de tiempo (condicional — depende P6)

Si P6 responde A/B mayoritariamente:
```
Esta semana: 3h 20m  ████░░░  Meta: 5h
```
Cálculo: suma de `(currentUnits actualizado esta semana)` para recursos tipo `minutes`.

### Sección 4: Racha real (condicional — depende P15)

Si P15 responde A/B/E mayoritariamente:  
Calcular racha real: días consecutivos en que el usuario completó al menos 1 review o actualizó progreso.

---

## FASE 5 — Conexión Aprendizaje↔Trading

**Objetivo:** Vincular recursos con setups del playbook.  
⚠️ **Requiere validación de encuesta: preguntas P12, P13, P14.**

---

### Decisión condicional de encuesta:

| Resultado P12 | Acción |
|---------------|--------|
| Mayoría A | Sprint completo: relación many-to-many + UI de vinculación |
| Mayoría B/C | Feature diferida — no en roadmap actual |

---

### Problema 5.1 — Sin relación many-to-many recurso↔setup

**Si encuesta valida:**

```prisma
// Relación implícita many-to-many en Prisma
model LearningResource {
  linkedSetups Setup[] @relation("ResourceSetups")
}

model Setup {
  linkedResources LearningResource[] @relation("ResourceSetups")
}
```

**Nuevo procedimiento:**
```typescript
learningResources.linkSetup: { input: { resourceId, setupId } }
learningResources.unlinkSetup: { input: { resourceId, setupId } }
```

---

## FASE 6 — Gamificación

**Objetivo:** Streaks, objetivos semanales, notificaciones.  
⚠️ **Requiere validación de encuesta: preguntas P15, P16, P17.**

---

### Decisión condicional de encuesta:

| Resultado P15 | Scope de gamificación |
|---------------|----------------------|
| A/B mayoritario | Streak completo con cálculo diario y display prominente |
| E (solo calidad) | Streak basado en reviews completados, no en logins |
| D (ansiedad) | Sin streak, o streak oculto por defecto |

| Resultado P16 | Scope de objetivos |
|---------------|-------------------|
| A/B/C | Implementar widget de meta semanal con barra de progreso |
| D | No implementar |
| E | Campo configurable en settings |

| Resultado P17 | Infraestructura |
|---------------|----------------|
| Solo B (visual) | Solo indicadores en UI — sin backend adicional |
| A (push) | Requiere service worker + FCM o similar |
| C (email) | Integración con Resend — nueva función de edge |

---

## Dependencias entre Fases

```
FASE 0 (Bugs críticos)
  ├── 0.1 requiere FASE 1.1 (tabla resource_reviews)
  ├── 0.2 requiere: solo frontend
  ├── 0.3 requiere: solo frontend
  └── 0.4 requiere: FASE 4 (stats procedure) para ser real

FASE 1 (Arquitectura)
  ├── 1.1 (schema) bloquea: 0.1, 2.1, 3.1, 3.2
  └── 1.2 (router) bloquea: 0.1, 4.*, 6.*

FASE 2 (Core)
  └── Requiere FASE 1 completa

FASE 3 (Review)
  ├── Requiere FASE 1 + FASE 2
  └── Bloqueada por encuesta P9/P11

FASE 4 (Panel)
  ├── Parcialmente implementable sin encuesta (secciones 1 y 2)
  └── Secciones 3 y 4 bloqueadas por encuesta P6/P15

FASE 5 (Conexión)
  └── Bloqueada por encuesta P12/P14

FASE 6 (Gamificación)
  └── Bloqueada por encuesta P15/P16/P17
```

---

## Estimación de Esfuerzo

| Fase | Esfuerzo | Tipo |
|------|----------|------|
| Fase 0 | 4-6 horas | Frontend + modal |
| Fase 1 | 6-8 horas | Schema migration + Supabase + router |
| Fase 2 | 8-12 horas | Frontend complejo (forms por tipo) |
| Fase 3 | 8-12 horas | Lógica de negocio + UI countdown |
| Fase 4 | 4-6 horas | Stats procedure + panel UI |
| Fase 5 | 8-12 horas | Relación many-to-many + UI |
| Fase 6 | 4-8 horas | Depende de scope validado por encuesta |
| **Total** | **~50-70 horas** | Full stack |

---

*Plan generado a partir de auditoría técnica del código fuente real. Todos los problemas incluyen archivo y función específica. Las fases condicionales se activarán con base en los resultados de la encuesta UX/Product Discovery.*
