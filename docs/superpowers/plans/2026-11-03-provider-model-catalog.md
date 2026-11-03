# Provider model catalog Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Seleccionar modelos desde catálogos reales por proveedor con búsqueda y compatibilidad manual.
**Architecture:** Servicio servidor de catálogo, endpoint tRPC autenticado y selector reutilizable en AiModelsCard.
**Tech Stack:** React, Next.js, tRPC, fetch, Radix Popover, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-03-provider-model-catalog-design.md

## Global Constraints
Sin nuevas dependencias ni migraciones. Claves solo en servidor y propias; sin inferencias pagadas. Conservar auto, herencia, valores no listados y overrides inactivos. OpenRouter con clave usa catálogo de cuenta; sin clave el público.

## Review Focus
- Proveedor cambiado con modelo del anterior: limpiar borrador y probar guardado.
- Catálogo caído/vacío/modelo antiguo: mantener selección y modo manual.
- Clave inválida o payload con datos sensibles: errores y retorno seguros.
- Búsqueda/teclado y móvil: elección accesible y sin desbordamiento.
- Caché tras guardar/eliminar clave: invalidar catálogos sin llamadas de generación.

## Task 1: Catálogo
- [x] Tests RED de parseo, URL/cabeceras, propósito, paginación y fallos.
- [x] Servicio src/server/services/ai/provider-model-catalog.ts y aiConfig.models con claves de resolveProviderKey; GREEN.

## Task 2: Selector e integración
- [x] Tests RED de selector e integración guardado/cambio de proveedor.
- [x] ProviderModelSelect en perfil/components con búsqueda, auto/herencia/manual y metadata explícita.
- [x] Reemplazar datalist/heurística de AiModelsCard; labels y grids adaptables; invalidar tras cambios de credenciales.
- [x] Suite, tipos, lint, revisión y graphify update.

## Task 3: Entrega
- [ ] Copiar temporalmente configuración autorizada a QA vacío y guardar huella del origen sin exponer claves.
- [ ] PR/preview QA real y capturas, CI verde y merge/eliminar rama.
- [ ] SHA producción, QA/CI y eliminación de copia; origen intacto; capturas finales.
