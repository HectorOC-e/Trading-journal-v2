# Recuperación y concurrencia de Aprendizaje

Correcciones para los cuatro escenarios reproducidos en la revisión de `59337d8`:

- El editor envía únicamente campos modificados respecto a una copia estable del formulario inicial. Guardar notas conserva el progreso actualizado por otra sesión. El PATCH del servidor conserva campos omitidos y recalcula porcentajes de cambios parciales usando el otro valor actual, bajo el mismo bloqueo por recurso que las finalizaciones.
- Finalizar es idempotente: repetir una operación completada devuelve éxito sin sobrescribir su nota/duración ni incrementar progreso otra vez. Las solicitudes simultáneas que pierden la reclamación vuelven a consultar el resultado. El cliente reintenta una vez los fallos transitorios.
- Las pestañas comparten el cronómetro y el borrador mediante snapshots por ID y eventos de almacenamiento. Pausa, reanudación, nota, casilla y cierre se propagan; una consulta activa cada cinco segundos durante la sesión y al enfocar reconcilia cierres externos. La recuperación conserva snapshots antiguos de sessionStorage. Las respuestas atrasadas de una sesión terminada no reabren esa sesión ni cierran una nueva.
- Las sesiones de más de 24 horas conservan sus minutos reales: la validación usa el rango del entero de PostgreSQL, sin recortar silenciosamente la duración.

Los cambios no necesitan migraciones ni dependencias. Las regresiones se observaron fallando antes de las correcciones. La aceptación del preview usa exclusivamente la cuenta QA: pérdida de respuesta después del commit, desconexión previa al envío, pausa y cierre entre pestañas, editor abierto durante un avance y guardado de una duración superior a 24 horas. El PR registra los resultados del commit final y las capturas conservadas.
