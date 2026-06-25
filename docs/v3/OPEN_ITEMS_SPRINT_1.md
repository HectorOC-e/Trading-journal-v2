# OPEN_ITEMS_SPRINT_1.md
### Trading Journal v3.1 — Sprint 1 · Items abiertos, deuda y riesgos

> Lo que queda abierto al cerrar S1. El item dominante es el **cutover de enforcement (gate G2)**, deliberadamente no ejecutado.

---

## 1. Gate G2 — el cutover de enforcement (lo más importante)
| ID | Item | Cierra en |
|---|---|---|
| **OI-1** | Revisar el **informe de no-mapeo** (`/api/cron/rules-migration-report`) con datos reales: triar `descriptiveWithoutEnforcement` (falsa protección) y `ambiguousAutomations`. | G2 (revisión humana) |
| **OI-2** | Diseñar y ejecutar el **cutover**: que `runAutomations` (o su sucesor) lea de `rules` (mode/enforce) en vez de `automations`, con test de no-regresión del bloqueo pre-trade. **Sólo tras OI-1.** | post-G2 |
| **OI-3** | Tras verificar paridad, **deprecar/retirar `automations`** (P9: conservar hasta verificar). | post-cutover |
| **OI-4** | Replay de la migración `20260625130000` en CI. | CI |

---

## 2. Deuda técnica detectada
| ID | Deuda | Severidad | Notas |
|---|---|---|---|
| **DT-1** | **Doble fuente temporal de reglas** (`automations` enforza; `rules` tiene copias inertes). | Media | Inherente a la migración no destructiva. Se resuelve con el cutover (OI-2) + retiro de `automations` (OI-3). Mientras tanto, editar una automatización **no** actualiza su copia en `rules` (la copia es un snapshot del backfill). |
| **DT-2** | **Backfill = snapshot**, no sincronización viva. | Media | Si el usuario edita automatizaciones tras la migración, `rules` queda desfasado hasta el cutover. Aceptable porque `rules` es inerte; documentar para no confiar en esas filas antes de G2. |
| **DT-3** | **2 plantillas gated** (`no-size-increase-after-loss`, `no-trade-low-energy`). | Baja | Esperan campos de S2 (contexto trade anterior) y S8 (energía). Activarlas es añadir el campo al registro + `available:true` + `rule`. |
| **DT-4** | **`source_commitment_id` sin FK** (Commitment no existe hasta S4). | Baja | Añadir FK cuando nazca `Commitment` (S4/S5). |
| **DT-5** | **Badge sólo en `app/reglas`** (lista de automatizaciones). | Baja | Cuando exista la superficie PROTEGER (S12) y el cutover, el badge debe reflejar `rule.mode` directamente, no `classifyMode(actions)`. |
| **DT-6** | **Plantillas de protección aún no expuestas en la galería de UI** (`automations.templates`). | Baja-media | `PROTECTION_TEMPLATES` existe y está testeado, pero la galería actual usa `TEMPLATES` (automatizaciones). Integrarlas en la UI de creación es trabajo de S1.5/S12. |

---

## 3. Riesgos pendientes
| ID | Riesgo | Origen | Se aborda en |
|---|---|---|---|
| **R-1** | **Falsa protección no resuelta hasta G2.** El informe la detecta, pero las reglas CRÍTICA descriptivas siguen sin bloquear hasta el cutover. | RI-2 / R3 | G2 (OI-1/OI-2) |
| **R-2** | **Cutover es el momento de máximo riesgo** (cambiar la fuente del bloqueo pre-trade). | RI-2 | OI-2 con test de no-regresión obligatorio |
| **R-3** | Heredados de S0 sin cerrar: **G1** (replay S0 + spike outbox) y **BIZ-1** (aislamiento de datos cross-user, antes de S4). | OPEN_ITEMS_SPRINT_0 | CI / antes de S4 |

---

## 4. Próximo paso recomendado
1. Cerrar **OI-4** (replay CI de S1) y **G1** de S0 en CI.
2. Ejecutar **OI-1** (informe con datos reales) → si `falseProtectionCount`/`ambiguousCount` son manejables, planificar **OI-2** (cutover) como mini-sprint con su test de no-regresión.
3. Decidir **BIZ-1** antes de S4.
4. Entonces avanzar a **Sprint 2** (captura de trade v3, C7) — **no antes** (no se avanzó a S2 en este sprint).
