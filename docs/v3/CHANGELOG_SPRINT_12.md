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
