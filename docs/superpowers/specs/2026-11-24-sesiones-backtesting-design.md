# Sesiones de backtesting en TjournalX

## Objetivo

Una sesión reúne un plan, los ejercicios realizados y los trades de Backtesting que aportan evidencia. El historial permite consultar el resultado de cada sesión, revisar las decisiones operación por operación y descargar un PDF que refleje lo que se sabía al cerrarla.

## Enfoque acordado

| Enfoque | Qué permite | Límite |
|---|---|---|
| Ampliar el formulario de Prácticas | Guardar un ejercicio con sus trades y su evaluación en una sola ficha | Un intento individual tendría que representar todas las jornadas, objetivos y decisiones de una sesión completa |
| Sesión propia dentro de Prácticas | Reunir varios ejercicios y operaciones, retomar el trabajo en distintas jornadas y guardar el informe de cierre | Requiere persistir las sesiones, sus vínculos y las versiones de informe |

Se eligió la segunda opción. La entrada principal será **Aprendizaje → Prácticas → Sesiones de backtesting**. En **Playbook**, se podrá iniciar una sesión desde un setup con su versión y, cuando aplique, el criterio de Backtesting que motivó el ejercicio. La ejecución del replay se hace en TradingView, MetaTrader o la herramienta que use el trader. TjournalX conserva el registro y la evaluación de la prueba.

## Flujo de trabajo

### 1. Preparar

- Crear un borrador con nombre, hipótesis, al menos un objetivo, mercado o símbolos, temporalidad y rango histórico.
- Elegir opcionalmente un setup del Playbook. Conservar una copia de la definición y del checklist usados durante la prueba. Una edición posterior del setup queda fuera de esa copia.
- Registrar reglas de entrada, invalidación, salida y supuestos de ejecución como comisiones o deslizamiento. Cada objetivo tiene un criterio de éxito y una forma de comprobarlo. Admitir objetivos medibles automáticamente y objetivos cualitativos con evaluación manual.
- Los criterios automáticos iniciales serán mínimos de operaciones cerradas, cumplimiento del checklist o expectativa en R. En los dos últimos el trader define la muestra evaluada mínima. El objetivo automático queda **Logrado** al alcanzar el umbral con la muestra necesaria, **Pendiente de repetir** si queda por debajo con muestra suficiente y **Sin evidencia suficiente** si falta muestra. La evaluación manual también admite **Parcial**. Los comentarios del trader acompañan los resultados automáticos y quedan identificados por separado.
- Mantener el rango histórico del mercado separado de las fechas reales de trabajo. Una sesión puede trabajarse durante varias jornadas y sus prácticas conservan la fecha y la duración efectivas de cada intento. El historial y el informe usan jornadas registradas en la zona del perfil: se propone la fecha local al iniciar o guardar evidencia, se añade la fecha efectiva de las prácticas vinculadas y el trader puede corregir las jornadas antes del cierre. Las fechas históricas de los trades por sí solas quedan fuera de este registro.

### 2. Ejecutar y documentar

- **Iniciar** abre la sesión y fija la versión del plan original. Durante la sesión se pueden añadir observaciones sobre cambios de criterio. El informe conserva el objetivo inicial como referencia de evaluación.
- Vincular prácticas existentes o abrir el formulario habitual de Prácticas con el objetivo y la modalidad prellenados. Admitir ejercicios de ejecución y revisión de Backtesting. Las prácticas conceptuales quedan disponibles como ejercicios vinculados y sus minutos siguen las reglas actuales de Aprendizaje.
- Vincular trades existentes o abrir el registro histórico de Trades con el contexto de la sesión. Los datos de mercado, el cierre y los eventos siguen proviniendo del registro del trade.
- Cada trade tiene una ficha con contexto, señal y motivo de entrada, invalidación, riesgo planificado, motivos de ajuste y de salida, cumplimiento del plan y lección. La ficha usa los campos disponibles de Trades y permite añadir notas específicas de la sesión. Cualquier interpretación posterior queda identificada como tal.
- Registrar señales descartadas con fecha de mercado, contexto, motivo y captura opcional. Se incluyen en el análisis del proceso y se excluyen de los cálculos de operaciones ejecutadas.
- Mostrar una sola ficha por trade aunque esté vinculado directamente y también desde varias prácticas. Los vínculos conservan las reglas actuales de ejecución y revisión de Prácticas. Comparar la fecha de apertura de mercado, en su zona registrada cuando esté disponible, con los extremos incluidos del rango histórico. Para registros antiguos, usar la fecha del trade. Los cierres y parciales posteriores forman parte del resultado de esa entrada. Si se conserva una entrada fuera de rango, requerir una justificación al finalizar.

### 3. Cerrar y consultar

- Antes de cerrar, mostrar un resumen de cobertura y objetivos evaluados, operaciones abiertas, motivos pendientes y datos faltantes. Se requiere al menos una operación cerrada incluida, una práctica guardada o una señal descartada. Resolver operaciones abiertas o excluirlas explícitamente con justificación y listarlas como excluidas. Los motivos faltantes y las muestras insuficientes aparecen como advertencias y quedan visibles en el informe. En una sesión de observación sin trades incluidos, las métricas operativas quedan como **Sin operaciones ejecutadas**.
- Requerir una conclusión del trader y el siguiente paso. Evaluar cada objetivo como **Logrado**, **Parcial**, **Pendiente de repetir** o **Sin evidencia suficiente**. En los objetivos automáticos, mostrar también el valor observado y el umbral.
- Guardar en una transacción el cierre y una versión inmutable del informe con el plan, operaciones, eventos, prácticas, evaluaciones, métricas y conclusiones. Al reabrir, conservar el plan y la definición del setup originales. La vista de cierre nuevo vuelve a consultar Trades y Prácticas y muestra las diferencias para confirmarlas antes de guardar. Un cambio de hipótesis, versión de setup o criterios iniciales se inicia en una sesión nueva. El historial conserva las versiones anteriores y permite descargar cada una.
- Filtrar el historial por estado, setup y fecha de trabajo. Mostrar título, objetivos, estado, número de operaciones y acceso al último informe en cada sesión.

## Contenido del PDF

| Sección | Contenido |
|---|---|
| Resumen | Identidad, versión, fecha de cierre, jornadas de trabajo, rango histórico, símbolos, temporalidad y setup evaluado |
| Plan y objetivos | Hipótesis, reglas, supuestos, criterios, resultado observado y evaluación de cada objetivo |
| Resultados | Operaciones cerradas, ganadoras, perdedoras y neutras, tasa de acierto, expectativa en R, curva acumulada en R, drawdown y cumplimiento del checklist |
| Diario operativo | Una ficha por cada trade incluido, con fecha y hora de mercado cuando estén registradas, dirección, entrada, stop, objetivo, tamaño, riesgo, eventos, salidas, resultado, motivos y lección |
| Ejercicios y observaciones | Prácticas vinculadas, duración, reflexiones, señales descartadas, cambios de criterio y capturas disponibles seleccionadas para el informe |
| Conclusión | Hallazgos, límites de la muestra, próximo ejercicio y análisis del Coach IA si se generó y se aprobó para esa versión |

La exportación usa el formato de PDF autenticado de Reviews como base. El contenido se genera a partir de la versión cerrada y se pagina con encabezados de sección y numeración. Las notas largas deben poder continuar en la página siguiente. Las capturas seleccionadas se conservan como copias privadas referenciadas por el informe para que siga siendo reproducible tras cambios en la práctica. Una imagen que falte se identifica en pantalla antes de cerrar. El PDF incluye únicamente imágenes que el usuario haya seleccionado y confirmado.

## Cálculos y procedencia

- Todas las operaciones deben pertenecer al usuario y estar clasificadas como Backtesting. Aplicar estas validaciones en el servidor, tanto al vincular como al generar la versión de cierre. El informe referencia evidencia y deja las decisiones de promoción en el flujo propio de Playbook.
- La curva y el drawdown usan R de trades cerrados con R registrado. La curva arranca en 0 R, se ordena por fecha y hora de cierre de mercado cuando estén disponibles y usa un orden estable para empates. Indicar cuándo se usa la fecha disponible por falta de hora de cierre. Mostrar cobertura de R y usar el mismo conjunto válido al calcular la expectativa en R.
- La tasa de acierto se calcula sobre los cierres con resultado conocido e incluye los neutros en el denominador. El cumplimiento se calcula sobre las operaciones con checklist evaluado y muestra su cobertura sobre el total de cierres. Reutilizar las reglas de clasificación y las funciones de analítica que correspondan a cada métrica.
- Para medir cumplimiento, evaluar cada trade contra el checklist del plan congelado. Se puede prellenar desde el checklist de Trades cuando corresponde a ese setup y los ítems coinciden. Con otro setup, otro checklist o sin evidencia suficiente, el trader puede marcar el cumplimiento dentro de la sesión según las reglas del plan. El informe distingue la evidencia guardada en Trades de la revisión manual del trader y muestra cuántas operaciones siguen sin evaluar.
- Si se presenta P&L monetario, separar totales por moneda y usar el resultado neto registrado. Una métrica sin datos suficientes queda marcada como **No disponible**, y un motivo que el trader no haya anotado queda como **Sin documentar**.
- El Coach IA es opcional. Puede contrastar el objetivo con los resultados, detectar patrones y sugerir ejercicios a partir de evidencia identificable. El análisis distingue observaciones de interpretaciones y respeta la configuración de IA del perfil. El trader puede revisar el comentario antes de incorporarlo al informe. El cierre y la exportación funcionan con la conclusión del trader cuando la IA no está configurada o falla.

## Persistencia y consistencia

- Usar entidades propias para la sesión, sus vínculos a operaciones y prácticas, sus observaciones y las versiones del informe. Validar la pertenencia en relaciones y exportaciones, con aislamiento por usuario y almacenamiento privado para las capturas. Las notas de sesión se guardan en su propio registro.
- La transición de cierre valida el estado y la versión esperada de la sesión. Reintentar la misma solicitud devuelve el mismo cierre y dos cierres concurrentes no pueden generar dos versiones para el mismo estado. Si se preparan copias de imágenes antes de confirmar el cierre, deben ser recuperables ante fallos y limpiarse si nunca se publican.
- Tomar los datos de cierre de una vista consistente y señalizar cambios de evidencia detectados antes de confirmar. La reanudación genera un borrador nuevo a partir del estado cerrado anterior y lo conserva junto al historial.
- Los vínculos y los informes asignan evidencia de aprendizaje. Las métricas de Dashboard, Trades, Reviews y Fiscalidad conservan su fuente habitual. Los minutos de una práctica se contabilizan una vez, aunque figure en el informe y en su historial de aprendizaje.

## Verificación de aceptación

1. Iniciar una sesión desde cero y otra desde Playbook con el setup y el criterio prellenados. Guardar y retomar un borrador en otra jornada.
2. Registrar una práctica y vincular un trade histórico de Backtesting con parciales y cambio de stop. Verificar las fechas de mercado y práctica por separado y comprobar que el trade aparece una vez al enlazarlo por dos caminos.
3. Rechazar vínculos de Real, Demo y otro usuario. Verificar la protección de la sesión, de los archivos y de la descarga del PDF entre cuentas.
4. Cerrar con evidencia completa y repetir con un trade abierto, un motivo ausente, una observación descartada y resultados en distintas monedas. Comprobar las advertencias y los denominadores de las métricas.
5. Editar posteriormente el setup y un trade, descargar el PDF original y comprobar que conserva la evidencia del cierre. Reabrir, cerrar nuevamente y descargar ambas versiones.
6. Probar el flujo en escritorio y móvil. Revisar un PDF de varias páginas con todas las fichas y un PDF sin IA ni capturas. Confirmar que las estadísticas por modalidad y los minutos de Aprendizaje conservan los valores esperados.
