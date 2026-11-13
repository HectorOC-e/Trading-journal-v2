# Actualizaciones fiscales automáticas y avisos

Fecha: 13 de noviembre de 2026. Base: main `930d9da`.

## Objetivo y alcance acordado

El usuario aprobó el proceso propuesto de detectar, preparar, validar y publicar reglas por ejercicio, conservando versiones anteriores, y pidió que fuera automático y avisara en Notificaciones y por correo cuando la actualización sea un hecho. Esta especificación concreta ese alcance para Honduras/persona natural/ISR y reutiliza los servicios actuales. No presenta declaraciones, consulta datos fiscales de usuarios en fuentes externas ni modifica trading.

## Decisiones de funcionamiento

- Una comprobación diaria consulta páginas públicas oficiales del SAR. Un cron protegido continúa entregas pendientes cada 15 minutos. El chequeo usa un lease duradero; no depende de una visita del usuario.
- Las tablas progresivas publicadas en HTML se extraen de una única tabla identificada por ejercicio; el título/acuerdo, las filas completas y el texto de ajuste anual deben ser coherentes. La página real de SAR-01-2026 contiene esta estructura y sirve de prueba de compatibilidad.
- Se activan automáticamente sólo ajustes anuales compatibles de umbrales del ISR ordinario: cuatro tramos contiguos, exento/15%/20%/25%, importes decimales exactos, ejercicio explícito, acuerdo SAR del año correspondiente y referencia a IPC. No extrapolar IPC ni reutilizar una tabla anterior para un nuevo año. Límites iguales a la tabla previa no producen una actualización ficticia.
- Una norma con otra estructura, tasas, deducciones, régimen o formulario requiere revisión; no se afirma que todo cambio legal pueda automatizarse. Una página ambigua, múltiples tablas, falta de información o fuente inaccesible deja la versión activa intacta y muestra estado de revisión/comprobación fallida. No anunciar «actualizado» antes de publicar.
- Una modificación de importes en un acuerdo ya publicado, un acuerdo anterior o una reducción de umbrales también requiere revisión. Una tabla oficial de un nuevo ejercicio puede habilitar ese año aunque conserve los mismos límites; el aviso indicará que no hubo variación en los umbrales comparados.
- Descargar y analizar sólo HTTPS de `www.sar.gob.hn`/`sar.gob.hn`, sin credenciales, puertos alternativos, redirecciones a otros hosts ni URLs proporcionadas por el usuario. Limitar bytes, enlaces, duración y número de documentos por ejecución. El HTML se trata como datos y no se representa en el navegador.
- Identidad de versión por hechos normalizados: país, régimen, ejercicio, acuerdo, tramos y referencia. Los contadores de descargas, fechas de consulta y cambios de maquetación no generan versiones nuevas. Conservar resumen estructurado, huella de contenido y referencia oficial en el registro de publicación.
- El motor selecciona reglas publicadas por país/régimen/año, valida contenido/checksum y emplea su versión en cálculo, simulación y cierre. Se conserva exactamente el paquete 2026 existente como base de compatibilidad. Las declaraciones archivadas no se recalculan ni se modifican; un borrador abierto debe prepararse otra vez si cambia su regla antes del cierre.
- El calendario permite el año actual y el siguiente, además de años ya abiertos y con reglas publicadas. Retirar los textos y bloqueos fijos de 2027; la disponibilidad viene de reglas verificadas. «Reglas aún no incorporadas» describe el producto y no atribuye al SAR una ausencia no verificada.

## Notificaciones y correo

- Nueva categoría **Fiscalidad**, reutilizando campana, centro de notificaciones, catálogo de mensajes y preferencias existentes.
- Evento de publicación: título «Reglas ISR {año} actualizadas», resumen de los cambios (umbrales antes/después, año aplicable), fuente oficial y enlace a Fiscalidad con historial de versiones. Una notificación por usuario/publicación; los reintentos no vuelven a marcar como no leído un aviso ya entregado.
- Destinatarios: usuarios con perfil fiscal Honduras. Nunca enviar a usuarios sin contexto fiscal ni a una eliminación de cuenta en curso.
- Correo: interruptor maestro y habilitación explícita **Email · Fiscalidad** en Perfil → Notificaciones. No activar preferencias de cuentas existentes sin acción del usuario. Silenciar, prioridad mínima, canales y horario de silencio se respetan; el silencio temporal difiere la entrega y no la pierde.
- El correo incluye sólo normativa pública y resumen de cambios. No incluye RTN, rentas, cálculos individuales ni documentos privados. Usa el transportador Resend actual, sin nuevas claves ni configuración de IA.
- Entregas duraderas por usuario/publicación con estado independiente para in-app y correo, lease, intentos y clave idempotente estable. Error o dry-run no equivale a enviado. Reintentos automáticos dentro de la ventana idempotente del proveedor; un envío ambiguo fuera de esa ventana requiere revisión y nunca se reintenta ciegamente. No reenviar al usuario el mismo anuncio cada día.
- La tabla 2026 ya incorporada es el punto de partida. El primer chequeo no envía un anuncio masivo sobre esa tabla ni inventa una actualización 2027.

## Persistencia y límites de permisos

- `TaxRuleSet` conserva paquetes publicados inmutables y su checksum; seleccionar última versión compatible publicada para el año, sin borrar la anterior.
- `TaxRuleUpdate`: registro global de hallazgo/publicación/revisión, versión candidata, metadatos oficiales, diff, estado y fecha. Lectura autenticada sólo de publicaciones; sin escrituras directas de cliente.
- `TaxRuleSyncState`: singleton operacional con último intento/éxito/estado y lease. Servidor exclusivamente; no expone HTML ni errores del proveedor a clientes.
- `TaxRuleDelivery`: usuario + actualización únicos, estados/lease/intentos por canal. FK de User con cascade, RLS por propietario, sin escritura de cliente. El flujo canónico de eliminación limpia estas filas junto al usuario.
- Una transacción publica paquete y evento; una transacción distinta crea la entrega y la notificación. El correo queda fuera de la transacción, protegido por lease e idempotencia del proveedor.
- Cron con autenticación Bearer constante en tiempo y sin modo público para publicar paquetes arbitrarios. Programación mediante `pg_cron`/`pg_net` y `public.app_setting`, como los runners actuales. El preview no agenda tareas ni envía correos reales a usuarios.

## Enfoques evaluados

1. Actualización manual del código cada año: conserva control, pero obliga a intervenir y no cumple la automatización solicitada.
2. Extraer cualquier norma y activarla sin restricciones: puede interpretar mal el alcance; se descarta.
3. Detección y activación automática de ajustes anuales compatibles, con cola de revisión para cambios estructurales: enfoque elegido para concretar el proceso aprobado. El parser conservador puede requerir adaptación si cambia la presentación del SAR; su fallo se hace visible y no genera un cálculo engañoso.

## Verificación y entrega

1. Parser: la página oficial 2026 produce exactamente la tabla existente; números, años, huecos, solapamientos, tablas duplicadas, tasas distintas, fuentes no permitidas, límites y redirecciones fallan de forma conservadora.
2. Motor: fixtures 2027 sintéticos exclusivamente locales permiten cálculo por paquete; 2026 mantiene resultados, año/versión/checksum incoherentes no calculan, snapshots y cierre con regla cambiada permanecen protegidos.
3. Publicación: concurrencia, bootstrap sin avisos, dedupe ante cambios cosméticos, error SAR conserva regla, reintento sin duplicar versión ni entrega.
4. Avisos: destinatarios, preferencias, opt-in, silencio diferido, idempotencia, leases, dry-run/errores, usuario eliminado y ausencia de datos personales en correo.
5. Navegador: panel de reglas y enlaces oficiales, preferencias y categoría Fiscalidad, escritorio/móvil. Fixtures de nuevas normas y envíos se prueban en base local/CI; nunca se publican normas sintéticas ni se mandan correos de prueba a usuarios reales.
6. Rama → CI/replay/preview exacto/QA/capturas → merge sólo si correcto → verificar producción → eliminar QA y revocar enlaces temporales, conforme al procedimiento autorizado.

## Referencias inspeccionadas

- SAR: https://www.sar.gob.hn/impuesto-sobre-renta-isr/
- SAR: https://www.sar.gob.hn/download/acuerdo-numero-sar-01-2026-publicado-en-fecha-23-de-enero-del-2026-en-la-gaceta-no-37051/
- `src/server/services/tax/calculation-service.ts`, `src/domains/tax/calculation.ts`, `src/domains/tax/validation.ts`: motor actualmente fijado a 2026.
- `src/server/services/notifications/emit.ts`, `src/server/services/email/eligibility.ts`, `src/server/services/email/resend-client.ts`: dedupe, preferencias y transporte reutilizables.
- `src/app/perfil/page.tsx`, `src/app/notificaciones/page.tsx`, `src/app/fiscal/components/fiscal-workspace.tsx`: superficies existentes.
