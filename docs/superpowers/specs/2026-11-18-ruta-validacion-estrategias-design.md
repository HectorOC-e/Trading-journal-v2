# TjournalX: ruta de validación de estrategias

Estado: diseño para aprobación; todavía no implementado.
Fecha: 18 de noviembre de 2026, America/Tegucigalpa.

## 1. Objetivo

Convertir el Playbook en una ruta verificable para responder, por cada setup:

1. ¿La hipótesis está suficientemente definida?
2. ¿Qué evidencia produjo en Backtesting?
3. ¿Se sostuvo en Demo bajo condiciones de ejecución más reales?
4. ¿Cómo se comporta en Real sin mezclar sus resultados con las etapas anteriores?
5. ¿Qué debe practicarse o corregirse antes de avanzar?

La ruta será **Hipótesis → Backtesting → Demo → Real**. TjournalX evaluará la evidencia y podrá recomendar avanzar, continuar recopilando muestra o revisar el setup, pero la promoción siempre requerirá una confirmación explícita del usuario.

La ruta no certifica rentabilidad, no promete resultados y no impide registrar operaciones. Es una herramienta de disciplina, trazabilidad y decisión.

## 2. Principios no negociables

- Backtesting, Demo y Real conservan estadísticas, P&L, drawdown, cuentas y trades independientes.
- Una promoción no mueve, copia ni reclasifica operaciones.
- La definición del setup es compartida; su desempeño y estado de evidencia son específicos de cada etapa.
- Sólo se usan trades cerrados, propios y vinculados al setup.
- La evidencia derivada se recalcula desde los datos vigentes. Las decisiones humanas conservan una fotografía de lo que se observó al tomarlas.
- Una práctica vinculada aporta contexto educativo, pero no crea un trade ni duplica una ejecución.
- La IA explica evidencia y propone acciones; no promociona, suspende ni modifica estrategias automáticamente.
- Real es monitoreo continuo, no una etapa que pueda declararse “completada”.

## 3. Ubicación y experiencia de usuario

La funcionalidad vivirá dentro de **Playbook**, en la ficha de cada setup. No se creará un módulo separado.

### Vista resumida

Cada setup mostrará una banda de progreso:

`Hipótesis → Backtesting → Demo → Real`

Cada etapa tendrá uno de estos estados visuales:

- **Pendiente:** todavía no iniciada.
- **En evaluación:** existe evidencia, pero aún no satisface los criterios.
- **Elegible para avanzar:** los criterios configurados se cumplen; falta decisión del usuario.
- **Promovida:** el usuario confirmó el avance con la evidencia disponible.
- **En revisión:** el usuario decidió corregir o ampliar la muestra.
- **Suspendida:** se detuvo voluntariamente el uso de la estrategia.
- **Monitoreo:** estado permanente de Real.

La tarjeta resumida mostrará etapa actual, tamaño de muestra, expectativa, promedio R, drawdown en R, disciplina, cobertura de evidencia y principal alerta. No mostrará un P&L combinado.

### Detalle de la ruta

Al abrir la ruta se presentarán cuatro paneles. Backtesting, Demo y Real tendrán su propia columna o pestaña, con identidad visual y rótulo persistente.

Cada etapa mostrará:

- operaciones cerradas y operaciones con R válido;
- período cubierto y semanas distintas con actividad;
- win rate, promedio R, expectativa y R acumulado;
- drawdown máximo expresado en R;
- cumplimiento de checklist y datos faltantes;
- evolución del edge y drift respecto de la definición;
- prácticas, capturas y recursos vinculados relevantes;
- criterios satisfechos, pendientes y advertencias;
- recomendación determinista y explicación opcional de IA.

La acción **Revisar avance** abrirá un modal consistente con el sistema de diseño existente. El usuario verá el resumen de evidencia, escribirá una nota opcional y confirmará una decisión. Para promover con criterios pendientes deberá indicar un motivo; la interfaz lo marcará como excepción consciente.

### Comparación entre etapas

La comparación mostrará valores paralelos, nunca sumados. Por ejemplo:

| Métrica | Backtesting | Demo | Real |
|---|---:|---:|---:|
| Muestra | 42 | 23 | 8 |
| Expectativa | +0.31R | +0.18R | −0.04R |
| Disciplina | 91 % | 83 % | 75 % |

Las diferencias se describirán como señales, no como causalidad demostrada. Una muestra insuficiente se verá como tal y no como cero.

## 4. Criterios y recomendaciones

Los criterios serán configurables por setup. TjournalX ofrecerá un preset inicial, visible y editable:

| Etapa que se evalúa | Evidencia inicial sugerida |
|---|---|
| Hipótesis | mercado, dirección, descripción, expectativa definida y checklist con al menos un criterio |
| Backtesting | 30 cierres, 80 % con R válido, expectativa positiva y 70 % de checklist evaluado |
| Demo | 20 cierres, actividad en 4 semanas distintas, expectativa positiva y 80 % de checklist cumplido |
| Real | monitoreo después de 20 cierres o 4 semanas; sin “graduación” final |

Estos valores son referencias operativas, no significancia estadística ni garantía de rentabilidad. El usuario podrá elevar o reducir cada umbral. La pantalla registrará qué política estaba activa cuando se tomó una decisión.

Las evaluaciones deterministas producirán uno de cuatro veredictos:

- `INCOMPLETE`: faltan datos esenciales.
- `INSUFFICIENT`: hay evidencia, pero no alcanza la política configurada.
- `ELIGIBLE`: se cumplen los criterios para considerar el avance.
- `WARNING`: la estrategia ya promovida muestra deterioro, drift o disciplina insuficiente.

Un veredicto nunca cambia por sí solo el estado persistido.

### Suspensión y revisión

El usuario podrá suspender, reanudar o devolver a revisión una estrategia. Esto afectará únicamente la ruta y sus avisos. No archivará el setup, no bloqueará cuentas y no alterará trades.

Si una etapa promovida deja de cumplir los criterios, se conservará la decisión original y aparecerá una advertencia nueva. TjournalX no reescribirá la historia ni degradará automáticamente la etapa.

## 5. Integración con Prácticas y Aprendizaje

Se reutilizarán `LearningPractice`, `PracticeTradeLink`, recursos, adjuntos y feedback existentes.

- Una práctica `EXECUTION` en Backtesting o Demo puede aparecer como evidencia contextual de la etapa correspondiente.
- Una práctica `REVIEW` puede enlazar operaciones de cualquier modalidad, manteniendo una sola modalidad por práctica.
- La ruta distinguirá trades analizados de trades ejecutados; revisar una operación no incrementa la muestra.
- Desde una brecha de la ruta podrá crearse una práctica prellenada. Ejemplo: “Practicar cinco ejecuciones del checklist de entrada en Demo”.
- Al completar la práctica, la ruta recalculará los indicadores provenientes de trades; los minutos o una captura, por sí solos, no convierten la estrategia en elegible.
- El asistente podrá usar objetivos, reflexiones, capturas y trades vinculados para explicar una brecha, indicando siempre modalidad y tamaño de muestra.

No se construirá un reproductor de velas. La ejecución puede realizarse en TradingView, MetaTrader u otra plataforma y registrarse después en TjournalX.

## 6. Modelo de datos

Las métricas actuales seguirán siendo derivadas. Sólo se persistirán configuración, decisiones y auditoría.

### `SetupValidationPolicy`

Una política activa por setup:

- `id`, `userId`, `setupId`;
- `version`;
- umbrales de Hipótesis, Backtesting, Demo y monitoreo Real;
- `createdAt`, `updatedAt`;
- unique `(userId, setupId)` e integridad de propietario.

Los umbrales numéricos se almacenarán en columnas tipadas para las reglas principales. Un campo JSON versionado podrá conservar criterios futuros sin reinterpretar políticas antiguas.

### `SetupValidationDecision`

Historial inmutable de decisiones:

- `id`, `userId`, `setupId`;
- `fromStage`, `toStage`;
- `action`: `PROMOTE`, `KEEP_REVIEWING`, `SUSPEND`, `RESUME` o `RETURN_TO_REVIEW`;
- `mode` de la evidencia evaluada cuando corresponda;
- `policyVersion`;
- `evidenceSnapshot` JSON validado y versionado;
- `evidenceSignature` para detectar cambios posteriores;
- `note`, `exceptionReason`;
- `createdAt`.

No se editarán decisiones antiguas. Una corrección será una nueva decisión enlazada, preservando auditoría.

### Estado actual

El estado actual se derivará del historial de decisiones en el primer corte. Si el volumen futuro lo justifica, podrá añadirse una proyección transaccional reconstruible. No se guardarán dos fuentes de verdad desde el inicio.

## 7. Cálculo de evidencia

Crear un servicio de dominio puro para calcular, por setup y modalidad:

- tamaño de muestra y cobertura de R;
- win rate, promedio R, expectativa y R acumulado;
- drawdown máximo en R sobre la secuencia cronológica;
- semanas distintas de evidencia;
- cumplimiento y cobertura del checklist;
- estado de decay y drift existente;
- cobertura de prácticas y adjuntos, sólo como contexto;
- lista de criterios y veredicto.

El servicio recibirá datos ya filtrados por `userId`, `setupId` y un único `OperationalMode`. La orquestación del servidor ejecutará tres consultas aisladas para la comparación. No existirá una consulta financiera con `mode: ALL`.

Las métricas monetarias podrán mostrarse dentro de una modalidad y divisa compatible, pero los criterios iniciales usarán R para evitar confundir importes o capitales heterogéneos.

La firma de evidencia incluirá versión del algoritmo, política, IDs y revisiones relevantes de los trades. Si cambia un trade o la política, la decisión histórica permanece válida como registro del momento, pero la interfaz indicará que la evidencia actual difiere de la fotografía decidida.

## 8. API y permisos

Ampliar el router autenticado de Playbook con operaciones equivalentes a:

- `validationOverview(setupId)`: etapas, métricas y estado actual;
- `validationEvidence(setupId, mode)`: detalle de una modalidad;
- `validationPolicy.get/update(setupId)`;
- `validationDecision.create(setupId, action, targetStage, note, exceptionReason)`;
- `validationHistory(setupId)`.

El servidor resolverá siempre `userId` desde la sesión. No aceptará decisiones sobre setups ajenos ni snapshots calculados por el cliente. En la mutación, el servidor recalculará la evidencia dentro de la misma operación lógica y guardará ese resultado.

Las tablas nuevas tendrán aislamiento por propietario, claves e índices para `(userId, setupId)` y políticas RLS si quedan expuestas mediante Supabase Data API. La service role no aparecerá en el navegador.

## 9. IA y notificaciones

La explicación de IA será opcional y se generará desde un resumen estructurado limitado:

- etapa y modalidad;
- política activa;
- métricas, alertas y tamaño de muestra;
- prácticas/evidencias explícitamente vinculadas;
- definición vigente del setup.

La salida deberá separar hechos, interpretación y siguiente práctica sugerida. No podrá afirmar que una estrategia es rentable o segura ni ejecutar una promoción.

Se podrán producir notificaciones deduplicadas cuando:

- una etapa pase por primera vez a elegible;
- una estrategia promovida entre en `WARNING`;
- una política cambie y altere la elegibilidad.

El primer corte usará notificaciones internas. El correo podrá añadirse con la preferencia global existente, evitando repetir el mismo evento.

## 10. Compatibilidad y migración

La migración será aditiva: nuevas tablas, enums e índices; no se modificará la procedencia de trades ni el historial existente. Todos los setups comenzarán sin decisiones y con el preset inicial materializado al primer acceso o por backfill idempotente.

La ausencia de una ruta no cambiará el estado actual de un setup ni ocultará sus métricas. El panel de inteligencia existente seguirá disponible y alimentará parte de la nueva evaluación.

## 11. Pruebas y aceptación

### Dominio

- Cálculo de expectativa, drawdown en R, cobertura, semanas y veredictos.
- Muestras vacías, R nulo, break-even, pérdidas y políticas personalizadas.
- Un trade de otra modalidad nunca cambia el resultado evaluado.

### Integración y seguridad

- Consultas y decisiones aisladas por usuario y setup.
- La promoción guarda la evidencia recalculada por servidor.
- Una modificación posterior marca diferencia de firma sin alterar la decisión histórica.
- Una excepción exige motivo.
- Las prácticas aportan contexto sin duplicar trades.

### Interfaz y recorrido completo

1. Crear o usar un setup definido.
2. Registrar Backtesting histórico y comprobar que sólo cambia esa etapa.
3. Vincular trades a una práctica y adjuntar una captura.
4. Alcanzar elegibilidad, revisar evidencia y promover manualmente a Demo.
5. Registrar Demo y comparar ambas muestras sin sumarlas.
6. Promover a Real y comprobar el monitoreo continuo.
7. Introducir deterioro en Real y verificar advertencia sin degradación automática.
8. Revisar experiencia de escritorio y móvil, estados vacíos, carga y error.

La entrega requerirá pruebas unitarias, integración de base de datos, typecheck, lint, build, E2E autenticado, preview de Vercel y capturas del recorrido.

## 12. Fuera de alcance

- Simulador o reproducción de velas.
- Ejecución automática en brokers.
- Certificación de rentabilidad o asesoramiento financiero.
- Bloquear por la fuerza operaciones o cuentas.
- Mezclar capital o P&L entre modalidades.
- Promoción automática por IA.
- Modelos estadísticos avanzados de Monte Carlo en el primer corte.

## 13. Orden de implementación propuesto

1. Motor determinista y pruebas de dominio.
2. Esquema, migración, aislamiento y servicio de evidencia.
3. API de políticas, decisiones e historial.
4. Ruta visual dentro de Playbook y comparación por modalidad.
5. Integración con Prácticas, explicación IA y notificaciones internas.
6. E2E, capturas, manual, preview y despliegue siguiendo el procedimiento QA del proyecto.
