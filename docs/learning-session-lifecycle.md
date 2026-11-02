# Sesiones y actualización de Aprendizaje

Se corrigen los cuatro hallazgos de la revisión posterior al PR #180:

- El inicio bloquea la fila del usuario dentro de una transacción antes de consultar o crear la sesión activa. Dos inicios simultáneos devuelven la misma sesión, incluso si seleccionan recursos distintos. No requiere migraciones.
- Al alcanzar el total de unidades se registra la primera fecha de finalización; las sesiones posteriores conservan esa fecha.
- Registrar tiempo no reemplaza los estados explícitos MASTERED, IN_REVIEW o ABANDONED. Los incrementos de unidades siguen serializados por recurso.
- Crear, editar, eliminar, cambiar estado/progreso, vincular setups y guardar repasos actualizan tanto las consultas de recursos como el resumen Hoy. También se sincroniza el resumen después de transiciones por inactividad.

Las regresiones reproducían dos sesiones activas distintas, la ausencia de completedAt y la pérdida de los estados explícitos. La discrepancia de Hoy se reprodujo previamente con navegador en producción usando únicamente la cuenta QA. La aceptación del nuevo preview comprueba esas mismas acciones y contrasta los resultados con Supabase antes del merge.
