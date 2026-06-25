# IMPLEMENTATION_ORDER.md
### Trading Journal v3 — Orden óptimo de ejecución

> Documento 8/8. Define el orden de construcción para minimizar reproceso y maximizar valor temprano, sin reducir alcance (la versión ideal completa se mantiene; esto es secuenciación, no recorte).

---

## 1. Principios de secuenciación
1. **Primitivas antes que features:** lo que muchas cosas necesitan se construye primero (ventanas rodantes, insights persistidos, bus, reglas unificadas, captura).
2. **El núcleo antes que la piel:** Behavior Engine + Coach v3 antes que el rediseño visual completo (la UI v3 envuelve capacidades reales, no maquetas).
3. **Datos antes que inteligencia:** captura (MAE/MFE, psico, régimen) antes que los detectores que la consumen.
4. **Valor por incremento:** cada paso deja algo usable; no hay "big bang".
5. **Riesgo de migración temprano:** la fusión Rule/Automation se hace pronto, con datos aún manejables.

---

## 2. DAG de dependencias (capacidades)

```
[S0] rollingWindow ───────────────┬─────────────────────────────┐
[S0] Insight persistido ──────────┼──────────────┐              │
[S0] bus + jobs ──────────────────┤              │              │
                                  │              ▼              ▼
[S1] Reglas unificadas ───────────┤        [S3] Métricas    [S4] Behavior
[S2] Captura v3 (psico/MAE/regime)─┘         institucionales   Engine I
        │                                         │              │
        │                                         ▼              ▼
        │                                   [S9] Riesgo/Prop  [S5] Regla↔Compromiso
        │                                                        │
        ▼                                                        ▼
[S8] Psicología v3 ◀──────────────────────────────────── [S6] Coach memoria
        │                                                        │
        └────────────────────────────┐                          ▼
                                      └────────────────▶ [S7] Coach proactivo/intervención
[S10] Playbook intel ◀── S0,S3                                   │
[S11] Aprendizaje/Instrumento/Tags ◀── S3,S10                    │
                                                                 ▼
[S12] DS v3 + 5 superficies ◀── S7 + todo el contenido ── [S13] HOY feed
                                                                 │
                                                                 ▼
                                                        [S14] Improvement/Regímenes/Onboarding
```

---

## 3. Ruta crítica (lo que no se puede paralelizar)
```
S0 ▶ S4 ▶ S5 ▶ S6 ▶ S7 ▶ S12 ▶ S13 ▶ S14
(primitivas → loop → regla↔compromiso → memoria → proactividad → superficies → HOY → mejora)
```
Esta cadena define el tiempo mínimo del proyecto. Todo lo demás se cuelga en paralelo.

---

## 4. Trabajo paralelizable (independiente entre sí)
Una vez hechos **S0–S2**, estos tracks pueden avanzar en paralelo (equipos/sesiones distintas):
- **Track Analytics:** S3 → S9 → S10 → S11.
- **Track Behavior/Coach (ruta crítica):** S4 → S5 → S6 → S7.
- **Track Psicología:** S8 (necesita S2; se integra en S7).
- **Track UX/DS:** preparar S12 (tokens/componentes) en paralelo desde temprano, integrar al final.

> Regla de integración: el **DS v3 (S12)** se diseña en paralelo desde S3, pero **se integra al final** porque envuelve capacidades reales (evita maquetar lo que no existe).

---

## 5. Orden recomendado lineal (si se ejecuta en serie, p.ej. un solo agente/sesión)
```
S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10 → S11 → S12 → S13 → S14
```
Razonamiento del orden:
1. **S0–S2** habilitan literalmente todo (sin rolling/insights/captura no hay longitudinal ni loop).
2. **S3** se adelanta porque S4 (verificación de compromisos) necesita métricas correctas.
3. **S4–S5** entregan el **núcleo del producto** (el loop) lo antes posible → primer "aha" de retención.
4. **S6–S7** convierten el coach en Profesional (memoria→proactividad). Máxima diferenciación.
5. **S8–S11** añaden profundidad analítica/psicológica sobre cimientos sólidos.
6. **S12–S14** envuelven todo en las 5 superficies y rematan con el relato de mejora.

---

## 6. Puntos de aprobación (gates con el usuario)
| Gate | Tras | Qué se valida |
|---|---|---|
| G1 | S0 | Primitivas y persistencia; decisión de seguir |
| G2 | S1 | Migración de reglas sin pérdida (riesgo alto) |
| G3 | S5 | El loop funciona end-to-end (insight→regla→verificación) |
| G4 | S7 | Coach proactivo + intervención (cambio de categoría a Profesional) |
| G5 | S12 | Re-arquitectura de navegación a 5 superficies |
| G6 | S14 | Producto v3 completo; 100% auditoría cubierta |

---

## 7. Estrategia de ramas y entrega
- Rama base de planificación: **`feat/v3-master-plan`** (estos 8 docs).
- Por sprint: rama `feat/v3-sX-<slug>` → PR a `main` tras validación (patrón actual del repo).
- Migraciones siempre validadas por CI (`migrate-validate`, replay desde cero) antes de merge.
- Feature flags para activar superficies v3 progresivamente sin romper v2 en producción.

---

## 8. Reversibilidad y seguridad
- Cada fusión de modelo (Rule/Automation; absorción de módulos) conserva el dato original hasta verificación post-migración.
- Las superficies absorbidas (Dashboard/Notif/Mercados/Etiquetas) se mantienen accesibles tras flag hasta que su reemplazo demuestre paridad de valor.
- El bloqueo pre-trade y la separación práctica/real son **invariantes**: ninguna fase puede regresarlos (test de no-regresión en cada sprint).

---

## 9. Primer paso concreto (cuando se apruebe)
**Sprint 0**, primer entregable: `rollingWindow` + persistencia de `Insight` + bus de dominio. Es la raíz del DAG y desbloquea la ruta crítica. Nada de UI todavía; pura capacidad testeable.

---

## 10. Resumen
- **Ruta crítica:** S0→S4→S5→S6→S7→S12→S13→S14.
- **Valor más temprano:** el loop (S4–S5) y el coach proactivo (S6–S7).
- **Riesgo gestionado primero:** migración de reglas (S1).
- **La piel al final:** DS v3 (S12) envuelve capacidades reales.
- **Cobertura:** 100% de la auditoría distribuida S0–S14, sin recortes.
