# Prácticas de aprendizaje

En Aprendizaje → Prácticas se registran ejercicios independientes o vinculados con un recurso. Cada registro guarda concepto, día del perfil, minutos, ejercicio y reflexión opcional. El historial permite filtrar por recurso y fechas, editar y eliminar con confirmación. El recurso ofrece «Practicar este contenido» y sus tres prácticas más recientes.

Los minutos y sesiones semanales se muestran por separado del estudio. No se actualizan unidades, dominio, repasos o racha de estudio; tampoco se importan trades ni se genera otra review semanal.

Después de guardar pueden añadirse cinco capturas privadas PNG/JPEG/WebP, hasta 4 MB por imagen. Se amplían y eliminan individualmente. Los enlaces de lectura caducan a los cinco minutos y se renuevan al abrir/actualizar la práctica. La eliminación del registro borra capturas y comentarios.

El asistente utiliza el proveedor/modelo configurado para el Coach. Antes de registrar una sesión puede proponer una guía a partir del concepto; «Usar como guía» permite conservarla al guardar. Después de guardar puede sugerir el siguiente ejercicio o comentar las notas y capturas. Solo se llama al proveedor al pulsar la acción. Las capturas se envían al proveedor únicamente al comentar y requieren un modelo con visión. No se certifica dominio ni rentabilidad.

Los comentarios conservan la versión evaluada. Editar texto o capturas incrementa la versión y muestra los comentarios anteriores como históricos. Los cambios concurrentes se rechazan; «Actualizar versión sin borrar el borrador» permite al usuario conservar sus cambios y aplicar explícitamente el borrador sobre la nueva versión. Cerrar sin guardar descarta el borrador local.

Las tablas nuevas solo permiten lectura propia mediante RLS desde la Data API. Las mutaciones pasan por endpoints autenticados que verifican propiedad, relación con el recurso, límites y versión. El bucket es privado; las subidas se realizan en servidor con validación de bytes y propiedad. Se reutilizan las credenciales de IA existentes, sin nuevas claves ni dependencias de ejecución.

Las subidas conservan un identificador de operación entre reintentos para no duplicar capturas tras una respuesta perdida. Los clientes no pueden subir ni eliminar objetos directamente en Storage: las mutaciones pasan por el servidor y actualizan la versión.

Cada práctica admite un objetivo opcional de hasta 1000 caracteres y una autoevaluación personal: «Lo logré», «Parcialmente» o «Necesito repetir». Puede dejarse sin evaluar o quitarse después; el historial muestra la valoración sin inferir dominio.

«Volver a practicar» abre un intento nuevo con el título, recurso, objetivo y ejercicio guardados, usando el día del perfil. Los minutos quedan vacíos y no se copian reflexión, autoevaluación, capturas ni comentarios. No suma sesiones ni minutos hasta guardar. Si hay un borrador modificado, se pide confirmación para descartarlo antes de repetir.
