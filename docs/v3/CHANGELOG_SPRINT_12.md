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

---

## S12b2 — Superficie PROTEGER: riesgo cuantitativo por cuenta (S9) ✅ (PR #110)
Superficia el risk engine de S9 dentro del `AccountDetailPanel` (`/cuentas`):
- **`RiskBudgetMeter`** (reutilizable, DS §11): presupuesto de pérdida diaria → nº máx de trades hoy; safe/warning/exceeded por token + icono (color nunca único portador). Se reusará en S13 (HOY).
- **`AccountRiskPanel`**: **riesgo de ruina** (Monte Carlo + banda creíble + analítica), **proyección de fase** (P(pasar) con banda, sesiones esperadas, P(violar DD primero), cuello de botella). Todo en bandas (FREEZE-D16). Consume `risk.overview` (S9); sin cambio de backend.

Read-only ("señal · no bloquea"); el bloqueo duro por budget es S13.

Verificación: tsc + eslint verdes. **Visual (Playwright, cuenta FTMO Funded real):** Margen diario disponible 5 trades / 5% al floor; Riesgo de ruina 0.0% banda 0.0–0.1% n=12; proyección omitida (cuenta funded, target 0 → D9.7). Render correcto con tokens DS v3.

---

## S12b3 — Superficie MEJORAR: playbook intelligence (S10) + errores→lecciones (S11) ✅ (PR #111)
`/playbook` gana:
- **`SetupIntelligencePanel`** (S10) en el detalle de setup: veredicto de **edge decay** (con significancia), **drift** definición-vs-ejecución, **`EdgeEvolutionChart`** (curva de avg R con línea 0R), y el antes/después de la última redefinición. Consume `playbook.setup`.
- **`ErrorCardsPanel`** (S11 #42) sobre la grilla: errores recurrentes → lecciones ordenadas por **coste real** (R), cada una con acción "convertir en regla" (coach). Consume `learningInsights.errorCards`.
- Componentes `components/playbook/{edge-evolution-chart,setup-intelligence-panel,error-cards-panel}`.

Read-only, determinista (P2); sin cambio de backend. Verificación: tsc + eslint verdes. **Visual (Playwright):** setup "Breakout London" → Edge estable 0.41R vs 0.15R base, **Drift en avg R: definido 1.2R vs operado 0.24R**, curva de evolución OK; panel de errores → **FOMO −19.5R / Revancha −18.5R / Off-plan −4.7R** (coincide con el smoke S11).

> **Transfer (#31) + SRS (#45)** son resource-centric (van en /aprendizaje, no /playbook) → diferidos a un sub-PR de /aprendizaje o a S13. El backend (S11) ya existe.

---

## S12c — Shell de 5 superficies + ⌘K (tras feature flag, OFF) ✅ (PR #112)
Navegación cognitiva v3 (HOY/OPERAR/MEJORAR/PROTEGER/ANALIZAR + Ajustes, FREEZE §2) reagrupando las **mismas rutas** por intención. **Totalmente tras flag, OFF por defecto** (decisión del usuario) — con el flag apagado la nav v2 es **idéntica** (verificado lado a lado).
- `lib/v3-shell-store.ts`: flag zustand+persist (`localStorage tj.v3Shell`), off default. Sin cambios de ruta → 100% reversible.
- `Sidebar`: `SURFACE_NAV` + `const nav = flag ? SURFACE_NAV : NAV` — swap de la agrupación en las 3 variantes (desktop/tablet/mobile), reutilizando todo el render.
- `CommandPalette` (⌘K ya navegaba): + comando "Vista: 5 superficies (beta)" para opt-in/out.

Verificación: tsc + eslint verdes. **Visual (Playwright, ambos estados):** OFF → nav v2 (PRINCIPAL/ANÁLISIS/GESTIÓN…); ON → 5 superficies (HOY activo/Sunrise, OPERAR, MEJORAR, PROTEGER, ANALIZAR, AJUSTES). Footer (Nuevo trade/Coach IA) intacto en ambos.

> **Diferido (no en este flag):** migración real de rutas (crear /hoy, /operar… absorbiendo Dashboard/Notif/Mercados/Etiquetas) y per-surface headers → progresivo, cuando el shell se valide en uso. Hoy las 5 superficies reagrupan las rutas existentes.

---

## S12d — Capa global de intervención + onboarding día-1 ✅ (PR #113)
Cierra S12.
- **Intervención global** (DS §10.4, P4 — la única interrupción): `InterventionOverlay` (S7) **montado en `AppShell`** (no solo en /trades) → una intervención activa aflora en **cualquier superficie**. Mejoras: token `--intervene` (la única "alarma", ámbar, no rojo de pérdida) + sombra e4 `--shadow-overlay` + `backdrop-blur` + **foco atrapado / scroll lock / Esc = "seguir" con fricción** (no cierra en una tecla, lleva el foco al botón de salida) + `refetchInterval` para liveness global. Quitado el mount duplicado de /trades.
- **Onboarding día-1**: `OnboardingWelcome` en HOY (dashboard) — solo para un trader **nuevo (0 trades)**, dismissible (`localStorage tj.onboardingDone`). Tres pasos que **encienden los motores**: conectar cuenta, registrar primer trade, check-in. Superficie `--coach`.

Read-only salvo el `respond` de intervención (ya existente, S7). tsc verde; eslint sin errores (warnings `set-state-in-effect` consistentes con el repo). Verificación visual en el preview.
