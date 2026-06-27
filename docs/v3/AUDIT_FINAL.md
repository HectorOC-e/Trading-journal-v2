# AUDIT_FINAL.md
### Trading Journal v3.1 — Auditoría de cierre

> Revisión completa antes de dar v3 por cerrado: estado de sprints/gates, salud técnica, open items (resueltos vs abiertos), gaps reales, decisiones postergadas y simplificaciones vs el FREEZE.
> Fecha: 2026-06-27 · Rama base: `main` (`d691398`).

---

## 1. Veredicto
**v3 está funcionalmente completo y verificado: 14/14 sprints (S0–S14) + 3 gates (G1/G2/BIZ-1), todo mergeado a `main` y verificado** (lógica por tests, superficies por Playwright contra el preview de producción con datos reales). El "cerebro" (Behavior Engine, Coach, Analytics, Intervention, Memory) y las superficies que lo exponen están vivos. **Quedan deudas acotadas y decisiones postergadas a propósito** (detalladas abajo) — ninguna bloquea el uso del producto.

## 2. Salud técnica
| Señal | Estado |
|---|---|
| Tests | ✅ **1130/1130 vitest** (127 files, 0 skipped) |
| tsc / eslint | ✅ 0 errores (warnings preexistentes `set-state-in-effect`, no de v3) |
| Código muerto en módulos v3 | ✅ ninguno (sin TODO/FIXME/dead) |
| Routers tRPC | ✅ los 33 definidos están registrados en `root.ts` |
| Migraciones | ✅ duales (SQL+prisma), replay-desde-cero verde en CI |
| Bloqueo pre-trade / separación práctica-real | ✅ invariantes intactos (test de no-regresión) |
| CI por PR (tsc/tests/build/replay/E2E/Vercel) | ✅ verde en los 14 merges |

## 3. Cobertura de sprints y gates
- **S0–S2** fundaciones/reglas/captura · **S3** institucional · **S4–S5** Behavior Engine (loop) · **S6–S7** Coach (memoria/intervención) · **S8** psicología · **S9** riesgo/prop · **S10** playbook · **S11** aprendizaje/edges · **S12** DS v3 + 5 superficies + intervención global + onboarding · **S13** feed HOY · **S14** ImprovementScore.
- **Gates:** G1 outbox ✅ · G2 cutover de reglas (flippeado en prod) ✅ · BIZ-1 (ADR-004, decisión B) ✅.
- **Cobertura auditoría v2:** C1–C8 cubiertos; los 50 ítems ROI distribuidos S0–S14 (matriz PRD §13). **Sin ítem fuera del plan.**

## 4. Open items — qué se cerró y qué sigue abierto
La mayoría de OI S3–S11 apuntaban "→ S12/S13/S14" y **se resolvieron** al construir las superficies. Lo **genuinamente abierto** se consolida en §5.

## 5. Gaps reales (deuda acotada, por severidad)
### 🟠 Medio — lo que un usuario notaría
| Ref | Gap | Nota |
|---|---|---|
| **A1** (OI-9.2) | **Bloqueo duro pre-trade por presupuesto diario (#17)** no cableado | S9/D9.3 lo prometió a S13; S13 lo expone como **señal** en el feed + meter, pero **no bloquea**. Reusa `Account.locked` + rules engine. *El gap funcional más visible.* |
| **A2** (OI-11.1/11.2) | **Transferencia #31 + SRS #45 sin superficie** | Backend S11 listo; falta UI en /aprendizaje + cablear `computeNextReview` a la mutación de grade. |
| **C1** (OI-4.8) | **Detectores de insight parciales** | Los 4 verificadores (revenge/oversizing/off-plan/intraday) existen, pero solo algunos detectores **generan** los insights que alimentan el loop/feed. |
| **B1** (OI-14.1) | **ImprovementScore sin curva temporal** | El índice es el **valor actual**; falta persistir `E19` (snapshot diario) para "vs hace 3 meses". |

### 🟡 Bajo — estructural / longitudinal / incremental
- **A3** (OI-13.3): migración **real de rutas** a 5 superficies (`/hoy`,`/operar`… absorbiendo Dashboard/Notif/Mercados/Etiquetas). Hoy = **reagrupación de nav tras flag**; Notificaciones convive, no absorbida.
- **A4** (OI-5.1): `/reglas` lista `automations`, no las `rules` del loop.
- **B2/B3/B4** (OI-10.3/14.4/8.4/9.5): persistir `SetupEdgeSnapshot`(E18), coste de indisciplina rolling, calibración/ruina/proyección como Insight historizado.
- **C2/C3/C4** (OI-8.1/13.1/13.2): sesgos extra #40; telemetría de "ignorado" del feed (hoy edad=proxy); digest #28 por email del feed HOY.
- **D1/D3** (OI-7.1/7.3): write-tools del chat (`propose_commitment/propose_rule` — la capacidad ya se entrega vía paneles); aprender `expectedImpact` de `Intervention.outcome`.
- **Misc**: off-plan como regla "warn" (OI-5.2/8.2), plantillas extra (OI-5.3).

> **Cerrados durante el camino (NO abiertos):** auto-extracción LLM de memoria (OI-6.1/7.2 → PR #103 D-A); superficies institucional/riesgo/playbook/edges (S12); onboarding día-1 #48 (S12d); crons v3 agendados en prod (#97).

## 6. Simplificación arquitectónica a declarar (vs FREEZE §6)
- **Memoria del coach:** se implementó **una tabla `CoachMemory`** (candidate/confirmed) en vez de las **4 capas jerárquicas** del freeze (E13 episódica / E14 semántica / E15 identidad / E16 mejora). **La frontera anti-poisoning (FREEZE-D9 / P6, la parte *irreversible*) SÍ se respeta** (el LLM propone, el usuario/datos confirman). La **jerarquía** (episódica+saliencia+decay, identidad estructurada) quedó **reducida** — es evolución futura, no corrupción: la decisión irreversible está protegida.
- **Snapshots derivados:** `E18 SetupEdgeSnapshot`, `E19 ImprovementScore`, `E20 RiskBudget` se **calculan al vuelo** (no persistidos). Correcto para el valor actual; las **curvas históricas** necesitan los snapshots (B1/B2).

## 7. Decisiones postergadas (POST-1..7) — frontera reservada, **NO deuda**
Reservadas a propósito en el FREEZE (cada una con su frontera limpia y su disparador):
`POST-1` realtime/SSE · `POST-2` coach multi-agente · `POST-3` aprendizaje cross-user (el moat; BIZ-1 reservó la frontera) · `POST-4` datos de mercado externos (régimen real ATR) · `POST-5` extracción del Cognitive Engine a servicio · `POST-6` base de reglas prop-firm como activo · `POST-7` A/B de variantes.

## 8. Recomendación
1. **Cerrar A1** (bloqueo duro por budget) — es el único gap funcional de severidad media barato de cerrar (reusa infra existente) y cierra la promesa de S9.
2. **Mini-sprint de historización** (E19 + E18 snapshots vía el cron existente) → desbloquea la curva temporal de la North Star (B1) y la evolución de edge (B2).
3. **Superficie /aprendizaje** (A2) para transfer/SRS — backend ya listo.
4. El resto es incremental/cosmético o postergado intencional; no bloquea declarar v3 **completo**.

---
**Conclusión:** v3 cumple su tesis — "una capa cognitiva que cambia el comportamiento del trader, verificado". Lo construido está limpio, testeado y vivo; lo pendiente está **inventariado, clasificado y es no-bloqueante**.

---

## 9. CIERRE DEL TRACK DE DEUDA (2026-06-27) — v3 CERRADO ✅
Tras la **re-verificación contra código** (`CLOSURE_REVERIFY.md`) y el track de saldo (`CLOSURE_DESIGN.md` / `CLOSURE_SPRINT_PLAN.md`), la deuda genuina quedó **resuelta**:

| Ítem | Resolución |
|---|---|
| **A1** guard de presupuesto | ✅ forward-looking (PR #116); el lock backward-looking ya existía |
| **B1** historización ImprovementScore (curva North Star) | ✅ E19 + cron + curva (PR #117), verificado en prod |
| **A2** transferencia #31 + SRS #45 | ✅ panel + `computeNextReview` cableado (PR #118), verificado |
| **A4** origen de regla del loop | ✅ badge "desde compromiso/insight" (PR #119) |
| **C1** detectores revenge/oversizing | ✅ ya existían (detectLosingStreak/Oversizing/Emotion) |
| **C2** disposition effect #40 | ✅ ya existía (`detectHoldingAsymmetry`) |
| **B2** SetupEdgeSnapshot | ⏭️ omitido — la curva de edge ya funciona al vuelo |

**Hallazgo del track:** la auditoría a nivel-doc **sobre-estimó la deuda**; la re-verificación contra código mostró que A4/C1/C2/A2-SRS estaban parcial/mayormente construidos. La deuda real era A1(matiz) + B1 + A2(superficie). Todo verificado (tests + UI vs prod).

### Reclasificado a v3.2 (roadmap, NO deuda — no bloquea el cierre)
- **E1** memoria jerárquica de 4 capas (E13–E16) — su invariante irreversible (frontera anti-poisoning, FREEZE-D9) **YA está cumplido**; la jerarquía es *enhancement*, no corrección.
- **A3** migración real de rutas a 5 superficies (hoy reagrupación de nav tras flag).
- **C3** telemetría de ignorado del feed · **C4** digest #28 · **D1** write-tools del chat · **D3** expectedImpact.
- **POST-1..7** (realtime, multi-agente, cross-user moat, ATR, extracción a servicio, base prop-firm, A/B) — frontera reservada con disparador.
- Micro-residuo: sesgo de **anclaje** (#40) — no se construyó un detector de determinismo dudoso a propósito (P3).

> **VEREDICTO: v3.1 CERRADO.** 14 sprints + 3 gates + deuda genuina saldada, todo en `main`, CI verde, verificado por tests y UI contra producción. Lo restante es evolución reservada (v3.2), no deuda de lo prometido.
