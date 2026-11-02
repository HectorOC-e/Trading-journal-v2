# Mejoras de uso de Aprendizaje

Se implementan las seis mejoras solicitadas: historial editable/anulable; reprogramación y cancelación de planes; errores con reintento; Hoy más breve; razones de repaso diferenciadas; primera visita y filtros vacíos con acciones. Se conserva el stack Next.js/tRPC/Prisma/Supabase, los estilos actuales y el flujo de QA→preview→merge→producción ya autorizado. No se cambia la contraseña pendiente de una cuenta existente.

## Enfoque y decisiones de implementación

Se integran capacidades en el módulo actual. Una aplicación separada duplicaría estado/autenticación; una mera reorganización visual no resolvería historial ni planes. Las siguientes decisiones son de implementación, no preferencias expresadas por el usuario.

- Historial paginado de sesiones completadas y anuladas, con edición de minutos/nota y anulación confirmada. Cada cambio conserva antes/después, fecha y ajuste de progreso en un log JSON de la misma fila. No se borran sesiones completadas. Versionado por updatedAt y bloqueos por sesión/recurso protegen contra cambios simultáneos.
- Nuevas finalizaciones registran unidad y contribución aplicada al recurso. Corregir/anular recalcula minutos/racha desde las sesiones y ajusta la contribución de progreso si la unidad sigue siendo compatible. En datos antiguos sin contribución registrada, la interfaz solicita una elección explícita para ajustar el progreso del recurso actual. No se inventa información histórica ni se aplican deltas negativos imposibles. Cambiar únicamente una nota no altera progreso.
- Planes: cambiar fecha/minutos o cancelar un plan mantiene su registro, exige estado planned y no suma tiempo. Las fechas siguen siendo días de calendario del perfil.
- Hoy: acción principal de estudio/repaso, resumen semanal/racha, agenda e historial. Los indicadores detallados siguen disponibles sin repetir bloques de repasos. Carga inicial, error recuperable con Reintentar y fallo de actualización con datos disponibles son estados distintos.
- Repasos: una regla compartida determina Vencido hace N días / Para hoy / Marcado por ti, con prioridad al vencimiento real. No cambia la elegibilidad ni cuenta archivados como pendientes.
- Biblioteca: distinguir ausencia total de recursos de ausencia de coincidencias; botones Crear primer recurso y Limpiar filtros. El callback de creación reutiliza el modal actual.

## Verificación y límites

Regresiones y pruebas de estados/correcciones/propiedad/reintento; concurrencia de edición-anulación y finalización; compatibilidad histórica; fechas del perfil; móvil; errores de API; preservación de los arreglos anteriores. Migración únicamente aditiva con defaults compatibles con el despliegue anterior. QA escribe solo en su usuario. Los registros reales previos no se reescriben ni se resetean contraseñas.
