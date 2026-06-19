# Diseño — Notificaciones por correo de Aprendizaje (digest diario)

**Fecha:** 2026-06-19
**Estado:** Aprobado para planificación
**Autor:** Brainstorming Héctor + Claude

---

## 1. Objetivo

Ampliar y elevar las notificaciones por correo, **enfocadas en Aprendizaje**, sustituyendo
los correos sueltos actuales (resumen semanal, inactividad, decay) por un **digest diario**
único, accionable y visualmente profesional, acorde a la identidad de la web. Construir un
**sistema base reutilizable** de plantillas de email que sirva para migrar el resto de
correos (prop-firm, etc.) más adelante.

### Métricas de éxito
- Un solo correo diario por usuario (cuando hay algo que decir), no varios solapados.
- Diseño consistente con la app (tokens, tipografía Inter/JetBrains Mono, acento indigo).
- Preferencia granular por categoría reutilizando `NotificationPreference.channels[]`.
- Cero envíos cuando no hay contenido (sin spam "vas al día").
- Plantillas mantenibles (React Email) con preview local y tests.

---

## 2. Estado actual (punto de partida)

- **`User.emailNotifications`** (toggle maestro en Perfil) — se persiste y se respeta, pero
  solo como interruptor global.
- **Edge function `supabase/functions/weekly-learning-summary/`** (623 líneas, Deno) envía
  vía Resend (REST `fetch`, sin SDK), disparada por `pg_cron`+`pg_net` (tick horario, gating
  por timezone). Hoy manda: resumen **semanal**, alerta de **inactividad** (7 días), **decay**
  (masterizados vencidos) y salud **prop-firm** (drawdown). HTML inline crudo, `max-width:500px`,
  `noreply@resend.dev`.
- **`email_log`** — tabla de dedupe `UNIQUE(user_id, email_type, week_key)`.
- **`NotificationPreference`** (app DB) — ya multicanal: `channels String[] @default(["in_app"])`,
  `minPriority`, `muted`, `quietStart/End`, `timezone`. Router tRPC `notifications.preferences.update`
  ya acepta `channels[]` por categoría. **La edge function la ignora.**
- **Dominio learning** — `streak-service.computeNewStreak()`, `decay-detector.detectDecayedResources()`,
  `review-scheduler.calcNextReviewAt()`.
- **Mensaje in-app** `REVIEW_OVERDUE` (categoría "Aprendizaje", P2) en el catálogo `lib/messages`.

---

## 3. Decisiones tomadas (sesión de brainstorming)

| Tema | Decisión |
|---|---|
| Proveedor | **Resend + React Email** (SDK `resend` + `@react-email/components`) |
| Eventos | Repasos vencidos · racha en riesgo · decay · resumen/progreso — **todos en el digest** |
| Cadencia | **Digest diario** (un correo/día, agrupado) |
| Preferencias | **Por categoría** vía `NotificationPreference.channels[]`; toggle de Perfil queda como maestro |
| Alcance vs correos actuales | El digest **reemplaza** semanal/inactividad/decay de aprendizaje; el "semanal" se conserva como **recap opcional** de fin de semana |
| Rediseño | **Aprendizaje + sistema base reutilizable**; prop-firm se migra después |
| Remitente | **Seguir con `resend.dev`** por ahora (dominio propio = futuro) |
| Render | **Enfoque A**: render en la app Next.js; cron apunta a un endpoint Next |
| Visual | Dirección **"Dashboard sereno"** (banda de racha B + calma tipográfica A), **light + dark** |

---

## 4. Arquitectura (Enfoque A)

```
pg_cron (cada hora)  ──pg_net POST──▶  app/api/cron/learning-digest/route.ts
                                          │  (auth: Bearer CRON_SECRET)
                                          ▼
                          send-learning-digest.ts  (orquestación)
                          ├─ por cada usuario elegible:
                          │   ├─ resolveEmailEligibility(user, "Aprendizaje")
                          │   │     · User.emailNotifications (maestro)
                          │   │     · NotificationPreference("Aprendizaje"): channels∋"email", !muted, quietHours
                          │   │     · hora local == sendHour  · no enviado hoy (email_log)
                          │   ├─ buildLearningDigest(data) → DigestModel   (puro, testeable)
                          │   ├─ si DigestModel.isEmpty → skip
                          │   ├─ render <LearningDigest model theme/> → HTML (React Email)
                          │   ├─ resendClient.send()  (dry-run si no hay RESEND_API_KEY)
                          │   └─ email_log.insert(type="learning_digest", week_key=fecha local YYYY-MM-DD)
                          └─ devuelve { processed, sent, skipped }
```

### Unidades y responsabilidades

| Unidad | Ubicación | Responsabilidad | Depende de |
|---|---|---|---|
| Sistema de plantillas | `src/emails/` | Componentes + tokens + plantillas React Email | `@react-email/components` |
| `buildLearningDigest` | `src/domains/learning/services/digest-builder.ts` | Función **pura**: datos → `DigestModel` (secciones, flags, `isEmpty`) | streak/decay/review services |
| `resolveEmailEligibility` | `src/server/services/email/eligibility.ts` | ¿Este usuario recibe email de esta categoría ahora? | Prisma |
| `resendClient` | `src/server/services/email/resend-client.ts` | Wrapper SDK Resend; dry-run sin API key; `FROM` config | `resend` |
| `sendLearningDigest` | `src/server/services/email/send-learning-digest.ts` | Orquesta: elegibilidad → build → render → send → log | las anteriores |
| Endpoint cron | `src/app/api/cron/learning-digest/route.ts` | Auth `CRON_SECRET`, itera usuarios, responde resumen | `sendLearningDigest` |
| Migración cron | `supabase/migrations/<ts>_schedule_learning_digest.sql` | Agenda `pg_cron` → `pg_net` al endpoint (versionado en repo) | pg_cron/pg_net |

---

## 5. Sistema base de plantillas — `src/emails/`

```
src/emails/
  theme.ts                 # tokens hex light + dark (espejo de globals.css en hex)
  components/
    EmailLayout.tsx        # <Html><Head><Body> + bg, fuente, ancho 560, modo light/dark
    EmailHeader.tsx        # mark "TJ" + wordmark (dentro de la banda en este diseño)
    EmailFooter.tsx        # texto legal + enlace "Ajustar preferencias"
    StreakBand.tsx         # banda acento: número grande (mono) + etiqueta + nota at-risk
    StatRow.tsx            # 3 stats sin caja, separados por hairlines verticales
    Section.tsx            # bloque con micro-label uppercase + hairline
    ReviewItem.tsx         # fila repaso: título + chip (loss/amber)
    ProgressBar.tsx        # barra de progreso semanal
    Button.tsx             # CTA primario (acento)
  templates/
    learning-digest.tsx    # digest diario (este diseño)
    weekly-recap.tsx       # recap opcional de fin de semana (mismo sistema)
```

- `theme.ts` expone `lightTheme` y `darkTheme` (paleta §9). Las plantillas reciben `theme`
  resuelto desde la preferencia del usuario (o `prefers-color-scheme` como fallback en clientes
  que lo soporten; default light).
- Todos los colores en **hex/RGB** (los clientes de correo no soportan `oklch`).
- Tipografía **Inter** con fallback de sistema; cifras/datos en **JetBrains Mono** con fallback mono.
- Preview local con `email dev` (script `pnpm email`), apuntando a `src/emails`.

---

## 6. Contenido y lógica del digest — `buildLearningDigest`

`DigestModel` (salida pura, sin IO):

```ts
interface DigestModel {
  isEmpty: boolean
  greetingName: string
  dateLabel: string                 // "jueves, 19 jun" (locale es, tz usuario)
  streak: { current: number; best: number; atRisk: boolean }
  reviews: { title: string; overdueDays: number; kind: "overdue" | "decay" | "today" }[] // top N, orden por más vencido
  progress: { minutesThisWeek: number; goalMinutes: number; pct: number }
  plannedSession?: { title: string }     // sesión de hoy si existe
}
```

### Secciones (cada una se renderiza solo si tiene contenido)
1. **Racha** (banda) — racha actual; si `atRisk` → nota "En riesgo · estudia hoy para no perderla".
2. **Stats** — Repasos (count, color loss), Semana (% meta), Mejor (best streak).
3. **Necesitan repaso** — vencidos + decaídos, **fusionados y deduplicados** por recurso,
   top N (p.ej. 5), orden por más vencido; chip rojo (`−N días`) o ámbar (`hoy`).
4. **Progreso** — minutos semana vs meta + barra; sesión planificada de hoy si existe.
5. **CTA** — "Iniciar sesión de estudio" → `/aprendizaje`.

### Reglas de negocio
- **Reemplazo:** la lógica de los antiguos `sendWeeklySummary`/`sendInactivityAlert`/
  `sendDecayNotification` de aprendizaje se **absorbe** aquí. La edge function pierde esas
  ramas (`type` weekly/inactivity/decay); conserva `prop_firm_health` hasta su migración.
- **Skip-if-empty:** no se envía si no hay vencidos/decaídos **y** la racha no está en riesgo
  **y** no hay sesión planificada. Evita el spam diario "vas al día".
- **Racha en riesgo:** `atRisk = current > 0 && lastReviewDate == ayer(local) && sin review hoy`.
  Helper nuevo `isStreakAtRisk(lastReviewDate, currentStreak, now, tz)` junto a `streak-service`.
- **Hora de envío:** por defecto **19:00 local** (para que el aviso de racha llegue antes de
  medianoche). Gating por timezone con el tick horario del cron. Configurable a futuro (se deja
  como constante `DIGEST_HOUR` por ahora; campo de usuario = fuera de alcance).
- **Dedupe:** `email_log` con `email_type="learning_digest"`, `week_key` = fecha local
  `YYYY-MM-DD` → máximo un digest por día por usuario.

---

## 7. Preferencias y elegibilidad

`resolveEmailEligibility(user, category="Aprendizaje", now)` devuelve `{ eligible, reason }`:
1. `user.emailNotifications` (maestro) — si `false` → no elegible.
2. `NotificationPreference(userId, "Aprendizaje")`:
   - si no existe la fila → **default**: email **desactivado** (opt-in explícito por canal email),
     aunque el maestro esté on. (Decisión: el canal email por categoría es opt-in; el digest no
     se envía hasta que el usuario active "email" en Aprendizaje. *Confirmar en revisión.*)
   - `channels` debe incluir `"email"`; `muted=false`; fuera de `quietHours`.
3. No enviado hoy (consulta `email_log`).

> **Nota de decisión pendiente (§13):** ¿el canal email por categoría es opt-in (off por
> defecto) u opt-out (on si el maestro está on)? El diseño asume **opt-in** para evitar enviar
> a usuarios existentes sin consentimiento explícito del canal. A confirmar.

---

## 8. Cambios en Perfil (UX)

`app/perfil/page.tsx` — sección **Notificaciones**:
- Mantener el toggle maestro `emailNotifications` (texto actualizado).
- Añadir, debajo, control **por categoría** de canal email (al menos "Aprendizaje"), que escribe
  en `channels[]` vía `trpc.notifications.preferences.update`. Patrón: una fila por categoría con
  toggle "Email". Deshabilitado/atenuado si el maestro está off.
- Copy del footer del correo enlaza aquí.

---

## 9. Diseño visual — "Dashboard sereno" (aprobado)

Estructura: **banda de racha** (acento) → **stats** (3, sin caja, hairlines) → **necesitan
repaso** (filas + chips) → **progreso** (barra) → **CTA** → **footer**. Ancho 560px, ritmo de
espaciado 28/22px, un solo acento, cifras en mono, jerarquía por tipografía.

### Paleta — light
| Rol | Hex |
|---|---|
| Página (canvas) | `#f4f5f8` |
| Tarjeta | `#ffffff` |
| Acento / banda / CTA | `#4f6ef7` |
| Texto títulos | `#14161d` |
| Texto cuerpo | `#4b5160` |
| Texto atenuado | `#8b909c` |
| Hairline sección | `#eef0f4` |
| Hairline fila | `#f4f5f8` |
| Chip loss (texto/bg) | `#e5484d` / `#fdeaea` |
| Chip amber (texto/bg) | `#9a6a12` / `#fef3e0` |
| Win | `#1aa35a` |
| Footer bg | `#fafbfc` |

### Paleta — dark
| Rol | Hex |
|---|---|
| Página (canvas) | `#0f1117` |
| Tarjeta | `#181a22` |
| Acento / CTA | `#5e7bff` |
| Banda | `#4a64ef` |
| Texto títulos | `#ecedf0` |
| Texto cuerpo | `#b4b8c2` |
| Texto atenuado | `#767b87` |
| Hairline sección | `#262a35` |
| Hairline fila | `#20232c` |
| Chip loss (texto/bg) | `#ff8a8e` / `#3a2226` |
| Chip amber (texto/bg) | `#f0b454` / `#3a2f1c` |
| Win | `#3ecf8e` |
| Footer bg | `#14161d` |

Maquetas de referencia: `.superpowers/brainstorm/.../email-b-calm-v2.html` (light) y
`email-dark-v1.html` (dark).

---

## 10. Scheduling

- Nueva migración versionada `supabase/migrations/<ts>_schedule_learning_digest.sql` que
  programa el job `pg_cron` (tick horario) → `pg_net.http_post` al endpoint
  `/api/cron/learning-digest` con cabecera `Authorization: Bearer <CRON_SECRET>`.
- La URL base y el `CRON_SECRET` se inyectan como settings/secretos (no hardcode en el repo).
- Mantener el job existente de la edge function solo para `prop_firm_health` (resto retirado).

---

## 11. Estrategia de pruebas

- **Unit (Node 24/vitest):**
  - `buildLearningDigest` — casos: vacío (skip), solo racha-en-riesgo, vencidos+decay
    deduplicados, orden por más vencido, progreso % clamp, sesión planificada.
  - `isStreakAtRisk` — ayer/ hoy/ hace 2 días/ racha 0.
  - `resolveEmailEligibility` — maestro off, sin pref (opt-in), channels sin email, muted,
    quiet hours, ya enviado hoy.
- **Render:** snapshot del HTML de `LearningDigest` (light y dark) con un `DigestModel` fijo.
- **Endpoint:** auth (401 sin secret, 200 con secret), dry-run sin `RESEND_API_KEY`.
- **Manual:** preview `email dev`; envío real a la cuenta propia (límite resend.dev).

---

## 12. Fuera de alcance (futuro)

- Migrar prop-firm y otros correos al sistema base (siguiente iteración).
- Dominio remitente propio verificado en Resend.
- Hora de envío configurable por usuario (campo en User/preferencias).
- Recap semanal: se incluye la plantilla `weekly-recap.tsx` y su toggle, pero su cron/envío
  puede planificarse aparte si crece el alcance.
- i18n del correo (hoy solo `es`, consistente con la app).

---

## 13. Riesgos y decisiones pendientes

1. **Opt-in vs opt-out del canal email por categoría** (§7) — asumido **opt-in**. Confirmar.
2. **Deliverability con `resend.dev`** — solo entrega a la cuenta propia; los usuarios reales no
   recibirán hasta verificar dominio. Aceptado para esta fase (desarrollo).
3. **Doble fuente temporal** — aprendizaje en la app, prop-firm en la edge function hasta su
   migración. Documentar para evitar confusión.
4. **Zona horaria / hora de envío** — depende de `User.timezone` correcto; usuarios sin tz válida
   caen a UTC.
