# Cierre de hallazgos de Aprendizaje

## Alcance

Se verifican los seis hallazgos de la primera entrega con regresiones y aceptación sobre un preview de Vercel antes de integrar en `main`.

| Hallazgo | Corrección |
| --- | --- |
| Pérdida de progreso con sesiones distintas simultáneas | Cada finalización reclama su sesión y bloquea la fila del recurso dentro de la misma transacción. Lee el progreso después de obtener el bloqueo, por lo que ambos incrementos se conservan. |
| Contadores y cola de repasos diferentes | Una función de elegibilidad compartida alimenta Home, estadísticas, cola, filtro y acciones de biblioteca. Incluye recursos marcados explícitamente, excluye archivados y usa el día local del perfil. Las estadísticas de estudio usan las mismas sesiones que Home. |
| Fechas de calendario desplazadas | Las fechas SRS se comparan y muestran como días de calendario; el formato no las convierte a la zona del navegador. La programación y transición por inactividad usan el día local del perfil. |
| Borrador perdido al recargar | Nota y casilla de repaso se guardan inmediatamente con el cronómetro por ID de sesión. Se conservan en marcha y en pausa, incluyendo vaciar/desmarcar. |
| Historial de planes finalizados en otra fecha | Las lecturas de sesiones manuales planificadas completadas usan su finalización como instante real, incluso cuando la fecha prevista era futura. Afecta resumen, racha, semana, historial y estadísticas. |
| Zona inválida heredada | Una zona no admitida se normaliza a UTC tanto en cálculos como en el reloj y su etiqueta. |

La revisión también añadió validación de pertenencia antes de iniciar o planificar una sesión: un recurso ajeno o inexistente se rechaza antes de crear datos.

## Historial real

La inspección inicial de producción encontró **0** sesiones manuales planificadas completadas con fecha de inicio distinta de su finalización y **0** sin hora de finalización. No había registros reales que reescribir. La compatibilidad con el formato antiguo se comprueba mediante registros exclusivos de QA y regresiones.

## Verificación

- Regresiones observadas fallando antes de las correcciones: incremento concurrente, historial con fecha prevista futura, pérdida de borrador, fecha visible, zona inválida y discrepancias de repasos.
- Pruebas de la regla compartida: fechas locales, recursos dominados marcados, archivados, contadores, filtro y acciones.
- La aceptación remota contrasta las acciones del navegador con filas de Supabase y conserva capturas. El PR contiene los resultados del commit y del despliegue finales.

Los registros preparados o modificados para aceptación pertenecen exclusivamente a la cuenta de QA. No se requieren cambios de esquema ni migraciones para estas correcciones.
