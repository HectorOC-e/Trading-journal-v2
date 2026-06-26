# CHANGELOG_SPRINT_8.md
### Trading Journal v3.1 — Sprint 8 (Psicología v3, E7/C7)

> Estado: **completado** (calibración de confianza + check-in pre-sesión go/no-go + mood longitudinal).
> Fecha: 2026-06-26 · Rama: `feat/v3-s8-psychology`.

## 1. Resumen
La psicología deja de ser solo descriptiva: ahora **calibra** la confianza del trader contra resultados reales, le da un **go/no-go antes de operar**, y mide la **tendencia longitudinal** de su estado.

## 2. Dominio puro (TDD) — `src/domains/analytics/psychology/`
- **`calibration.ts` (#23):** agrupa por `confidenceRating` (1–5), estima el WR de cada bucket vs la media con el estimador Bayesiano (ADR-002 / S3). Veredicto: `overconfident` (confianza alta gana menos que la media, creíble), `underconfident` (dudas → gana más), `calibrated`, `insufficient`. Guardas contra baseline degenerada (≥0.95 / ≤0.05).
- **`checkin.ts` (#30):** `checkinVerdict(mood,energy,sleep)` → `go|caution|no_go`. Una sola dimensión en el suelo (1) fuerza `no_go`; media ≤2 → no_go, ≤3 → caution. `no_go` **recomienda no operar**.
- **`mood.ts`:** `moodTrend` sobre rolling-window (C3/S0) → `improving|declining|stable`.

## 3. Schema — migración `20260626240000`
`PreSessionCheckin` (E12): mood/energy/sleep/score/verdict/reasons/date/session. RLS, anonimizable (ADR-004).

## 4. Servicio + API
- `psychology-service`: `submitCheckin` (veredicto + persistencia), `latestCheckin`, `getCalibration` (trades cerrados con confianza), `getMoodTrend` (sesiones + check-ins).
- Router `psychology` (submitCheckin/latestCheckin/calibration/moodTrend).

## 5. UI
- `PsychologyV3Panel` en `/psicologia`: tarjeta de **check-in** (3 escalas → veredicto con color; rojo recomienda no operar; muestra el de hoy), **curva de calibración** (barras WR por nivel) y **tendencia de ánimo**.

## 6. Invariantes
- La calibración usa el Bayesiano honesto (sin rigor fabricado; `insufficient` con poca muestra — R6).
- El check-in **recomienda**, no bloquea por la fuerza (la intervención dura es S7).

## 7. Diferido (OPEN_ITEMS_SPRINT_8)
- Sesgos extra (#40) — el framework `psychology-insights` ya existe; ampliarlo incremental.
- Tilt intradía fino (la cascada ya está en S7).
- Check-in que crea una regla de "stop por hoy" (hoy solo recomienda).

## 8. Verificación
Ver `TEST_REPORT_SPRINT_8.md`: **1000/1000 vitest** (+11, TDD), tsc+eslint verdes.
