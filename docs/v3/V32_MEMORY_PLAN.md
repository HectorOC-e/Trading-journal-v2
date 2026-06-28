# V32_MEMORY_PLAN.md
### Trading Journal v3.2 · E1 — Memoria jerárquica de 4 capas (FREEZE §6)

> Primer sprint de v3.2. Eleva la `CoachMemory` plana a las **4 capas** del freeze, **sin romper la frontera anti-poisoning (D9, ya cumplida)**. Patrón v3: dominio puro + TDD → migración dual → servicio → assembler → verificación.
> Fecha: 2026-06-27.

## Re-verificación (estado real)
- `CoachMemory` plana ya tiene `kind(fact|preference|identity)` + `status(candidate|confirmed|refuted)` + frontera D9 (LLM propone candidato, usuario/datos confirman). `assembleCoachContext` inyecta confirmada (identity+facts) + compromisos + resumen.
- **pgvector OPERATIVO** (`TradeEmbedding` + columna `notes_embedding vector`, escritura `::vector`, búsqueda `<=>`). Reutilizable.
- **E16 (mejora) ya tiene su dato**: `improvement_scores` (E19, closure B1). Solo falta leerlo en el contexto.

## Las 4 capas y qué es nuevo
| Capa | Entidad | Estado | Trabajo |
|---|---|---|---|
| **Episódica** | E13 `MemoryEpisode` | **ausente** | append-only + embedding (pgvector) + **saliencia con decay**; recall híbrido (filtro + kNN + saliencia). *Lo genuinamente nuevo.* |
| **Semántica** | E14 `MemoryPattern` | parcial (= `CoachMemory kind:fact` confirmada) | promover a patrón + `supportEpisodeIds[]` + confirmar con **N episodios deterministas (P6)** |
| **Identidad** | E15 `MemoryIdentity` | parcial (= `kind:identity` texto) | 1/usuario **estructurado** (tono/canal/estilo/riesgo), editable |
| **Mejora** | E16 | **dato ya existe** (E19) | leer la serie en el contexto ("mejor que hace 3 meses") |

## Sub-sprints (PR por pieza)
- ✅ **E1·a — Episódica (E13) — HECHO (PR #120, verificado en BD real):** migración `memory_episodes` + columna `embedding vector` + RLS; `salience.ts` puro (saliencia por evento + decay + recallScore, TDD); `memory-episode-service` (recordEpisode append-only + embedding best-effort, recallEpisodes kNN×saliencia, getSalientEpisodes); productores `intervention.respond` + check-in rojo; `assembleCoachContext` inyecta los episodios salientes (D10). **Decay a READ-time** (no cron — sin write-amplification). Smoke real OK: intervention 0.90 / checkin 0.70, recall top, contexto incluye "Momentos recordados". *Pendiente (E1·b): más productores (commitment kept/broken, trade emocional) + recall por query del último mensaje.*
- **E1·b — Semántica (E14) + Memory Agent:** `MemoryPattern` con `supportEpisodeIds[]`; el Memory Agent confirma un patrón candidato solo con **N≥3 episodios de soporte** (P6, determinista, no por el LLM). Backfill no destructivo de `CoachMemory kind:fact` confirmada → `MemoryPattern` (P9, conservar original).
- **E1·c — Identidad (E15) + Mejora (E16) + Assembler (D10):** `MemoryIdentity` estructurada (editable en el panel); leer E19 para el delta de mejora; `assembleCoachContext` pasa a ensamblar **las 4 capas con presupuesto de tokens** (Identity siempre + Semantic confirmados relevantes + top-k Episodic por saliencia + delta Improvement).

## Invariantes (ningún sub-sprint rompe)
- **D9/P6**: el LLM **nunca** escribe semántica/identidad directo; propone, el Memory Agent/usuario confirma contra datos (N episodios). Episódica es append-only (evidencia, nunca editada).
- **D10**: contexto acotado por presupuesto, no "toda la memoria".
- Migraciones reversibles (P9): se conserva `CoachMemory` hasta verificar paridad.
- RLS per-usuario en las 4 tablas.

## Definición de "E1 hecho"
Las 4 capas existen con RLS; el coach ensambla contexto de las 4 con presupuesto; D9 intacto; episódica con recall semántico + saliencia; migración reversible; sin regresión del coach. Verificado por tests + UI (panel de memoria) + smoke real del recall.

---
## ✅ E1 COMPLETA (2026-06-27) — memoria jerárquica de 4 capas viva y verificada
| Capa | Entidad | PR | Verificación (BD real) |
|---|---|---|---|
| Episódica | E13 `memory_episodes` (pgvector) | #120 | record→saliencia 0.90/0.70→recall→"Momentos recordados" ✓ |
| Semántica | E14 `memory_patterns` (Memory Agent, P6 N≥3) | #121 | 3 episodios→patrón **confirmado** (support n=3)→en contexto ✓ |
| Identidad | E15 `memory_identity` (estructurada, editable) | #122 | tono "directo"→"Identidad del trader" ✓ |
| Mejora | E16 (lee E19) | #122 | serie 2pts→"Progreso: índice X (+N vs hace M días)" ✓ |

**`assembleCoachContext` ensambla las 4 con presupuesto (D10).** Anti-poisoning (D9) intacto: episódica append-only, semántica confirmada por dato, identidad del usuario. Decay episódico a read-time. Smoke 4-capas: las 4 presentes en el contexto. `CoachIdentityEditor` en el panel de memoria (🧠).

**Pendiente menor (no bloquea):** recall episódico por query del último mensaje del chat (hoy se inyectan los más salientes); backfill `CoachMemory kind:fact` confirmada → `MemoryPattern` (ambas conviven sin conflicto). **Siguiente en v3.2: A3 rutas reales / C3 / C4 / D1 / POST-x.**
