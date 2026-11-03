# Hora personal del recordatorio de aprendizaje

El usuario solicita añadir en Perfil la hora del aviso de Aprendizaje, usando la zona horaria del mismo perfil. El aviso diario existente es un resumen por correo, fijado a las 19:00; las notificaciones internas de eventos no se programan con este ajuste.

Se añade learningReminderTime en users (HH:mm, 24 horas), con valor inicial 19:00. Perfil → Notificaciones ofrece un campo compartido y guardado independiente para evitar guardar otros cambios pendientes. La zona mostrada será la persistida en el perfil. Las preferencias existentes (interruptor maestro, categoría, silencio y deduplicación diaria) se conservan.

El runner compara hora y minuto en la zona IANA del usuario, incluyendo cambios de horario y offsets de media/cuarta hora. El cron pasa de horario a cada minuto, preservando su comando, destino y secreto. La configuración del cron se activa después de publicar el código que filtra por minuto. Un horario inexistente por cambio de hora se omite ese día; la hora repetida conserva la deduplicación diaria existente.

Se descarta un horario global porque no cumple el pedido y limitarse a horas enteras porque restringe innecesariamente al usuario. Elegir HH:mm y frecuencia de un minuto es decisión de implementación. No se activan correos deshabilitados ni se envían correos de prueba a usuarios reales.

Validar persistencia/lectura propia, formato y límites, UTC/local/madrugada/offsets/DST, llamadas del runner solo al minuto esperado y controles de opt-in existentes. QA del perfil en preview y producción, restaurando la configuración de QA; transportes de correo simulados para probar programación.

Fiabilidad: tolerar hasta cuatro minutos de retraso buscando el instante previsto en la zona del perfil. Si cruza medianoche, el resumen y su clave diaria usan el día previsto; el silencio usa el instante real. Resend recibe una clave idempotente usuario/día para impedir duplicados en ticks solapados. El tiempo DST inexistente se sigue omitiendo ese día.
