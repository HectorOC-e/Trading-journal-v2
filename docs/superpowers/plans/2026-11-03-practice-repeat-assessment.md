# Practice repetition and self assessment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repetir prácticas sin duplicar actividad y registrar objetivo y autoevaluación personal.
**Architecture:** Dos columnas aditivas, validación tRPC y controles compartidos; repetir abre un borrador local con identidad nueva.
**Tech Stack:** Next.js, React, Prisma, Supabase Postgres, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-03-practice-repeat-assessment-design.md

## Global Constraints
Sin dependencias nuevas, sin modificar estudio/trades, sin llamadas IA automáticas. Objetivo máximo 1000 caracteres; resultado nullable achieved/partial/repeat. Preservar propiedad y concurrencia.

## Review Focus
- Repetir no hereda minutos ni resultado/evidencias: componente y navegador.
- Borrador sin guardar no cuenta en resumen: navegador antes/después.
- Limpiar resultado y objetivo persiste: router y navegador.
- Cambios locales al repetir requieren confirmación: componente.
- Registros anteriores sin campos mantienen comportamiento: suite existente y preview.

## Task 1: Persistencia
- [x] Pruebas RED del router: objetivo, resultados válidos/inválidos y limpieza.
- [x] Migración aditiva con CHECK y Prisma; tRPC fields defaults compatibles; generar cliente y pruebas GREEN.

## Task 2: Interfaz
- [x] Pruebas RED de objetivo/autoevaluación y repetir limpio/con cambios.
- [x] Modal con controles compartidos y callback de repetición; pestaña con key nueva y borrador sin minutos/reflexión/evidencias; muestra resultado.
- [x] Pruebas GREEN, TypeScript, lint, suite completa, revisión y graphify update.

## Task 3: Entrega
- [ ] PR, preview listo, ciclo completo en navegador y capturas.
- [ ] Merge autorizado, eliminar rama, verificar CI y SHA de producción; QA y limpieza de fixtures.
