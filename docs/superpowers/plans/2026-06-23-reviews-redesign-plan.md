# Implementation plan — Reviews redesign

**Spec:** `docs/superpowers/specs/2026-06-23-reviews-redesign-design.md`
**Branch:** `feat/reviews-redesign`

Delivered in 4 phases; each phase is independently shippable + verified.

## Phase 1 — Infra fixes (unblock) ✅ ship first

1. **PDF engine swap** — `src/server/services/reviews/render-pdf.ts`:
   - Replace `playwright-core` import with `puppeteer-core`; launch via
     `@sparticuz/chromium` (`executablePath()`, `args`, `headless: true`).
   - Keep `page.setContent(html)` + `page.pdf({format:"A4",printBackground:true})`.
   - Local dev: honor `PUPPETEER_EXECUTABLE_PATH` (replaces the playwright env var).
   - Remove `playwright-core` from `src/package.json`; add `puppeteer-core`. `pnpm install`.
   - Keep `@sparticuz/chromium` in `next.config.ts` `serverExternalPackages`; add
     `puppeteer-core`.
2. **Email domain fix** — replace `https://app.tradingjournal.app` → `https://tjournalx.com`
   in `send-review.ts`, `send-learning-digest.ts`, `review-summary.tsx`,
   `learning-digest.tsx`, `weekly-recap.tsx`. Keep `NEXT_PUBLIC_APP_URL` first.
3. **Cron `app.app_url` migration** — `supabase/migrations/<ts>_set_app_url.sql`:
   `ALTER DATABASE postgres SET app.app_url = 'https://tjournalx.com';` (public; safe).
   `app.cron_secret` documented in spec ops checklist (set out-of-band).
4. **Verify:** tsc + build; **Vercel preview**: deploy, mint a session, GET
   `/api/reviews/pdf`, assert `application/pdf`. Confirm email CTAs point to tjournalx.com.

## Phase 2 — Auto-first lifecycle

5. Consolidate AI to one button: remove `runAutoGenerate` + `generateSummary` UI from
   `create-review-modal.tsx`; verify `generateSummary` has no other consumer, then remove
   the procedure/UI. Keep `generateAnalysis`.
6. Report page: add **✓ Finalizar** (sets `status:"submitted"` via existing update/upsert) +
   inline **"Tus notas"** editor (autosave to existing narrative columns). Keep
   Enviar/PDF/Generar análisis.
7. Creation: "Nueva review (mensual)" navigates to the period report (auto-draft) instead of
   opening the heavy modal. Remove/trim `create-review-modal` + `create-monthly-review-modal`.
   Verify weekly + monthly end-to-end (resolves the monthly-create bug).

## Phase 3 — Rich report

8. Extend `report` procedures (`weekly-reviews.ts` / `monthly-reviews.ts`) with an analytics
   slice from `buildAnalyticsBundle({from,to},true)`: **expectancy, avgR, equity curve,
   markets, psychology**. Compute the bundle once, share with the insights query.
9. View-model + components: add equity curve, expanded KPI band, markets + psychology panels
   (reuse `/analytics` chart components where they fit). Keep weekly non-empty for any sample.
10. Mirror the new sections into `pdf-report-html.ts` (inline SVG equity curve, etc.).

## Phase 4 — Rich + themed emails

11. Email theme resolution: read profile theme (light/dark) + accent; pass resolved
    `EmailTheme` (templates already define light/dark) with accent injected. Robust light
    fallback + best-effort dark.
12. Richer review email (KPIs + mini equity + best setup + discipline + 1–2 AI callouts +
    user note + CTA). Parallel richness pass on the Aprendizaje email.
13. QA the email in light/dark; snapshot tests.

## Ops checklist (user)

- Verify a domain at resend.com/domains; set `EMAIL_FROM` in Vercel.
- Set `NEXT_PUBLIC_APP_URL=https://tjournalx.com` in Vercel.
- Set `app.cron_secret` in Supabase = the app's `CRON_SECRET`.
