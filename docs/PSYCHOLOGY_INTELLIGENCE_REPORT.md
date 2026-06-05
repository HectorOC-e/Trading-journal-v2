# Psychology Intelligence — Implementation Report

> Fecha: 2026-06-05. Estado: ✅ Implementado · 🟡 Parcial · ⏭️ Diferido.
> Build local no ejecutado (sin `node_modules`); validar en CI.

## 1. Objetivo

Convertir Psychology de un almacén de emociones/journal/disciplina en un **sistema de análisis conductual**: detecta patrones, correlaciones, riesgos, sesgos y hábitos, con recomendaciones accionables + narrativa IA. Sin tocar el Dashboard ni el tab `tab-disciplina` (se construye **encima**).

## 2. Implementado

**Motor determinista** — `domains/analytics/services/psychology-insights.ts` (puro + tests):
| Detector | Correlación | Ejemplo de salida |
|---|---|---|
| `detectEmotionBeforeLoss` | Psychology ↔ Performance | "La frustración/ansiedad aparece antes del 67% de tus pérdidas." |
| `detectImpulsiveExpectancy` | Psychology ↔ Rule violations | "Tus operaciones impulsivas tienen expectancy negativo." |
| `detectOverconfidence` | Sesgo de exceso de confianza | "Tus trades de máxima confianza ganan menos que tu media." |
| `detectHoldingAsymmetry` | Aversión a la pérdida | "Cortas ganadores y aguantas perdedores." |
| `detectViolationEmotion` | Psychology ↔ Rules | "Tus violaciones se asocian al estado X." |
| `detectCleanStreak` | Hábito positivo | "Racha de N días de disciplina limpia." |

Cada insight: `title · detail · recommendation · evidence · metric`, categorizado (pattern/correlation/anomaly/risk/opportunity) y con severidad (critical/warning/positive/info) para ranking.

**Backend** — `analytics.psychologyInsights` (tRPC) reutiliza `buildAnalyticsBundle` (un solo fetch cruzado) y corre el motor.

**Capa IA** — `lib/ai/psychology-insights-service.ts` + `/api/psychology-ai`. Feature **`psychology_analysis`** (ya existía en `AI_FEATURES`) ahora **cableado** a un call-site real: contexto = sección psicológica del bundle + señales deterministas; prompt de experto en psicología del trading que responde con callouts (`[!INSIGHT]`, `[!WARNING]`, `[!RECOMMENDATION]`).

**Frontend** — `/psicologia` añade un panel **Inteligencia psicológica** (insights deterministas + narrativa IA en streaming, renderizada como markdown) **encima** del `TabDisciplina` existente. `TabDisciplina` y Dashboard intactos.

**Tests** — `__tests__/domains/psychology-insights.test.ts` (emoción↔pérdida, expectancy impulsivo, racha limpia, umbral mínimo).

## 3. Correlaciones cubiertas vs pedidas

| Pedida | Estado |
|---|---|
| Psychology ↔ Performance (emoción antes de ganancias/pérdidas) | ✅ |
| Psychology ↔ Rule Violations (emociones asociadas) | ✅ |
| Psychology ↔ Drawdowns | 🟡 aproximado vía emoción en días/trades perdedores (no peak-to-trough por evento emocional) |
| Psychology ↔ Accounts (riesgo por cuenta) | 🟡 vía Analytics (cuentas bloqueadas); falta segmentar emoción por cuenta |
| Psychology ↔ Learning (impacto del aprendizaje) | ⏭️ requiere join con sesiones de estudio + disciplina diaria |
| Psychology ↔ Goals | 🟡 disciplineScore vs disciplineGoal disponible en Analytics/Goals |
| Psychology ↔ Reviews (hallazgos recurrentes) | ⏭️ requiere NLP sobre el texto de reviews |

## 4. Compatibilidad
- Dashboard y `tab-disciplina` sin cambios.
- Sin migración de BD (todo derivado de `trade.emotionBefore/fomoFlag/revengeFlag/confidenceRating`).

## 5. Follow-up
- Detector Learning↔Discipline (sesiones >30 min → disciplina del día siguiente).
- Segmentar emoción por cuenta y por setup.
- Reviews recurrentes (análisis de texto).
