# TjournalX: Real, Demo y Backtesting como ámbitos independientes

Estado: diseño para revisión; todavía no implementado.
Base examinada: `c40467dd13f71df4cc93b86ab463ff8fc62be85b`.
Fecha: 15 de noviembre de 2026, America/Tegucigalpa.

## 1. Intención y criterio de éxito

El usuario pide que Real, Demo y Backtesting funcionen como mundos diferentes y no produzcan datos incorrectos por cruzar sus operaciones. La separación debe existir en las consultas, cálculos, informes y automatismos, además de ser visible en la interfaz.

**Invariante principal:** añadir, importar, editar o eliminar operaciones Demo o Backtesting no cambia los resultados, el riesgo, las conclusiones ni las alertas de Real. La misma garantía se aplica entre Demo y Backtesting. Una comparación solicitada muestra cada muestra por separado.

Los conceptos, las definiciones de estrategias y los recursos educativos pueden compartirse; los resultados de sus ejecuciones mantienen su procedencia. La autenticación, las preferencias de accesibilidad y las restricciones de seguridad de la cuenta de usuario siguen siendo comunes.

El diseño responde a los hallazgos H01–H12 del informe de evaluación, conservado en `/workspace/entregables/revision-operativa/Evaluacion-demo-backtesting-y-practicas.md`. La auditoría anterior ejecutó 63 pruebas existentes y 14 caracterizaciones; estas últimas describen fallos actuales, no certifican su corrección.

## 2. Enfoques considerados

| Enfoque | Ventaja | Limitación | Decisión |
|---|---|---|---|
| Corregir filtros y conservar «Incluir práctica» | Menor cambio visual | Sigue permitiendo sumar dinero real y simulado; Demo y Backtesting continúan mezclados | Descartado para este objetivo |
| Una aplicación con un ámbito obligatorio por consulta | Reutiliza Trades y los componentes actuales; permite imponer la separación desde el servidor | Exige revisar todos los consumidores y sus cachés | Recomendado, coherente con la petición del usuario |
| Tres aplicaciones o tres bases de datos | Separación física | Duplica mantenimiento, estrategias y aprendizaje; excede el problema | Descartado |

Se mantiene la arquitectura actual: Next.js 16.2.7, React 19.2.7, tRPC, Prisma 7, PostgreSQL/Supabase, Zustand, Vitest y Playwright. No hace falta instalar una biblioteca de simulación ni construir otro registro de operaciones.

## 3. Reglas que el usuario podrá ver

1. Un selector persistente **Real / Demo / Backtesting** sustituye «Incluir práctica». Real es el valor inicial.
2. Dashboard, Trades, Analytics, Playbook y Reviews muestran la modalidad seleccionada. Los enlaces y exportaciones conservan modalidad, periodo y filtros compatibles.
3. Disciplina y psicología también pertenecen a la modalidad seleccionada. No se mantiene la política anterior de mezclarlas por defecto.
4. **Comparar modalidades** abre una lectura paralela: tres columnas o series con sus tamaños de muestra. No existe un saldo, P&L, drawdown ni puntuación general que sume esas modalidades.
5. Una modalidad sin datos muestra «Sin operaciones en esta modalidad». No toma datos de otra como sustitución.
6. Cambiar de modalidad elimina la selección de una cuenta incompatible. Mientras llega la nueva consulta no se muestran cifras de la modalidad anterior bajo el nuevo rótulo.
7. Los cron y correos no dependen del selector del navegador: usan su ámbito explícito y lo indican en el contenido.

### Clasificación inicial y fondeo

| Tipo de cuenta existente | Ámbito |
|---|---|
| PERSONAL | REAL |
| PROP_FIRM | REAL, conservando la política actual y mostrando su fase |
| DEMO_PERSONAL, DEMO_PROP | DEMO |
| BACKTEST | BACKTEST |
| QA | INTERNAL; excluido de los resultados del usuario |
| Tipo nulo o desconocido | Sin clasificar; excluido de resultados hasta su revisión |

**Decisión propuesta por el implementador:** no reclasificar silenciosamente las evaluaciones de fondeo que hoy pertenecen a Real. Dentro de Real se distinguen cuenta personal, evaluación y fondeada. El capital nominal de una evaluación no se presenta como efectivo personal disponible; los retiros efectivamente recibidos siguen su propio registro. Esta etiqueta no afirma que todo P&L de PROP_FIRM sea dinero retirable o un ingreso fiscal.

Una cuenta conserva su modalidad. Si el usuario pasa de Demo a Real, crea otra cuenta. La edición ordinaria no permite cambiar de modalidad una cuenta con operaciones. Una corrección de clasificación errónea requiere un flujo explícito con vista previa del historial afectado y auditoría; queda fuera del primer corte para evitar mover historia por accidente. Sí se permiten correcciones de tipo que mantengan la modalidad.

## 4. Contrato técnico único

Crear un contrato de dominio compartido, sin un valor `ALL`:

```ts
type OperationalMode = "REAL" | "DEMO" | "BACKTEST";
type StoredOperationalMode = OperationalMode | "INTERNAL";
type ScopedWindow = {
  mode: OperationalMode;
  from?: string; // YYYY-MM-DD, inclusivo
  to?: string;   // YYYY-MM-DD, inclusivo
  accountId?: string;
  includeArchived: boolean;
};
```

- Todas las rutas autenticadas conservan el filtro de propietario. El ámbito no concede permisos.
- El servidor valida que `accountId` pertenece al usuario y a `mode`; una discordancia produce `BAD_REQUEST`, nunca amplía la consulta.
- Filtrar propietario, modalidad y fechas **antes** de paginar o limitar. Agregados completos mediante SQL o recorrido paginado; las listas de contexto IA sí pueden limitarse, indicando orden y tamaño de muestra.
- Eliminar las llamadas financieras con `includePractice: true`. Durante la transición se admite omisión del contrato antiguo sólo como Real. `includePractice: true` devuelve un error de actualización requerida en cuanto entra el nuevo contrato; no hay traducción que mezcle ámbitos.
- El nuevo cliente sólo se publica cuando todos sus servicios usan el contrato. Los clientes antiguos reciben la indicación de recargar si intentan activar la mezcla.
- Claves de caché, embeddings recuperados, análisis guardados, notificaciones y trabajos incluyen usuario, modalidad y periodo. También incluyen cuenta, divisa y revisión de datos cuando afectan al resultado.
- La comparación invoca tres consultas aisladas; no tiene un agregador que acepte una lista de modalidades.
- Comparar importes sólo dentro de la misma modalidad y con la normalización de divisa existente. Un tipo de cambio ausente se declara como dato incompleto; no se suma la cifra nativa como si ya estuviera convertida.

### Procedencia persistente

Añadir `Trade.operationalMode` como instantánea de la modalidad de su cuenta al registrar/importar; `INTERNAL` sólo para cuentas internas. La API la deriva de una cuenta verificada, no acepta que el cliente la elija libremente. Un constraint/trigger protege la coincidencia de modalidad y propietario también ante escrituras directas por un rol cliente.

La migración se amplía primero con columna nullable y sin valor por defecto REAL. Se rellena sólo a partir de tipos reconocidos; los registros desconocidos quedan NULL y fuera de resultados. El nuevo código no crea trades sin modalidad. Se añaden índices empezando por usuario/modalidad/estado/fecha y se comprueban planes de ejecución con una muestra representativa.

La consulta histórica no depende de que una cuenta siga activa. Rendimiento e informes incluyen archivadas por defecto; capital disponible y riesgo actual usan sólo cuentas activas o pausadas que correspondan. Se muestran ambos criterios.

## 5. Superficies que deben recibir la misma separación

| Superficie | Cambio requerido |
|---|---|
| Dashboard y equity | Modalidad única; base de equity arrastrada desde antes del periodo; capital por tipo de cuenta claramente identificado |
| Trades, CSV, MT4 y eventos | Cuenta y modalidad validadas; procedencia conservada en todas las escrituras y lecturas |
| Analytics y Edges | Mismo filtro antes de límites; estadísticas calculadas sobre la muestra completa pertinente |
| Playbook | Reutilizar la separación REAL/DEMO/BACKTEST del servicio actual; rankings, salud y ciclo de vida derivados por ámbito |
| Disciplina y psicología | Muestra de una modalidad; costes monetarios con divisa y procedencia; etiquetas deduplicadas por trade |
| Reviews, PDF y correo | Resultados y análisis por modalidad, sin un total mezclado |
| IA, herramientas y búsqueda | Modalidad y cuenta en cada evidencia; filtros también en herramientas y recuperación semántica |
| Hoy, riesgo y automatismos | Presupuesto, drawdown, bloqueos derivados y compromisos evaluados en la cuenta/ámbito correspondientes |
| Aprendizaje | Desgloses por modalidad y sesiones vinculadas, sin convertir una mejora simulada en mejora de Real |
| Retiros y Fiscalidad | Prueba de que una operación simulada no crea retiros disponibles, ingresos fiscales ni obligaciones |

Las definiciones compartidas de setup no cambian de estado global por un mal backtest. La salud calculada y las recomendaciones tienen ámbito; una edición manual de la definición sigue siendo una acción compartida y explícita del usuario.

Los compromisos, insights y alertas derivados incluyen modalidad en su identidad. Los registros derivados antiguos cuya procedencia se mezcló se identifican como históricos y no ejecutan nuevas acciones hasta regenerarse. Un bloqueo manual global solicitado por el usuario mantiene su alcance explícito; no se genera uno por una infracción de otra modalidad.

### Reviews ya guardadas

Conservar una review por periodo y las notas del usuario. Añadir snapshots por modalidad en una tabla `ReviewModeSnapshot`, con clave única `(userId, kind, periodKey, mode)`, versión, firma de evidencia, métricas y análisis automático. `kind` es WEEKLY o MONTHLY; `periodKey` es el lunes YYYY-MM-DD o el mes YYYY-MM.

No convertir análisis antiguos potencialmente mezclados en análisis «Real» mediante una etiqueta nueva. Guardarlos como legado, marcar sus agregados y texto IA como pendientes de regenerar y no usarlos para nuevas conclusiones. Las notas manuales se conservan como notas históricas del periodo, sin atribuirles modalidad. Un solo cierre periódico y un solo correo pueden contener secciones separadas; no se triplican las reviews ni los envíos.

## 6. Fechas históricas y registro de operaciones

### Tres fechas distintas

| Dato | Significado | Ejemplo |
|---|---|---|
| Fecha/hora de mercado | Cuándo ocurrió la ejecución en su mercado | 10/02/2024 09:30 |
| Fecha de práctica | Cuándo se realizó efectivamente el ejercicio | Hoy |
| `createdAt` | Cuándo entró el registro en TjournalX | Hoy, al guardar o importar |

**Decisión propuesta:** las velas antiguas permanecen en la cronología de mercado de Backtesting; los minutos de práctica corresponden al día real del ejercicio, en la zona del perfil. Importar archivos hoy no demuestra haber practicado hoy.

Mantener `Trade.date` como fecha de referencia de la operación. Añadir `marketOpenedAt`, `marketClosedAt` y `marketTimeZone`, nullable para legado. Las altas nuevas que declaren horas completas usan timestamps con zona verificada. No inferir una fecha de cierre histórica a partir de una hora ni de `createdAt`.

**Convención del primer corte:** los KPI de operaciones cerradas siguen agrupándose por `Trade.date`, preservando la convención actual. Balance/equity y presupuestos usan los eventos de realización. La respuesta y el informe identifican esa base temporal; no se presenta la distribución por fecha de apertura como flujo de caja por fecha de cobro. Un CLOSE nuevo registra sólo el remanente no realizado, sin volver a sumar las parciales. El legado conserva su convención de realización hasta que exista una corrección explícita.

### Dos flujos, con controles propios

- **Operación en curso:** mantiene los controles preventivos vigentes. Elegir una fecha pasada no permite saltarse un bloqueo para abrir exposición real.
- **Registrar operación pasada:** guarda un registro histórico cerrado, con apertura, cierre, costes y resultado. No pide autorización preventiva para una operación ya ejecutada, pero valida propietario, precios, secuencia y coherencia. Después recalcula los saldos y controles actuales afectados. No permite dejar una posición abierta saltándose controles.

El contexto de escritura (`LIVE` o `HISTORICAL`) se conserva como procedencia. Una importación de operaciones cerradas usa el segundo; una importación de exposición todavía abierta sigue la política de riesgo para posiciones actuales.

Para el riesgo histórico, calcular el capital disponible justo antes de la ejecución, con los movimientos y realizaciones conocidos hasta ese instante. Excluir ganancias posteriores y cambios futuros de capital. Si faltan datos para reconstruirlo, guardar riesgo monetario y mostrar porcentaje histórico no verificable; no sustituirlo por el balance actual.

Las parciales de un backtest histórico requieren su fecha/hora de mercado. No usan «ahora» por omisión. Se comprueba el orden apertura/parciales/cierre y se conserva una única realización de cada importe.

La corrección de fechas se permite como corrección trazable: una transacción actualiza los eventos afectados, invalida los resultados derivados y mantiene el modo. Si la secuencia existente impide moverla sin inventar horas, se solicita corregir los eventos en el mismo formulario.

### Emociones

Guardar cuándo se registró la emoción y a qué actividad se refiere. Una emoción recordada de una operación antigua es reconstruida. Una emoción de una práctica actual sobre velas antiguas puede ser actual, pero requiere contexto de práctica fechado explícitamente. La misma ventana de edición se aplica al alta y a la corrección; no se etiqueta una emoción como contemporánea sólo porque se guardó hoy. Las muestras de emoción actual y reconstruida se distinguen en psicología.

## 7. Aprendizaje y Prácticas

Reutilizar `LearningPractice`, su formulario, adjuntos, objetivo, reflexión y feedback versionado. No crear un simulador ni un segundo libro de trades.

Ampliar la práctica con `operationalMode` nullable y `kind: CONCEPT | EXECUTION | REVIEW`. CONCEPT sin trades puede no tener modalidad; EXECUTION exige DEMO o BACKTEST; REVIEW permite cualquiera, identificando el análisis posterior de una ejecución real.

Crear `PracticeTradeLink` con propietario, práctica, trade, `role: EXECUTED | REVIEWED` y fecha de vínculo:

- Muchos trades en una práctica y un trade referenciado por varias prácticas.
- Todos los trades de una práctica tienen una sola modalidad; comparar modalidades es una vista, no una sesión mixta.
- Un trade tiene a lo sumo un vínculo EXECUTED; las reutilizaciones posteriores son REVIEWED. Una revisión no cuenta como una ejecución nueva.
- Unique `(practiceId, tradeId)` y unique parcial para un EXECUTED por `(userId, tradeId)`. Integridad de propietario en las claves y comprobaciones de servidor/RLS.
- Un vínculo no cambia el resultado, el saldo, la fecha de mercado ni la modalidad del trade.
- Borrar una práctica sólo elimina sus vínculos y evidencias propias. No borra operaciones. Borrar un trade elimina sus vínculos e invalida el feedback afectado, sin borrar la práctica.
- Altas/ediciones/bajas de vínculos y modificaciones de un trade vinculado invalidan el feedback mediante versión y firma de evidencia. La respuesta IA tardía no aparece como vigente si su evidencia cambió.

### Experiencia de uso

Desde Trades: **«Usar en una práctica»** abre el formulario existente con los trades seleccionados. Desde Prácticas: **«Vincular operaciones»** busca sólo operaciones propias de la modalidad elegida. Siempre se puede abrir el registro original.

La ficha muestra objetivo, recurso/setup, modalidad, fechas de mercado, fecha efectiva de práctica, número de ejemplos, minutos, capturas, reflexión y siguiente intento. Un setup común no autoriza a incorporar todas sus operaciones a la evidencia de la sesión.

Los minutos continúan siendo esfuerzo declarado o medido expresamente; importar o vincular trades no genera minutos. Se conservan separados de las horas, meta y racha de estudio actuales. Una práctica compartida con un plan no duplica minutos ni cumplimiento.

### Señales educativas e IA

- Transferencia y costes de errores se calculan por modalidad. Cada `(tradeId, etiqueta normalizada)` cuenta una vez, aunque exista también un flag FOMO/Revancha.
- En aprendizaje, las ejecuciones Demo/Backtesting vinculadas usan la fecha de la práctica EXECUTED para ordenar el progreso. Las estadísticas de mercado siguen usando `Trade.date`.
- Para operativa real, la transferencia utiliza la fecha de ejecución y un hito explícito de estudio del recurso. Si no hay tal hito, se muestra muestra insuficiente; no se usa automáticamente la fecha de creación del recurso.
- Los trades simulados sin fecha de práctica verificable sí sirven para estadísticas de su modalidad, pero no para afirmar una transferencia antes/después del aprendizaje.
- El calendario global de repaso se basa en estudio y memoria. Las señales operativas por modalidad se muestran como sugerencias; un mal backtest no acorta automáticamente el SRS de todo el usuario ni se convierte en degradación de su Real.
- El tutor recibe objetivo, autoevaluación, reglas disponibles del recurso/setup y sólo las operaciones/capturas vinculadas, con modalidad, moneda y las dos fechas. Los límites de tamaño y de evidencia se indican; no se omiten trades silenciosamente.
- El tutor contrasta cumplimiento y evidencia; no certifica dominio ni rentabilidad por haber ganado. Notas, imágenes y contenido recuperado siguen tratándose como datos no confiables.

## 8. Seguridad, migración y compatibilidad

Aplicar las prácticas de Supabase y PostgreSQL: RLS en tablas expuestas nuevas, `USING` y `WITH CHECK` según propietario, claves que impidan referencias entre usuarios y pruebas con JWT de dos usuarios. La service role sigue sólo en servidor. Los índices se justifican con consultas reales.

Secuencia de despliegue:

1. Añadir columnas/tablas compatibles con el código antiguo; no borrar ni renombrar campos existentes.
2. Ejecutar backfill de modalidad en lotes idempotentes. Publicar recuento por tipo, modalidad y no clasificados; ninguna fila cambia de propietario ni se elimina.
3. Completar el nuevo lector y todas las escrituras, incluidos imports, antes de activar la nueva experiencia. Repetir el backfill para escrituras que hizo el despliegue anterior durante la transición.
4. Verificar restricciones, cachés y snapshots; hacer el cambio coordinado de cliente y servidor. No publicar un selector que sólo filtre parte del sistema.
5. Conservar registros originales, notas y evidencia de la migración. La vuelta a una versión defectuosa que mezclaba ámbitos no es un rollback válido: en caso de fallo se deshabilitan las superficies afectadas mientras se corrige.

No se ejecutan migraciones ni backfills en producción durante la preparación de este plan.

## 9. Fases y condiciones de salida

| Fase | Entregable | Condición para avanzar |
|---|---|---|
| 1. Fundamento y consultas | Procedencia persistente, contratos y agregaciones completas por modalidad | Ninguna consulta nueva usa una muestra mezclada; snapshot y backfill verificados |
| 2. Experiencia coherente | Selector, Dashboard, Analytics, Playbook, Reviews, IA y automatismos | Añadir Backtesting no altera ninguna cifra ni acción de Real/Demo |
| 3. Historia fiable | Flujo histórico, timestamps, riesgo y equity temporal | Registrar un trade antiguo produce cifras y eventos coherentes sin alterar su modalidad |
| 4. Prácticas vinculadas | Vínculos, fechas de esfuerzo, tutor y señales educativas | No duplica operaciones, minutos ni ganancias; evidencia y feedback quedan versionados |
| 5. Validación y entrega | QA en preview, capturas, manual, merge y comprobación en producción | CI, aislamiento, fechas históricas, ownership y recorridos de escritorio/móvil aprobados |

Se preparan cambios por fase, pero el corte público se hace cuando las superficies afectadas respetan el contrato completo. No se deja una mezcla conocida detrás de la nueva interfaz.

## 10. Casos mínimos de aceptación

1. Misma moneda, misma fecha: Real +100, Demo +500, Backtesting −200. Cada modalidad devuelve su cifra en Dashboard, Analytics, Playbook, review, PDF e IA. Comparar devuelve 100 / 500 / −200; nunca 400.
2. Crear 1.100 backtests anteriores a un trade real no hace desaparecer el real; los agregados de Backtesting incluyen sus 1.100 operaciones.
3. Capital inicial 1.000, ganancia anterior al periodo 9.000 y ganancia del periodo 100: equity inicial del periodo 10.000, final 10.100. El rendimiento del periodo es 100.
4. Riesgo monetario histórico 10 sobre capital histórico verificable 1.000: 1 %, aunque el balance actual sea 10.000. Si la base no es verificable, porcentaje desconocido.
5. 02/01/2024 01:00 America/Tegucigalpa se guarda como 02/01/2024 07:00Z y conserva su día de mercado.
6. Practicar hoy velas de febrero de 2024 agrega los minutos a hoy y los resultados a Backtesting de febrero de 2024; no cambia Real ni la racha de estudio.
7. Trade histórico con parcial 30 y resultado total 100: las realizaciones suman 100; ambas fechas son de mercado, y el cierre final no vuelve a sumar 100.
8. Dos trades con etiqueta FOMO y flag FOMO, cada uno −1R/−100, producen dos ocurrencias y −2R/−200; no superan el umbral de tres.
9. Una cuenta archivada conserva su rendimiento histórico sin aparecer como capital disponible para abrir trades.
10. Cambiar una cuenta con trades de Demo a Personal se rechaza en la edición ordinaria. Elegir una cuenta Demo en una consulta Real también se rechaza.
11. El usuario B no puede vincular, leer ni modificar trades/prácticas del usuario A, incluso por Data API. Una práctica no acepta trades de modalidades diferentes.
12. Reutilizar evidencia no crea otra ejecución. Editar o borrar evidencia marca el feedback anterior como desactualizado y no permite reutilizar una respuesta IA tardía como vigente.
13. Un bloqueo derivado de Demo no bloquea Real. Un histórico cerrado puede registrarse sin desbloquear exposición nueva en una cuenta bloqueada.
14. QA, tipos desconocidos, costes sin conversión y análisis legados mezclados nunca aparecen silenciosamente como rendimiento Real válido.
15. Actualizar la pestaña, abrir un enlace, exportar, ejecutar el cron y abrir el correo conservan sus respectivos ámbitos, sin depender de un estado del navegador.

## 11. Límites del primer corte y decisiones propuestas

No incluye simulador de velas, presentación de impuestos, reconstrucción adivinada de cierres legados ni reclasificación masiva de cuentas por fase. No duplica la review semanal con otra review financiera en Aprendizaje.

Las decisiones propuestas que el usuario aún puede corregir son: mantener PROP_FIRM en Real con subetiquetas; contar el esfuerzo de un replay en el día real de practicar; separar también disciplina/psicología; preservar la base `Trade.date` para KPI operativos y distinguirla de realización; impedir cambiar de modalidad cuentas con historia mediante la edición ordinaria. El resto son elecciones de implementación dentro de esas reglas.
