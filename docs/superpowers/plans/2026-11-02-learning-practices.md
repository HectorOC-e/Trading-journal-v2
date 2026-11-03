# Prácticas en Aprendizaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar la aplicación de lo aprendido, con evidencias y ayuda opcional del asistente, sin duplicar las reviews de operativa.

**Architecture:** Entidad de práctica independiente de StudySession y Trade, con relación opcional a LearningResource. Publicar cuatro entregas funcionales; las siguientes consumen la identidad y propiedad definidas en la primera.

**Tech Stack:** Next.js, React, tRPC, Zod, Prisma/Postgres, Supabase Storage y la infraestructura existente del Coach.

**Spec:** Diseño funcional aprobado en la conversación: registro manual, capturas, historial, vínculo con recursos, resumen semanal y ayuda opcional del asistente.

## Global Constraints

- Sin simulador, enlace automático a trades, puntuación automática ni nueva review semanal.
- La práctica no modifica progreso, dominio, repasos, horas ni racha de estudio existentes. Mostrar estudio y práctica por separado.
- Aislamiento por usuario en consultas, mutaciones y archivos; validar también la propiedad del recurso relacionado.
- Fecha de práctica como día de calendario del perfil; duración manual, sin deducirla de operaciones.
- Mismo procedimiento autorizado por entrega: rama, pruebas, push/PR, preview, QA real con usuario de pruebas, merge y eliminación de rama, verificación de producción.
- Graphify antes de explorar código y actualización después de cambios.
- Las especificaciones detalladas de imágenes e IA se concretan al iniciar sus fases, después de inspeccionar las capacidades existentes; no instalar nuevos proveedores por adelantado.

## Review Focus

- Un identificador de otro usuario no permite leer, modificar ni vincular prácticas o archivos ajenos.
- Eliminar un recurso conserva la práctica como independiente.
- Cambio de semana/año y zona horaria no duplica ni desplaza minutos.
- Fallos de guardado o subida conservan el formulario y permiten reintentar sin duplicados.
- Editar evidencias invalida la vigencia de comentarios anteriores del asistente.

---

## Fase 1 — Registro útil de principio a fin

**Files:**
- Modify: `src/prisma/schema.prisma`, nueva migración en `supabase/migrations/`, `src/server/trpc/root.ts`.
- Create: `src/server/trpc/routers/learning-practices.ts`, `src/domains/learning/services/practice-service.ts`.
- Create: `src/app/aprendizaje/components/practices-tab.tsx`, `src/app/aprendizaje/modals/practice-modal.tsx`.
- Modify: `src/app/aprendizaje/page.tsx`, `src/components/aprendizaje/resource-drawer.tsx`.
- Test: `src/__tests__/routers/learning-practices.test.ts`, `src/__tests__/components/learning-practices.test.tsx`.

**Interfaces:** `learningPractices.list({cursor?, limit, resourceId?, from?, to?})`, `.create(input)`, `.update({id, expectedUpdatedAt, ...input})`, `.delete({id, expectedUpdatedAt})`. Input: título, fecha, duración entera de 1–1440 minutos, ejercicio realizado, reflexión opcional y resourceId opcional. List devuelve `{items,nextCursor}`. Propiedad y reloj de modificación controlados por servidor.

- [ ] Escribir y observar fallar pruebas de CRUD, aislamiento, recurso ajeno/eliminado, fechas inválidas, duración y conflicto de edición.
- [ ] Crear modelo propio con relación nullable/onDelete SetNull; migración aditiva y políticas de acceso siguiendo los patrones del proyecto.
- [ ] Implementar endpoints protegidos y paginación estable por fecha/id; validar fecha no futura en zona del perfil.
- [ ] Probar formulario e historial: vacío inicial accionable, edición, confirmación de borrado, carga, error/reintento y borrador conservado.
- [ ] Implementar pestaña Prácticas y acción «Practicar este contenido» desde el recurso, precargando su relación; incluir filtros recurso/fecha y deep-link `?tab=practicas`.
- [ ] Ejecutar pruebas, TypeScript, lint y replay de migraciones; revisión independiente. Comprobar que studySessions y progreso del recurso no cambian.
- [ ] Publicar y validar crear/editar/filtrar/eliminar en preview y producción, escritorio y móvil. Commit de la entrega y actualización Graphify.

## Fase 2 — Evidencias visuales

**Files:** nuevo endpoint `src/app/api/upload/practice-image/route.ts`, componente `src/app/aprendizaje/components/practice-attachments.tsx`; ampliar modelo/router/modal de Fase 1 y políticas de Storage en migración propia.

**Interfaces:** adjuntos asociados a una práctica propia, identificados por clave de almacenamiento; lectura autenticada con URL temporal. Límites propuestos para implementación: cinco imágenes por práctica, JPEG/PNG/WebP, máximo 5 MB por imagen, verificación del contenido en servidor.

- [ ] Probar acceso cruzado, formato/tamaño inválido, límite, subida interrumpida y borrado de práctica con adjuntos.
- [ ] Implementar almacenamiento privado, validación de propiedad, subida, visualización ampliada y eliminación; no aceptar URLs arbitrarias como adjuntos propios.
- [ ] Conservar cambios de texto ante fallo de subida; eliminar archivos huérfanos y permitir reintento sin duplicación.
- [ ] Verificar capturas en escritorio/móvil, privacidad y limpieza; publicar con el mismo procedimiento de Fase 1.

## Fase 3 — Constancia e integración con Hoy

**Files:** ampliar `practice-service.ts` y router; nuevo `src/app/aprendizaje/components/practice-week-summary.tsx`; modificar `hoy-tab.tsx` y `resource-drawer.tsx`.

**Interfaces:** `learningPractices.summary()` devuelve semana del perfil, minutos y número de prácticas; historial del recurso reutiliza `list({resourceId})`. No combinar estos valores con `studySessions`.

- [ ] Probar límites de semana/año, distintas zonas y actualización de totales tras editar/eliminar.
- [ ] Mostrar sesiones/minutos semanales y registro rápido en Hoy; resumen e historial por recurso, reutilizando las mismas consultas.
- [ ] Etiquetar claramente «Estudio» y «Práctica»; evitar resumen duplicado en la misma vista. Sin nueva racha o meta obligatoria.
- [ ] Verificar totales contra base de datos con usuario QA y publicar por el procedimiento acordado.

## Fase 4 — Ayuda opcional del asistente

**Files:** ampliar la integración existente de Coach tras inspeccionar `src/lib/ai/coach-tools.ts` y `src/lib/ai/execute.ts`; nuevo servicio enfocado en `src/server/services/learning/practice-feedback-service.ts` y componentes de acciones/comentarios dentro de Prácticas.

**Interfaces:** «Ayúdame a practicar» consume concepto/recurso propio; «Comentar esta práctica» consume una versión explícita de la práctica y sus evidencias autorizadas. Guardar comentario, fecha y versión evaluada. Cambios posteriores muestran comentario como correspondiente a una versión anterior.

- [ ] Verificar capacidades de texto/visión, configuración del proveedor y gestión de errores/costes existentes antes de elegir implementación.
- [ ] Probar propiedad, ausencia de evidencias, instrucciones maliciosas en notas/imágenes, proveedor sin visión, timeout y versión modificada durante la petición.
- [ ] Generar ejercicio concreto o comentarios separando observaciones, dudas y siguiente ejercicio; no certificar rentabilidad ni inventar lo que no se ve.
- [ ] Guardar y mostrar comentarios solicitados por usuario, sin llamadas automáticas al abrir páginas ni regeneración silenciosa.
- [ ] Validar flujo real con configuración autorizada, revisar y publicar por el procedimiento acordado.

## Orden y criterio de salida

Las cuatro fases se implementan en una entrega conjunta por instrucción posterior del usuario. Cada bloque requiere evidencia de QA antes del merge. La primera entrega ya permite registrar prácticas independientes o vinculadas, consultarlas y corregirlas. Las fases posteriores amplían ese flujo; no bloquean su utilidad inicial.

## Estado

Implementación conjunta en curso. Procedimiento y decisiones en el registro de QA.
