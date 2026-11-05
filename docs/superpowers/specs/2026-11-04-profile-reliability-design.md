# Correcciones y organización de Perfil

El usuario autoriza aplicar las nueve correcciones del informe /workspace/qa-learning/profile-audit/findings.md y las cuatro mejoras de uso. Mantener proveedores/configuraciones y datos existentes; seguir rama, preview QA real, merge y producción.

## Comportamiento
- Entradas numéricas como borrador de texto (FX, P&L y metas), aceptar punto/coma decimal, validar al guardar sin truncar ni sustituir valores inválidos silenciosamente.
- Solo Metas controla weeklyGoalMinutes. Guardado e invalidaciones comparten la fuente; Datos personales no puede sobrescribir esa meta ni preferencias autosalvadas.
- Interruptores y apariencia reflejan guardado confirmado; bloquear durante petición y conservar/restaurar estado ante error. Etiquetar guardado automático frente a formularios manuales, con estado pendiente y cancelar.
- IA: validar credencial OpenRouter mediante /auth/key, no catálogo público; mismo helper en ambos diagnósticos y catálogo privado. No guardar modelos antes de cargar configuración o si falla, ofrecer reintento. Proteger cambios locales de perfil/metas/modelos al recargar o navegar.
- Controles compartidos Button/Input/Field/Switch y confirmaciones. Etiquetas asociadas y semántica accesible. Secciones Datos, Metas, Apariencia, Notificaciones, IA y Seguridad; cambiar sección conserva borradores. Selector IANA con búsqueda y preservación de valores guardados; sesiones con zona de referencia explícita.
- Exportación JSON de registros paginada por sección, sin límite silencioso de 5000. Incluir aprendizaje/prácticas y demás registros propios no sensibles. Declarar cobertura y exclusiones (claves y binarios de imágenes), con progreso. Mantener una interfaz paginada para no exceder cuerpos de respuestas del hosting.
- Borrado: intención durable sin FK a User para sobrevivir borrado de identidad/datos. Intento inmediato y reintentos de cron autenticado; estado completed solo después de verificar limpieza, pending visible si falla parcialmente. Nunca fingir éxito completo. No borrar cuentas reales para QA; usar cuenta desechable autorizada.

## Implementación
Tres trabajos independientes en paralelo según dispatching-parallel-agents: autenticación de proveedores; servicio paginado de exportación; servicio durable de eliminación. El agente principal integra profile router y realiza UI/guardado. Cada agente posee archivos distintos; TDD y pruebas enfocadas, después integración y revisión global.

Sin copiar de nuevo configuración origen para esta tarea: las pruebas de credencial usan valores ficticios y transportes simulados. Verificaciones normales de QA no envían correos ni generan inferencias. Cambios de preferencias de QA se restauran; datos de prueba nuevos se limpian. No exponer claves/ciphertext en exportaciones, logs ni capturas.
