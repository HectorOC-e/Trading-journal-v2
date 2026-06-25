# OPENITEMS_CLOSEOUT_S0_S2.md
### Trading Journal v3.1 — Cierre de open items de Sprints 0–2

> Resultado de la pasada de cierre. Marca qué open items quedan **resueltos**, cuáles **no son completables por código** (necesitan infra/DB o decisión de negocio) y cuáles se **dejan como follow-up acotado** (cirugía de formulario no verificable localmente).
> Rama: `feat/v3-s0-s2-openitems` (desde `main` actualizado). Fecha: 2026-06-25.

---

## ✅ Resueltos en esta pasada
| Item | Sprint | Qué se hizo | Verificación |
|---|---|---|---|
| **DT-1** server `riskPct` | S2 | `trades.create` deriva `riskPct` (`deriveRiskPct`) cuando el cliente no lo manda. Nunca queda null silencioso. | tsc + suite |
| **DT-5** Off-plan auto-tag | S2 | `saveChecklistResult` aplica `evaluateChecklist` → añade tag "Off-plan" si el checklist del setup queda incompleto (aditivo). | tsc + suite |
| **OI-1** incentivo D10 | S2 | Query `trades.emotionFeedback` + componente `EmotionInsight` cableado en el modal de registro: al elegir emoción muestra tu WR histórico (n≥5). | 2 tests + render |
| **OI-4** tags sugeridos | S2 | `NoteTagSuggestions` (chips 1-tap desde la nota) cableado bajo Notas. | 4 tests + render |
| **DT-6** plantillas de protección en galería | S1 | Las 3 plantillas **disponibles** (`daily-loss-stop`, `weekly-loss-limit`, `cooldown-after-loss`) se exponen en la galería de automatizaciones (single source of truth). Las gated se omiten. | tsc + suite |

**+10 tests nuevos** (componentes), suite total **873/873**, tsc + eslint verdes.

---

## ❌ No completables por código (necesitan infra o decisión)
| Item | Sprint | Por qué | Qué se necesita |
|---|---|---|---|
| **G1** spike outbox | S0 | Requiere una **DB real** para probar `trade.created` → outbox → `processed`. | Ejecutar `/api/cron/recompute-insights` + `/api/cron/dispatch-events` en entorno con DB. |
| **G2** cutover de reglas | S1 | Requiere revisar el informe de no-mapeo con **datos reales** y luego cambiar la fuente del bloqueo pre-trade (alto riesgo, test de no-regresión con DB). | Decisión + entorno con DB. |
| **BIZ-1** aislamiento de datos cross-user | S0 | Es una **decisión de negocio** (¿habilitar aprendizaje poblacional anónimo futuro?), no código. | Tu decisión, antes de S4. |
| **OI-4 (S0)** replay migraciones | S0/S1/S2 | Lo valida **CI** (`migrate-validate`), no el entorno local. | Merge del PR → CI. |

---

## 🟡 Follow-up acotado (deliberadamente NO hecho sin poder ejecutar la app)
Estos tocan el formulario de registro (1065 líneas, con cálculo de position-sizing/leverage) o flujos que no puedo verificar en runtime. Hacer cirugía de esquema de formulario a ciegas es el mayor riesgo del proyecto; lo dejo listo para hacerse con verificación visual.

| Item | Sprint | Estado | Nota |
|---|---|---|---|
| **OI-5** inputs MAE/MFE + selector `regime` en el form | S2 | Columnas + API `trades.create` **ya aceptan** los campos. Falta añadirlos a `tradeFormSchema` + estado del form + mapeo de submit. | Mejor en el flujo de **cierre/edición** (las excursiones se conocen tras cerrar). |
| **OI-2** nudge al cerrar sin emoción | S2 | Lógica lista (`needsEmotionNudge`). | Pertenece al modal de **cierre/edición**, no al de registro. |
| **OI-3** pre-fill de `session` | S2 | `deriveSession` listo; `riskPct` ya se deriva en servidor (DT-1). | Un efecto RHF que rellene `session` necesita un guard "manual" para no sobreescribir; sin poder probar el form, se difiere. |

---

## Resumen
- **5 open items resueltos** (2 server, 2 UI cableadas, 1 plantillas) con tests.
- **4 no completables aquí** (3 gates + replay CI) — necesitan DB/CI/decisión.
- **3 follow-ups de formulario** acotados y documentados (API lista; falta UI verificable).

**Probable ahora en la app** (tras merge): el badge enforce/warn (S1), **el incentivo emocional D10** y **los chips de tags sugeridos** en el modal de registro, las **plantillas de protección** en la galería, y el **auto-tag Off-plan** al guardar un checklist incompleto.
