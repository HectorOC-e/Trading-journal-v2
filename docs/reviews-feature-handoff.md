# Handoff — Reviews: reportes ricos + IA + email + cron + PDF

**Rama:** `feat/reviews-rich-reports`
**Spec:** `docs/superpowers/specs/2026-06-22-reviews-reports-email-cron-pdf-design.md`
**Estado:** implementado y validado en build/tests, **NO verificado en runtime real** (el reportante indica que "no funcionó" pero no sabe qué revienta). Ver §"Causas probables" y el prompt de revisión al final.

---

## Qué se hizo (5 fases)

1. **Reportes rediseñados** (`src/app/reviews/components/report/*`)
   - Componentes compartidos con recharts + framer-motion + `CountUp`; `ReviewReportShell` renderiza semanal y mensual desde un `ReviewReportVM` común.
   - Las páginas `reviews/semanal/[weekStart]` y `reviews/mensual/[yearMonth]` ahora son wrappers delgados.
   - Nuevo breakdown **por sesión**: `sessions[]` agregado en `buildWeeklyReport`/`buildMonthlyReport` (+ `session` en `ReportTrade` y en los `select` de los routers).

2. **Análisis IA**
   - Schema: `aiAnalysis`/`aiAnalysisAt` en `WeeklyReview` y `MonthlyReview` (Prisma + migración `supabase/migrations/20260622130000_reviews_ai_analysis.sql`).
   - Mutaciones `weeklyReviews.generateAnalysis` / `monthlyReviews.generateAnalysis` → alimentan el modelo computado al proveedor IA del usuario (`resolveAiCall`/`streamChat`), persisten resultado.
   - `AiAnalysisCard` (Generar/Regenerar) en el reporte.
   - Loaders compartidos `src/server/services/reviews/report-data.ts` (los usan report query, IA, email y cron).

3. **Email + toggle**
   - Template `src/emails/templates/review-summary.tsx`; modelo puro `review-email-model.ts`.
   - Servicio `src/server/services/email/send-review.ts` (opt-in categoría `Reviews`, dedupe vía `email_log`, skip-if-empty, adjunto PDF opcional).
   - Mutaciones manuales `*.sendEmail` + botón "Enviar por correo".
   - Toggle "Email · Reviews" en `perfil/page.tsx`. `resend-client` ahora soporta `attachments`.

4. **Cron automático**
   - `src/app/api/cron/reviews-digest/route.ts` (tick horario, gate por hora local 08:00 + lunes / día 1).
   - Auto-genera IA desde trades (`ensure-analysis.ts`) y envía. Migración pg_cron `20260622140000_schedule_reviews_digest.sql`.

5. **PDF server-side**
   - HTML autocontenido con SVG inline (`pdf-report-html.ts`, puro) → Chromium headless (`@sparticuz/chromium` + `playwright-core`) vía `setContent` (`render-pdf.ts`).
   - Descarga: `GET /api/reviews/pdf` (botón "Descargar PDF" reemplaza `window.print`). Adjunto en el email del cron.

## Impacto / cambios de comportamiento
- **Las páginas de reporte semanal/mensual se rediseñaron por completo** (antes barras a mano; ahora recharts + animaciones + IA + más secciones).
- **Nuevas rutas:** `/api/cron/reviews-digest`, `/api/reviews/pdf`.
- **Nuevas columnas DB** en `weekly_reviews` y `monthly_reviews`.
- **Nueva categoría de notificación** `Reviews` (opt-in email).
- **Refactor** de los procedimientos `report` de ambos routers para usar los loaders compartidos.

## Validación hecha
- `tsc --noEmit`: 0 errores · `vitest`: 73 archivos / 775 tests verdes · `next build`: OK · `pnpm install --frozen-lockfile`: OK.
- **No verificado en runtime:** render real del PDF (Chromium), llamadas IA reales, envío Resend real, ejecución del cron (pg_cron).

---

## ⚠️ Causas probables de que "no funcione" (ordenadas por probabilidad)

1. **Migración no aplicada en tu DB.** Las queries de Prisma (`weeklyReviews.list`, `report`, etc.) seleccionan `ai_analysis`/`ai_analysis_at`. Si las columnas **no existen** en la DB contra la que pruebas, **toda la sección /reviews falla (500)**. Como las migraciones corren por CI al mergear, probar la rama sin aplicarla rompe todo reviews.
   - Fix local: aplicar `20260622130000_reviews_ai_analysis.sql` a tu DB, o `pnpm prisma db push`.
2. **`prisma generate` no corrido** tras cambiar el schema → tipos/cliente desalineados.
3. **`pnpm install` no corrido** → faltan `@sparticuz/chromium` / `playwright-core` (rompe `/api/reviews/pdf` y el build).
4. **PDF en local:** `@sparticuz/chromium` trae binario Linux (serverless). En Windows/macOS dev necesita `PLAYWRIGHT_CHROMIUM_EXECUTABLE` apuntando a un Chrome local; si no, `/api/reviews/pdf` lanza 500.
5. **IA sin proveedor configurado** → `generateAnalysis` devuelve `PRECONDITION_FAILED` (esperado, no es bug).
6. **Email sin `RESEND_API_KEY`** → modo dry-run (no envía, solo loguea; esperado).
7. **Cron:** requiere pg_cron + `app.app_url`/`app.cron_secret` y la migración del schedule; no se dispara solo en dev.

---

## Prompt de revisión para más tarde (cópialo a una sesión nueva)

```
Estoy en la rama feat/reviews-rich-reports (feature de reviews: reportes ricos + IA + email + cron + PDF). Algo NO funciona en runtime pero no sé qué revienta exactamente. Necesito que diagnostiques.

Contexto: lee docs/reviews-feature-handoff.md y el spec docs/superpowers/specs/2026-06-22-reviews-reports-email-cron-pdf-design.md.

Tareas:
1. Verifica prerequisitos de runtime, en orden de probabilidad:
   a. ¿Las columnas ai_analysis / ai_analysis_at existen en weekly_reviews y monthly_reviews en la DB activa? (revisa supabase/migrations y si la migración 20260622130000 se aplicó). Si no, ESA es la causa de que /reviews reviente con 500 — propón aplicarla.
   b. ¿Está corrido `prisma generate` y `pnpm install` (deps @sparticuz/chromium, playwright-core)?
2. Levanta la app (pnpm dev) y abre /reviews, una review semanal y una mensual. Captura el error EXACTO (consola del server + network 500 + stack). No asumas: reproduce.
3. Para cada superficie, valida por separado y reporta cuál falla:
   - Página de reporte semanal/mensual (query trpc *.report)
   - Botón "Generar análisis" (mutación generateAnalysis) — requiere proveedor IA
   - Botón "Descargar PDF" (GET /api/reviews/pdf) — requiere chromium; en local define PLAYWRIGHT_CHROMIUM_EXECUTABLE
   - Botón "Enviar por correo" (mutación sendEmail)
   - Toggle "Email · Reviews" en /perfil
   - Cron: POST /api/cron/reviews-digest con body {"force":true} y Authorization: Bearer $CRON_SECRET
4. Usa la skill /verify o webapp-testing para reproducir en navegador y traer logs reales.
5. Reporta: qué superficie falla, el error literal, la causa raíz y el fix mínimo. NO declares que algo funciona sin haberlo observado.

Importante: el proyecto usa pnpm (NO npm). Tests: cd src && node_modules/.bin/vitest run.
```
