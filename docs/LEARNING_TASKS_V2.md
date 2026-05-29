# LEARNING TASKS V2 — Auditoría UX + Producto

> **Generado:** 2026-05-29
> **Fuente:** Auditoría UX/Producto post-implementación del módulo de aprendizaje completo
> **Branch:** `claude/epic-darwin-1XZTX`
> **Prerequisito:** Todas las tasks de LEARNING_TASKS.md completadas [x]

---

## Leyenda

| Símbolo | Estado |
|---------|--------|
| `[ ]` | Pendiente |
| `[/]` | En progreso |
| `[x]` | Completado |
| `[!]` | Bloqueado |

| Símbolo | Prioridad |
|---------|-----------|
| 🔴 | CRÍTICA (bug o bloqueo UX) |
| 🟠 | ALTA |
| 🟡 | MEDIA |
| 🟢 | BAJA |

---

## FASE 0 — Correcciones de Bugs Silenciosos

> Bugs lógicos que producen datos incorrectos o UX rota sin error visible.

---

### TASK-L017
**Prioridad:** 🔴 CRÍTICA
**Estado:** `[ ]`
**Fase:** 0 — Bug fix

**Descripción:**
El cálculo de `minutesThisWeek` en el procedimiento `stats` es incorrecto. Actualmente suma el valor TOTAL de `currentUnits` de recursos actualizados esta semana, no el INCREMENTO semanal. Si un usuario tiene un video con 400 minutos acumulados y lo actualiza a 420 minutos esta semana, el sistema contabiliza 420 minutos esta semana, no 20.

**Causa raíz:**
```typescript
// Actual (INCORRECTO):
// Suma currentUnits de recursos cuyo updatedAt >= weekStart
// Mide el valor acumulado total, no el delta semanal

// Correcto: necesita el delta entre valor al inicio de semana y valor actual
```

**Solución arquitectónica:**
Añadir tabla `progress_snapshots` o campo `weekProgressMinutes Int? @default(0) @map("week_progress_minutes")` en `LearningResource` que se resetea cada lunes via trigger o en el procedure de `updateProgress`. El campo almacena el delta real de la semana en curso.

**Implementación alternativa (más simple, sin schema change):**
En `updateProgress`, calcular el delta respecto al último `currentUnits` registrado y acumularlo en un campo `weekDeltaMinutes` que se resetea los lunes en la query de stats.

**Schema requerido:**
```prisma
model LearningResource {
  weekDeltaMinutes Int @default(0) @map("week_delta_minutes")
  weekDeltaResetAt DateTime? @map("week_delta_reset_at")
}
```

**SQL:**
```sql
ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS week_delta_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_delta_reset_at TIMESTAMPTZ;
```

**Lógica en updateProgress:**
```typescript
// Al actualizar progreso:
// 1. Si week_delta_reset_at < lunes actual → resetear week_delta_minutes a 0
// 2. delta = currentUnits - existing.currentUnits (si positivo)
// 3. week_delta_minutes += delta
// minutesThisWeek en stats = SUM(week_delta_minutes) donde progressType = 'minutes'
```

**Validaciones:**
- [ ] Usuario con video de 400min actualiza a 420min → minutesThisWeek muestra 20, no 420
- [ ] El lunes siguiente el contador se resetea a 0
- [ ] Actualizar el mismo recurso dos veces en la misma semana acumula correctamente
- [ ] `tsc --noEmit` sin errores
- [ ] `pnpm run build` sin errores

**Dependencias:** Ninguna
**Archivos afectados:**
- `src/prisma/schema.prisma`
- `src/server/trpc/routers/learning-resources.ts` (`updateProgress`, `stats`)

---

### TASK-L018
**Prioridad:** 🔴 CRÍTICA
**Estado:** `[ ]`
**Fase:** 0 — Bug fix

**Descripción:**
La Edge Function `weekly-learning-summary` envía emails a las 9AM UTC fija. El modelo `User` ya tiene el campo `timezone` (ej. "America/Tegucigalpa" = UTC-6). El email llega a las 3AM para el usuario. Esto mata la tasa de apertura.

**Solución:**
Cambiar el cron job de un único job global a un sistema que respete timezones. Dado que pg_cron no soporta jobs dinámicos por timezone, la estrategia es:

**Opción A (recomendada — sin complejidad):** Correr el cron cada hora (en lugar de una vez el lunes) y dentro de la función filtrar solo usuarios cuya hora local sea entre 9:00 y 9:59 AM del lunes.

```sql
-- Cambiar schedule de '0 9 * * 1' a cada hora los lunes:
SELECT cron.schedule(
  'weekly-learning-summary',
  '0 * * * 1',  -- cada hora, solo lunes
  $$...$$
);
```

```typescript
// En la Edge Function, filtrar usuarios por timezone:
function shouldSendNow(timezone: string): boolean {
  const now = new Date()
  const localHour = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getHours()
  const localDay = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getDay()
  return localDay === 1 && localHour === 9  // lunes 9AM hora local
}
```

**Validaciones:**
- [ ] Usuario en UTC-6 recibe el email a las 9AM hora local (15:00 UTC)
- [ ] Usuario en UTC+1 recibe el email a las 9AM hora local (08:00 UTC)
- [ ] Los cron jobs actuales se actualizan a schedule horario
- [ ] La función no envía emails duplicados si falla y se reintenta en la misma hora

**Dependencias:** Ninguna (Edge Function ya desplegada)
**Archivos afectados:**
- `supabase/functions/weekly-learning-summary/index.ts`
- SQL de actualización de cron schedule (via `execute_sql`)

---

## FASE 1 — UX Correctiva (Alto Impacto, Bajo Costo)

---

### TASK-L019
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 1 — UX fix

**Descripción:**
No existe flujo para restaurar un recurso archivado (status ABANDONED). Esto hace que archivar tenga un costo asimétrico: el usuario teme archivar porque siente que es irreversible. El resultado son recursos zombie en estado IN_PROGRESS que deberían estar archivados.

**Cambios requeridos:**
1. Añadir opción de filtrado "Archivados" en ResourceGrid (chip/tab adicional en FilterBar o toggle separado)
2. En el menú ··· de recursos con status ABANDONED: mostrar "Restaurar" en lugar de "Archivar"
3. "Restaurar" llama `updateStatus({ id, status: "PENDING" })`
4. Al archivar, mostrar un micro-prompt (2 segundos, no modal): "¿Por qué archivas esto?" con 3 botones: "Ya no es relevante / Lo dominé completamente / Sin tiempo". Guardar en un campo `archiveReason String? @map("archive_reason")` en schema.

**Schema:**
```prisma
model LearningResource {
  archiveReason String? @map("archive_reason") // "irrelevant" | "mastered" | "no_time"
}
```

**SQL:**
```sql
ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;
```

**Validaciones:**
- [ ] Filtro "Archivados" muestra solo recursos con status ABANDONED
- [ ] Menú ··· de recurso archivado muestra "Restaurar", no "Archivar"
- [ ] Restaurar → status cambia a PENDING y recurso aparece en grid normal
- [ ] El micro-prompt de razón de archivado aparece al archivar
- [ ] `tsc --noEmit` sin errores

**Dependencias:** Ninguna
**Archivos afectados:**
- `src/prisma/schema.prisma`
- `src/server/trpc/routers/learning-resources.ts` (schema update)
- `src/components/aprendizaje/resource-card.tsx` (lógica de menú)
- `src/components/aprendizaje/resource-grid.tsx` (filtro archivados)

---

### TASK-L020
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 1 — UX

**Descripción:**
La tarjeta muestra `nextReviewAt` (cuándo revisar) pero no cuándo fue el último review ni si el recurso está "muerto" (sin actividad en 30+ días siendo IN_PROGRESS).

**Cambios requeridos:**

**1. Indicador de último review en tarjeta:**
El procedimiento `list` necesita incluir el timestamp del review más reciente por recurso.
```typescript
// En el query de list, añadir:
include: {
  linkedSetups: { select: { id: true, name: true } },
  reviews: {
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
}
```
Serializar `lastReviewAt: string | null` en `SerializedResource`.

**2. Display en tarjeta:**
En el footer del ResourceCard, junto a la fecha de creación, mostrar:
- "Revisado hace 3d" si hay review reciente
- "Sin reviews aún" si no hay ninguno
- Si IN_PROGRESS y sin actividad en 30+ días: borde izquierdo del card en gris pálido (vs el color normal del tipo) como señal sutil de recurso frío

**3. Tipo en types/index.ts:**
```typescript
interface LearningResource {
  lastReviewAt?: string | null  // nuevo campo
}
```

**Validaciones:**
- [ ] Recurso con review hace 3 días muestra "Revisado hace 3d"
- [ ] Recurso sin ningún review muestra "Sin reviews aún"
- [ ] Recurso IN_PROGRESS sin actividad en 30+ días tiene indicador visual diferenciado
- [ ] `tsc --noEmit` sin errores

**Dependencias:** Ninguna
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (`list`, `serializeResource`, `SerializedResource`)
- `src/types/index.ts`
- `src/components/aprendizaje/resource-card.tsx`

---

### TASK-L021
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 1 — UX cognitiva

**Descripción:**
El modal de revisión abre en blanco cada vez. No hay contexto del review anterior. El usuario debe recordar sin ayuda qué escribió, qué masteryLevel asignó y qué prometió aplicar. Esto viola el principio de continuidad cognitiva y reduce la calidad de cada review.

**Cambios requeridos:**

En `RevisarRecursoModal`, antes del formulario, añadir una sección de contexto que carga el review más reciente:

```typescript
// Nueva query en el modal:
const { data: lastReview } = trpc.learningResources.listReviews.useQuery(
  resource.id,
  { enabled: open && !!resource }
)
const mostRecent = lastReview?.[0] ?? null
```

**Display del contexto anterior (solo si hay review previo):**
```
┌─ Último review (hace 14 días · Mastería: 3/5) ──────────────┐
│ Aprendiste: "La liquidez se barre antes del movimiento real"  │
│ Ibas a aplicar: "Esperar el sweep antes de entrar"           │
│ Insights: • "No entrar en la primera vela de reacción"       │
└──────────────────────────────────────────────────────────────┘
```

El bloque es colapsable (por defecto expandido la primera vez, colapsado si ya lo leyeron). No editable. Solo contexto.

**Validaciones:**
- [ ] Modal muestra el review más reciente antes del formulario
- [ ] Si no hay reviews previos, no se muestra el bloque de contexto
- [ ] El bloque es colapsable
- [ ] El formulario de nuevo review está vacío (no pre-rellena con el anterior)
- [ ] `tsc --noEmit` sin errores

**Dependencias:** `listReviews` procedure (ya existe en TASK-L005)
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (`RevisarRecursoModal`)

---

### TASK-L022
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 1 — Flujo core

**Descripción:**
El modal de revisión actual pide 4 campos obligatorios + masteryLevel. Esto crea fricción para reviews frecuentes. La frecuencia es el mecanismo que hace funcionar el spaced repetition. Si el review es costoso, el usuario lo evita.

**Arquitectura: dos modos en el mismo modal**

```
[Quick ✓]  [Deep ▾]   ← toggle en el header del modal
```

**Modo Quick (default):**
- Selector de masteryLevel 1-5 (ya existe)
- Campo opcional de 1 línea: "¿Algo que añadir?" (placeholder sugerente)
- Botón "Guardar review" — 30 segundos

**Modo Deep (existente, renombrado):**
- El formulario actual completo (learned, howToApply, insights, rating, masteryLevel)

**Lógica de guardado en Quick mode:**
```typescript
// Si modo quick:
createReview.mutate({
  resourceId: resource.id,
  learned: quickNote || "(review rápido)",
  howToApply: "",
  insights: [],
  rating: 0,
  masteryLevel: form.masteryLevel,
})
```

**Estado del modal:**
```typescript
const [reviewMode, setReviewMode] = useState<"quick" | "deep">("quick")
```

La selección de modo persiste en `localStorage` para respetar preferencia del usuario.

**Validaciones:**
- [ ] El modal abre en modo Quick por defecto
- [ ] Cambiar a modo Deep muestra el formulario completo actual
- [ ] Quick review guarda en resource_reviews con `learned = quickNote || "(review rápido)"`
- [ ] nextReviewAt se calcula igual en ambos modos
- [ ] La preferencia de modo persiste entre sesiones
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L021 (para que el contexto anterior sea visible en ambos modos)
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (`RevisarRecursoModal`)

---

## FASE 2 — Profundidad de Conocimiento

---

### TASK-L023
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 2 — Arquitectura UI

**Descripción:**
No existe vista de detalle de recurso. La tarjeta es el único punto de acceso y tiene un techo de información visible. Sin vista de detalle, el sistema no puede escalar en profundidad: no hay espacio para historial completo, todos los insights, evolución del mastery, o análisis de impacto inline.

**Implementación: drawer lateral (no página separada)**
Un drawer que se abre desde la tarjeta al hacer click en el título o en un botón "Ver detalle". Ocupa el 40% derecho de la pantalla. Se puede usar en paralelo con la grid (no reemplaza la pantalla, la complementa).

**Contenido del drawer:**

```
Header:
  [Tipo chip] [Status badge] [MasteryLevel: ●●●○○]
  Título
  Autor · Fecha · Fuente

Sección 1: Progreso actual
  Barra de progreso con unidades
  currentUnits / totalUnits · progressType

Sección 2: Notas del recurso
  El campo notes de creación

Sección 3: Setups vinculados + impacto
  Lista de setups con WR inline (datos de setupImpact)
  "Sin completedAt → completa el recurso para ver impacto"

Sección 4: Historial de reviews (Timeline)
  [Cada review] fecha · masteryLevel · rating
  Excerpt de learned (primera línea)
  Expandible para ver learned completo + howToApply + insights

Sección 5: Insights acumulados
  Todos los insights de todos los reviews como lista flat
  Sin atribución de fecha (el conocimiento puro)

Footer sticky:
  [Quick Review] [Deep Review] [Editar]
```

**Implementación técnica:**
- Nuevo componente `ResourceDrawer` en `src/components/aprendizaje/resource-drawer.tsx`
- Estado en page.tsx: `drawerResource: ResourceFromDB | null`
- `ResourceDrawer` hace sus propias queries: `listReviews(resource.id)` y `setupImpact(resource.id)`
- El drawer usa `position: fixed` con backdrop semitransparente o se integra en el layout de 3 columnas

**Nuevo query necesario en el router:**
El `list` procedure ya incluye linkedSetups. El drawer necesita `listReviews` (ya existe).

**Validaciones:**
- [ ] Click en título del card → abre drawer
- [ ] Drawer muestra historial completo de reviews
- [ ] Drawer muestra todos los insights acumulados
- [ ] Setups vinculados con WR inline (si completedAt)
- [ ] Botones Quick/Deep review funcionan desde el drawer
- [ ] Cerrar drawer no resetea el estado de la grid (filtros, búsqueda)
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L021 (contexto de review), TASK-L022 (quick review)
**Archivos afectados:**
- `src/components/aprendizaje/resource-drawer.tsx` (nuevo)
- `src/app/aprendizaje/page.tsx` (estado del drawer + callbacks)
- `src/components/aprendizaje/resource-card.tsx` (click en título)

---

### TASK-L024
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 2 — Visualización

**Descripción:**
Implementar sparkline de evolución de masteryLevel a lo largo del tiempo. Solo se muestra cuando el recurso tiene ≥3 reviews. Muestra la trayectoria de aprendizaje: ¿está mejorando? ¿plateau? ¿regresión?

**Ubicación:** En el drawer de detalle (TASK-L023), entre el header y la sección de progreso.

**Implementación:**
SVG inline generado desde los datos de `listReviews`. No requiere librería externa.

```typescript
function MasterySparkline({ reviews }: { reviews: SerializedReview[] }) {
  if (reviews.length < 3) return null
  // reviews ordenados por createdAt ASC
  const points = reviews.map((r, i) => ({
    x: (i / (reviews.length - 1)) * 100,
    y: 100 - ((r.masteryLevel - 1) / 4) * 100,  // invertir: 5 arriba, 1 abajo
  }))
  // Generar path SVG con línea + puntos
}
```

**Display:** Gráfico de 80×24px con:
- Línea de progreso en color del tipo de recurso
- Puntos en cada review (hover muestra fecha + nivel)
- Banda de referencia sutil en nivel 3 (línea punteada = "entiendo")
- Último punto más grande (estado actual)

**Validaciones:**
- [ ] Solo aparece con ≥3 reviews
- [ ] Recurso con mastery 2→3→2→4 muestra la curva correcta
- [ ] Último punto coincide con masteryLevel actual del recurso
- [ ] Sin librería externa (SVG puro)
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L023 (drawer donde se muestra)
**Archivos afectados:**
- `src/components/aprendizaje/resource-drawer.tsx`

---

### TASK-L025
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 2 — Retención pasiva

**Descripción:**
Los insights escritos en los reviews (`insights[]`) nunca resurgen después de guardarse. Se acumulan en la base de datos sin volver a ser vistos. Esta es la pérdida de valor más silenciosa del sistema.

**Implementación: widget "Insight del día" en el panel derecho**

Nuevo procedimiento en el router:
```typescript
dailyInsight: protectedProcedure
  .query(async ({ ctx }) => {
    // Traer todos los insights de todos los reviews del usuario
    const reviews = await ctx.prisma.resourceReview.findMany({
      where: { userId: ctx.userId, insights: { isEmpty: false } },
      select: { insights: true, createdAt: true, resource: { select: { title: true } } },
    })
    // Flatten todos los insights
    const allInsights = reviews.flatMap(r =>
      r.insights.map(insight => ({
        text: insight,
        resourceTitle: r.resource.title,
        reviewedAt: r.createdAt.toISOString(),
      }))
    )
    if (allInsights.length === 0) return null
    // Seleccionar uno deterministicamente por día (fecha como seed)
    const today = new Date()
    const dayIndex = Math.floor(today.getTime() / 86_400_000)
    return allInsights[dayIndex % allInsights.length]
  })
```

**Display en panel derecho** (nueva sección entre "Meta semanal" y "Foco del día"):
```
💡 Insight del día
────────────────────────────────
"No entrar en la primera vela de
 reacción tras un sweep"
                    — ICT Killzones
```

Sin botones, sin acciones. Solo texto. Si el usuario no tiene insights guardados, no se muestra la sección (no hay empty state).

**Validaciones:**
- [ ] El insight cambia cada día (no cada recarga)
- [ ] El insight muestra el título del recurso de origen
- [ ] Si el usuario no tiene insights → la sección no aparece
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L001 (createReview con insights ya existe)
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (nuevo procedure `dailyInsight`)
- `src/app/aprendizaje/page.tsx` (widget en panel derecho)

---

### TASK-L026
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 2 — Flujo de review

**Descripción:**
Para revisar N recursos urgentes el usuario hace N ciclos de: encontrar el recurso en grid → abrir modal → guardar → volver. El modo sesión elimina esa fricción: muestra los recursos urgentes en cola, uno por uno, hasta terminar.

**Implementación:**

Botón "Iniciar sesión" en la sección "Reviews vencidas" del panel derecho (solo visible cuando hay ≥2 reviews urgentes).

Estado en page.tsx:
```typescript
const [sessionMode, setSessionMode] = useState(false)
const [sessionQueue, setSessionQueue] = useState<ResourceFromDB[]>([])
const [sessionIndex, setSessionIndex] = useState(0)
```

`SessionReviewModal`: modal de pantalla completa (max-w-xl) que muestra:
```
[1 de 4] ICT Killzones
─────────────────────
[contexto del review anterior]
[quick review form]
[Guardar y siguiente →]  [Saltar]
```

Al completar la cola: "Completaste 4 reviews. Próxima sesión recomendada: miércoles." Y cierra.

**Validaciones:**
- [ ] Botón "Iniciar sesión" visible solo con ≥2 reviews urgentes
- [ ] La cola se inicializa con todos los `urgentReviews` de stats
- [ ] "Guardar y siguiente" guarda el review y avanza en la cola
- [ ] "Saltar" avanza sin guardar review
- [ ] Al final de la cola muestra resumen (cuántos completados)
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L022 (quick review mode), TASK-L021 (contexto previo)
**Archivos afectados:**
- `src/app/aprendizaje/page.tsx` (`SessionReviewModal` + estado)

---

### TASK-L027
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 2 — Discoverability

**Descripción:**
Los filtros actuales (tipo, markedForReview, sort) son insuficientes para usuarios con 30+ recursos. Los datos para filtros avanzados ya existen; solo falta la UI.

**Filtros a añadir (en orden de prioridad):**

1. **Por status** (multi-select): PENDING, IN_PROGRESS, COMPLETED, IN_REVIEW, MASTERED. Se añade como chips debajo de los de tipo.
2. **Por tag** (multi-select): Extraer todos los tags únicos del usuario y mostrarlos como chips con toggle.
3. **Por masteryLevel** (rango): slider 1-5 o chips "≥3".
4. **"Sin reviews"**: toggle para mostrar solo recursos sin ningún review.
5. **"Favoritos"**: toggle para mostrar solo `isFavorite: true`.

**Implementación en ResourceGrid:**
Añadir un panel de filtros expandible "Más filtros ▾" debajo de la fila actual. Por defecto colapsado. Al expandir muestra los filtros adicionales. El estado de filtros se mantiene local en el componente.

**Los datos para los filtros:**
- Tags únicos: `Array.from(new Set(resources.flatMap(r => r.tags)))`
- Status: array estático de RESOURCE_STATUSES
- MasteryLevel: no existe en el tipo `LearningResource` actual → necesita añadirse en la serialización

**Nota técnica:** `masteryLevel` no está en `LearningResource` (está en `ResourceReview`). Para el filtro de masteryLevel, necesita desnormalizarse en el recurso. Alternativa: filtrar por `rating` que sí existe en el recurso.

**Validaciones:**
- [ ] Filtro por status multi-select funciona (puede combinar IN_PROGRESS + IN_REVIEW)
- [ ] Filtro por tags muestra todos los tags únicos del usuario
- [ ] Toggle "Favoritos" muestra solo `isFavorite: true`
- [ ] Toggle "Sin reviews" filtra correctamente (requiere `lastReviewAt` de TASK-L020)
- [ ] Los filtros son combinables entre sí
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L020 (lastReviewAt para el filtro "sin reviews")
**Archivos afectados:**
- `src/components/aprendizaje/resource-grid.tsx`
- `src/types/index.ts` (si se añade field para filtro)

---

## FASE 3 — Inteligencia de Impacto

---

### TASK-L028
**Prioridad:** 🟠 ALTA
**Estado:** `[ ]`
**Fase:** 3 — Analytics

**Descripción:**
"¿Qué recurso mejoró más mi trading?" es la pregunta central que justifica la existencia del módulo. El sistema tiene todos los datos para responderla. Falta la vista que lo muestra.

**Nuevo procedimiento: `resourceImpactRanking`**

```typescript
resourceImpactRanking: protectedProcedure
  .query(async ({ ctx }) => {
    // Traer recursos completados con linkedSetups
    const resources = await ctx.prisma.learningResource.findMany({
      where: {
        userId: ctx.userId,
        completedAt: { not: null },
        linkedSetups: { some: {} },
      },
      select: {
        id: true, title: true, type: true, completedAt: true,
        linkedSetups: { select: { id: true, name: true } },
      },
    })

    // Para cada recurso, calcular:
    // - WR POST completedAt (ya hace setupImpact)
    // - WR PRE completedAt (trades del mismo setup ANTES de completedAt)
    // - Delta = postWR - preWR
    // - Confianza: n total de trades (pre + post)

    return rankedByDelta  // ordenado por delta descendente
  })
```

**Display:** Nueva sección en el panel derecho (o tab en la página), con tabla compacta:

```
📊 Impacto en trading
────────────────────────────────────────
ICT Killzones        +18% WR  (n=31)  ↑
Mark Douglas Cap 5   +12% WR  (n=15)  ↑
Doble Techo Video     +6% WR  (n=8)   △ pocos datos
──────────────────────────────────────
```

Reglas de visualización:
- Delta positivo: verde con flecha ↑
- Delta negativo: rojo con flecha ↓ (puede pasar: el trader cambió el setup y cayó el WR)
- n < 10: badge "pocos datos" sin delta
- n < 5: no mostrar (excluir del ranking)

**Validaciones:**
- [ ] Solo aparecen recursos con completedAt + linkedSetups + ≥5 trades post-completedAt
- [ ] El delta es WR_post - WR_pre (no solo WR_post)
- [ ] Recursos con < 5 trades post están excluidos
- [ ] El ranking está ordenado por delta descendente
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L016 (setupImpact ya existe, este lo extiende con pre-WR)
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (nuevo procedure)
- `src/app/aprendizaje/page.tsx` (nueva sección en panel o tab)

---

### TASK-L029
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 3 — Analytics

**Descripción:**
Detección automática de recursos que deberían pasar a IN_REVIEW porque el conocimiento puede estar decayendo (Ebbinghaus). Un recurso en MASTERED que no se revisa en 3× su reviewInterval está en riesgo de decay.

**Lógica:**
```typescript
// En el procedure stats o en un nuevo procedure:
const decayingResources = await ctx.prisma.learningResource.findMany({
  where: {
    userId: ctx.userId,
    status: "MASTERED",
    nextReviewAt: { lte: new Date() },  // ya vencido
  },
  select: { id: true, title: true, nextReviewAt: true },
})
```

Si `nextReviewAt` ya pasó (ya existe en urgentReviews), el recurso ya aparece como urgente. La diferencia es la TRANSICIÓN AUTOMÁTICA de status.

**Implementación:**
En el procedure `stats`, después de calcular urgentReviews, transicionar automáticamente recursos MASTERED cuyo nextReviewAt venció hace más de (reviewInterval × 2) días:

```typescript
// Auto-transition MASTERED → IN_REVIEW si muy vencido:
const decayed = resources.filter(r =>
  r.status === "MASTERED" &&
  r.nextReviewAt &&
  (today - r.nextReviewAt) > (r.reviewInterval ?? 7) * 2 * 86_400_000
)
if (decayed.length > 0) {
  await ctx.prisma.learningResource.updateMany({
    where: { id: { in: decayed.map(r => r.id) } },
    data: { status: "IN_REVIEW" },
  })
}
```

**Display:** En el panel derecho, si hay recursos que acaban de transicionar, mostrar notificación inline: "2 recursos marcados como MASTERED volvieron a IN_REVIEW por inactividad."

**Validaciones:**
- [ ] Recurso MASTERED con nextReviewAt vencida 2× el intervalo → cambia a IN_REVIEW
- [ ] El cambio se refleja en la grid sin reload manual
- [ ] El mensaje informativo aparece en el panel
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L011 (stats procedure)
**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (procedure `stats`)
- `src/app/aprendizaje/page.tsx` (display de notificación)

---

## FASE 4 — Escala y Arquitectura

---

### TASK-L030
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 4 — Performance

**Descripción:**
El cálculo del streak en `stats` descarga todos los reviews del usuario para calcular días consecutivos. A 500+ reviews es invisible. A 5,000+ reviews (usuario constante en 2-3 años) puede ser perceptible.

**Solución:** Campos materializados en el modelo `User`.

```prisma
model User {
  currentStreak    Int      @default(0) @map("current_streak")
  bestStreak       Int      @default(0) @map("best_streak")
  lastReviewDate   DateTime? @map("last_review_date") @db.Date
}
```

**SQL:**
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_date DATE;
```

**Actualización del streak en `createReview`:**
```typescript
// Al crear un review, actualizar el streak del usuario:
const today = new Date(); today.setHours(0,0,0,0)
const user = await tx.user.findUniqueOrThrow({
  where: { id: ctx.userId },
  select: { currentStreak: true, bestStreak: true, lastReviewDate: true }
})
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
const isConsecutive = user.lastReviewDate &&
  user.lastReviewDate.getTime() >= yesterday.getTime()
const newStreak = isConsecutive ? user.currentStreak + 1 : 1
await tx.user.update({
  where: { id: ctx.userId },
  data: {
    currentStreak: newStreak,
    bestStreak: Math.max(user.bestStreak, newStreak),
    lastReviewDate: today,
  }
})
```

**En `stats`:** Eliminar el cálculo actual de streak (O(n)) y usar `user.currentStreak` directamente (O(1)).

**Validaciones:**
- [ ] `currentStreak` se actualiza correctamente al crear un review
- [ ] La racha se rompe si no hay review un día calendario (no 24 horas)
- [ ] `bestStreak` solo crece, nunca decrece
- [ ] El procedure `stats` ya no descarga todos los reviews para el streak
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L005 (createReview)
**Archivos afectados:**
- `src/prisma/schema.prisma`
- `src/server/trpc/routers/learning-resources.ts` (`createReview`, `stats`)

---

### TASK-L031
**Prioridad:** 🟡 MEDIA
**Estado:** `[ ]`
**Fase:** 4 — Reliability

**Descripción:**
La Edge Function de email no tiene idempotencia. Si se ejecuta dos veces en la misma semana (cron falla y se reintenta, o error de pg_cron), los usuarios reciben el email duplicado.

**Solución:** Tabla de log de emails enviados.

```sql
CREATE TABLE IF NOT EXISTS email_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,  -- 'weekly' | 'inactivity'
  week_key   TEXT NOT NULL,  -- 'YYYY-WW' (año-semana ISO)
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, email_type, week_key)
);

CREATE INDEX IF NOT EXISTS email_log_user_week ON email_log(user_id, week_key);
```

**En la Edge Function:**
```typescript
// Antes de enviar:
const weekKey = getISOWeek(now)  // ej. "2026-22"
const { error: insertError } = await supabase
  .from('email_log')
  .insert({ user_id: user.id, email_type: type, week_key: weekKey })

if (insertError?.code === '23505') {  // unique violation = ya enviado
  skipped++
  continue
}
// Si insert OK → enviar email
```

**Validaciones:**
- [ ] Ejecutar la función dos veces en la misma semana → segundo run no envía (skipped: N)
- [ ] La semana siguiente → sí envía (nuevo week_key)
- [ ] La tabla `email_log` tiene RLS: solo el propio usuario puede ver su log
- [ ] `tsc --noEmit` sin errores en función TypeScript

**Dependencias:** TASK-L015 (Edge Function)
**Archivos afectados:**
- `supabase/functions/weekly-learning-summary/index.ts`
- Nueva migración SQL (tabla `email_log`)

---

### TASK-L032
**Prioridad:** 🟢 BAJA
**Estado:** `[ ]`
**Fase:** 4 — UX de escala

**Descripción:**
A partir de 50+ recursos, la grid de tarjetas se vuelve cognitivamente pesada. Las tarjetas tienen altura variable y la grid es difícil de escanear. Se necesita una vista de lista compacta como alternativa.

**Implementación:**
Toggle en ResourceGrid: `[⊞ Grid]  [☰ Lista]`. La preferencia persiste en localStorage.

**Vista de lista (densidad alta):**
```
[Tipo] Título del recurso              [Status] [ML:●●●○○] [Última rev: 3d]
[Tipo] Otro recurso más largo          [Status] [ML:●●○○○] [Sin reviews]
```

Cada fila: 36px de altura fija. Mismo filtering y sorting que la grid. Click en fila → abre el drawer (TASK-L023).

**Validaciones:**
- [ ] Toggle grid/lista visible en ResourceGrid
- [ ] Vista de lista muestra todos los recursos del filtro activo
- [ ] Click en fila → abre drawer de detalle
- [ ] La preferencia de vista persiste en localStorage
- [ ] `tsc --noEmit` sin errores

**Dependencias:** TASK-L023 (drawer de detalle), TASK-L020 (lastReviewAt)
**Archivos afectados:**
- `src/components/aprendizaje/resource-grid.tsx`
- `src/components/aprendizaje/resource-list-row.tsx` (nuevo componente)

---

## Resumen de Prioridades

| Prioridad | Tasks |
|-----------|-------|
| 🔴 CRÍTICA | TASK-L017, TASK-L018 |
| 🟠 ALTA | TASK-L019, TASK-L020, TASK-L021, TASK-L022, TASK-L023, TASK-L025, TASK-L028 |
| 🟡 MEDIA | TASK-L024, TASK-L026, TASK-L027, TASK-L029, TASK-L030, TASK-L031 |
| 🟢 BAJA | TASK-L032 |

## Orden de Ejecución Recomendado

```
Semana 1 — Correcciones críticas:
  TASK-L017 (bug minutesThisWeek)
  TASK-L018 (timezone en email)
  TASK-L019 (desarchivado)
  TASK-L020 (indicador último review)

Semana 2 — UX core:
  TASK-L021 (contexto review anterior)
  TASK-L022 (quick review mode)
  TASK-L025 (insight del día)

Semana 3-4 — Profundidad:
  TASK-L023 (drawer de detalle)
  TASK-L024 (sparkline mastery)
  TASK-L026 (session mode)
  TASK-L027 (filtros avanzados)

Mes 2 — Analytics:
  TASK-L028 (ranking por impacto WR)
  TASK-L029 (decay detection)

Mes 3 — Escala:
  TASK-L030 (streak materializado)
  TASK-L031 (email idempotencia)
  TASK-L032 (vista lista compacta)
```

## Qué NO implementar

- Leaderboards o comparación entre usuarios
- AI-generated summaries de recursos
- Push notifications (ya decidido)
- Puntos, XP, badges de gamificación
- Vista de calendario de actividad (heatmap)
- Tags automáticos
- Notificaciones in-app en tiempo real (WebSockets)
- Exportar a PDF/CSV (complejidad alta, valor bajo en este contexto)

---

*Backlog generado desde auditoría UX/producto post-implementación. Cada task incluye causa raíz, implementación técnica concreta y validaciones verificables.*
