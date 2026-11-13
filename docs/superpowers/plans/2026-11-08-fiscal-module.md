# Fiscalidad Honduras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar las fases 1–3 aprobadas: registros fiscales independientes, estimación HN2026 y preparación/archivo del borrador102.
**Architecture:** Monolito modular con tablas fiscales propias, servicios autenticados y ledger decimal. Sólo un lector SELECT conecta Retiros; motor puro y paquete anual versionado. Documentos privados y cierres auditados.
**Tech Stack:** Next16.2.7/React19, tRPC11, Prisma7/Postgres, Supabase Auth/Storage, Decimal de Prisma, Vitest/Playwright.
**Spec:** `docs/superpowers/specs/2026-11-08-fiscal-module-design.md`, aprobada por el usuario el08nov2026.

## Global Constraints

- Honduras, persona natural domiciliada, ejercicio2026 y moneda fiscal HNL; calendario America/Tegucigalpa.
- Ninguna escritura fiscal modifica trading, retiros, capital, locks, P&L o estadísticas. No usar accounts.list ni dashboardMutation.
- Importes/cotizaciones `numeric(38,18)`, finales HNL `numeric(20,2)`; cantidades de API como cadenas, sin fallback FX/paridad USDC.
- Tabla2026: exento228324.32;15%hasta348154.10;20%hasta809660.75;25%resto. Simulación HALF_UP final2decimales; redondeo normativo pendiente bloquea READY hasta confirmación respaldada.
- Reglas desconocidas son pendientes, no exención. FTMO/cripto no reciben categoría tributaria automática. Simulaciones no alteran registros.
- RLS/ownership, bucketprivado tax-evidence, sin IA/embeddings. READY sólo con requisitos completos; close revalida READY en transacción.
- API privilegiada es la única escritura fiscal; clientes REST no saltan auditoría/cierre. Todos los ids relacionados deben compartir propietario.
- Extender exportación y eliminación de perfil (servicio y SQL de buckets). No actualizar datos reales para QA.
- AGENTS: graphify query antes de primera búsqueda/read por pregunta; rawread sólo archivos localizados. Graphify update tras código.

## Review Focus

- Dos confirmaciones simultáneas no pueden gastar/conciliar el mismo saldo dos veces; probar en transacción y lock común por perfil.
- Solicitud de2025 cobrada2026 y cobro2027 de ingreso2026cerrado conservan años y no vuelven a crear renta.
- Reutilización de una retención/comisión ya aplicada no reduce impuesto dos veces; componentes económicos únicos.
- Cierre durante subida o escritura concurrente no admite finalización tardía ni altera snapshot anterior.
- Cotización, fuente o ejercicio desconocidos conservan registro pero nunca muestran cero calculado como deuda completa.

---

### Task 1: Dominio decimal, contratos y motor puro

**Files:** Create `src/domains/tax/{types,validation,decimal,ledger,calculation}.ts`, `src/domains/tax/rules/hn/2026.ts`; tests `src/__tests__/domains/tax/*.test.ts`.
**Interfaces:** Exportar tipos JSON-friendly de activo/valoración/tratamiento/partida y esquemas Zod sin imports de servicios. `calculateHnIsr2026(base:string)` → `{base,tax,brackets,roundingAdjustment,ruleVersion}`; `validatePostings(input)` valida partidas por tipo; `calculateTax(input)` produce base/tramos/créditos/saldo/pending y coverage. Reglas tienen URLs/checksum/version; `decimal` rechaza escala/rango/exponentes/no finitos antes de persistir. Importes resultantes como cadenas.

- [ ] Escribir pruebas RED: ochofixtures de la spec, monotonicidad, centavo/frontera, escala38/18 y HNL20/2, cotización faltante, USDC≠USD, 2k→transferencia1k→gasto300, crédito>impuesto separado de devolución, comisión no duplicada y tratamiento pendiente.
- [ ] Run `cd src && pnpm test __tests__/domains/tax`; observar fallo por funciones faltantes.
- [ ] Implementar contratos, reglas anuales y motor decimal puro; ningún acceso a red/BD/tiempo implícito.
- [ ] Repetir comando: PASS; commit exclusivo dominio/tests. Documentar interfaces finales para servicios.

### Task 2: Persistencia, integridad y transacciones fiscales

**Files:** Modify `src/prisma/schema.prisma`; create migración con CLI, `src/server/services/tax/{context,serializers}.ts`; test `src/__tests__/services/tax/context.test.ts` e integración SQL.
**Interfaces:** Modelos de la spec: TaxProfile, TaxPeriod, TaxRuleSet, TaxAssetAccount, TaxTransaction, TaxPosting, TaxIncome, TaxDeduction, TaxCredit, TaxImportCandidate, TaxReconciliation, TaxEvidence y vínculos explícitos, TaxReturn, TaxAuditEvent. Campos económicos normalizados; metadata/snapshots tipados. Todos user-owned incluyen userId/FKUser+cascade y unique(userId,id). `withTaxWrite(db,userId,periodIds,request,fn)` bloquea perfil/períodos, chequea OPEN/revisiones, invalida READY, audita e implementa idempotencia por request/hash. `serializeTax` mantiene Decimal como string y fechas DATE como YYYY-MM-DD.

- [ ] RED pruebas de propietario/revisión/cierre/idempotencia (mismo payload mismo resultado; otro payload conflicto).
- [ ] Generar schema y migración aditiva; constraints/FKs compuestas, índices, RLS SELECTowner y sin writes directas authenticated/anon. Bucket privado10MiB y permisos sólo vía servidor. Catálogo de reglas publicado read-only.
- [ ] Generar Prisma, ejecutar pruebas de guardas y replay migration; confirmar ausencia de cambios a tablas económicas previas.
- [ ] Commit schema/migración/contexto una vez Prisma valida. No aplicar remoto hasta revisar SQL.

### Task 3: Registros, ledger y conciliación de Retiros

**Files:** Create `src/server/services/tax/{profile-service,ledger-service,record-service,withdrawal-reader,reconciliation-service}.ts`, `src/server/trpc/routers/tax.ts`; modify `src/server/trpc/root.ts`; tests `src/__tests__/{services,routers}/tax/*.test.ts`.
**Interfaces:** Router `tax`: profile.get/save, periods.list/create, accounts.list/save, transactions.list/save/post/reverse, incomes.list/save, deductions.list/save, credits.list/save, imports.candidates/reconcile/dismiss, overview. Inputs `periodId`, `requestId`, `expectedRevision` y decimales string; listas cursor/limit. Frontend consume RouterInputs/Outputs, sin acceso directo BD.

- [ ] RED: no userId de cliente, 2usuariosIDOR, lector SELECT sin llamar accounts.list, tipos reales vs QA/DEMO/BACKTEST, cuenta inactiva, fecha retiro fueraejercicio, snapshot modificado/borrado, conciliaciónparcial/múltiple y sobreasignación.
- [ ] Implementar perfil/ejercicios y cuentas fiscales; fechaeconómica, activo completo, saldos iniciales y tránsito diferenciados. Ingreso y cobro separados; recepción ligada no genera doble renta. Transferencias/conversiones afectan partidas únicamente.
- [ ] Implementar gastos/deducciones/créditos con fundamento/admisión separados; comprobación anti-duplicación y disponible de créditos ya usados.
- [ ] Implementar propuestas/vinculación sólo SELECT a originales; snapshot propio e idempotencia en confirmación; registrar recepción nueva o vincular existente. Estado PAGADO no basta; fecha/evidencia confirmadas porusuario.
- [ ] Correr pruebas enfocadas + typecheck. Commit backend/router, interfaces listadas en reporte para UI.

### Task 4: Evidencias privadas y ciclo de vida del perfil

**Files:** Create `src/server/services/tax/evidence-service.ts`, `src/app/api/tax/evidence/route.ts`; modify `src/domains/profile/export-sections.ts`, `src/server/services/profile/{export-profile,account-deletion}.ts`, nueva migración de función limpieza; tests `src/__tests__/services/tax/evidence.test.ts` y pruebas perfil existentes.
**Interfaces:** tax.evidence.list/startUpload/finalize/link/remove/download, token corto firmado hacia Storage, metadata con SHA256/MIME/tamaño y owner. endpoint devuelve URL firmada300s private,no-store; finalize valida objeto real y ejercicio abierto. Vínculos explícitos comprobados. Exportperfil añade todos los delegates fiscales e identificadores/versiones sin URLs firmadas; eliminación incluye tax-evidence por prefijo/owner.

- [ ] RED: IDOR, MIMEspoof, >10MiB, tokenfinalize trasclose, subida incompleta, reemplazo immutable, descarga ajena/caché y limpieza >100objetos reintentable.
- [ ] Implementar uploads directos + finalización servidor, descarga y desvinculación auditada; Storage no se ejecuta dentro de una transacción SQL larga. Compensar fallos/huérfanos de la cuenta.
- [ ] Añadir bucket y metadatos a limpieza durable/export de perfil sin cambiar secciones previas; actualizar función SQL y RLS.
- [ ] Correr pruebas focales perfil/documentos y typecheck; commit propio.

### Task 5: Cálculo, formulario102, cierres y exportaciones

**Files:** Create `src/server/services/tax/{calculation-service,return-service,export-service}.ts`, `src/app/api/tax/export/route.ts`; extend router; tests services/tax/returns, exports.
**Interfaces:** tax.calculations.preview (simulación sólo lectura), tax.returns.list/prepare/close/reopen/reportFiled; snapshot inmutable con entradas/rules/mapping/hash y evidencias. Export ?returnId&format=json|csv|pdf con owner y límites; HTMLescaped PDF usando renderer existente.

- [ ] RED: parcial≠READY, sin RTN, comerciante sin contador/informe previo, B incompleta, sin tasa, año sinreglas, créditos duplicados, scope transanual, close simultáneo a write, borrador stale y reapertura conserva hash anterior.
- [ ] Implementar coverage y pendientes; tratamiento legal y redondeo sólo confirmados con razón/documento. Mapping por etiquetas oficiales; no inventar casillas. Sólo `READY` revalidado puede cerrar.
- [ ] Preparar A/B/C/D y resumen mediante registros normalizados; snapshot puede DRAFTparcial. Cobros posteriores referencian ingreso cerrado sin cambiar reconocimiento ni snapshot.
- [ ] Exportar JSON/CSVneutralizado/PDFescaped y manifiesto de evidencia; siempre indicar no presentado. Acuseesdeclaraciónusuario, sin envíoSAR ni validaciónoficialimplícita.
- [ ] Pruebas enfocadas y typecheck; commit propio.

### Task 6: Interfaz fiscal completa, navegación y recuperación

**Files:** Create `src/app/fiscal/{page,loading,error}.tsx` y `components/{fiscal-workspace,profile-form,income-form,transaction-form,records-panel,evidence-panel,calculation-panel,return-panel}.tsx`; modify Sidebar NAV/SURFACE_NAV; tests `src/__tests__/components/tax/*.test.tsx`.
**Interfaces:** Usar sólo router Task3–5, componentes UI existentes, stringsdecimales. Formularios propios por registro/ejercicio con `useRecoverableDraft` y guardas de identidad/revisión. Paneles resumen/perfil/ingresos/movimientos/gastoscréditos/documentos/ISR/declaración.

- [ ] RED: carga/error/reintento, sinperfil, selectoranual, campos decimalsstring, préstamo≠ingreso, importación vs vincular, parcial≠cero, crear/revertirmovimiento, snapshotcierre y formularios compartidos accesibles.
- [ ] Implementar las secciones y acciones reales sin botones decorativos; reutilizar Button/Dialog/Card/Select y confirmaciones existentes para revertir/cerrar/reabrir.
- [ ] Formularios de ingreso incluyen recepción y fundamento separados; movimiento indica cuentas/activos/destino/fee; FX confecha/fuente explícitas. Gastos/créditos y documentos linkeables.
- [ ] Navegación ambas configuraciones y drawer móvil; no contexto fiscal a Coach ni widgets que creen trading como acción fiscal.
- [ ] Pruebas focales + checklist React + typecheck/lint; commit UI.

### Task 7: Revisión, migración, QA y publicación

**Files:** Tests integrales fiscal/PrismaRLS y scripts QA locales aislados; graphify-out actualizado.
**Interfaces:** Contratos finales previos; proyectoSupabase jpojusluihjjsjvcubdp; Vercel trading-journal-v2; procedimiento aprobado rama/preview/merge/producción/limpieza.

- [ ] Ejecutar suite completa, typecheck, lint, build y replay SQL; actualizar grafo AST.
- [ ] Revisión independiente del cambio con foco en ownership, Decimal, doblecómputo y cierre; corregir hallazgos importantes con regresiones RED→GREEN.
- [ ] Revisar/aplicar migración aditiva autorizada; alinear versión remota y local. Verificar constraints/RLS/privacidad y datos económicos originales sin cambios.
- [ ] Push/PR ligado a diseño195; preview exacthead READY y CIverde. QA exclusiva nueva, sin IA y dosusuarios para IDOR; probar los25 criterios pertinentes en desktop/móvil, capturas de las cuatro vistas principales y evidencia API→BD.
- [ ] Si hay fallo corregir y probar exactnuevohead. Sólo con todo verde merge a main y borrar rama. Verificar producción/CI exactcommit, repetir flujos críticos, eliminar usuarios/datos/objetos QA por mecanismo durable y revocar enlaces temporales.
- [ ] Entregar PR, cambios, límitesnormativos, pruebas y capturas con estado real de cada fase.

## Self-review

Cobertura spec1–3→Task1/2; spec4→Task3/4/6; spec5→Task1/5; spec6→Task5/6; spec7–8→Task2–4; spec9–11→Task7. Cinco ReviewFocus cubiertos Tasks2–5 y QA. Decisiones legales pendientes permanecen visibles y bloquean READY; no se detiene el registro ni se inventan reglas para poder publicar.
