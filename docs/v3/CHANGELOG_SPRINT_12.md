# CHANGELOG_SPRINT_12.md
### Trading Journal v3.1 — Sprint 12 (Design System v3 + shell de 5 superficies)

> El primer sprint de **UI pesada**: viste de superficies todo el backend de S3–S11 (hasta ahora read-only e invisible). Se entrega **por partes** (sub-PRs incrementales y verificables) por su tamaño y riesgo (re-arquitectura de navegación).
> Fecha: 2026-06-27 · Rama base: `main`.

## Plan por partes
| Parte | Qué | Riesgo |
|---|---|---|
| **S12a** | DS v3 — fundaciones de tokens (roles cognitivos + spacing + elevación) | nulo (CSS aditivo) |
| **S12b** | Biblioteca de componentes v3 + superficiar S3/S9/S10/S11 en páginas existentes | bajo |
| **S12c** | Shell de 5 superficies (HOY/OPERAR/MEJORAR/PROTEGER/ANALIZAR) + ⌘K + migración de rutas (tras feature flag) | alto |
| **S12d** | Capa global de intervención + onboarding día-1 | medio |

---

## S12a — DS v3: fundaciones de tokens ✅
`app/globals.css` (DESIGN_SYSTEM_V3 §2/§5/§6). **CSS aditivo puro, sin cambio de layout.**
- **Roles cognitivos** (semánticos, como win/loss/be — significado, no decoración; constantes entre temas): `--coach`/`--coach-soft` (violeta del coach), `--intervene`/`--intervene-soft` (la **única alarma**, ámbar alto, distinto del rojo de pérdida), `--commit`/`--commit-soft` (teal de compromisos), `--reinforce`/`--reinforce-soft` (= win, refuerzo calmado), `--regime-trend`/`--regime-range`/`--regime-volatile`.
- **Escala de spacing semántica** `--space-0..12` (base 4px).
- **Elevación e4** `--shadow-overlay` para la capa de intervención (máxima jerarquía + backdrop blur).
- Variantes `*-soft` retuneadas para dark; todos registrados en `@theme inline` (utilidades Tailwind `bg-coach`, etc.).
- **Daltonismo:** estos colores siempre se pararán con icono/texto en los componentes (S12b+), nunca color solo (WCAG 1.4.1).

Verificación: tsc verde; build real validado por CI (`next build`). Sin cambio funcional ni de layout (fundación para S12b+).

---

## S12b1 — Superficie ANALIZAR: institucional (S3) + edges (S11) ✅ (PR #109)
`/analytics` gana dos tabs nuevas (v2 intacto):
- **"Institucional"** (S3): histograma de **distribución de R** (con aviso de cola izquierda), **equity + drawdown** (max DD marcado), KPIs **Sortino/Calmar/½Kelly + Max DD**. Pieza pura nueva `summarizeInstitutional` + procedure `analytics.institutional` (período/práctica). El drawdown se ancla a la **equity real** (capital + P&L), no al P&L acumulado desde 0.
- **"Edges"** (S11): tabla de **edge por instrumento con badge de poda** + tabla de **tags veneno/oro**, vía el router `edges`.
- Componentes `components/analytics/{r-distribution-chart,equity-drawdown-chart}.tsx` (recharts + tokens DS v3; cada viz lleva un insight, DS §12).

Verificación: tsc + eslint + **1108 vitest** (+4). **Visual (Playwright contra el preview prod + datos reales de la cuenta demo):** Institucional → Max DD 8.15%, Sortino 0.41, Calmar 3.14, ½Kelly 12%, gráficos OK; Edges → tablas con badges OK. Bug de drawdown (343%→8.15%) detectado y corregido en la verificación visual.
