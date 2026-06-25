# OPEN_ITEMS_SPRINT_0.md
### Trading Journal v3.1 — Sprint 0 · Items abiertos, deuda y riesgos

> Lo que queda abierto al cerrar S0. Nada aquí bloquea la corrección de lo entregado; son cosas a resolver en su sprint o gate. Cada item indica **dueño temporal** (sprint donde se cierra).

---

## 1. Validación pendiente (gate G1)
| ID | Item | Cierra en |
|---|---|---|
| **OI-1** | Migración `20260625120000` sin replay local; falta confirmación CI (`supabase db reset`). | CI / G1 |
| **OI-2** | Spike end-to-end del outbox (recompute → `insight.created` → dispatch → `processed`) en entorno con DB. Valida ADR-001 a coste medido. | G1 (antes de S4) |

---

## 2. Deuda técnica detectada
| ID | Deuda | Severidad | Notas |
|---|---|---|---|
| **DT-1** | **`sample_size` es coarse** (= nº total de trades, no n por detector). | Media | Los detectores existentes no exponen n. Refinar cuando se reescriban los detectores con la capa Bayesiana (S3). Honesto pero impreciso. |
| **DT-2** | **Campos Bayesianos nulos** (`confidence`, `credible_interval_*`, `effect_size`). | Media | Por diseño (ADR-002): las columnas existen, el estimador es S3. Riesgo: que algún consumidor asuma que están llenos. Mitigar documentando "nullable hasta S3". |
| **DT-3** | **Capa DB sin tests de integración** (`publishEvent`/`persistInsights`/`dispatchPending`). | Media | Bloqueado por falta de DB local. Añadir tests con DB efímera (testcontainers/Supabase local) cuando el entorno lo permita. |
| **DT-4** | **Doble mantenimiento SQL ↔ `schema.prisma`.** | Baja | Patrón ya existente en el repo (56 migraciones). Riesgo de drift si se edita uno sin el otro. Un check de drift en CI lo cerraría. |
| **DT-5** | **`recomputeInsights` recalcula sobre "todos los trades"** (no incremental). | Baja-media | Aceptable para un job diario en S0; el worker incremental sobre deltas (NFR coste, FREEZE §RI-4) es S6/S7. No usar este job en el camino de intervención. |
| **DT-6** | **`generatePsychologyInsights` y `generateInsights` podrían compartir categorías** sin coordinación de fingerprint. | Baja | Cubierto hoy por el dedupe (D-S0-7), pero si dos detectores deben coexistir con el mismo slug habría colisión silenciosa (se queda el primero). Revisar al ampliar detectores. |

---

## 3. Riesgos pendientes (heredados, no resueltos en S0 por estar fuera de alcance)
| ID | Riesgo | Origen | Se aborda en |
|---|---|---|---|
| **R-1** | **Fast-path síncrono de intervención** aún no existe; el outbox solo da entrega diferida. C1 sigue sin su mecanismo de "momento del error". | RI-1 / ADR-001 | S7 (productor en `trade.create`) |
| **R-2** | **Coste del job a escala** (recompute por usuario × detectores) sin caché incremental de contexto. | RI-4 | S3/S6 (FREEZE-D7) |
| **R-3** | **Dispatcher no programado** → si se programa antes de tener consumidores, drena eventos. Debe programarse **junto con** el primer consumidor (S4). | D-S0-3 | S4 |
| **R-4** | **Rigor estadístico** aún ausente (columnas vacías). Mostrar insights sin confianza puede reintroducir R6 si la UI los trata como ciertos. **No exponer en UI hasta S3.** | RI-3 / ADR-002 | S3 |
| **R-5** | **Migración de reglas (C6)** intacta — sigue siendo el riesgo alto de S1 (fusión semántica). | RI-2 | S1 |
| **R-6** | **Privacidad de memoria** (ADR-003) registrada pero no implementada; ningún sprint puede introducir memoria plana editable por LLM. | RI-12 | S6 |

---

## 4. Decisión de negocio aún pendiente (de A0, no arquitectónica)
| ID | Item | Impacto si se decide tarde |
|---|---|---|
| **BIZ-1** | **Aislamiento de datos cross-user (POST-3 del freeze):** ¿el esquema debe permitir aprendizaje poblacional anónimo futuro? Afecta cómo se modelan tablas desde ya. | Habilitar el moat (§7 del Challenge) más tarde = migración de datos + consentimiento. Decidir antes de S4 (cuando nacen `Intervention`/`Commitment`, los datos del moat). |

---

## 5. Próximo paso recomendado
1. Cerrar **OI-1/OI-2** (gate G1) en CI/entorno con DB.
2. Decidir **BIZ-1** (aislamiento de datos) antes de S4.
3. Entonces avanzar a **Sprint 1** (unificación de Reglas, C6) — **no antes** (regla de este sprint respetada: no se avanzó a S1).
