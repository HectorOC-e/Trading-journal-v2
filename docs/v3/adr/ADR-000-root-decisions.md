# ADR-000 — Decisiones de raíz de Trading Journal v3.1

- **Estado:** Aceptada
- **Fecha:** 2026-06-25
- **Contexto fuente:** `v3/README.md §Decisiones de raíz`, `ARCHITECTURE_FREEZE.md`
- **Reemplaza:** prosa de `v3/README.md` (se eleva a ADR formal)

## Contexto
Las cuatro decisiones de raíz de v3 vivían sólo como prosa en `v3/README.md`, sin alternativas ni reversibilidad (deuda RI-11). Este ADR las formaliza.

## Decisión
1. **Arquitectura radical:** 11 módulos colapsan en **5 superficies cognitivas** + 2 subsistemas transversales (Coach, Behavior Engine).
2. **Absorber, no borrar:** ninguna superficie se elimina sin que su dato útil reaparezca como decisión.
3. **DS v3 evoluciona** los tokens/temas actuales (no reescritura).
4. **Entrega documental antes de código;** implementación sólo tras aprobación explícita (cumplida: el freeze es la aprobación arquitectónica).

## Alternativas consideradas
- *Mantener 11 módulos y sólo añadir features* → rechazada: no resuelve el problema estructural (sistema reactivo/episódico).
- *Reescritura desde cero del DS* → rechazada: coste y riesgo sin beneficio proporcional.

## Consecuencias
- Toda la nav v3 se reorganiza (riesgo de hábito, mitigado por migración progresiva).
- **Reversibilidad:** media. Revertir la consolidación de superficies tras S12 es caro pero posible (las pantallas v2 se conservan tras flag).

## Referencias
`FREEZE-P1`, `FREEZE §2`.
