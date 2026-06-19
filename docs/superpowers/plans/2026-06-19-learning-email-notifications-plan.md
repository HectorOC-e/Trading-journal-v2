# Plan de implementación — Notificaciones por correo de Aprendizaje (digest diario)

Spec: `docs/superpowers/specs/2026-06-19-learning-email-notifications-design.md`. Rama: `feat/learning-email-notifications`.
Enfoque A (React Email + Resend en la app Next.js). Cada fase se verifica (typecheck + tests) y se commitea por separado. Toolchain: Node 24 vía nvm.

## EM-P0 — Dependencias + sistema base de plantillas
Añadir a `src/package.json`: `resend`, `@react-email/components`, `react-email` (dev) + script `email` (`email dev -d src/emails`).
`src/emails/theme.ts`: `lightTheme`/`darkTheme` con la paleta hex del spec §9. Componentes base en `src/emails/components/`: `EmailLayout` (Html/Head/Body, bg, Inter, ancho 560, theme), `StreakBand` (mark TJ + número mono + etiqueta + nota at-risk), `StatRow` (3 stats sin caja, hairlines), `Section` (micro-label + hairline), `ReviewItem` (título + chip loss/amber), `ProgressBar`, `Button`, `EmailFooter` (enlace preferencias).
**Verif:** `pnpm email` renderiza una preview de prueba; typecheck.

## EM-P1 — `digest-builder` (puro) + `isStreakAtRisk` + tests
`domains/learning/services/digest-builder.ts`: `buildLearningDigest(data): DigestModel` (spec §6). Fusiona vencidos + decaídos (dedup por recurso), top N por más vencido, calcula `progress.pct` (clamp 0–100), `streak`, `isEmpty`.
`isStreakAtRisk(lastReviewDate, currentStreak, now, tz)` junto a `streak-service.ts` (reusa `detectDecayedResources`).
**Verif (vitest, Node 24):** vacío→skip, solo racha-en-riesgo, vencidos+decay deduplicados/orden, clamp progreso, sesión planificada, at-risk ayer/hoy/-2d/racha0.

## EM-P2 — Plantilla `learning-digest` + render + snapshots
`src/emails/templates/learning-digest.tsx` consumiendo `DigestModel` + `theme`. Estructura "Dashboard sereno": banda racha → stats → necesitan repaso → progreso → CTA → footer. Solo renderiza secciones no vacías.
**Verif:** snapshot del HTML renderizado (`@react-email/render`) light y dark con un `DigestModel` fijo.

## EM-P3 — Elegibilidad + cliente Resend + orquestación
`server/services/email/eligibility.ts`: `resolveEmailEligibility(user, "Aprendizaje", now)` → maestro `emailNotifications`, `NotificationPreference` (**opt-in**: sin fila o `channels` sin `"email"` → no elegible; `muted`, quietHours), no enviado hoy (`email_log`).
`server/services/email/resend-client.ts`: wrapper SDK `resend`; dry-run + log si no hay `RESEND_API_KEY`; `FROM` configurable (default `Trading Journal <noreply@resend.dev>`).
`server/services/email/send-learning-digest.ts`: carga datos del usuario → `buildLearningDigest` → skip-if-empty → render → `resendClient.send` → `email_log.insert(type="learning_digest", week_key=fecha local)`.
**Verif:** unit de `resolveEmailEligibility` (maestro off, sin pref, channels sin email, muted, quiet, ya enviado); orquestación con resend mockeado (skip vacío, send+log no vacío).

## EM-P4 — Endpoint cron protegido
`app/api/cron/learning-digest/route.ts`: `POST`, auth `Authorization: Bearer <CRON_SECRET>` (401 sin/mal, 412 si no configurado, espejo del patrón de la edge function). Itera usuarios con `emailNotifications=true`, gate por hora local == `DIGEST_HOUR` (19) salvo `force`, llama `sendLearningDigest`, responde `{ processed, sent, skipped }`.
**Verif:** tests de auth + dry-run; smoke local con `force:true`.

## EM-P5 — Migración pg_cron versionada
`supabase/migrations/<ts>_schedule_learning_digest.sql`: `cron.schedule` horario → `pg_net.http_post` a `/api/cron/learning-digest` con header `CRON_SECRET`. URL base + secreto vía settings (sin hardcode). Documentar en el archivo cómo se inyectan.
**Verif:** migración aplica en local; `cron.job` listado.

## EM-P6 — Limpieza de la edge function
`supabase/functions/weekly-learning-summary/index.ts`: retirar ramas `weekly`/`inactivity`/`decay` (absorbidas por el digest) y sus `sendWeeklySummary`/`sendInactivityAlert`/`sendDecayNotification`. Conservar `prop_firm_health`. Quitar del dashboard/migración los schedules retirados. (Opcional: renombrar la función a `prop-firm-health` en una iteración futura, fuera de alcance.)
**Verif:** la función despliega; solo responde `prop_firm_health`.

## EM-P7 — Perfil: preferencia por categoría
`app/perfil/page.tsx` sección Notificaciones: actualizar copy del toggle maestro; añadir fila **"Email · Aprendizaje"** que lee/escribe `channels[]` vía `trpc.notifications.preferences.update({ category:"Aprendizaje", channels:[...]} )`. Atenuada si el maestro está off. Reusa `trpc.notifications.preferences.list`.
**Verif:** toggle persiste (`NotificationPreference` upsert); UI real (webapp-testing, `ariaoc89@gmail.com`).

## EM-P8 — Recap semanal (opcional) + conocimiento IA
`src/emails/templates/weekly-recap.tsx` rediseñado con el sistema base (mismo lenguaje visual). `lib/ai/app-knowledge.ts`: describir el digest diario de Aprendizaje, su opt-in por categoría y dónde se ajusta. (Cron/envío del recap puede planificarse aparte si crece.)
**Verif:** preview del recap; build.

## EM-P9 — Verificación final
Suite unit + typecheck + lint + `pnpm build`. Preview `email dev` (light/dark). Envío real a la cuenta propia (límite `resend.dev`). PR → review → merge → `migrate-deploy` (la nueva migración del cron).
**Verif:** CI verde; correo recibido en la cuenta propia con el diseño aprobado.

---

### Notas de ejecución
- **Datos del digest**: las queries que alimentan `buildLearningDigest` viven en `send-learning-digest.ts` (no en el builder, que es puro). Reusar columnas ya consultadas hoy por la edge function (`learning_resources`, `resource_reviews`, metas) para no reinventar.
- **Migraciones**: Supabase CLI es la fuente de verdad ([[project_schema_migration_divergence]]); nada de SQL manual ([[feedback_no_manual_db_changes]]). No hay cambios de **schema** (no nuevas tablas); solo la migración del **cron**.
- **QA**: probar por la UI real, sin inyectar datos por SQL ([[feedback_qa_no_db_injection]]).
- **Secretos GH/Supabase**: `RESEND_API_KEY`, `CRON_SECRET`, URL base del endpoint.
