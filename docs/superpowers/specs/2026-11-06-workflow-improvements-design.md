# Mejoras del flujo diario, evaluación y recuperación

El usuario aprobó aplicar las cinco mejoras propuestas. Se implementan juntas manteniendo componentes y módulos existentes, sin simulador, IA adicional ni cambios de contraseñas.

## Enfoque

Ampliar las superficies actuales (Hoy, detalle de cuenta, reporte semanal, inteligencia de setup y formularios) mantiene un solo flujo y utiliza sus datos reales. Crear cinco módulos nuevos duplicaría navegación y lógica; limitarse a enlaces dejaría sin resolver procedencia, recuperación y contexto. La integración es la decisión de implementación adoptada dentro del alcance aprobado.

## Comportamiento esperado

1. Dashboard: un Plan del día compacto con compromisos vigentes, riesgo/enlace a cuentas, repasos pendientes, sesiones programadas y acceso a registrar práctica. Respeta zona del perfil, estados vacíos/errores y enlaces profundos reales. Se mantiene el feed Hoy de señales, sin duplicar sus tarjetas.
2. Saldo: en detalle de cuenta mostrar capital inicial + PnL realizado + conciliaciones − retiros pagados = saldo actual; restar reservas para disponible. Todo nativo de la cuenta y desde API canónica. Datos corregidos deben coincidir con tarjetas, formulario de trade y retiros, incluso sin trades o con saldo negativo.
3. Review→acción: desde reporte semanal convertir conclusión en compromiso medible reutilizando los cuatro verificadores existentes, o en práctica programada usando sesiones planificadas. Conservar origen estructurado y navegación al reporte. Una práctica futura nunca cuenta como práctica realizada. Al registrar práctica, enlazar/completar la planificación de forma atómica; mostrar seguimiento en la review pertinente. No inventar verificación automática de conclusiones arbitrarias ni duplicar acciones por reintentos.
4. Estrategias: ampliar SetupIntelligencePanel con selector Real/Demo/Backtesting (QA excluido), número de cierres y R válidos, cumplimiento con denominador explícito y estado sin evaluación, y mensaje de muestra limitada según umbrales existentes. Cambiar alcance afecta toda evaluación/gráfico. No sumar dinero de monedas diferentes.
5. Borradores: recuperación explícita en reviews, prácticas y recursos largos. Identidad y clave/version separan usuario y registro; ningún borrador sobrescribe automáticamente al servidor. Restaurar/descartar, conservar si falla guardado, limpiar solo revisión guardada y proteger cambios nuevos durante peticiones. Mantener idempotencia/expectedVersion en práctica. No persistir secretos, archivos ni URLs de subida. Limpiar los nuevos borradores al cerrar sesión.

## Decisiones de implementación

Los borradores son locales al dispositivo; no se agregan sincronización cloud ni dependencias. La continuidad utiliza metadatos de origen opcionales en entidades existentes, sin cambiar datos antiguos ni motores de verificación. Las prácticas programadas requieren un recurso válido; un registro de práctica mantiene su semántica de sesión ya realizada. Los estados sin evidencia se muestran como tales. Se conservan configuración y acceso de los usuarios originales; QA aislado sin LLM de pago.

## Validación

Regresiones de cálculos/ownership/idempotencia/fechas/aislamiento y recuperación; suite completa, tipos, lint y revisión independiente; rama→PR→CI y preview exacto con pruebas desktop/móvil y capturas→merge/main/producción→limpieza de QA y enlaces. La autorización del usuario para ese procedimiento y enlaces temporales con revocación persiste.
