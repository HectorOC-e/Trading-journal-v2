# Profile reliability and usability Implementation Plan

> **For agentic workers:** Execute task by task; independent backend tasks dispatched per dispatching-parallel-agents. Principal owns router integration and UI.

**Goal:** Corregir nueve problemas de Perfil y sus cuatro mejoras de uso.
**Architecture:** Formularios de borrador aislados, controles compartidos, fuentes canónicas e interfaces de servidor paginadas/durables.
**Tech Stack:** Next.js, React, tRPC, Prisma, Supabase Auth/Storage/cron, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-04-profile-reliability-design.md

## Global Constraints
Preservar datos y configuraciones originales; no claves en respuestas/exportación. Decimales sin parseo por pulsación. No éxito falso ante persistencia fallida. Solo fixtures QA se modifican, y se restauran.

## Review Focus
- 0.5/coma y 0/null en metas: validación de borrador y pruebas de tecleo.
- Fallos/carga lenta: ni estados fantasma ni guardado de defaults IA.
- Metas y preferencias tras refetch: no sobrescribir otro formulario.
- Exportación con varias páginas y relaciones hijas: alcance propio y exclusiones explícitas.
- Eliminación Auth/DB/Storage parcial: intención durable, idempotencia, reintento y estado veraz.

## Task 1: Backend independiente (TDD por agente)
- [x] Validación real de OpenRouter y centralizar diagnósticos/catálogo; errores seguros.
- [x] PROFILE_EXPORT_SECTIONS y exportProfilePage(prisma,userId,input), registros propios paginados, sin credenciales.
- [x] Eliminación durable con modelo/migración, worker/cron y tests de fallos parciales; interfaz requestAccountDeletion.

## Task 2: Integración y Perfil (principal)
- [x] Integrar servicios en profile router y ajustar contrato de borrado/exportPage.
- [x] Campos numéricos de texto, meta única, invalidaciones y estados de guardado sin optimismo falso.
- [x] Pruebas RED/GREEN de UI y guardado; controles compartidos y formularios etiquetados.
- [x] Navegación de secciones, cambios pendientes/cancelar, zona IANA buscable y referencia de sesiones.
- [x] Bloqueo/reintento de carga IA y guardia de borradores.

## Task 3: Verificación y entrega
- [ ] Suite completa, TypeScript/lint, revisión independiente, graphify.
- [ ] Migración segura y cron, rama/PR/preview, QA desktop/móvil/fallos/exportación/cuenta desechable, capturas.
- [ ] Merge autorizado y eliminar rama; producción SHA exacto, QA/CI y restauración/limpieza.
