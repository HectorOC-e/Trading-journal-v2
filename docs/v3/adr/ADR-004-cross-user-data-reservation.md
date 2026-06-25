# ADR-004 — Reserva de datos cross-user (BIZ-1)

- **Estado:** Aceptada — **Decisión B (reservar)**
- **Fecha:** 2026-06-25
- **Decide:** BIZ-1 (de `OPEN_ITEMS_SPRINT_0` / `ARCHITECTURE_FREEZE` POST-3)
- **Relacionado:** `ARCHITECTURE_CHALLENGE.md §7.1` (el moat profundo)

## Contexto
El moat más defendible (Challenge §7.1) es un **modelo poblacional privacy-preserving**: "traders con tu patrón que lo corrigieron, hicieron X". Eso requiere poder agregar, de forma anónima, señales de `Intervention.outcome` / `Commitment.result` entre usuarios. Esas tablas nacen en **S4**, así que la decisión de si **reservar la frontera** debe tomarse **antes de S4**.

Aislar estrictamente hoy (todo per-usuario, sin posibilidad de agregación) cerraría el moat: habilitarlo después implicaría migración de datos + consentimiento retroactivo.

## Decisión — Opción B: Reservar para cross-user
Se mantiene RLS per-usuario y **no se construye** ningún modelo cross-user todavía, pero se **reserva la frontera**:

1. **Flag de consentimiento** `users.data_sharing_consent` (opt-in, default `false`) — añadido ya (migración `20260625150000`). Nada se comparte sin opt-in explícito.
2. **Diseño anonimizable de S4:** `Intervention` y `Commitment` deben modelar su `outcome`/`result` con **campos estructurados sin PII** (tipo de patrón, resultado, métricas), de modo que un futuro pipeline pueda agregarlos sin texto libre ni identificadores personales.
3. **Sin decisiones de schema que impidan agregar después** (p.ej. no enterrar la señal en blobs por-usuario no estructurados).

## Alternativas consideradas
- **A — Aislamiento estricto:** más simple, pero **cierra el moat**; reabrirlo = migración + consentimiento retroactivo. Rechazada.

## Consecuencias
- **Coste ahora:** mínimo (una columna booleana + una guía de diseño para S4).
- **Irreversible (frontera):** el diseño anonimizable de `Intervention`/`Commitment` en S4 debe respetar esta reserva; nace con la decisión.
- **Reversible:** el modelo poblacional concreto, el consentimiento UI y el pipeline son **futuro** y opcionales; sólo se activan con tracción + masa de datos.

## Pendiente (cuando se aborde el moat, no ahora)
- UI de consentimiento en Ajustes (explicación + toggle).
- Pipeline de agregación con privacidad diferencial.
- ADR específico del modelo poblacional.
