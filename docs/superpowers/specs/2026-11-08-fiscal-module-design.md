# TjournalX — Fiscalidad e ISR de Honduras

Estado: especificación para revisión; no implementada. Fecha: 8 de noviembre de 2026.
Base verificada: `main`, commit `16df421aa0d3d9fd331c5c74ded8917b20eb8336`.
Este entregable no cambia Prisma, migraciones, datos, permisos ni pantallas de producción.

## 1. Propósito y alcance

Fiscalidad permitirá saber cuánto dinero se recibió, cuál fue su origen, qué estimación tributaria se puede justificar y qué documentos respaldan cada cifra. Un cobro, su tratamiento tributario y su movimiento posterior son hechos distintos.

Primera versión: Honduras, persona natural domiciliada, ejercicio calendario 2026, registro y preparación del ISR ordinario. Se podrán registrar salarios, pagos de firmas de fondeo, otras rentas, movimientos de bancos y cripto, gastos, deducciones, retenciones y anticipos. Registrar una categoría no implica que su tratamiento esté automatizado ni validado jurídicamente.

La experiencia incluirá los tres primeros hitos de la propuesta: registro/control, estimación y preparación de declaración. Otros países, personas jurídicas, otros impuestos/regímenes, presentación electrónica, conectores con exchanges y acceso de contadores externos quedan para una ampliación. Un comerciante individual podrá llevar sus registros; completar su borrador requiere los datos del contador y la información aplicable del formulario, sin prometer cobertura de todos sus regímenes especiales.

No se usarán P&L, capital ni número de trades como renta fiscal. Tampoco se enviarán documentos fiscales al Coach, embeddings o proveedores de IA de manera implícita. No se almacenarán contraseñas del SAR ni claves de Binance/bancos.

### Decisión de arquitectura

La propuesta del usuario sitúa `/fiscal`, `domains/tax` y servicios fiscales dentro del repositorio actual. Se adopta ese enfoque: **módulo aislado dentro de la misma aplicación y despliegue**, con tablas y bucket propios. Independencia funcional y de datos no significa una segunda base física ni otro inicio de sesión.

Alternativas consideradas:

| Enfoque | Consecuencia | Decisión |
|---|---|---|
| Calculadora sobre las métricas actuales | No acredita cobros; mezcla FX de portfolio con valoración fiscal y carece de trazabilidad | Descartado |
| Módulo propio en la app | Reutiliza autenticación/UI, conserva contratos fiscales separados y un adaptador de lectura | Adoptado según las rutas propuestas |
| Aplicación/servicio y base independientes | Añade identidad, sincronización y operación duplicadas; útil sólo si aparece esa necesidad de despliegue | Diferido |

## 2. Hallazgos del repositorio que condicionan el diseño

| Contrato actual | Evidencia | Consecuencia fiscal |
|---|---|---|
| `Withdrawal` tiene `Decimal(14,2)`, moneda, estado, `date` tipo DATE, referencia y timestamps | `src/prisma/schema.prisma:206` | No sirve como libro de cripto ni prueba de bruto/neto/fecha de cobro; no ampliar su significado |
| La API de retiros admite códigos de moneda de tres letras y dos decimales | `src/server/trpc/routers/withdrawals.ts:25` | El ejemplo «retiro de 2.000 USDC» es conceptual: hoy requiere registrar su recepción cripto en Fiscalidad y vincularla al retiro fiat si existe, sin cambiar Retiros |
| Retiros puede volver de `PAGADO` a otro estado y borrarse | `src/server/services/accounts/withdrawal-service.ts:42` | Importar snapshot y detectar cambios; nunca borrar/reclasificar automáticamente hechos fiscales |
| La consulta de cuentas puede reconciliar bloqueos al leer | `src/server/trpc/routers/accounts.ts` | El adaptador fiscal no puede llamar `accounts.list`: necesita una consulta propia que sólo haga SELECT |
| La proyección analítica de retiros no es un libro de cobros y usa normalización de portfolio | `src/domains/analytics/services/analytics-bundle.ts` | Consultar los registros originales, no el agregado de Analytics |
| FX global aproximado/configurable; monedas desconocidas pueden acabar con factor 1; HNL no está en su tabla base | `src/lib/fx.ts:11`, `:30` | Crear valoración fiscal fechada e independiente; nunca usar ese fallback ni modificar el FX global para este módulo |
| `protectedProcedure` valida identidad; Prisma tiene acceso privilegiado | `src/server/trpc/init.ts:39` | RLS no sustituye `userId` en cada operación ni la comprobación de relaciones |
| La aplicación ya tiene exportación y eliminación durable de perfil | `src/server/services/profile/export-profile.ts`, `account-deletion.ts` | Incorporar datos y objetos fiscales a esos ciclos de vida antes de publicar |

No habrá llamadas desde `domains/tax` a servicios de trading. Los servicios fiscales no invocarán mutaciones de cuentas, retiros, trades, riesgo ni invalidación de Analytics. El único acceso al dominio de trading será un puerto de lectura de retiros y sus cuentas de origen, incluidos sus estados históricos/inactivos.

## 3. Fuentes y límites de la validación normativa

Las reglas se apoyan en fuentes primarias, con identificación de versión. Esta revisión no equivale a certificar la totalidad de obligaciones de cada contribuyente ni la ausencia de reformas posteriores.

| ID | Fuente oficial y localización | Uso y límite |
|---|---|---|
| HN-ISR-2026 | [SAR, Acuerdo SAR-01-2026](https://www.sar.gob.hn/download/acuerdo-numero-sar-01-2026-publicado-en-fecha-23-de-enero-del-2026-en-la-gaceta-no-37051/) y [publicación en La Gaceta conservada por TSC](https://www.tsc.gob.hn/web/leyes/Acuerdo-SAR-01-2026.pdf), PDF p.3 / Gaceta A.6 | Tabla progresiva anual 2026; no determina por sí sola la clasificación de un payout |
| HN-102-2026-08 | [SAR, Ayuda Impuesto Sobre la Renta Persona Natural, código 102](https://www.sar.gob.hn/download/ayuda-declaracion-jurada-impuesto-sobre-la-renta-102/), botón Descargar; portada agosto 2026, 71 páginas | Estructura y requisitos de la Oficina Virtual; verificar cambios del formulario antes de habilitar un nuevo mapping |
| HN-PREREQ-CI | [SAR, Acuerdo SAR-619-2024](https://www.sar.gob.hn/download/acuerdo-no-sar-619-2024-no-36725-de-fecha-27-de-diciembre-2024-que-la-declaracion-jurada-del-impuesto-sobre-la-renta-requerira-a-partir-del-periodo-fiscal-2024-la-presentacion-previa-del-i/), PDF p.4 / Gaceta A.9 | Verificar presentación previa del Informe de Estado de Situación Financiera para comerciante individual; no basta con datos del contador |
| HN-LISR-REF | [SAR, texto consolidado de la Ley ISR](https://www.sar.gob.hn/download/texto-consolidado-decreto-ley-numero-25-ley-del-impuesto-sobre-la-renta/), portada 22-01-2025, hasta Acuerdo SAR-07-2025; [Código Tributario 170-2016](https://www.sar.gob.hn/download/decreto-no-170-2016-codigo-tributario/), decreto original | Referencias para revisar elegibilidad/fuente, no un consolidado certificado de 2026; comprobar reformas y vigencia |
| HN-FX-REF | [BCH, resultados diarios del TCR](https://www.bch.hn/estadisticas-y-publicaciones-economicas/reportes-dinamicos/estadisticas-cambiarias/resultados-diarios-del-tcr) y [comunicado cripto de 29-07-2022](https://www.bch.hn/administrativas/RI/Enlaces%20Comunicados%20FMI%20%20ES/Comunicado%20Criptoactivos%2029-7-2022.pdf) | Fuente candidata USD/HNL y contexto monetario; no fijan paridad USDC/USD ni método de valoración ISR |

El PDF del manual se conserva como evidencia de investigación fuera del producto, en `/workspace/qa-learning/fiscal-spec-2026/`. SHA-256 del PDF: `94b0bd1ebfb790247a8e5cebef87b27ad2cab11de7b75ebf8e1713216f2584d4`. El enlace de descarga es dinámico; no fijar en el producto un token temporal de esa URL. No se añade el PDF completo al repositorio.

El manual exige información del contador para comerciantes individuales. Para éstos, HN-PREREQ-CI añade un informe financiero previo: la primera versión registrará su constancia/revisión, no fabricará balances contables a partir del ledger de cobros.

**Pendiente de validación profesional por tipo de caso:** fuente territorial de los servicios/recompensas de fondeo; categoría de rentas por capital propio; momento legal de reconocimiento; disposición/conversión de cripto, costo fiscal y ganancias; elegibilidad de gastos/deducciones/créditos y reglas especiales. Pagador extranjero, residencia del exchange o pago en USDC no resuelven esas cuestiones. Los compilados legales pueden reflejar textos de distintas fechas: ninguna contradicción se resolverá escogiendo silenciosamente la opción de menor impuesto.

Las reglas pendientes no impiden conservar registros ni ejecutar simulaciones explícitas. Sí impiden presentar una estimación incompleta como impuesto definitivo o marcar una declaración como lista.

## 4. Experiencia funcional

Entrada de navegación: **Fiscalidad**, ruta `/fiscal`. Selector inicial Honduras / 2026 / Persona natural. Otros países y años sin reglas no ofrecerán una calculadora por defecto. Se usarán `AppShell`, tarjetas, `Button`, `Dialog`, campos y tablas del sistema actual; añadir la ruta en `NAV` y `SURFACE_NAV` de `Sidebar.tsx` y probar el drawer móvil. El Coach global no recibe contexto fiscal ni incorpora estos datos a sus herramientas; las acciones rápidas de trading no registrarán movimientos fiscales.

Resumen:

| Indicador | Definición |
|---|---|
| Ingresos recibidos | Porciones de cobros confirmados vinculadas a hechos `TaxIncome`, menos reversos; incluye tratamiento pendiente. No incluye préstamos, aportes, saldos iniciales ni transferencias propias. Separar totales por activo cuando falte valoración HNL |
| Pendientes de conciliar | Candidatos de retiros y cobros sin completar; no suman como ingreso confirmado |
| ISR estimado | Resultado sobre registros y tratamientos admitidos; mostrar cobertura, base excluida pendiente y versión de reglas |
| Retenciones y anticipos | Separar registrados, soportados y aplicables al cálculo; nunca confundir gasto con crédito |
| Documentación | Comprobantes disponibles y registros que necesitan respaldo, sin tratar un fichero subido como verificación del SAR |

Estados monetarios distintos: **sin registros**, **cero confirmado**, **sin calcular**, **estimación parcial** y **conciliado**. Si hay importes pendientes de valoración, no presentar un total HNL que parezca completo. Un retiro solicitado o una transferencia entre wallets propias no cuenta como ingreso nuevo.

El desglose de movimientos puede mostrar todas las entradas externas, distinguiendo ingresos, financiación/aportes y naturaleza pendiente; ese total de caja no sustituye el indicador de ingresos. Un cobro aún no asociado a una naturaleza queda pendiente de clasificar, visible por separado.

Vistas internas: Perfil y ejercicio; Ingresos; Movimientos y cripto; Gastos/deducciones; Retenciones/anticipos; Documentos; ISR/simulaciones; Declaración. Cada total permite abrir sus registros contribuyentes, decisiones y documentos. Los filtros de fechas son del ejercicio fiscal, no los de Analytics.

### Perfil y ejercicio

Datos: país, ejercicio, moneda fiscal HNL, domicilio/residencia fiscal, persona natural/condición de comerciante individual, RTN, actividad y obligaciones declaradas por el usuario. Identificar origen de cada obligación: ingresada por el usuario o derivada de una regla validada; no inferir un alta oficial ante el SAR. RTN de 14 dígitos y ceros iniciales como texto; esa validación sintáctica no certifica su existencia. Zona del calendario fiscal Honduras: `America/Tegucigalpa`, independiente de la zona de visualización del perfil general.

RTN puede quedar pendiente para comenzar a registrar; se exige para marcar el borrador listo. El perfil del ejercicio queda versionado para que un cambio de domicilio/actividad no reescriba años previos. No se cambiará la moneda ni zona horaria global de TjournalX.

### Ingresos y cobros

Registrar pagador, naturaleza, contrato/referencia, importe bruto y activo, componentes de comisión/retención, importe efectivamente recibido, fecha real, cuenta fiscal de destino, evidencia y tratamiento. Guardar por separado `receivedDate` y `recognitionDate`: cobro y devengo/reconocimiento tributario no son sinónimos. No imponer criterio de caja universal a partir de la interfaz.

Un salario se ingresa con sus componentes y constancia; los conceptos exentos/no gravados no se adivinan. Un payout se podrá guardar como **recibido / tratamiento pendiente** sin asignarle un porcentaje fijo. Devoluciones/aportes de capital y préstamos se clasifican como movimientos de otra naturaleza con respaldo, no se fuerzan a ingreso gravado.

### Retiros → candidatos → conciliación

1. Al abrir/actualizar Fiscalidad, la API consulta retiros propios mediante un lector SELECT dedicado. No necesita hooks ni escrituras en Retiros. Paginar por cursor; no filtrar exclusivamente por `Withdrawal.date` dentro de 2026: una solicitud de 2025 puede cobrarse en 2026. Se guarda candidato sólo al actuar sobre él, no como efecto de una query.
2. Mostrar por defecto `PAGADO` como candidato conciliable y `SOLICITADO`/`EN_PROCESO` como pendientes informativos; no permitir confirmar recepción por el estado solo. `RECHAZADO` se excluye de la propuesta habitual. Tipos QA/DEMO/BACKTEST no generan propuestas.
3. El usuario elige **Vincular cobro existente**, **Registrar recepción** o **Descartar propuesta** con razón. Vincular es la vía para un ingreso ya registrado manualmente.
4. Conservar ID de retiro y cuenta como referencias de origen más snapshot de importe/moneda/fecha/estado/referencia/tipo de cuenta/`updatedAt` y hash. No habrá FK con eliminación en cascada hacia los datos de trading.
5. La conciliación admite pagos parciales y un cobro que liquida varios retiros. Asignaciones y componentes no pueden superar el cobro ni la fuente; diferencias de moneda requieren sus valoraciones y una conciliación HNL documentada.
6. Si cambian importe, moneda, fecha, referencia o estado de la fuente, marcar **origen modificado**; si desaparece, **origen no disponible**. Mantener el registro fiscal. El usuario puede reconocer la diferencia o realizar una corrección fiscal auditada, sin cambiar el retiro.
7. `userId + sourceType + withdrawalId` hace idempotente el candidato. UUID de solicitud + hash de payload hace idempotente confirmar/vincular; mismo UUID con otro payload devuelve conflicto. Asignaciones concurrentes se validan dentro de transacción y bloqueo del período/fuente fiscal. La referencia escrita por el usuario no es una clave única ni prueba de identidad bancaria.

No equivaler importación con reconocimiento gravable. No exigir que el estado original siga en `PAGADO` para conservar un cobro que ya fue confirmado con evidencia. No descontar del ingreso una comisión y además deducir la misma comisión otra vez.

### Movimientos de cripto, bancos y saldos

Cada cuenta fiscal es banco, exchange o wallet de propiedad declarada; nunca es una `Account` de trading. Identidad del activo incluye fiat o, para tokens, símbolo/red/contrato cuando corresponda. USDC en redes distintas no se confunde con USD ni con otro token del mismo nombre.

Tipos de evento: saldo inicial, recepción externa, transferencia propia, conversión, pago/gasto, comisión, ajuste y reverso. Cada evento tiene partidas firmadas por cuenta/activo; su signo determina entrada/salida. Se validan ecuaciones por tipo de evento: conservar cantidad del mismo activo en transferencias salvo comisión; conversiones documentan dos activos y su cotización, sin sumar cantidades de tokens diferentes.

Ejemplo de aceptación: recepción externa 2.000 USDC en Binance → traslado propio 1.000 USDC a otra wallet → pago con tarjeta de 300 USDC desde Binance. Sin comisiones/saldos iniciales: Binance 700 y otra wallet 1.000; ingreso recibido 2.000, no 3.000 ni 3.300. El pago puede implicar una disposición de cripto con tratamiento pendiente, pero no un segundo ingreso del payout ni una deducción automática por ser un gasto.

El saldo se deriva de partidas confirmadas y saldos iniciales identificados, no del importe de los ingresos ni de una cotización actual. Mostrar saldos **registrados**, sin afirmar que están sincronizados con Binance. Bloquear saldos negativos al confirmar, salvo ajuste de apertura explícito documentado; permitir borradores incompletos. Pendientes/en tránsito aparecen aparte.

No se prometerá cálculo automático de ganancias de cripto sin lotes/costo fiscal y método legal validados. Hasta entonces, una conversión o gasto que requiera ese cálculo impide marcar la declaración lista, pero permite ver saldos y la estimación parcial del ISR ordinario.

### Gastos, deducciones y créditos

Registrar gastos económicos aunque sean personales/no deducibles; su clasificación tributaria es separada. Una deducción requiere tipo, importe soportado, ejercicio, criterio legal/regla y condición de aplicabilidad. Los topes se aplican por persona/ejercicio/categoría, no por fichero o transacción.

Retención/anticipo: pagador o SAR, fecha, concepto, importe, constancia/recibo, período imputable y estado de validación. Puede existir sin un movimiento de wallet (p. ej., retención salarial). Una retención descontada del bruto no vuelve a restarse como gasto; se aplica una sola vez como crédito si corresponde. No reconocer automáticamente un impuesto extranjero como crédito nacional.

La primera entrega del motor sólo activará categorías con reglas verificadas. Otras quedan registradas como propuestas pendientes; no se concede un importe fijo de gastos médicos a todo usuario ni una deducción por toda compra con tarjeta. Los anticipos futuros se registran como previsión y no como pagos efectuados.

### Documentos

Contratos, constancias de retención, recibos, extractos, facturas y acuses. Metadatos: nombre original, tipo real, tamaño, hash SHA-256, fecha, propietario y vínculos a registros fiscales. PDF/JPEG/PNG; máximo de esta versión 4 MiB por documento, validado en servidor (ajuste del límite inicial propuesto de 10 MiB para respetar el payload de 4,5 MB del hosting). No aceptar HTML/SVG ni renderizar contenido activo.

Bucket privado `tax-evidence`; claves `userId/evidenceId/objectId`, nombres originales sólo en metadatos. Descargas con autorización del registro, `private, no-store` y URL firmada propuesta de 300 segundos. No persistir URLs firmadas ni direcciones públicas en los registros. Subida pendiente → validación → disponible/rechazada; compensación de objetos huérfanos y borrado reintentable. Usar subida autenticada a través del servidor con el límite de 4 MiB, validación binaria, objeto inmutable y finalización auditada. No emitir capacidades de subida que puedan seguir usándose tras eliminar la cuenta. Cerrar el ejercicio invalida la finalización; un objeto subido con autorización anterior se limpia si ya no puede adjuntarse. Reemplazar un documento crea una versión nueva y conserva el vínculo histórico necesario; no sobrescribir silenciosamente.

## 5. Motor de cálculo y precisión

Contrato puro: entradas decimales como texto, ejercicio, perfil congelado, registros aceptados, decisiones y `ruleSetVersion` → resultado con base, tramos, créditos, diferencias, advertencias, cobertura y referencias de origen. Sin acceso a BD, HTTP o fecha actual implícita.

No usar `number`, `parseFloat`, `toFixed` ni el FX de portfolio para cantidades/operaciones fiscales. Postgres/Prisma Decimal: cantidades y cotizaciones `numeric(38,18)` (20 dígitos enteros, 18 decimales); importes HNL fiscales finales `numeric(20,2)`. Rechazar exceso de escala/rango en la API antes de que Postgres redondee. Reutilizar Decimal de Prisma en servidor; cualquier decimal directo añadido al cliente será dependencia explícita y fijada, no un import transitorio oculto. La UI recibe cadenas y nunca recalcula la deuda con coma flotante.

Cada valoración conserva cantidad, activo base/cotizado, tasa, fecha/hora de referencia, fuente/URL o evidencia, método, proveedor y precisión. HNL→HNL usa identidad explícita; otras conversiones sin tasa quedan pendientes. Una ruta USDC→USD→HNL exige ambos pasos justificados: no hay paridad implícita, ni cotización de hoy para cobros históricos, ni sustitución por 1 cuando falta una moneda. La tasa manual tiene estado **declarada por el usuario**, no **oficial**. Diferenciar tasa de mercado/operación y criterio de valoración tributaria.

### Tabla anual 2026 y algoritmo

| Límite superior de renta neta gravable anual HNL | Tasa marginal sobre la porción |
|---:|---:|
| 228.324,32 | 0 % |
| 348.154,10 | 15 % |
| 809.660,75 | 20 % |
| Sin límite | 25 % |

Para base no negativa `B`, cada porción es `max(0, min(B, limiteSuperior) - limiteSuperiorAnterior)`. La cota anterior del siguiente tramo es el límite anterior, no ese límite + 0,01: así no se pierde un centavo por frontera. La tabla oficial se representa al usuario con sus rangos inclusivos; el algoritmo trabaja con anchuras continuas decimales.

Caso ordinario soportado: ingresos gravables admitidos − gastos/deducciones admitidos = base, con tratamientos especiales aplicados exclusivamente por reglas explícitas. No compensar pérdidas/ingresos de categorías diferentes sin norma. ISR progresivo − créditos aplicables = saldo: mostrar por separado impuesto determinado, créditos, saldo por pagar y posible exceso, sin llamar devolución automática a un saldo favorable.

Política de simulación propuesta: cálculos intermedios decimales completos, redondeo final HNL a dos decimales `HALF_UP`; presentar ajuste de redondeo cuando los tramos visuales no sumen exactamente. Esta política requiere contrastarse con el formulario/criterio contable antes de usarla para marcar un borrador listo; no se atribuye al Acuerdo una instrucción de redondeo que no se verificó.

Fixtures matemáticas de esa política (base ya determinada; no salario bruto):

| Base HNL | ISR antes de créditos HNL |
|---:|---:|
| 0,00 | 0,00 |
| 228.324,32 | 0,00 |
| 228.324,33 | 0,00 |
| 348.154,10 | 17.974,47 |
| 348.154,11 | 17.974,47 |
| 809.660,75 | 110.275,80 |
| 809.660,76 | 110.275,80 |
| 1.000.000,00 | 157.860,61 |

No calcular una exención salarial mensual dividiendo sin más el umbral anual entre doce. Simulaciones viven aparte: no crean cobros, deducciones, créditos ni documentos reales.

### Reglas versionadas

Identidad: país + régimen + año + versión. Paquete publicado inmutable con tablas, elegibilidad/topes, tratamiento de créditos, redondeo, mapping 102, referencias, fecha de consulta, checksum y estado de revisión. Publicación sólo por release revisada, nunca por una mutación abierta al usuario. Validar ausencia de huecos/solapamientos y esquemas del paquete.

Cambiar una norma crea versión nueva, no edita 2026 en sitio. Una declaración fija su versión y conserva sus entradas/resultados. 2027 sin paquete validado muestra **reglas no disponibles**; puede registrar datos, no reutilizar 2026. La UI diferencia regla del producto, elección del usuario y criterio profesional documentado.

## 6. Preparación del formulario 102

Asistente propuesto por el producto:

1. **Perfil:** identificación, domicilio, ejercicio, condición del contribuyente y contador cuando corresponda.
2. **A / Cálculo:** desglose de ingresos, gastos y deducciones; trazar cada agregado hasta sus registros.
3. **B / Información tributaria:** solicitar información aplicable que no puede inferirse del ledger; opción no aplica con motivo cuando esté permitida. Nunca rellenar ceros como sustituto de datos faltantes.
4. **C / Créditos:** retenciones y anticipos admitidos con soporte y período correcto.
5. **D / Resumen y conciliación:** base/impuesto/créditos/saldo, diferencias y elementos pendientes.

Cada campo exportado se identifica por una clave interna estable, etiqueta oficial, sección, versión del manual y regla de agregación. No inventar números de casilla si no aparecen en la fuente: validar el mapping con capturas del formulario vigente durante la implementación. Campo no soportado o mapping sin comprobar queda pendiente y bloquea el estado listo. El XLS/CSV no se anuncia como archivo importable por el SAR sin formato oficial verificado.

Inventario mínimo comprobado por etiquetas (no son códigos numéricos): A incluye sueldos, otros ingresos gravables, honorarios, gastos, deducciones y RNG (pp.14–20); B solicita, entre otros, no gravables, no deducibles y partes relacionadas (p.32); C contempla retenciones salariales/art.50, pagos a cuenta, pagos del período y excedente anterior (pp.50–54); D muestra ISR, créditos e impuesto a pagar (pp.56–57). No se verificó una casilla independiente «comisiones» ni los subcampos de deducciones. No sumar créditos ya aplicados con pagos a cuenta sin conciliar su uso previo; guardar importe original, aplicado antes y disponible.

Salidas: resumen PDF imprimible; CSV de registros y agregados (protegido frente a fórmulas); JSON decimal completo del snapshot; manifiesto de evidencias con hashes, sin enlaces públicos. Primera versión exporta documentos individuales autorizados y manifiesto; un ZIP masivo queda fuera hasta disponer de streaming y límites comprobados. Cada exportación indica **borrador / no presentado**, fecha, ejercicio, regla/mapping, versión y limitaciones.

Guardar un número o acuse aportado por el usuario registra **presentación declarada por el usuario**. Sólo evidencia disponible y revisión humana permiten catalogarlo como archivado; no afirmar validación oficial por haber subido un PDF. No hay conexión para presentar o pagar al SAR en este alcance.

### Estados y cierre

Período: `OPEN` / `CLOSED`. Preparación: `DRAFT` / `IN_REVIEW` / `READY`; archivo externo: registro separado `reportedFiledAt` + acuse. Listo exige: perfil suficiente; contador e informe financiero previo si aplican; registros conciliados; tratamientos/valoraciones admitidos; documentos requeridos; reglas y mapping aplicables; información B completa; ninguna discrepancia bloqueante.

Advertencias no bloqueantes no se ocultan; el usuario debe poder identificar su efecto. Una cifra parcial nunca recibe `READY`. El cálculo conserva lista de exclusiones con sus importes/activos cuando sea posible, sin tratarlas como exenciones.

Cerrar crea snapshot inmutable, versión de documentos y hash de todas sus entradas. Mutaciones de registros, partidas, tratamientos, evidencias y asignaciones del ejercicio cerrado se rechazan **en servidor dentro de la misma transacción**, no sólo deshabilitando botones. Una cotización/regla/perfil nuevo no altera snapshots cerrados. Reabrir exige motivo y auditoría; cualquier corrección produce una revisión nueva del borrador y conserva la anterior. Una rectificación se etiqueta como tal, sin declarar que fue presentada.

Precondición inequívoca: `close` sólo acepta preparación `READY` y revalida todos los requisitos dentro de la transacción. No existe un cierre incompleto alternativo. Se pueden guardar/exportar snapshots `DRAFT` parciales sin cerrar. Toda modificación relevante de un período abierto invalida `READY`, incrementa la revisión y obliga a preparar/revisar de nuevo antes de cerrar.

## 7. Modelo de datos propuesto

Modelo conceptual, todavía sin migración. Importes/fechas se normalizan a columnas; no esconder el libro económico en un JSON arbitrario. JSON sólo para snapshots versionados/validados y referencias normativas estructuradas. Tablas de usuario con `user_id` obligatorio y clave única adicional `(user_id,id)` para relaciones compuestas del mismo propietario.

| Entidad | Responsabilidad y campos principales |
|---|---|
| `TaxProfile` | Usuario, país, identificación/RTN, domicilio, régimen/condición, actividad; revisión. Una identidad fiscal por usuario/país para esta versión |
| `TaxPeriod` | Perfil, año, fechas inicial/final DATE, zona fiscal, moneda, perfil del ejercicio versionado, estado, revisión; único perfil+año+régimen |
| `TaxRuleSet` | Catálogo global publicado, país/régimen/año/versión, referencias, payload validado, checksum; sólo lectura para usuarios |
| `TaxAssetAccount` | Perfil, nombre, banco/exchange/wallet, propiedad declarada; independiente de cuentas de trading. Movimientos, no un campo balance editable |
| `TaxTransaction` + `TaxPosting` | Evento fechado vinculado al perfil y al período de la fecha económica; estado `DRAFT`/`POSTED`/`REVERSED`; partidas cuenta+activo+cantidad decimal firmada, valoraciones versionadas y reverso de origen. Las partidas se guardan atómicamente |
| `TaxIncome` | Hecho de ingreso, pagador/naturaleza, bruto, fecha de reconocimiento, tratamiento, importe admitido, componentes y referencias. Cobros relacionados por conciliación; un ingreso puede tener varios cobros |
| `TaxDeduction` | Gasto o deducción, con subtipo tipado, importe económico/admitido, fundamento, elegibilidad/tope y vínculo al componente económico de origen. No duplicar una comisión |
| `TaxCredit` | Retención/anticipo u otro crédito admitido, pagador, pago/constancia, fecha, ejercicio imputable, importe registrado/aplicado antes/disponible/admitido y tratamiento. Referencia única de componente para evitar uso doble |
| `TaxImportCandidate` | Referencia sin FK a Withdrawal, snapshot/hash, revisión de fuente, estado propuesto/descartado/vinculado/modificado/no disponible; único usuario+tipo+ID origen |
| `TaxReconciliation` | Asignaciones entre candidato opcional, ingreso y cobro/partida, importes bruto/neto/comisión/retención y diferencia justificada. Admite conciliación parcial/múltiple sin sumar el dinero otra vez |
| `TaxEvidence` | Metadatos/clave privada/hash/versiones y estado del objeto; relaciones explícitas a los registros fiscales soportados |
| `TaxReturn` | Período+revisión, estado, snapshot de cálculo/entradas, perfil/reglas/mapping fijados, hash, manifiesto, presentación reportada/acuse; revisiones anteriores inmutables |
| `TaxAuditEvent` | Usuario/actor, instante, acción, entidad/revisión, motivo, diff fiscal mínimo y requestId; append-only para el usuario |

Implementar vínculos de documentos mediante tablas de relación por entidad con FKs compuestas de propietario; no aceptar `targetId` polimórficos sin comprobar su existencia/propiedad. El catálogo de activos/valoraciones puede almacenarse en subregistros validados de partidas; cada snapshot debe capturar los valores usados, no una referencia mutable.

El ingreso pertenece al ejercicio de reconocimiento; un cobro relacionado puede ocurrir en otro ejercicio del mismo perfil. Conciliación transanual bloquea períodos/ingreso en orden estable para evitar deadlocks y sobreasignaciones; no mueve el ingreso de año silenciosamente. Un cobro posterior puede referenciar un ingreso de un período cerrado: la asignación y sus documentos pertenecen al ejercicio abierto del cobro y no alteran las entradas ni el snapshot histórico. Cambiar el importe reconocido/tratamiento o evidencia usada en el cierre anterior sí exige reabrirlo. El cobro posterior no vuelve a crear renta gravable en el nuevo año si ya se reconoció en el anterior según el criterio aplicable.

Un traslado pendiente en diciembre y recibido en enero se registra con salidas/entradas fechadas y cuenta de tránsito fiscal, manteniendo ambas fechas y la misma identidad de transferencia. Aperturas se derivan de partidas al corte anterior, con hash/fecha de corte y marca provisional si el año anterior sigue abierto, o se importan con respaldo; no requieren un cierre fiscal incompleto ni reingresan el saldo como renta. Cambios tardíos que alteren ese corte generan discrepancia de apertura y bloquean `READY` hasta conciliarla, sin reescribir un ejercicio cerrado.

Todos los registros mutables incluyen `createdAt`, `updatedAt`, `revision`; confirmaciones usan `requestId` y hash de payload. Registros publicados se corrigen con revisión/reverso, no hard-delete. Borradores no usados pueden retirarse con auditoría y limpieza de objetos. Borrar la cuenta sí elimina datos fiscales y objetos según la solicitud explícita del propietario; cierre anual no impide ese flujo.

Índices mínimos: `(user_id,period_id,date,id)`, estado por ejercicio, referencias de importación, relaciones de ingreso/cobro, evidencia y auditoría. La unicidad de RTN no será global entre usuarios. No habrá cascada desde `Withdrawal`/`Account` hacia Fiscalidad; sí relaciones de propiedad para limpieza de perfil.

## 8. API, seguridad y estructura

```text
src/app/fiscal/                         resumen y secciones, componentes del sistema
src/domains/tax/                        tipos, validación, decimal, reglas y cálculo puro
src/domains/tax/rules/hn/2026/           paquete normativo validado/versionado
src/server/services/tax/                libro, conciliación, cierre, evidencias y exportación
src/server/services/tax/withdrawal-reader.ts  único adaptador SELECT a trading
src/server/trpc/routers/tax.ts          router autenticado
src/app/api/tax/evidence/               subida/descarga autorizada
src/app/api/tax/export/                 artefactos autorizados y acotados
src/prisma/schema.prisma                modelos fiscales independientes
supabase/migrations/                    tablas, constraints, RLS y bucket privado
```

Grupos de API: `tax.profile`, `tax.periods`, `tax.incomes`, `tax.transactions`, `tax.deductions`, `tax.credits`, `tax.imports`, `tax.evidence`, `tax.calculations`, `tax.returns`. Paginación por cursor y filtros de ejercicio en listados. `userId` siempre viene del contexto; `periodId`/cuentas/evidencias se resuelven con el mismo propietario. Cantidades decimales como cadenas; fechas calendario `YYYY-MM-DD`; instantes UTC ISO separados.

Operaciones críticas: `imports.candidates` sólo lee; `imports.reconcile` guarda exclusivamente Fiscalidad; `transactions.post/reverse`, `returns.prepare/close/reopen`, `evidence.finalize/download`. Formularios envían `expectedRevision`. Conflicto de revisión conserva borrador local y exige recarga/revisión; no sobrescribe silenciosamente. Doble clic/reintento repite la misma respuesta sólo si coincide el payload idempotente.

Reglas de acceso:

- `protectedProcedure` y comprobación de propietario en todos los servicios; no usar `dashboardMutation`.
- RLS SELECT por propietario en todas las tablas fiscales de usuario. Primera versión: escritura sólo por API autenticada privilegiada y validada; revocar INSERT/UPDATE/DELETE directos de `anon`/`authenticated`. Así REST no elude auditoría, cierre ni unicidad lógica. El service role nunca llega al cliente.
- Catálogo de reglas: lectura sólo de versiones publicadas, sin escritura del usuario. Auditoría: lectura propia, sin update/delete del cliente.
- Bucket privado sin políticas públicas; subida y descargas pasan por autorización fiscal. Cada intento de carga privilegiada crea un lease operacional que sobrevive al borrado de User; la eliminación no completa hasta que terminen o caduquen las cargas y se repita el barrido. Estas intenciones técnicas no forman parte del libro ni se exponen al cliente. URLs firmadas sólo tras validar objeto, propietario y estado.
- Sin acceso externo para contadores en primera versión; los datos del contador del formulario no conceden permisos. Compartir un informe requiere acción explícita del usuario.
- RTN, documentos y descripciones fiscales excluidos de logs, analítica de producto y errores públicos. Auditoría fiscal accesible sólo al propietario, con campos sensibles minimizados.
- Límites de ficheros, peticiones y paginación; escape de HTML en PDF, neutralización de CSV y pruebas IDOR en consultas y descargas.
- Incluir tablas y objetos en exportación/eliminación de perfil; después de borrar, revocar acceso siguiendo el mecanismo durable existente y verificar objetos, no sólo filas.

No reutilizar el bucket de screenshots de trades ni su política de acceso; tomar sólo los patrones de autorización del bucket privado de prácticas. Extender explícitamente el manifiesto/delegados de exportación y la lista de buckets tanto del servicio de eliminación como de su función SQL de limpieza; no confiar sólo en cascadas Prisma.

## 9. Hitos de construcción después de aprobar el diseño

| Hito | Entrega verificable | Condición para avanzar |
|---|---|---|
| 1. Registro y control | Perfil/ejercicio, libro económico, ingresos, propuestas de retiros, conciliación, documentos, auditoría | Ninguna escritura en trading; aislamiento y anti-duplicación comprobados; limpieza/exportación cubiertas |
| 2. Estimación | Paquete HN2026, ISR progresivo, valoraciones históricas, deducciones/créditos admitidos, simulaciones | Fuentes y redondeo revisados; límites decimales; tratamiento desconocido visible como pendiente |
| 3. Declaración | A/B/C/D, conciliación, snapshots, cierre/reapertura, exportación y acuses reportados | Mapping vigente probado, bloqueos completos y pruebas de cierres concurrentes |
| 4. Ampliación futura | Países/regímenes, conectores, acceso de contadores | Nuevo alcance/diseño; no habilitar opciones ficticias antes de tener reglas/permisos |

Antes de cualquier DDL: revisar esta especificación, resolver decisiones legales necesarias para las reglas que se quieran activar, detallar el plan de implementación y revisar migraciones aditivas/RLS. La especificación puede aprobarse manteniendo categorías explícitamente pendientes; eso no autoriza resolverlas inventando tratamientos.

La entrega de producto seguirá el procedimiento habitual: rama de trabajo, PR, CI, migración revisada, preview exacto, QA aislada en escritorio/móvil y capturas, merge sólo si pasa, producción y limpieza/revocación. No realizar declaraciones reales, pagos, mensajes ni cambios de configuración ajena en QA. No copiar configuración de IA: este módulo no la necesita.

## 10. Criterios de aceptación y pruebas

1. Sin perfil fiscal se puede iniciar el alta sin cambiar Perfil, moneda, calendario ni onboarding de trading.
2. Leer candidatos y abrir Fiscalidad no cambia locks, cuentas, retiros, capital, P&L, estadísticas, logs ni cachés del trading.
3. Candidatos excluyen DEMO/BACKTEST/QA y conservan retiros de cuentas históricas; estados sin cobro no inflan ingresos.
4. Confirmar un cobro requiere fecha y cuenta de recepción; `PAGADO` por sí solo no es evidencia.
5. Un cobro existente se vincula sin recrearlo; pagos parciales/múltiples cuadran con sus componentes y rechazan sobreasignación concurrente.
6. Reintentos/doble clic y UUID con payload diferente prueban idempotencia/conflicto. Dos usuarios nunca pueden vincularse fuentes, cuentas o documentos.
7. Modificar/borrar un retiro después de conciliar no altera el hecho fiscal ni un cierre; produce discrepancia visible.
8. Caso 2.000 USDC → transferencia propia → gasto 300 preserva el ingreso único y los saldos registrados; saldo inicial no se confunde con renta.
9. Conversión de activos registra ambas patas, precio/fecha/comisión; tratamiento desconocido de la disposición bloquea `READY`.
10. Comisión económica sólo contribuye una vez al gasto/deducción; retención sólo una vez al crédito y nunca como gasto adicional.
11. Falta de cotización, ticker ambiguo, cambio de FX general o paridad USDC no comprobada no produce una valoración automática de 1.
12. Cadenas decimales, escala, números grandes/negativos/no finitos, centavos y los ocho fixtures de tramos se verifican sin `number`.
13. Propiedades del motor: monotonicidad del ISR antes de créditos, incremento marginal por tramo, no doble imposición en fronteras y reproducibilidad.
14. Deducciones por tope anual/agregado y créditos superiores al impuesto no se convierten en deducciones ilimitadas o devoluciones afirmadas.
15. Ejercicio 2027 sin reglas falla de forma explícita; cambiar reglas/perfil/cotizaciones no reescribe un snapshot 2026.
16. Comerciante individual sin datos requeridos de contador no queda listo; un perfil no admitido no recibe cálculo ordinario como si aplicara.
17. Totales incompletos y datos B desconocidos quedan identificados; las casillas exportadas cuadran con los registros contribuyentes.
18. Cierre contra una escritura simultánea: sólo una secuencia válida; tras cierre se rechazan también escrituras API/REST, carga de evidencias y cambios de tratamiento.
19. Reapertura/corrección conserva auditoría y la revisión exportada anterior; un acuse subido no se etiqueta validado por el SAR.
20. MIME/tamaño/ruta/IDOR/expiración de URL; subida fallida no deja evidencia disponible ni objetos huérfanos permanentes.
21. Usuario A, usuario B y anónimo: aislamiento de lectura, cálculo, importación, auditoría, fichero y exportación; REST directo no salta controles de servidor.
22. Exportación conserva decimales/fechas/versiones, no filtra documentos ajenos, neutraliza CSV y escape de contenido PDF.
23. Borrado de QA elimina Auth/perfil, tablas y objetos fiscales; reintento de limpieza es seguro y no afecta al otro usuario.
24. Desktop/móvil: navegación, formularios, borrador/reintento, errores de carga, teclado y tablas; capturas de saldo fiscal, conciliación, desglose ISR y borrador 102.
25. Suite previa de trading, retiros, aprendizaje y perfil sigue correcta; comparación de sus datos/métricas antes y después del flujo fiscal demuestra separación.

## 11. Decisiones pendientes y condición de publicación

No falta una decisión de arquitectura para planificar los hitos. Sí hay validaciones legales que no debe adivinar el implementador:

- Tratamientos concretos de payouts, fuente económica, renta por capital propio y disposiciones cripto.
- Método de valoración/costo fiscal, reconocimiento y redondeo que se admitirá como conciliado.
- Categorías de deducción/crédito a automatizar, con vigencia y elegibilidad verificadas.
- Mapping de campos aplicables del 102 y cobertura para comerciante individual.

Decisión propuesta para no bloquear el registro: mantener esas categorías en revisión y permitir estimaciones parciales/simulaciones con advertencias, **sin `READY` ni cierre conciliado** hasta completar los requisitos aplicables. No convertir incertidumbre en exención ni omitir importes silenciosamente.

El diseño se considera revisable con esta política. El módulo no se considera implementado por existir este documento, ni una calculadora se considera una declaración presentada.
