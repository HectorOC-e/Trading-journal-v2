# Aprendizaje: historial, planes y recuperación

Se integran seis mejoras de uso en el módulo existente:

- Historial paginado con edición de minutos y notas, anulación confirmada, estado visible y contador de correcciones. Se conserva cada versión anterior y el ajuste de progreso; las sesiones anuladas dejan de contar en horas y racha.
- Contribución de progreso registrada al terminar nuevas sesiones. Los ajustes compatibles se realizan en transacción, con control de versión. En sesiones anteriores sin contribución registrada, el ajuste del recurso requiere una elección explícita; una nota nunca modifica unidades. Los cambios de unidad incompatibles y los resultados negativos se rechazan.
- Planes paginados, incluidos los atrasados y los posteriores a la semana actual. Se pueden reprogramar o cancelar; completar y reprogramar se serializan para utilizar los minutos vigentes.
- Errores con reintento en Hoy, biblioteca, estadísticas, planes e historial. Los datos ya disponibles permanecen visibles. Los conflictos del historial conservan el borrador hasta que el usuario decide actualizarlo.
- Hoy sin la tira estadística duplicada ni los dos bloques repetidos de repasos. Se conservan acción principal, resumen semanal, agenda de repasos, planes e historial.
- Motivo de repaso compartido: vencido, para hoy o marcado manualmente. Biblioteca distingue primera visita de filtros sin resultados y ofrece Crear primer recurso o Limpiar filtros.

## Compatibilidad de datos

La migración 20261102130101_learning_session_revisions añade tres columnas a study_sessions, sin reescribir registros existentes. Fue creada por apply_migration de Supabase, cuyo número generado se copió al archivo local porque la CLI no podía inicializarse en el home de solo lectura. Los clientes anteriores siguen funcionando con los nuevos campos nulos/default. No se añaden dependencias ni se modifica el acceso de cuentas existentes.

## Verificación

Se incluyen regresiones de propiedad, concurrencia, versiones obsoletas, timestamps históricos con microsegundos, compatibilidad de unidades, anulación, cero minutos, fechas locales, paginación, planes atrasados/lejanos, recuperación de errores y vacíos con acciones. El PR conserva la validación final del commit, las comprobaciones de CI y la aceptación remota con datos exclusivos de QA.
