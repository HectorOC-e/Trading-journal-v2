# Correcciones generales y fiabilidad

Autorización: el usuario pidió corregir los13hallazgos e implementar las mejoras del informe general. Retiros queda excluido. Base068aef9.

## Objetivo
Corregir cálculo financiero, persistencia y ciclo de vida sin cambiar el significado de los datos originales. MantenerNext/React/tRPC/Prisma/Supabase y controles compartidos existentes.

## Decisiones de implementación
- Historial completo para balance/riesgo/exposición actual; operaciones filtradas únicamente para rendimiento del período. Una sola conversión FX por importe. Clave de caché incluye rangos y versión de cálculo. Reconciliación usa fecha local de cuenta.
- La disciplina mensual procede de la disciplina real, nunca de overallScore. Repetir cierre sin cambios es idempotente.
- Notas Reviews preservadas al salir rápido, autoguardado serial con error/reintento y borrador recuperable por usuario/período; no escritura de un período en otro.
- Cambiar texto invalida su vector en la misma escritura; resultados asíncronos antiguos no deben reindexar texto obsoleto. Excluir notas vacías; mostrar estado de índice y cuándo se consultó con refresco/reintento.
- Nuevo chat reinicia identificador de hilo y evita que respuesta de petición anterior se agregue a una conversación nueva.
- SetupEdge null significa borrar, undefined omitir. Duplicado conserva toda configuración e imágenes, manteniendo cambio explícito nombre/estado. KPIactivos calcula activos. Fusionar etiquetas deduplica por operación.
- Editor de recursos comparte reglas de progreso/completado/fecha con actualización directa, sin reactivar archivados accidentalmente ni perder efectos de finalización.
- Modales de setup protegen borradores/subidas/guardados y permiten cancelar de forma segura; error de consulta distinto de vacío con reintento.
- Evaluar protección de contraseñas filtradas; habilitar si disponible sin subir plan/coste y comprobar; si plataforma impide, documentar límite concreto.

## Alternativas
Se eligen correcciones localizadas con utilidades compartidas sobre reescritura de módulos o migración de framework. La separación por dominios permite pruebas enfocadas y revisión independiente; un único release evita dejar incoherencias entre capas.

## Restricciones
No modificar Retiros ni datos/configuración de cuentas originales. Fixtures de QA aislados, restaurar preferencias y eliminar fixtures propios. No exponer secretos ni hacer inferencias pagadas para validar metadatos. Pruebas multimoneda/historial/TZ/repetición/concurrencia. Autorizado: rama→PRpreview→QAdesktop/móvil/capturas→merge/borrar→producciónSHAexacto+CI.
