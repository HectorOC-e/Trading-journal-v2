# Actualizaciones ISR y avisos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar ajustes anuales compatibles del SAR automáticamente y notificar publicaciones en la aplicación y por email según preferencias.

**Architecture:** Parser oficial y reglas puras; servicio de sincronización con publicación transaccional; entregas por usuario duraderas e idempotentes. El motor carga el paquete publicado del ejercicio y las superficies existentes muestran estado/historial/preferencias.

**Tech Stack:** Next.js 16.2.7, TypeScript, Prisma 7/PostgreSQL/Supabase, Vitest, Resend y pg_cron/pg_net existentes. Sin IA ni proveedor nuevo.

**Spec:** `docs/superpowers/specs/2026-11-13-fiscal-rule-updates-design.md`

## Global Constraints

- Sólo Honduras/persona natural/ISR ordinario; autoactivar únicamente ajustes compatibles de los cuatro umbrales y tasas existentes.
- Ningún paquete 2027 inventado ni correo de prueba a usuarios reales en producción.
- Mantener regla 2026, snapshots archivados, permisos por usuario y preferencias de correo/horario.
- Sólo fuentes HTTPS SAR permitidas; bytes, tiempos y documentos acotados; no renderizar HTML remoto.
- Rama y procedimiento de CI, preview, QA, merge y limpieza ya autorizado. No incluir caches Graphify heredadas ni credenciales en commits.

## Review Focus

- Una modificación cosmética o un contador no debe producir una nueva regla o aviso (Task 1/3).
- Una norma detectada que todavía requiere revisión no debe presentarse como activada (Task 1/3/5).
- Dos cron concurrentes y un fallo después del proveedor no deben duplicar notificaciones o correos (Task 3/4).
- Un cambio de regla entre preparar y cerrar exige una nueva versión sin modificar el archivo anterior (Task 2).
- Silencio temporal, baja/opt-out y eliminación de usuario no deben perder avisos válidos ni enviar a quien ya no es elegible (Task 4).

### Task 1: reglas versionadas y parser SAR

**Files:** Create `src/domains/tax/rules/rule-set.ts`, `src/server/services/tax/rules/sar-source.ts`; tests `src/__tests__/domains/tax/rule-set.test.ts`, `src/__tests__/services/tax/sar-source.test.ts` y fixture estructural del artículo oficial.

**Interfaces:** `HnRuleSet`, `validateRuleSet(payload,checksum)`, `parseSarRulePage(html,url): SarRuleCandidate`; hechos canónicos y comparación de tramos sin números flotantes.

- [ ] Tests RED para tabla real 2026, fila/cabecera falsa, huecos, tasa incompatible, año incoherente, doble tabla y normalización cosmética.
- [ ] Implementar schema/checksum y extractor limitado sin ejecutar contenido remoto.
- [ ] Tests GREEN y commit de rutas explícitas.

### Task 2: motor fiscal por paquete

**Files:** Modify `src/domains/tax/calculation.ts`, `validation.ts`, `src/server/services/tax/calculation-service.ts`; tests de cálculo y lifecycle existentes.

**Interfaces:** `calculateHnIsr(base,rule)`, `calculateTax(input,rule?)`; selección de `TaxRuleSet` publicada por año y régimen. Mantener `calculateHnIsr2026` como compatibilidad.

- [ ] Tests RED: paquete local sintético 2027 calcula con sus tramos, año/checksum equivocado no calcula, simulación usa mismo paquete y cierre desactualizado rechaza.
- [ ] Parametrizar cálculo y serialización/huella de preparación; no alterar datos fiscales.
- [ ] Suite fiscal GREEN y commit.

### Task 3: sincronización y publicación duraderas

**Files:** Create `src/server/services/tax/rules/sync-service.ts`, `status-service.ts`; modify Prisma schema; nueva migración generada por CLI; tests servicios e integración PostgreSQL.

**Interfaces:** `syncTaxRules(db,{now,fetchSource?})`, `getTaxRulesStatus(db,year)`; modelos `TaxRuleUpdate`, `TaxRuleSyncState`, `TaxRuleDelivery` de la especificación.

- [ ] Tests RED: bootstrap 2026 sin avisos, publicación compatible atómica, paquete idéntico sin evento, rechazo conserva anterior, lease concurrente y recuperación.
- [ ] Crear modelos/migración RLS y publicar sólo hechos canónicos completos; estado público acotado a información normativa.
- [ ] Tests GREEN, Prisma validate e integración local; commit.

### Task 4: notificaciones, correo y runner

**Files:** Create `src/server/services/tax/rules/delivery-service.ts`, `src/emails/templates/tax-rule-update.tsx`, `src/app/api/cron/tax-rules/route.ts`; modify catálogo/tipos/router de notificaciones; migración programa cron protegido.

**Interfaces:** `deliverTaxRuleUpdates(db,{now,sendEmail?})`; lotes acotados, delivery único por usuario/update y claves de correo estables.

- [ ] Tests RED para in-app + email habilitado, email opt-out, mute/prioridad/silencio, dos runners, crash ambiguo, dry-run/error y eliminación.
- [ ] Implementar entrega con lease, estado por canal y resumen normativo sin datos fiscales personales; usar Resend y controles existentes.
- [ ] Tests GREEN y prueba real de plantilla renderizada sin enviar correos; commit.

### Task 5: estado e historial en Fiscalidad y preferencias

**Files:** Modify `src/server/trpc/routers/tax.ts`, `src/app/fiscal/components/fiscal-workspace.tsx`, `src/app/perfil/page.tsx`, `src/app/notificaciones/page.tsx`; crear panel de reglas pequeño y tests de componentes.

**Interfaces:** `tax.rules.status({year})`; categoría Fiscalidad y toggle `Email · Fiscalidad`; la UI consulta disponibilidad en vez de fijar 2027.

- [ ] Tests RED para estado sin paquete, historial publicado/fuentes, nuevas reglas habilitan simulación y toggle preserva canales actuales.
- [ ] Reutilizar Panel/Button y formularios/preferencias actuales; quitar afirmaciones fijas sobre publicaciones futuras.
- [ ] Tests GREEN, tipos y lint; commit.

### Task 6: verificación y publicación

- [ ] Suite completa, tipos, lint, build y replay de migraciones; actualizar Graphify desde raíz y revisar diff.
- [ ] Revisión independiente final del branch; corregir hallazgos importantes con RED→GREEN.
- [ ] PR/preview exacto, QA aislada de escritorio/móvil y capturas; ninguna actualización sintética en base compartida.
- [ ] Migración y merge conforme autorizaciones/revisión automática; verificar producción y cron, limpieza de QA y enlaces.
- [ ] Actualizar el manual e informar alcance efectivo y limitaciones de detección/revisión, sin afirmar disponibilidad de 2027 hasta existir publicación verificada.
