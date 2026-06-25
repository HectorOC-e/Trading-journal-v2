# OPEN_ITEMS_SPRINT_2.md
### Trading Journal v3.1 — Sprint 2 · Items abiertos, deuda y riesgos

## 1. Wiring de UI pendiente (verificación del usuario)
| ID | Item | Notas |
|---|---|---|
| **OI-1** | Mostrar el **incentivo D10** al capturar emoción (`feedbackForEmotion` → "tu WR ansioso es 33% en 6 trades"). | Lógica lista; falta el componente en el formulario de cierre/captura. |
| **OI-2** | **Nudge #10** al cerrar sin emoción (`needsEmotionNudge`). | Lógica lista; falta el prompt 1-tap. |
| **OI-3** | **Pre-fill** de `session`/`riskPct` en el formulario (`deriveSession`/`deriveRiskPct`), editable inline. | Helpers listos; falta llamarlos en el form. |
| **OI-4** | Mostrar **sugerencias de tags** (`suggestTagsFromNote`) como chips confirmables. | Core listo. |
| **OI-5** | Inputs de **MAE/MFE** y selector de **regime** en el formulario. | Columnas + input del router listos. |

## 2. Deuda técnica
| ID | Deuda | Severidad | Notas |
|---|---|---|---|
| **DT-1** | **`riskPct` se deriva en cliente**, no en servidor. | Media | Si una integración crea trades sin pasar por el form (import/API), `riskPct` quedará null. Fallback: derivar en `trades.create` usando el balance de la cuenta. |
| **DT-2** | **`sample_size` del feedback emocional es el total por emoción**, sin ventana temporal. | Baja | Aceptable para el incentivo. Una versión "últimas 4 semanas" se apoya en `rollingWindow` (S0) — futuro. |
| **DT-3** | **`deriveSession` ignora timezone**. | Baja | Aproximación editable documentada. Mejorará cuando el trade capture timezone/UTC real. |
| **DT-4** | **Auto-tagging sólo determinista** (keywords). | Baja | Cobertura limitada de lenguaje; la capa LLM (enriquecimiento) es posterior. |
| **DT-5** | **`evaluateChecklist` no está cableado en `trades.create`** para auto-taggear "Off-plan". | Media | La función existe y está testeada; falta invocarla en la mutación para añadir el tag automáticamente. |

## 3. Riesgos pendientes
| ID | Riesgo | Se aborda en |
|---|---|---|
| **R-1** | Si la UI no expone el incentivo (OI-1), C7 vuelve a ser "captura sin retorno" → reaparece R2. **El valor de S2 depende del wiring.** | UI follow-up |
| **R-2** | Heredados sin cerrar: **gate G2** (cutover de reglas, S1), **gate G1** (replay S0 + spike outbox), **BIZ-1** (aislamiento de datos cross-user, antes de S4). | CI / antes de S4 |

## 4. Próximo paso recomendado
1. Wiring de UI (OI-1..OI-5) + invocar `evaluateChecklist` en la mutación (DT-5) — verificable por el usuario.
2. Cerrar gates pendientes (G1, G2) y decidir **BIZ-1** antes de S4.
3. Entonces **Sprint 3** (métricas institucionales, C4) — que **consume** `maeR/mfeR/regime` capturados aquí. No se avanzó a S3 en este sprint.
