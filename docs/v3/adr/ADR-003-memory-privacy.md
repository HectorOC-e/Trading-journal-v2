# ADR-003 — Privacidad de la memoria y frontera anti-corrupción

- **Estado:** Aceptada
- **Fecha:** 2026-06-25
- **Decide:** `FREEZE-D9`, `FREEZE-P6`, `FREEZE-P8`
- **Resuelve riesgo:** RI-5 (memoria poisoning), RI-12 (perfil psicológico → procesadores LLM externos)

## Contexto
La memoria del coach (`CoachMemory`) almacena hechos/preferencias/perfil psicológico inferido. Dos problemas: (1) si el LLM escribe "hechos" que luego se inyectan como verdad, el error se compone a 5 años (poisoning); (2) esos datos sensibles viajan a proveedores LLM externos (Anthropic/OpenAI/OpenRouter) en cada request.

## Decisión
1. **Frontera anti-poisoning (FREEZE-P6 / D9, irreversible):** *el LLM **propone**, los **datos confirman**.* La memoria semántica/identidad sólo pasa a `confirmed` con **soporte determinista** (N episodios verificables). El LLM nunca escribe memoria semántica/identidad directamente. Memoria plana editable por LLM **queda prohibida**.
2. **Minimización hacia terceros:** sólo se envía al proveedor LLM el subconjunto de memoria necesario para la respuesta (Context Assembler con presupuesto, FREEZE-D10); no se vuelca el perfil completo por defecto.
3. **Control del usuario:** memoria **visible, editable y borrable**; cifrado en reposo (reutiliza `key-encryption.ts`); opt-out del envío de memoria sensible.

## Alternativas consideradas
- *Memoria plana `{kind, content, confidence}` editable por LLM* (propuesta original AI_COACH §3) → rechazada: corrupción incremental, sin verificación.
- *No persistir memoria* → rechazada: mata C2 (el coach que recuerda).

## Consecuencias
- **Irreversible:** la frontera "LLM propone, datos confirman" debe existir desde el primer commit de memoria (S6). Retrofitearla con datos en producción es doloroso.
- **S0:** no se construye memoria todavía (es S6). Este ADR se registra ahora porque **condiciona el modelo de datos** y el consentimiento de onboarding (E13); ningún sprint puede introducir memoria plana editable por LLM.
