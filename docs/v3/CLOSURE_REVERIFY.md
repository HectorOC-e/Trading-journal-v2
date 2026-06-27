# CLOSURE_REVERIFY.md
### Re-verificación de la deuda contra el CÓDIGO (no solo docs)

> A petición: antes de implementar, revisar el código real de cada gap del `AUDIT_FINAL.md` para no reconstruir lo que ya existe. **Hallazgo central: el audit a nivel-doc sobre-estimó la deuda; la mayoría de "gaps" están parcial o mayormente construidos.**
> Fecha: 2026-06-27.

| Gap (audit) | Realidad en código | Veredicto |
|---|---|---|
| **A1** bloqueo por presupuesto | El bloqueo **backward-looking** ya existe (`assertTradeable` auto-locka por `DAILY_LOSS_LIMIT`). Solo faltaba el **forward-looking**. | ✅ **HECHO** (PR #116) |
| **A4** `/reglas` lista automations no rules | `/reglas` **ya tiene sección `rules`** (`trpc.rules.list` + toggle/delete + `RuleModeBadge` enforce/warn). | 🟢 ~hecho · residuo menor: mostrar **origen** (sourceCommitment/Insight) |
| **C1** detector de revenge/oversizing/off-plan | `detectLosingStreak` (cascada/racha — la que aparece en el feed) + `detectEmotionPerformance` (usa revengeFlag) + `detectOversizingAfterLoss` (pattern-detector) **ya existen**. | 🟢 ~hecho · residuo: off-plan como insight standalone (opcional) |
| **C2** sesgos #40 | `overconfidence-bias` ya existe en `psychology-insights`. Faltan los específicos #40 (disposition effect, anclaje). | 🟡 parcial |
| **A2** transfer/SRS sin superficie | La **cola SRS de repaso ya existe** en `/aprendizaje`. Faltan: panel de **transferencia (#31)** + cablear `computeNextReview` (#45) al grade. | 🟡 parcial (genuino) |
| **B1/B2** snapshots E18/E19 | **No existen** tablas; las curvas se calculan al vuelo. | 🔴 genuino |
| **A3** migración real de rutas | **No existen** rutas /hoy,/operar… (solo reagrupación de nav). | 🔴 genuino · bajo valor (cosmético) |
| **C3** telemetría de ignorado del feed | No existe (edad=proxy). | 🔴 genuino · incremental |
| **C4** digest #28 del feed | No existe (el digest de aprendizaje sí). | 🔴 genuino · incremental |
| **D1** write-tools del chat | No existe (capacidad ya vía paneles). | 🔴 genuino · solo verificable con API key |
| **E1** memoria 4 capas | Solo `CoachMemory`. **La frontera anti-poisoning (D9, lo irreversible) YA está.** La jerarquía no. | 🟠 genuino · grande · invariante protegido |

---

## Deuda genuina restante (track de cierre corregido)
1. **B1/B2 — Historización (E18/E19 snapshots)** → curvas longitudinales (North Star "vs hace 3 meses", evolución de edge). *Alto valor.*
2. **A2 — panel de transferencia (#31) + cablear `computeNextReview` (#45)** a la cola SRS existente. *Backend listo; valor medio.*
3. **Pulido**: A4 origen de regla · C2 sesgos #40 específicos. *Bajo.*
4. **A3 / C3 / C4 / D1** — incrementales/cosméticos. *Bajo; reclasificables a v3.2.*
5. **E1 — memoria jerárquica de 4 capas** — *grande; el invariante crítico (D9) ya está protegido, así que es **enhancement arquitectónico**, no corrección — candidato natural a v3.2.*

## Plan de cierre corregido (reemplaza S15–S19 originales)
- **S15 (en curso):** A1 ✅ (#116) + A4 origen + C2 sesgos #40. (PR de sprint).
- **S16:** B1/B2 historización (migración E18/E19 + job + curvas). *El núcleo del valor restante.*
- **S17:** A2 transfer panel + computeNextReview wiring.
- **Reclasificado a v3.2 (no bloquea cerrar v3):** A3 rutas, C3/C4/D1 incrementales, **E1 memoria 4 capas** (invariante D9 ya cumplido).

> **Tesis:** tras S15–S17 (deuda genuina superficiada), v3 puede cerrarse. E1/A3/C3/C4/D1 son evolución, no deuda de lo prometido — y E1 tiene su parte irreversible ya protegida.
