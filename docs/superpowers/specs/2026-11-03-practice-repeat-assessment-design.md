# Repetición y autoevaluación de prácticas

Implementar los dos cambios priorizados en la propuesta aceptada: repetir una sesión y registrar un objetivo opcional con autoevaluación. Se conserva el modal compartido, los permisos, las versiones y la separación del estudio.

## Enfoque
Abrir un borrador nuevo desde «Volver a practicar» conserva título, recurso, ejercicio y objetivo. La fecha será la del perfil y los minutos estarán vacíos; no copia identidad, capturas, comentarios, reflexión ni autoevaluación. No registra minutos antes de guardar. Si hay cambios locales se usa la confirmación existente antes de abrir el nuevo borrador.

Añadir objetivo opcional de hasta 1000 caracteres y autoevaluación opcional con valores achieved / partial / repeat, presentados como Lo logré / Parcialmente / Necesito repetir. Mostrar el resultado en el historial y aclarar que es una valoración personal. Registros antiguos permanecen sin objetivo y sin evaluación. No se infiere dominio ni se crean reviews adicionales.

## Alternativas
Se descarta duplicar inmediatamente en la base de datos porque contaría sesiones todavía no realizadas. Tampoco se crea un subsistema de objetivos: dos campos en la práctica existente bastan. Estos detalles son decisiones de implementación dentro del alcance autorizado.

## Validación
Probar borrador sin evidencias ni minutos heredados, permisos y validación de campos, guardado, edición y limpieza de evaluación, protección de borradores y compatibilidad con registros anteriores. Preview y producción con cuenta QA y capturas; borrar solamente fixtures nuevos.
