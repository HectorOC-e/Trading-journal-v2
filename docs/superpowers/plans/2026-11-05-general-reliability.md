# General Reliability Implementation Plan

> **For agentic workers:** Ejecutar por dominios independientes con dispatching-parallel-agents; coordinación/revisión/QA por principal.

**Goal:** Corregir13hallazgos y mejoras de persistencia/error/indexación, excluyendo Retiros.
**Architecture:** Historial financiero separado de período, ciclos compartidos, guardado confirmado recuperable, indexación invalidada/CAS. Mantener interfaces públicas compatibles salvo null explícito documentado.
**Tech Stack:** Next.js/React/tRPC/Prisma/Supabase/Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-05-general-reliability-design.md

## Global Constraints
Retiros excluido. Datos originales y credenciales preservados. Archivos compartidos asignados a un solo implementador. Graphify antes de explorar, actualizar una vez integrado. No commits de agentes ni mutaciones remotas por agentes.

## Review Focus
- Historial anterior al filtro y pérdidas en moneda distinta no alteran balance actual ni unidades del límite.
- UTCcruza medianoche mientras cuenta sigue en día anterior: bloqueo consistente.
- Salida rápida, mutación en curso, cambio de período y error de guardado: borrador no se pierde ni se aplica a otro registro.
- Borrar/reeditar notas mientras vector antiguo se calcula: no reaparece significado antiguo ni cita vacía.
- Repetir cierre, fusionar etiquetas coincidentes, duplicar/limpiar setup y editar unidades100% mantienen estado consistente.

## Task1: Finanzas y reloj de cuentas
Files:dashboard-service.ts,analytics-cache helpers,accounts.ts,focusedtests.
- [x] RED: balanceALL=7d637.71;FXuso5%no86.2%;rangosdistintosnocachecollision;midnightTZnoautounlock.
- [x] Separar historiales, normalizarFX,clavecachécompleta/versionada,fecha localcuenta;GREEN+tsc/lint.

## Task2: Reviews puntuación/notas
Files:report-data.ts,review-lifecycle.tsx,notesdraft helpers/tests. No routers de embeddings.
- [x] RED: finalizar/reabrir/finalizar idempotente;notasal800mssalida/concurrencia/período/error.
- [x] Fuente disciplina real y notas serializadas/recuperables, estados y reintento;GREEN.

## Task3: IA indexación y chat
Files:reviewrouters,pipeline/corpora,ai-coach-drawer.tsx,ai-configindexstatus/AiModelsCardsection,tests.
- [x] RED: vectorinvalidadoatedit/clear,noescrituraasíncronaobsoleta,chatnuevo sinthreadprevio/respuestavieja.
- [x] Invalidezatómica/CAS/exclusiónvacíos y estadoíndiceactualizadoconrefresco/reintento;GREEN.

## Task4: Playbook/etiquetas y UX
Files:playbook/page.tsx,setups.ts,tags.ts,focusedcomponents/tests.
- [x] RED: Edgeclear null,duplicadoconfig completa,activosPnL100not−200,mergeA/B→Búnico.
- [x] Implementar y guardiaborrador/subida/guardar; consultaerroresconretry;GREEN.

## Task5: Aprendizaje
Files:learning-resources.ts,progress/lifecyclehelpers,focusedtests.
- [x] RED: edición100%marcaCOMPLETED+fecha;reabrir/repetición/archivadosconsistentes.
- [x] CompartirtransicionesyefectosconupdateProgress,serializaciónexistente;GREEN.

## Task6: Integración y entrega
- [ ] Evaluar/habilitar protección contraseñas sincosteadicional y verificarefecto o documentarlímite.
- [ ] RevisióndeDiff+independiente,fullsuite2workers,tsc/lint,graphifyupdate.
- [ ] PushPRpreview,QAfixturesaisladosdesktop/móvil/fallos/concurrencia,restauración+capturas.
- [ ] CIverde,merge/borrarrama,producciónexactSHA+QA+CI+limpiezafinal.
