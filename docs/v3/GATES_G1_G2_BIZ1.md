# GATES_G1_G2_BIZ1.md
### Trading Journal v3.1 — Cierre de G1, G2 y BIZ-1

> Resultado de ejecutar los tres gates pendientes. Fecha: 2026-06-25 · Rama: `feat/v3-g1-g2-biz1`.

---

## G1 — Outbox validado end-to-end ✅ (contra la BD real)
Spike ejecutado contra la BD del `.env`:
- Tablas `domain_events` e `insights` presentes (migraciones aplicadas).
- Evento publicado en transacción → `pending` → `dispatchPending` → **`processed`** (`claimed:1, processed:1, failed:0`, **160ms**).
- Fila de prueba limpiada.

**Conclusión:** ADR-001 (outbox transaccional + dispatcher con `FOR UPDATE SKIP LOCKED`) funciona en infra real. *Nota:* el productor `trade.created` (fast-path) llega en S7; el spike usó `insight.created`. `insights` estaba en 0 filas (el job `recompute-insights` no se ha programado aún en prod).

---

## G2 — Cutover de reglas: implementado detrás de flag (default OFF) ✅
### Paridad verificada (datos reales)
| Métrica | Valor |
|---|---|
| automations totales | 5 |
| rules backfilleadas desde automations | 5 |
| automations **sin** regla espejo | **0** |
| desajustes de `mode` vs presencia de BLOCK | **0** |
| reglas con `mode=enforce` | 2 |
| reglas descriptivas (source null) | 16 |

### Qué se implementó
- **`runRules`** (motor sobre `rules`) — semántica idéntica a `runAutomations`; las descriptivas (trigger null) se excluyen solas. Tests de no-regresión: 8.
- **`runRuleEngine`** + flag **`RULES_SOURCE`** (`'automations'` por defecto). `trades.create` usa `runRuleEngine` en sus 3 puntos. **Flag OFF ⇒ comportamiento idéntico a hoy.**
- **Dual-write** (`rule-sync.ts`): cada CRUD de automatización (create/update/toggle/delete/reorder/createFromTemplate) **espeja** la fila en `rules`, best-effort. Así `rules` se mantiene en sync y el flag es flippable.

### Runbook para hacer el flip en prod
1. **Re-backfill de seguridad** (captura automatizaciones creadas entre el deploy de S1 y el del dual-write). Ejecuta el `INSERT ... where not exists` de `20260625130000_v3_s1_unify_rules.sql` (es idempotente), o crea una migración que lo repita.
2. Verifica paridad (las 2 queries de "must be 0" en este doc).
3. **Flip:** `RULES_SOURCE=rules` en el entorno (Vercel env) y redeploy.
4. **Smoke:** registra un trade que debe bloquearse por una regla `enforce` → debe bloquear igual que antes.
5. **Rollback instantáneo:** `RULES_SOURCE=automations` (o borrar la var) + redeploy.
6. **Cleanup (más tarde, no ahora):** una vez estable, dejar de escribir `automations` y, en una migración posterior, retirar la tabla (FREEZE-P9: conservar hasta verificar).

**Estado:** ✅ **FLIPPEADO Y VERIFICADO EN PRODUCCIÓN (2026-06-26).**
- Paridad re-verificada antes del flip: 5/5 automatizaciones espejadas, **0 sin espejo, 0 desajustes de `mode`**.
- `RULES_SOURCE=rules` creado en el entorno **Production** de Vercel (vía REST API) + redeploy de `main` (deployment `dpl_8xDger…`, sirve tjournalx.com).
- **Smoke (cutover real):** usuario throwaway con una regla `enforce` que vive **solo en `rules`** (sin automation espejo) → al intentar registrar un trade en prod, **se bloqueó** (`trades_created=0`) y la regla registró `last_fired_at` (y `runRules` —no `runAutomations`— es quien actualiza `rules.last_fired_at`). Como el usuario no tenía automatizaciones, bajo el comportamiento viejo NO se habría bloqueado → prueba definitiva de que el enforcement lee de `rules`. Usuario throwaway eliminado tras la prueba.
- **Rollback:** quitar la env var `RULES_SOURCE` (o ponerla a `automations`) + redeploy → vuelve a `automations` al instante. Dual-write sigue activo.
- **Pendiente (cleanup, más tarde — FREEZE-P9):** dejar de escribir `automations` y, en migración posterior, retirar la tabla una vez estable.

---

## BIZ-1 — Decisión **B (reservar cross-user)** ✅
- **ADR-004** registrado (`docs/v3/adr/ADR-004-cross-user-data-reservation.md`).
- Reserva concreta: columna `users.data_sharing_consent` (opt-in, default `false`) — migración `20260625150000`.
- **Implicación para S4:** `Intervention` y `Commitment` deben nacer con `outcome`/`result` **estructurados y anonimizables** (sin PII), para no cerrar el moat poblacional.
- No se construye nada cross-user todavía (es futuro); sólo se reserva la frontera.

---

## Resumen
| Gate | Estado |
|---|---|
| **G1** | ✅ Validado en BD real (outbox OK, 160ms) |
| **G2** | ✅ **FLIPPEADO en prod (2026-06-26)**: `RULES_SOURCE=rules`, smoke de cutover verificado (bloqueo desde `rules`, regla sin automation espejo). Dual-write activo; rollback = quitar la var |
| **BIZ-1** | ✅ Decisión B + ADR-004 + columna de consentimiento |

**Verificación:** 876/876 vitest (+10, TDD), tsc + eslint verdes. Migración nueva: `20260625150000` (aditiva).
