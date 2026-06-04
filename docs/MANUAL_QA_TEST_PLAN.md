# Manual QA Test Plan — Trading Journal v2

**Versión:** Post-Sprint 8  
**Fecha:** 2026-06-04  
**Objetivo:** Permitir validar el producto completo, pantalla por pantalla, sin necesidad de leer código.  
**Ejecutor:** Cualquier persona con acceso al entorno desplegado (staging o producción).  
**Prerrequisito:** Cuenta de usuario activa con al menos 1 cuenta de trading configurada y 10+ trades registrados. Tener también una cuenta vacía disponible para casos de prueba de estado vacío.

---

## Clasificación de Severidad

| Nivel | Significado |
|-------|-------------|
| **P0** | Crítico — bloquea el uso del producto o compromete datos/seguridad |
| **P1** | Mayor — funcionalidad clave rota o métricas incorrectas |
| **P2** | Moderado — inconsistencia o degradación de experiencia |
| **P3** | Menor — cosmético, deferred, o edge case sin impacto funcional |

---

## Índice de Pantallas

1. [Login / Autenticación](#1-login--autenticación)
2. [Dashboard — General](#2-dashboard--general)
3. [Dashboard — Tab Portfolio](#3-dashboard--tab-portfolio)
4. [Dashboard — Tab Operador](#4-dashboard--tab-operador)
5. [Dashboard — Tab Disciplina](#5-dashboard--tab-disciplina)
6. [Dashboard — Tab Playbook](#6-dashboard--tab-playbook)
7. [Trades — Lista y KPI Strip](#7-trades--lista-y-kpi-strip)
8. [Trades — Registrar Trade](#8-trades--registrar-trade)
9. [Trades — Detalle de Trade](#9-trades--detalle-de-trade)
10. [Trades — Editar Trade](#10-trades--editar-trade)
11. [Trades — Importar CSV](#11-trades--importar-csv)
12. [Trades — Psicología](#12-trades--psicología)
13. [Reviews — Tab Semanales](#13-reviews--tab-semanales)
14. [Reviews — Crear / Editar Review Semanal](#14-reviews--crear--editar-review-semanal)
15. [Reviews — Tab Mensuales](#15-reviews--tab-mensuales)
16. [Cuentas (Accounts)](#16-cuentas-accounts)
17. [Cuentas — Fases y Promoción](#17-cuentas--fases-y-promoción)
18. [Playbook (Setups)](#18-playbook-setups)
19. [Aprendizaje (Learning)](#19-aprendizaje-learning)
20. [Mercados (Markets)](#20-mercados-markets)
21. [Reglas (Rules)](#21-reglas-rules)
22. [Retiros (Withdrawals)](#22-retiros-withdrawals)
23. [Etiquetas (Tags)](#23-etiquetas-tags)
24. [Perfil — Datos Personales](#24-perfil--datos-personales)
25. [Perfil — Metas Semanales](#25-perfil--metas-semanales)
26. [Perfil — Apariencia y Tema](#26-perfil--apariencia-y-tema)
27. [Perfil — Notificaciones](#27-perfil--notificaciones)
28. [Perfil — Configuración de IA](#28-perfil--configuración-de-ia)
29. [Perfil — Exportar y Cerrar Sesión](#29-perfil--exportar-y-cerrar-sesión)
30. [AI Coach (Drawer)](#30-ai-coach-drawer)
31. [Mobile — Responsive General](#31-mobile--responsive-general)
32. [Mobile — Navegación y Paneles](#32-mobile--navegación-y-paneles)
33. [Configuración del Sistema](#33-configuración-del-sistema)

---

## 1. Login / Autenticación

**Objetivo:** Verificar que el acceso con credenciales válidas e inválidas funciona correctamente y redirige al dashboard.

**Dependencias:** Supabase Auth configurado, dominio verificado.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 1.1 | Login con credenciales válidas | Ir a `/login`. Ingresar email y contraseña correctos. Pulsar "Iniciar sesión". | Redirige a `/dashboard` sin error. | P0 |
| 1.2 | Login con contraseña incorrecta | Ingresar email válido y contraseña incorrecta. | Muestra mensaje de error claro (toast o texto). No redirige. | P1 |
| 1.3 | Login con email no registrado | Ingresar email que no existe. | Muestra mensaje de error. No da información sobre existencia del email. | P1 |
| 1.4 | Redirect protegido sin sesión | Ir directamente a `/dashboard` sin estar autenticado. | Redirige a `/login`. No muestra el dashboard. | P0 |
| 1.5 | Sesión persistente | Login, cerrar pestaña, abrir nueva pestaña y navegar a `/dashboard`. | Sesión activa. No pide login de nuevo (dentro del TTL de Supabase). | P1 |
| 1.6 | Campo de email vacío | Enviar formulario con email en blanco. | Validación frontend o error claro. No envía request. | P2 |
| 1.7 | Redirección post-login | Acceder a `/reviews` sin sesión, luego completar login. | Redirige a `/reviews` (o al menos al dashboard), no a una URL rota. | P2 |

---

## 2. Dashboard — General

**Objetivo:** Verificar que el dashboard carga correctamente, muestra los tabs, el KPI strip refleja datos reales y los estados de carga son los adecuados.

**Dependencias:** Al menos 1 cuenta activa con 10+ trades registrados.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 2.1 | Carga inicial con datos | Navegar a `/dashboard`. | Aparece el KPI strip con valores numéricos. No hay errores visibles. Skeleton visible brevemente durante la carga. | P0 |
| 2.2 | Estado de carga (skeleton) | Con conexión lenta simulada, cargar `/dashboard`. | Se muestra `SkeletonKpiStrip` mientras los datos cargan. No aparece pantalla en blanco. | P1 |
| 2.3 | Estado de error de datos | Desconectar la red. Recargar `/dashboard`. | Se muestra un mensaje de error (`role="alert"`) claro. No se muestra UI rota ni NaN. | P1 |
| 2.4 | Tabs visibles | Confirmar que el selector de tabs muestra: "Portfolio", "Operador", "Disciplina", "Playbook". | Todos los tabs son visibles y tienen texto legible. | P1 |
| 2.5 | Persistencia de tab seleccionado | Seleccionar tab "Disciplina". Navegar a otra página. Volver al dashboard. | El tab "Disciplina" sigue seleccionado. | P2 |
| 2.6 | Selector de período | Cambiar el período de "3M" a "7d". | Los KPIs se actualizan con datos del período seleccionado. El cambio persiste en localStorage. | P1 |
| 2.7 | Período persiste tras recarga | Seleccionar "1M". Recargar la página. | El período sigue siendo "1M". | P2 |
| 2.8 | Dashboard con cuenta vacía | Usar cuenta sin trades. Cargar `/dashboard`. | Muestra valores en cero o "—", no errores NaN ni crashes. | P1 |
| 2.9 | `aria-busy` durante carga | Inspeccionar el elemento `<main>` durante la carga. | Tiene `aria-busy="true"` mientras carga y `aria-busy="false"` cuando termina. | P3 |

---

## 3. Dashboard — Tab Portfolio

**Objetivo:** Verificar que las métricas financieras son correctas, el gráfico de equity curve es coherente y los KPI cards reflejan los datos del período seleccionado.

**Dependencias:** 10+ trades en el período seleccionado.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 3.1 | KPIs correctos | Comparar "Net P&L", "Win Rate", "Avg R", "Trades" con una suma manual de los trades del período. | Diferencia < 1% (redondeo aceptable). | P0 |
| 3.2 | Win Rate consistente | Anotar Win Rate en Tab Portfolio. Ir a Trades, filtrar por período. Calcular manualmente: trades con PnL > 0 / total trades. | Coincide con el valor del dashboard. | P0 |
| 3.3 | Sharpe Ratio aparece | Verificar que existe la KPI card "Sharpe Ratio". | Muestra valor numérico (o "—" si insuficientes datos) con 4 decimales. | P1 |
| 3.4 | Equity curve coherente | El gráfico de curva de equity muestra tendencia visual que coincide con el P&L neto. | Si PnL > 0, la curva sube. Si PnL < 0, la curva baja. No hay saltos inexplicables. | P1 |
| 3.5 | Gráfico de composición (pie chart) | Verificar que el pie chart de Win/Loss/BE suma visualmente el 100%. | Las proporciones son coherentes con el Win Rate y los trades del período. | P1 |
| 3.6 | Gráfico de barras P&L | El gráfico de barras muestra barras positivas (verde) y negativas (rojo) coherentes con los datos. | No hay barras invertidas. Las alturas son proporcionales a los P&L. | P2 |
| 3.7 | Goal Progress Widget | Verificar que el widget de metas muestra progreso. | Si hay metas configuradas en Perfil, aparece el widget. Si no hay metas, no se muestra (o muestra estado vacío). | P2 |
| 3.8 | Prop Firm rules (si aplica) | Si la cuenta tiene reglas de prop firm, verificar que el estado de cumplimiento es correcto. | No muestra "roto" si el trader está dentro de los límites. | P1 |
| 3.9 | KPIs calculados sobre TODOS los trades, no solo los paginados | Registrar 250 trades. Comparar el Win Rate del dashboard con el cálculo manual de todos los trades. | El dashboard incluye los 250 trades, no solo los primeros 50/200. | P0 |

---

## 4. Dashboard — Tab Operador

**Objetivo:** Verificar que las métricas por setup, el histograma de resultados y las estadísticas operacionales son correctas.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 4.1 | Carga sin error | Hacer clic en tab "Operador". | No hay errores. Las tarjetas de setups se renderizan. | P0 |
| 4.2 | Métricas por setup coherentes | Comparar Win Rate de un setup específico con los trades filtrados por ese setup en la página de Trades. | Coinciden (tolerancia < 1%). | P1 |
| 4.3 | Distribución R:R | Verificar el histograma de distribución de R:R. | Los valores son positivos para trades ganadores y negativos para perdedores. No hay outliers extremos sin justificación. | P1 |
| 4.4 | Stats de días de la semana | El gráfico de rendimiento por día de la semana refleja los datos reales. | El mejor/peor día coincide con una revisión manual de trades agrupados por día. | P2 |
| 4.5 | Período afecta al tab | Cambiar período a "7d". Las métricas del tab Operador se actualizan. | Solo se muestran datos del período seleccionado. | P1 |
| 4.6 | Con pocos trades (< 5 por setup) | Setup con 2-3 trades. | El setup aparece pero no muestra métricas falsamente significativas. Muestra indicador de "datos insuficientes" si aplica. | P2 |

---

## 5. Dashboard — Tab Disciplina

**Objetivo:** Verificar que el Discipline Score, el heatmap de disciplina y las estadísticas de violación de reglas son correctas.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 5.1 | Discipline Score visible | Clic en tab "Disciplina". | Se muestra el Discipline Score semanal en porcentaje o número de 0-100. | P1 |
| 5.2 | Heatmap de disciplina | Verificar que el heatmap de días muestra colores coherentes. | Días sin trades aparecen neutros. Días con trades malos aparecen en rojo/naranja. | P2 |
| 5.3 | Violaciones de reglas | Registrar un trade con tag "Impulsivo". Ir al tab Disciplina. | El contador de "Impulsivo" se incrementa. El conteo coincide con los trades etiquetados. | P1 |
| 5.4 | Botón "Ver registro" en Disciplina | Hacer clic en el botón "Ver registro →" dentro del tab Disciplina. | Navega a la sección de logs/registros correspondiente. No es un enlace muerto. | P1 |
| 5.5 | Coste de indisciplina | Si hay trades "Off-plan" o "Impulsivo", verificar el campo "Coste de indisciplina". | El valor es la suma de P&L de esos trades (puede ser positivo o negativo). | P1 |
| 5.6 | Racha de días limpios | Verificar contador de días sin trades indisciplinados. | El número es coherente con el historial de trades. | P2 |
| 5.7 | Composition pie (plan/off-plan) | Verificar que el gráfico de composición muestra % de trades siguiendo el plan vs. off-plan. | Proporciones coherentes con tags "Impulsivo" y "Off-plan" en los trades. | P2 |

---

## 6. Dashboard — Tab Playbook

**Objetivo:** Verificar que los setups se muestran con los indicadores de salud correctos y las sparklines de equity son coherentes.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 6.1 | Setups visibles | Ir al tab Playbook. | Cada setup configurado aparece en una tarjeta con nombre y estadísticas. | P1 |
| 6.2 | Setup health indicator (🟢/🟡/🔴) | Verificar el indicador de salud en cada tarjeta. | Setup con buen Win Rate y >5 trades muestra 🟢. Setup con bajo Win Rate muestra 🔴. Setup con <5 trades muestra ⚪ (datos insuficientes). | P1 |
| 6.3 | Sparklines coherentes | Verificar la sparkline de equity en cada setup. | La tendencia general (subida/bajada) es coherente con si el setup es ganador o perdedor en el período. | P1 |
| 6.4 | Datos correctos en sparkline | Para un setup con 5+ trades, confirmar que la sparkline muestra al menos 5 puntos. | La sparkline no está vacía ni plana si hay trades. | P1 |
| 6.5 | Setup sin trades | Setup sin ningún trade asignado. | Muestra estado vacío o "Sin datos" en lugar de crash. | P2 |
| 6.6 | Click en setup navega al Playbook | Hacer clic en una tarjeta de setup en el tab Playbook del Dashboard. | Navega a `/playbook` o abre el detalle del setup. | P2 |

---

## 7. Trades — Lista y KPI Strip

**Objetivo:** Verificar que la lista de trades carga correctamente, el KPI strip refleja todos los trades (no paginados) y los filtros funcionan.

**Dependencias:** 10+ trades registrados.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 7.1 | KPI Strip carga | Ir a `/trades`. | El KPI strip muestra Net P&L, Win Rate, Avg R, Peor Día, Total Trades. No hay NaN ni undefined. | P0 |
| 7.2 | "Peor Día" (no "Drawdown") | Verificar la etiqueta del cuarto KPI. | Dice "Peor día" (no "Drawdown"). Muestra el P&L del peor día como número negativo. | P1 |
| 7.3 | Win Rate consistente con dashboard | Comparar el Win Rate de `/trades` con el del dashboard en el mismo período. | Deben coincidir. | P0 |
| 7.4 | Lista de trades visible | Confirmar que la tabla de trades muestra filas con fecha, símbolo, P&L y tipo. | Datos visibles. No hay columnas vacías sin justificación. | P0 |
| 7.5 | Skeleton durante carga | Con red lenta, observar que se muestran filas skeleton. | `SkeletonTableRows` visible durante la carga. No aparece pantalla en blanco. | P1 |
| 7.6 | Empty state con cuenta vacía | Acceder con cuenta sin trades. | Se muestra el estado vacío con mensaje y botón "Registrar trade". No hay tabla vacía silenciosa. | P1 |
| 7.7 | Selección de trade | Hacer clic en una fila de la tabla. | El panel de detalle del trade se abre a la derecha (o como drawer en móvil). | P1 |
| 7.8 | KPIs calculados sobre todos los trades | Con 200+ trades, verificar que el total de trades en el KPI strip coincide con el recuento real (no truncado a 50). | TASK-001 fix: los KPIs deben usar todos los datos. | P0 |
| 7.9 | rMultiple no nulo en trades CSV | Importar trades desde CSV. Ver el rMultiple en la columna o detalle. | El rMultiple no es `null` ni `—` para trades con stop loss definido. | P1 |

---

## 8. Trades — Registrar Trade

**Objetivo:** Verificar que el formulario de registro recoge todos los campos obligatorios, valida correctamente y guarda el trade.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 8.1 | Abre el modal | Pulsar "Nuevo Trade" (o "+" en la topbar). | El modal de registro se abre sin error. | P1 |
| 8.2 | Campos obligatorios | Intentar guardar sin rellenar Símbolo, Fecha o P&L. | Se muestran errores de validación. No se guarda el trade. | P1 |
| 8.3 | Guardar trade válido | Rellenar todos los campos obligatorios. Pulsar guardar. | El trade aparece en la lista. El KPI strip se actualiza. Aparece un toast de éxito. | P0 |
| 8.4 | Asignar cuenta | Verificar que el selector de cuenta muestra las cuentas activas. | Solo aparecen cuentas en estado ACTIVE o PAUSED (no INACTIVE). | P1 |
| 8.5 | Asignar setup | Verificar que el selector de setup muestra los setups configurados en el Playbook. | Lista de setups coherente con los existentes. | P1 |
| 8.6 | Tags (custom tags) | Añadir tags al trade. Verificar que se pueden agregar tags personalizados. | Los tags se guardan y aparecen en el detalle del trade. Límite de 20 tags; cada tag máximo 30 caracteres. | P1 |
| 8.7 | Tag vacío rechazado | Intentar añadir un tag de cadena vacía. | No se agrega. Se muestra validación o se ignora silenciosamente. | P2 |
| 8.8 | planNotes (notas de pre-trade) | Rellenar el campo "Notas de planificación" con texto. | Se guarda y aparece en el detalle del trade. Límite de 500 caracteres. | P2 |
| 8.9 | Campos de psicología | Seleccionar una emoción antes del trade y una confianza (1-5). | Se guardan correctamente. Aparecen en el detalle del trade. | P2 |
| 8.10 | Toast en error de guardado | Simular un error de red. Intentar guardar. | Se muestra un toast de error descriptivo. El modal no se cierra. | P1 |
| 8.11 | `inputmode="decimal"` en campos de precio | En móvil, tocar los campos de precio (Entry, Stop Loss, etc.). | El teclado numérico con decimales aparece automáticamente en iOS/Android. | P2 |

---

## 9. Trades — Detalle de Trade

**Objetivo:** Verificar que el panel de detalle muestra toda la información correctamente, incluyendo campos de psicología y notas.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 9.1 | P&L hero correcto | Seleccionar un trade. Ver el valor de P&L en el encabezado. | El P&L coincide con el valor en la tabla de la lista. | P0 |
| 9.2 | rMultiple visible | Seleccionar un trade con stop loss definido. | El rMultiple aparece calculado. No es `null`. | P1 |
| 9.3 | Tags visibles | Trade con tags asignados. | Los tags aparecen en el panel. | P1 |
| 9.4 | Psicología visible | Trade con emoción y confianza definidas. | Se muestran la emoción (emoji + nombre), confianza (X/5) y notas pre-trade. | P2 |
| 9.5 | Checklist de setup visible | Trade con setup asignado. | Se muestra el checklist de criterios del setup marcados/desmarcados. | P2 |
| 9.6 | Sección de cuenta | El panel muestra a qué cuenta pertenece el trade. | El nombre de cuenta es correcto y corresponde. | P1 |
| 9.7 | Botón Editar abre modal de edición | Hacer clic en "Editar". | Se abre el modal de edición con todos los campos pre-poblados. | P1 |
| 9.8 | Botón Eliminar con confirmación | Hacer clic en "Eliminar". | Aparece un diálogo de confirmación (Radix Dialog, no `window.confirm()`). | P2 |
| 9.9 | Eliminar borra el trade | Confirmar la eliminación. | El trade desaparece de la lista. El KPI strip se actualiza. Toast de éxito. | P0 |
| 9.10 | AI: Embedding de notas | Trade con notas extensas. Verificar si hay indicador de "notas analizadas" o si el AI coach menciona notas del trade. | Las notas del trade son accesibles para el AI coach a través de embeddings. | P2 |

---

## 10. Trades — Editar Trade

**Objetivo:** Verificar que la edición conserva los datos previos y que los cambios se reflejan inmediatamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 10.1 | Pre-población de campos | Abrir modal de edición. | Todos los campos tienen los valores del trade original. No hay campos vacíos que deberían estar llenos. | P1 |
| 10.2 | Guardar sin cambios | Abrir y cerrar el modal sin modificar nada. | No crea un duplicado ni modifica el trade. | P1 |
| 10.3 | Modificar P&L | Cambiar el P&L a un valor diferente. Guardar. | La tabla y el detalle reflejan el nuevo P&L. El KPI strip se actualiza. | P0 |
| 10.4 | Cambiar setup asignado | Cambiar el setup del trade. Guardar. | El setup actualizado aparece en el detalle y en los filtros. | P1 |
| 10.5 | Añadir/Quitar tags | Modificar los tags. Guardar. | Los tags actualizados aparecen en el detalle. | P1 |
| 10.6 | Validación en edición | Borrar el símbolo y guardar. | Se muestra error de validación. No se guarda. | P1 |

---

## 11. Trades — Importar CSV

**Objetivo:** Verificar que la importación de CSV desde MT4/cTrader funciona correctamente y los campos críticos están calculados.

**Dependencias:** Archivo CSV de exportación de MT4 o cTrader disponible.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 11.1 | Abre modal de importación | Pulsar el botón "Importar CSV". | El modal se abre. Se puede seleccionar archivo. | P1 |
| 11.2 | Importar CSV MT4 válido | Seleccionar un CSV de MT4 con 10 trades. Confirmar la importación. | Los 10 trades aparecen en la lista. Toast de éxito. | P0 |
| 11.3 | rMultiple calculado post-importación | Revisar los trades importados. | El campo rMultiple no es `null` para trades con stop loss en el CSV. | P1 |
| 11.4 | Timezone correcto | Importar trades con timestamps. Verificar que las horas son coherentes con el timezone del trader (no hardcoded "New York"). | Las fechas/horas no son sistemáticamente incorrectas en +/- 1 hora. | P1 |
| 11.5 | CSV malformado | Intentar importar un CSV inválido (headers incorrectos, celdas vacías). | Se muestra un error descriptivo. No se importan datos parciales silenciosamente. | P1 |
| 11.6 | CSV vacío | Importar un CSV con headers pero sin filas de datos. | Se muestra mensaje informativo "Sin trades para importar". | P2 |
| 11.7 | Validación de tamaño de imagen (setup) | Intentar subir una imagen de >5 MB para un setup. | El servidor rechaza la subida con error 400. No se guarda la imagen. | P1 |

---

## 12. Trades — Psicología

**Objetivo:** Verificar que el sistema psicológico (emociones, confianza, flags de comportamiento) captura y muestra los datos correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 12.1 | Registrar emoción pre-trade | Al crear un trade, seleccionar emoción "Ansioso". Guardar. | El trade muestra la emoción en el panel de detalle. | P1 |
| 12.2 | Registrar confianza (1-5) | Seleccionar confianza "4/5". Guardar. | El panel de detalle muestra "Confianza: 4/5". | P1 |
| 12.3 | Flag FOMO | Seleccionar flag "FOMO" en el trade. | El trade aparece etiquetado con el indicador correspondiente. | P2 |
| 12.4 | Flag Revanche (revenge trade) | Registrar un trade con flag "Revanche". | Aparece en el conteo de violaciones en el tab Disciplina. | P1 |
| 12.5 | Planificación pre-trade (planNotes) | Escribir 200 caracteres en planNotes. Guardar. | Las notas aparecen completas en el detalle del trade. | P1 |
| 12.6 | Psicología en tab Disciplina | Ir a Dashboard → Disciplina. Verificar que los flags FOMO/Revenge aparecen en las violaciones. | Los contadores de disciplina incluyen trades con flags psicológicos. | P1 |
| 12.7 | Distribución de emociones | Si hay múltiples trades con diferentes emociones, verificar si existe alguna visualización de distribución de emociones. | Se muestra distribución (si la feature está implementada) o los datos son accesibles via AI coach. | P2 |

---

## 13. Reviews — Tab Semanales

**Objetivo:** Verificar que la lista de reviews semanales carga, los filtros funcionan y el panel de detalle muestra información correcta.

**Dependencias:** 5+ reviews semanales creadas.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 13.1 | Lista de reviews carga | Ir a `/reviews`. Tab "Semanales" activo por defecto. | Se muestran las reviews ordenadas por fecha descendente. No hay errores. | P0 |
| 13.2 | KPI strip en tab semanal | Verificar que el KPI strip (P&L, Win Rate, Discipline Score, semanas revisadas) aparece. | El strip está visible SOLO en el tab "Semanales", no en "Mensuales". | P1 |
| 13.3 | KPI strip NO aparece en tab mensual | Cambiar al tab "Mensuales". | El KPI strip semanal no aparece en el tab mensual. | P1 |
| 13.4 | Filtro de texto/búsqueda | Escribir un término en el campo de búsqueda. | Solo aparecen las reviews que contienen ese término en el contenido o en los tags. | P1 |
| 13.5 | Filtro por outcome | Filtrar por "Win". | Solo se muestran reviews de semanas con P&L positivo. | P1 |
| 13.6 | Filtro por estado (draft/submitted) | Filtrar por "Borrador". | Solo se muestran reviews no enviadas. | P2 |
| 13.7 | Filtro de disciplina | Filtrar por score de disciplina > 70. | Solo se muestran reviews con ese score o superior. | P2 |
| 13.8 | Limpiar filtros | Aplicar filtros. Pulsar "Limpiar filtros". | Todos los filtros se resetean. Se muestran todas las reviews. | P2 |
| 13.9 | URL con filtros persiste | Aplicar un filtro. Copiar la URL. Pegar en nueva pestaña. | Los filtros se mantienen en la URL (query params). La misma vista se carga. | P2 |
| 13.10 | Seleccionar review abre detalle | Hacer clic en una review. | El panel de detalle se abre con toda la información de la review. | P1 |
| 13.11 | Detalle muestra trades de la semana | El panel de detalle muestra los trades de esa semana. | Los trades listados son coherentes con los dates de la review. | P1 |

---

## 14. Reviews — Crear / Editar Review Semanal

**Objetivo:** Verificar que el flujo de creación y edición de reviews semanales guarda correctamente, incluyendo generación de resumen AI.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 14.1 | Crear nueva review | Pulsar "Nueva Review". Seleccionar semana. Rellenar campos. | El modal se abre. Los campos se pueden editar. | P1 |
| 14.2 | Prefill con datos de trades | Al abrir el modal para una semana con trades, verificar si los campos se pre-llenan. | Net P&L y Win Rate se pre-rellenan desde los trades de esa semana. | P1 |
| 14.3 | Guardar como borrador | Guardar sin enviar. | La review aparece con estado "Borrador". No desencadena ninguna acción adicional. | P1 |
| 14.4 | Enviar review | Marcar como "Enviada". Guardar. | El estado cambia a "Enviada". El discipline score se calcula y guarda. | P1 |
| 14.5 | Discipline Score calculado correctamente | Revisar el discipline score guardado. Compararlo con el cálculo manual. | El score coincide con la fórmula: f(execution, learning, adherence) — máximo 100. | P1 |
| 14.6 | Generar resumen AI | Hacer clic en "Generar resumen". | Se llama a la API AI. El resumen aparece en el campo de texto. No hay HTTP 200 en error (debe ser toast rojo si falla). | P1 |
| 14.7 | Error AI con toast | Simular fallo de la API AI (sin clave configurada). Pulsar "Generar resumen". | Se muestra un toast de error descriptivo. No aparece HTML de error en el campo. | P1 |
| 14.8 | Editar review existente | Desde el panel de detalle, pulsar "Editar". | El modal se abre con todos los datos pre-cargados. | P1 |
| 14.9 | Guardar edición | Modificar un campo. Guardar. | Los cambios se reflejan en el panel de detalle. Toast de éxito. | P1 |
| 14.10 | Eliminar review | Desde el panel de detalle, pulsar "Eliminar". | Aparece diálogo de confirmación. Al confirmar, la review desaparece de la lista. Toast de éxito. | P1 |
| 14.11 | Week selector para períodos pasados | Usar el week selector para navegar a una semana de hace 6 meses. | La selección de semana funciona correctamente. No se queda atascado en la semana actual. | P2 |

---

## 15. Reviews — Tab Mensuales

**Objetivo:** Verificar que el tab de reviews mensuales muestra las cards correctamente, la creación y edición funcionan, y el prefill desde reviews semanales es correcto.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 15.1 | Tab Mensuales visible | Ir a `/reviews`. Pulsar tab "Mensuales". | La vista cambia a la lista de reviews mensuales. No hay error. | P1 |
| 15.2 | KPI strip semanal no visible | Confirmar que el KPI strip de datos semanales no aparece en el tab Mensuales. | Sin KPI strip en esta vista. | P1 |
| 15.3 | MonthlyReviewCard visible | Con reviews mensuales creadas, verificar que aparecen las tarjetas. | Cada tarjeta muestra: mes, año, ScoreBadge (verde/amarillo/rojo), temas clave. | P1 |
| 15.4 | ScoreBadge colores correctos | Verificar colores del ScoreBadge. | Score ≥ 75 → verde. Score 50–74 → amarillo. Score < 50 → rojo. Sin score → sin badge. | P2 |
| 15.5 | Botón Editar (hover) visible | Pasar el cursor sobre una tarjeta mensual. | Los botones ✎ (editar) y × (eliminar) se hacen visibles al hacer hover. | P1 |
| 15.6 | Botón Editar abre modal con datos | Pulsar ✎ en una tarjeta. | El modal de edición se abre con los datos de la review. | P1 |
| 15.7 | Crear review mensual | Pulsar "Nueva review mensual". Seleccionar mes y año. | El modal se abre. Los campos están vacíos o pre-rellenados con datos del mes. | P1 |
| 15.8 | Prefill desde reviews semanales | Crear review de un mes que tenga reviews semanales. | Se sugieren automáticamente: disciplineScore promedio (excluyendo scores=0), temas de "qué funcionó", P&L total. | P1 |
| 15.9 | Score 0 excluido del promedio | Mes con 2 weekly reviews: una con score 80 y otra sin score (0). | El overallScore sugerido es 80, no 40. | P1 |
| 15.10 | Tags de temas clave | Añadir tags de "Temas clave" y "Objetivos". Guardar. | Los tags aparecen en la tarjeta mensual. | P2 |
| 15.11 | Eliminar review mensual | Pulsar × en una tarjeta. Confirmar eliminación. | La tarjeta desaparece. Toast de éxito. | P1 |
| 15.12 | Seleccionar tarjeta (toggle) | Hacer clic en una tarjeta. Hacer clic de nuevo. | La tarjeta alterna entre seleccionada (borde de acento) y deseleccionada. El atributo `aria-pressed` cambia. | P2 |

---

## 16. Cuentas (Accounts)

**Objetivo:** Verificar que la gestión de cuentas de trading funciona: creación, visualización de fases, estadísticas y logs.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 16.1 | Lista de cuentas | Ir a `/cuentas`. | Se muestran las cuentas activas del usuario con nombre, tipo y estado. | P0 |
| 16.2 | Skeleton durante carga | Observar el estado de carga. | Se muestran skeleton cards en lugar de spinner de texto. | P1 |
| 16.3 | Empty state sin cuentas | Acceder con un usuario sin cuentas. | Se muestra un estado vacío con CTA para crear la primera cuenta. | P1 |
| 16.4 | Crear cuenta | Pulsar "+". Rellenar nombre y balance inicial. | La cuenta aparece en la lista. Toast de éxito. | P0 |
| 16.5 | Estadísticas de cuenta correctas | Verificar el P&L acumulado y Win Rate en la tarjeta de cuenta. | Los valores son consistentes con los trades de esa cuenta. | P0 |
| 16.6 | Drawdown correcto | Verificar el Drawdown máximo de la cuenta. | Muestra el drawdown máximo desde el balance más alto (ATH), no el drawdown actual. | P1 |
| 16.7 | Archivar cuenta | Pulsar "Archivar" en una cuenta. Confirmar. | La cuenta desaparece de la lista principal. Toast de éxito. El log de auditoría registra el estado anterior correcto (no "INACTIVE→INACTIVE"). | P1 |
| 16.8 | Log de auditoría correcto | Abrir el log de una cuenta que ha sido archivada. | El campo `from` en el evento STATUS_CHANGE refleja el estado previo a archivar (ej. "ACTIVE"), no "INACTIVE". | P1 |
| 16.9 | Paginación de logs | Cuenta con >10 logs de actividad. Verificar que se pueden cargar más. | Hay paginación cursor-based. Los logs no se truncan silenciosamente. | P2 |

---

## 17. Cuentas — Fases y Promoción

**Objetivo:** Verificar que la gestión de fases (Phase 1, 2, Funded) funciona correctamente y que la lógica de promoción evalúa el objetivo correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 17.1 | Fase visible | Verificar que la fase actual de la cuenta es visible. | Se muestra "Phase 1", "Phase 2" o "Funded" en la tarjeta. | P1 |
| 17.2 | Promover fase (objetivo cumplido) | Cuenta que ha superado el objetivo de P&L de la fase. Abrir el modal de promoción. | El modal muestra `objectiveMet = true`. El P&L comparado con el target es correcto. | P0 |
| 17.3 | Promover fase (objetivo no cumplido) | Cuenta con P&L por debajo del target. Abrir el modal de promoción. | El modal muestra `objectiveMet = false`. No es hardcoded. | P0 |
| 17.4 | Log de promoción | Promover una fase. Revisar el log de auditoría. | El evento PHASE_CHANGE tiene `from` = fase anterior y `to` = fase nueva. | P1 |
| 17.5 | Reglas de prop firm | Si la cuenta tiene reglas (max daily loss, max total loss). Verificar que se muestran en el dashboard y en la tarjeta de la cuenta. | Los umbrales se muestran correctamente. El estado (OK/WARNING/BREACH) es coherente con el P&L. | P1 |
| 17.6 | Cambio de estado manual | Cambiar el estado de una cuenta a "PAUSED". Revisar que el estado se actualiza y no aparece en la lista activa por defecto. | Estado actualizado. Toast de éxito. | P2 |

---

## 18. Playbook (Setups)

**Objetivo:** Verificar que la gestión de setups del playbook funciona correctamente: creación, edición, criterios de entrada y versiones.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 18.1 | Lista de setups | Ir a `/playbook`. | Se muestran los setups configurados con nombre, tipo y estadísticas básicas. | P0 |
| 18.2 | Sparklines en cada setup | Verificar que cada setup muestra una pequeña sparkline de equity. | La sparkline muestra la curva de equity del setup con datos reales (no una línea plana). | P1 |
| 18.3 | Health indicator correcto | Setup con buen/mal historial muestra el indicador correcto. | 🟢 = healthy (win rate alto + trade count ≥ 5). 🟡 = warning. 🔴 = critical. ⚪ = datos insuficientes (< 5 trades). | P1 |
| 18.4 | Crear nuevo setup | Pulsar "+". Rellenar nombre, descripción y criterios. Guardar. | El setup aparece en la lista. | P0 |
| 18.5 | Añadir imagen a setup | Subir una imagen PNG < 5 MB para el setup. | La imagen se muestra en el card del setup. | P2 |
| 18.6 | Imagen > 5 MB rechazada | Intentar subir imagen > 5 MB. | El servidor devuelve error. Se muestra mensaje de error. | P1 |
| 18.7 | Editar criterios de entrada | Abrir setup y modificar la descripción o criterios. | Los cambios se guardan. Aparece una nueva versión (snapshot). | P1 |
| 18.8 | Versiones de setup (snapshots) | Setup con múltiples ediciones históricas. | Las versiones anteriores son accesibles. La versión activa es la más reciente. | P2 |
| 18.9 | Edge definition | Verificar campos Expected WR, Expected Avg R, Min R, Max R. | Los campos aceptan valores numéricos y se guardan. | P2 |
| 18.10 | Checklist A+ | Crear checklist de criterios para setup A+. | Los criterios se pueden marcar al registrar un trade. | P2 |
| 18.11 | Eliminar setup | Eliminar un setup sin trades asignados. | El setup desaparece. Toast de éxito. | P2 |
| 18.12 | Eliminar setup con trades | Intentar eliminar un setup que tiene trades asignados. | Se previene la eliminación o se muestra una advertencia clara sobre las consecuencias. | P1 |

---

## 19. Aprendizaje (Learning)

**Objetivo:** Verificar que el sistema de spaced repetition, materiales de aprendizaje y estadísticas de impacto funcionan correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 19.1 | Lista de recursos | Ir a `/aprendizaje`. | Se muestran los recursos de aprendizaje con título, estado y próxima revisión. | P0 |
| 19.2 | Añadir recurso | Pulsar "+". Rellenar título y tipo. Guardar. | El recurso aparece en la lista con estado "Por revisar". | P1 |
| 19.3 | Marcar como revisado | Abrir un recurso. Pulsar "Marcar como revisado". | La fecha de próxima revisión se calcula usando el algoritmo de spaced repetition. | P1 |
| 19.4 | Transición MASTERED→IN_REVIEW | Recurso en estado MASTERED con fecha de revisión vencida. Navegar al listado. | El recurso transiciona a IN_REVIEW solo cuando se accede a él (no solo por listar). No hay transiciones fantasma por cargar la pantalla. | P1 |
| 19.5 | Streak de aprendizaje | Revisar recursos 3 días consecutivos. | La racha incrementa correctamente. Se resetea si pasa un día sin actividad. | P1 |
| 19.6 | Impacto en trades | Si hay vinculación de recursos con trades (tags, setups), verificar el ranking de impacto. | El resource impact ranking muestra recursos ordenados por impacto en resultados de trading. No hay peticiones N+1 (la carga debe ser rápida < 1s). | P1 |
| 19.7 | Editar recurso | Modificar el título o contenido de un recurso. | Los cambios se guardan. | P2 |
| 19.8 | Eliminar recurso | Eliminar un recurso. | El recurso desaparece de la lista. Toast de éxito. | P2 |
| 19.9 | Estadísticas de aprendizaje | Verificar el panel de estadísticas (total recursos, tasa de retención, etc.). | Los números son coherentes con los recursos y su historial de revisiones. | P2 |

---

## 20. Mercados (Markets)

**Objetivo:** Verificar que el seguimiento de mercados funciona: añadir, favoritar, buscar y eliminar mercados.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 20.1 | Lista de mercados | Ir a `/mercados`. | Se muestran los mercados configurados. | P1 |
| 20.2 | Añadir mercado | Pulsar "+". Escribir nombre. Guardar. | El mercado aparece en la lista. | P1 |
| 20.3 | Favoritar mercado | Pulsar el icono de estrella en un mercado. | El mercado se mueve a la sección de favoritos o aparece marcado con estrella. | P2 |
| 20.4 | Buscar mercado | Escribir en el campo de búsqueda. | Se filtran los mercados en tiempo real. | P2 |
| 20.5 | Editar mercado | Pulsar editar en un mercado. Cambiar el nombre. | El nombre se actualiza. | P2 |
| 20.6 | Eliminar mercado | Eliminar un mercado. | El mercado desaparece. Toast de confirmación. | P2 |
| 20.7 | Empty state | Sin mercados configurados. | Se muestra estado vacío con CTA para añadir el primero. | P2 |

---

## 21. Reglas (Rules)

**Objetivo:** Verificar que la gestión de reglas de trading funciona y que las reglas se aplican en el tab Disciplina del dashboard.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 21.1 | Lista de reglas | Ir a `/reglas`. | Se muestran las reglas configuradas. | P1 |
| 21.2 | Añadir regla | Pulsar "+". Rellenar nombre, severidad (mayor/menor) y descripción. Guardar. | La regla aparece en la lista. | P1 |
| 21.3 | Regla mayor vs. menor | Verificar que las reglas tienen diferentes indicadores visuales según su severidad. | Reglas mayores (🔴) y menores (🟡) se distinguen visualmente. | P2 |
| 21.4 | Editar regla | Modificar la descripción de una regla. | Los cambios se guardan. | P2 |
| 21.5 | Eliminar regla | Eliminar una regla. | La regla desaparece. Toast de éxito. | P2 |
| 21.6 | Reglas reflejadas en Disciplina | Ir al Dashboard → Disciplina. Verificar que las violaciones de reglas están alineadas con las reglas configuradas. | Los tipos de violaciones en el tab Disciplina corresponden a las reglas configuradas. | P1 |

---

## 22. Retiros (Withdrawals)

**Objetivo:** Verificar que el registro de retiros funciona y que el historial es correcto.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 22.1 | Lista de retiros | Ir a `/retiros`. | Se muestran los retiros registrados con fecha y monto. | P1 |
| 22.2 | Registrar retiro | Pulsar "+". Rellenar monto, fecha y cuenta. Guardar. | El retiro aparece en la lista. Toast de éxito. | P1 |
| 22.3 | Retiro afecta al balance de cuenta | Registrar un retiro de $500. Verificar el balance en la página de cuentas. | El balance de la cuenta se reduce en $500. | P1 |
| 22.4 | Eliminar retiro | Eliminar un retiro. | El retiro desaparece. El balance de cuenta se restaura. | P1 |
| 22.5 | Monto debe ser positivo | Intentar registrar un retiro con monto 0 o negativo. | Se muestra error de validación. | P2 |
| 22.6 | Empty state | Sin retiros registrados. | Se muestra estado vacío descriptivo. | P2 |

---

## 23. Etiquetas (Tags)

**Objetivo:** Verificar que la gestión de tags personalizados funciona: crear, renombrar, eliminar y fusionar tags.

**URL:** `/etiquetas`

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 23.1 | Lista de tags | Ir a `/etiquetas`. | Se muestran todos los tags usados por el usuario con el conteo de trades. | P1 |
| 23.2 | Renombrar tag | Seleccionar un tag. Pulsar "Renombrar". Ingresar nuevo nombre. Confirmar. | El tag se actualiza en todos los trades donde aparecía. | P1 |
| 23.3 | Nombre duplicado rechazado | Intentar renombrar un tag con el mismo nombre que uno existente. | Se muestra error. No se crea un duplicado. | P1 |
| 23.4 | Eliminar tag | Seleccionar un tag. Pulsar "Eliminar". Confirmar. | El tag desaparece de todos los trades donde aparecía. | P1 |
| 23.5 | Fusionar tags | Seleccionar dos tags similares. Fusionarlos. | Todos los trades de ambos tags quedan con el tag destino. El tag origen desaparece. | P1 |
| 23.6 | Validación de nombres | Intentar crear un tag con más de 30 caracteres. | El campo no acepta más de 30 caracteres (o se muestra error). | P2 |
| 23.7 | Tags disponibles en Trade form | Crear un tag nuevo desde `/etiquetas`. Ir a crear un trade. | El nuevo tag está disponible en el selector de tags del trade. | P1 |

---

## 24. Perfil — Datos Personales

**Objetivo:** Verificar que el perfil del usuario se puede visualizar y editar correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 24.1 | Perfil carga | Ir a `/perfil`. | Se cargan los datos del usuario. Skeleton visible brevemente si es lento. | P0 |
| 24.2 | Nombre visible y editable | El nombre del usuario se muestra y se puede modificar. | Al guardar, el nuevo nombre aparece en el TopBar u otras partes de la UI. | P1 |
| 24.3 | Email visible | El email del usuario se muestra. | El email correcto aparece. No es un campo editable (depende del proveedor de auth). | P2 |
| 24.4 | Base currency | Modificar la moneda base (ej. de USD a EUR). Guardar. | Los P&L en las páginas de trades/dashboard se muestran con el símbolo de la nueva moneda. | P1 |
| 24.5 | Sesiones de trading — duración objetivo | Modificar la duración objetiva de sesión (minutos/semana). Guardar. | El valor se persiste. El goal widget del dashboard refleja este objetivo. | P2 |
| 24.6 | Guardar sin cambios | Pulsar "Guardar" sin modificar nada. | No aparece error. Toast neutral o de éxito. | P2 |
| 24.7 | Validación de datos | Ingresar caracteres inválidos en el campo de nombre (ej. solo espacios). | Se muestra validación. No se guarda el nombre inválido. | P2 |

---

## 25. Perfil — Metas Semanales

**Objetivo:** Verificar que la configuración de metas semanales se guarda y se refleja en el goal widget del dashboard.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 25.1 | Configurar meta de disciplina | Establecer Discipline Goal = 75. Guardar. | El goal widget del dashboard muestra el objetivo con la barra de progreso correspondiente. | P1 |
| 25.2 | Configurar meta de trades semanales | Establecer Weekly Trades Goal = 10. Guardar. | El progress widget muestra "X/10 trades esta semana". | P1 |
| 25.3 | Configurar meta de P&L semanal | Establecer Weekly P&L Goal = 500. Guardar. | El widget muestra progreso hacia el objetivo de P&L. | P1 |
| 25.4 | Configurar meta de tiempo de estudio | Establecer Weekly Goal Minutes = 120 (minutos de aprendizaje). Guardar. | El widget de metas incluye el progreso de tiempo de estudio. | P2 |
| 25.5 | Meta vacía (null) | Borrar un objetivo. Guardar. | El widget deja de mostrar ese objetivo. No muestra "NaN" o errores. | P1 |
| 25.6 | Meta de disciplina entre 0-100 | Intentar ingresar 150 en el campo de disciplina. | El campo se limita a 100 (o se muestra validación). | P2 |
| 25.7 | Reflejo en Dashboard | Después de configurar metas, ir al dashboard. | El GoalProgressWidget muestra las metas configuradas con su progreso actual. | P1 |

---

## 26. Perfil — Apariencia y Tema

**Objetivo:** Verificar que los toggles de tema (light/dark/system) y el color de acento funcionan correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 26.1 | Toggle Light/Dark/System visible | Verificar que el selector de tema tiene 3 opciones. | Botones "Claro", "Oscuro" y "Sistema" visibles. El seleccionado muestra estado activo. | P1 |
| 26.2 | Activar tema oscuro | Pulsar "Oscuro". | La UI cambia a tema oscuro inmediatamente. El cambio se persiste al recargar. | P1 |
| 26.3 | Activar tema claro | Pulsar "Claro". | La UI cambia a tema claro. | P1 |
| 26.4 | Modo "Sistema" | Pulsar "Sistema". Cambiar el tema del SO entre claro y oscuro. | La aplicación sigue automáticamente el tema del SO. | P2 |
| 26.5 | Color de acento | Si hay selector de color de acento, probar al menos 3 colores. | El color seleccionado se aplica en los botones, bordes de acento y elementos destacados. | P2 |
| 26.6 | Persistencia del tema | Cambiar a oscuro. Cerrar pestaña. Abrir de nuevo. | El tema oscuro sigue activo. | P1 |
| 26.7 | Icono de tema en sidebar correcto | Verificar el icono en la barra lateral con cada modo de tema. | El icono refleja el tema activo (sol/luna/automático). No muestra el icono incorrecto. | P2 |

---

## 27. Perfil — Notificaciones

**Objetivo:** Verificar que los toggles de notificaciones se guardan y el sistema de email está configurado.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 27.1 | Toggle de notificaciones visible | Verificar que hay un toggle "Notificaciones por email". | El toggle muestra el estado actual (activado/desactivado). | P2 |
| 27.2 | Activar notificaciones | Activar el toggle. Guardar. | El cambio se persiste. Al recargar, el toggle sigue activado. | P2 |
| 27.3 | Daily loss limit alert | Si la feature está configurada: configurar un límite de pérdida diaria. Ejecutar trades que superen el límite. | Se envía una notificación o email de alerta. (Requiere Resend configurado.) | P1 |
| 27.4 | Email de verificación no enviado silenciosamente | Verificar que los emails del sistema llegan a la bandeja de entrada (no spam). | Emails no en spam. Dominio verificado en Resend. | P2 |

---

## 28. Perfil — Configuración de IA

**Objetivo:** Verificar que la configuración de proveedores de IA (Anthropic, OpenAI, OpenRouter) funciona correctamente: guardar, borrar y probar claves.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 28.1 | Sección de IA visible | Ir a `/perfil`. Buscar sección "Configuración de IA". | Se muestran 3 proveedores: Anthropic, OpenAI, OpenRouter. | P1 |
| 28.2 | Guardar clave Anthropic | Ingresar una clave API válida de Anthropic (sk-ant-...). Guardar. | La clave se guarda. Se muestra solo los últimos 4 caracteres enmascarados. | P1 |
| 28.3 | Clave almacenada encriptada | Verificar que la clave no se transmite en texto plano (revisar network requests). | La clave se envía encriptada o no aparece en plaintext en los headers/body de la request. | P0 |
| 28.4 | Probar conexión | Después de guardar la clave, si hay botón "Probar conexión", pulsarlo. | Se muestra ✅ si la clave es válida o ❌ si es incorrecta. | P1 |
| 28.5 | Clave inválida rechazada | Ingresar una clave con formato inválido (ej. "abc"). Guardar. | Se muestra error de validación de formato. No se guarda. | P1 |
| 28.6 | Borrar clave | Pulsar el botón de borrar (rojo/danger) en la clave guardada. Confirmar. | La clave desaparece. El proveedor queda sin configurar. | P1 |
| 28.7 | AI Coach disponible con clave | Después de guardar una clave de Anthropic, abrir el AI Coach. Enviar un mensaje. | El AI Coach responde. No aparece error "NO_API_KEY". | P0 |
| 28.8 | AI Coach sin clave muestra error claro | Sin ninguna clave configurada, abrir el AI Coach. Enviar un mensaje. | Se muestra un error descriptivo pidiendo configurar la clave en el perfil. No aparece error técnico crudo. | P1 |
| 28.9 | Rate limiting en AI | Enviar 6+ mensajes consecutivos al AI Coach muy rápido. | El 6to mensaje recibe respuesta de rate limit (HTTP 429 con tiempo de espera). No hay errores 500. | P1 |

---

## 29. Perfil — Exportar y Cerrar Sesión

**Objetivo:** Verificar que la exportación de datos y el cierre de sesión funcionan correctamente.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 29.1 | Exportar datos | Pulsar "Exportar datos". | Se descarga un archivo JSON con los datos del usuario. Toast de éxito. | P1 |
| 29.2 | Contenido del JSON exportado | Abrir el archivo exportado. | Contiene trades, reviews, playbook, cuentas y preferencias. No hay campos `null` inexplicables o datos de otro usuario. | P1 |
| 29.3 | Cerrar sesión | Pulsar "Cerrar sesión". | Se elimina la sesión. Redirige a `/login`. No se puede acceder al dashboard sin nuevo login. | P0 |
| 29.4 | Cerrar sesión limpia localStorage | Después del cierre de sesión, verificar si hay datos sensibles en localStorage. | No se almacenan claves API ni tokens en localStorage post-cierre de sesión. | P0 |

---

## 30. AI Coach (Drawer)

**Objetivo:** Verificar que el chat de AI Coach funciona, transmite respuestas en streaming, maneja errores correctamente y tiene contexto del trader.

**Dependencias:** Clave API de Anthropic configurada en el perfil. 10+ trades registrados para contexto.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 30.1 | Drawer abre | Pulsar el botón del AI Coach (ícono de chat). | El drawer se abre con el mensaje de bienvenida. El input está enfocado. | P1 |
| 30.2 | Mensaje inicial de bienvenida | Verificar el mensaje inicial. | Aparece un mensaje de bienvenida del coach. No hay pantalla en blanco ni errores. | P1 |
| 30.3 | Enviar mensaje básico | Escribir "¿Cuál es mi Win Rate esta semana?" y pulsar enviar. | El coach responde con información específica del usuario (no genérica). La respuesta llega en streaming (texto aparece progresivamente). | P0 |
| 30.4 | Respuesta en streaming | Observar cómo llega la respuesta. | El texto aparece gradualmente (streaming), no de golpe tras un spinner. Se muestra un indicador de "pensando" mientras espera. | P1 |
| 30.5 | Respuesta usa datos reales del trader | Preguntar "¿Qué setup me ha funcionado mejor este mes?". | La respuesta menciona setups reales del usuario, no ejemplos genéricos. | P1 |
| 30.6 | Contexto de trades (embeddings) | Preguntar sobre el contexto de un trade específico con notas. | El coach puede referenciar las notas del trade si los embeddings están activos. | P2 |
| 30.7 | Error sin clave API | Sin clave configurada, intentar enviar un mensaje. | Se muestra el error `NO_API_KEY` con mensaje claro que pide configurar la clave en el perfil. | P1 |
| 30.8 | Historial de conversación persiste | Enviar 3 mensajes. Cerrar y reabrir el drawer. | El historial se mantiene en la misma sesión. (Si se recarga la página, se puede aceptar que se limpie.) | P2 |
| 30.9 | Cerrar drawer | Pulsar "✕" para cerrar. | El drawer se cierra. La aplicación sigue funcionando normalmente. | P1 |
| 30.10 | Mensaje muy largo | Enviar un mensaje de 2000+ caracteres. | El mensaje se envía sin error. El coach responde. No hay truncamiento silencioso ni error 413. | P2 |
| 30.11 | Rate limit visible | Si se supera el rate limit, verificar la respuesta. | Se muestra un mensaje claro "Demasiadas solicitudes. Espera X segundos." No hay error 500 crudo. | P1 |

---

## 31. Mobile — Responsive General

**Objetivo:** Verificar que el layout es usable en pantallas de 375px (iPhone SE) y 390px (iPhone 14/15).

**Dispositivos de prueba:** iPhone SE (375px), iPhone 14 (390px), Samsung Galaxy S23 (360px). Emulador del navegador con DevTools aceptable.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 31.1 | Dashboard en 375px | Abrir `/dashboard` en 375px. | El layout no desborda horizontalmente. Los KPI cards son legibles. No hay overflow horizontal. | P1 |
| 31.2 | KPI strip en móvil | Verificar el KPI strip en pantalla estrecha. | Las cards hacen wrap o scroll horizontal controlado. Ningún valor es cortado. | P1 |
| 31.3 | Tabla de trades en móvil | Abrir `/trades` en 375px. | La tabla es scrolleable horizontalmente de forma controlada o se adapta a tarjetas. No desborda el layout. | P1 |
| 31.4 | Sidebar/navegación en móvil | Verificar la navegación lateral. | Hay un menú hamburguesa o navegación colapsada. No hay sidebar de 240px que ocupe toda la pantalla. | P1 |
| 31.5 | Modal de nuevo trade en móvil | Abrir el modal de registro de trade en móvil. | El modal ocupa el 100% de la pantalla o es un bottom sheet. Es usable con el pulgar. | P1 |
| 31.6 | Teclado numérico en precio | En iOS, tocar el campo "Entry Price". | El teclado numérico con decimales aparece (no el teclado alfabético). | P2 |
| 31.7 | AI Coach drawer en móvil | Abrir el AI Coach drawer en móvil. | El drawer ocupa la pantalla completa o al menos 80% de altura. El input es accesible sobre el teclado virtual. | P1 |
| 31.8 | Reviews en móvil | Abrir `/reviews` en móvil. | Las cards de reviews son legibles. Los botones de hover (editar/eliminar) son accesibles via tap en móvil. | P1 |
| 31.9 | Perfil en móvil | Abrir `/perfil` en móvil. | Los campos de formulario tienen tamaño de tap target ≥ 44px. El scroll funciona sin problemas. | P2 |
| 31.10 | Texto legible en todo el layout | Verificar que no hay texto de tamaño < 11px en flujos críticos. | El texto es legible sin zoom. No hay texto pixelado. | P2 |

---

## 32. Mobile — Navegación y Paneles

**Objetivo:** Verificar que la navegación entre páginas y el back button funciona correctamente en dispositivos móviles.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 32.1 | Botón "Volver" en panel de detalle | En `/trades` móvil, seleccionar un trade para abrir el detalle. Pulsar el botón "Volver" del detalle. | Vuelve a la lista de trades. No usa `window.history.go(-1)` que podría salir de la app. | P1 |
| 32.2 | Botón "Volver" en review detail | En `/reviews` móvil, abrir una review. Pulsar "Volver". | Vuelve a la lista de reviews. | P1 |
| 32.3 | Botón "Volver" en account detail | En `/cuentas` móvil, abrir una cuenta. Pulsar "Volver". | Vuelve a la lista de cuentas. | P1 |
| 32.4 | Gesto swipe back (iOS) | En iOS, usar el gesto de swipe desde el borde izquierdo en un panel de detalle. | El gesto navega correctamente hacia atrás sin romper el estado de la app. | P2 |
| 32.5 | Navegación con tabs en dashboard móvil | Cambiar entre tabs del dashboard (Portfolio, Operador, Disciplina, Playbook) en móvil. | Los tabs son accesibles. El cambio de tab no requiere scroll horizontal excesivo. | P1 |
| 32.6 | Scroll en listas largas | Scroll a través de una lista de 50+ trades en móvil. | El scroll es fluido. No hay saltos ni congelamiento de la UI. | P1 |

---

## 33. Configuración del Sistema

**Objetivo:** Verificar que la configuración del entorno (variables de entorno, servicios externos) está correctamente configurada.

**Nota:** Esta sección requiere acceso al entorno de staging/producción o a los logs del servidor.

| # | Caso de Prueba | Pasos | Resultado Esperado | Severidad si Falla |
|---|----------------|-------|--------------------|--------------------|
| 33.1 | Variables de entorno presentes | Revisar el archivo `.env` o la configuración del entorno de despliegue. | Todas las variables de `.env.example` están definidas: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_KEY_ENCRYPTION_SECRET` (hex de 64 chars), `CRON_SECRET`. | P0 |
| 33.2 | `AI_KEY_ENCRYPTION_SECRET` es hex de 64 chars | Verificar el valor de `AI_KEY_ENCRYPTION_SECRET`. | Exactamente 64 caracteres hexadecimales (32 bytes). Si es más corta o no es hex, el cifrado de claves AI falla silenciosamente. | P0 |
| 33.3 | Supabase RLS activo | Verificar en Supabase Dashboard que Row Level Security está activo en todas las tablas. | Tablas: trades, accounts, weekly_reviews, monthly_reviews, trade_tags, user_ai_config, user_preferences, goals — todas con RLS enabled. | P0 |
| 33.4 | Rate limiting en AI endpoints | Enviar 10 requests seguidas al AI Coach. | La respuesta 6+ devuelve HTTP 429 con header `Retry-After`. | P1 |
| 33.5 | CRON_SECRET no vacío | Intentar llamar al endpoint CRON sin el header correcto. | Devuelve 401. No ejecuta el cron job. | P0 |
| 33.6 | Upstash Redis (si configurado) | Si `UPSTASH_REDIS_REST_URL` está configurado, verificar que el rate limiter distribuido funciona. | Los límites se aplican cross-instancia, no solo por proceso Node. | P1 |
| 33.7 | Logs estructurados | Verificar los logs de producción (Vercel Functions logs). | Los logs tienen formato JSON con `{timestamp, level, message, context}`. No hay `console.log` en texto plano de errores de producción. | P2 |
| 33.8 | Resend email domain verificado | Enviar un email de prueba (daily loss alert o summary). | El email llega a la bandeja de entrada (no spam). No hay bounce. | P2 |
| 33.9 | Build sin errores de TypeScript | Ejecutar `pnpm build` en el entorno. | Build exitoso. Cero errores TypeScript. Cero errores Vercel. | P0 |
| 33.10 | Tests CI passing | Ver el resultado del último GitHub Actions run. | 479 tests passing (o más si hay nuevos). 0 tests failed. | P1 |
| 33.11 | Turbopack warnings (non-blocking) | Revisar los logs de build de Vercel. | Puede haber warnings de `@upstash/*` — esto es aceptable. No debe haber errores de módulos no encontrados. | P3 |
| 33.12 | Webhook secret configurado | Configurar `SUPABASE_WEBHOOK_SECRET`. Enviar una request sin el header. | Devuelve 503 con `reason: "WEBHOOK_NOT_CONFIGURED"` (sin clave) o 401 (clave incorrecta). Nunca 200 por defecto. | P1 |

---

## Resumen de Casos por Severidad

| Sección | P0 | P1 | P2 | P3 | Total |
|---------|----|----|----|----|-------|
| Login | 2 | 3 | 2 | 0 | 7 |
| Dashboard General | 1 | 4 | 4 | 1 | 10 |
| Tab Portfolio | 3 | 4 | 2 | 1 | 10 |
| Tab Operador | 1 | 3 | 2 | 0 | 6 |
| Tab Disciplina | 0 | 3 | 4 | 0 | 7 |
| Tab Playbook | 0 | 3 | 3 | 0 | 6 |
| Trades — Lista/KPIs | 3 | 3 | 2 | 0 | 8 |
| Trades — Registrar | 1 | 5 | 4 | 0 | 10 |
| Trades — Detalle | 2 | 4 | 3 | 0 | 9 |
| Trades — Editar | 1 | 4 | 1 | 0 | 6 |
| Trades — CSV | 1 | 5 | 1 | 0 | 7 |
| Trades — Psicología | 0 | 5 | 2 | 0 | 7 |
| Reviews — Semanales | 1 | 6 | 4 | 0 | 11 |
| Reviews — Crear/Editar | 0 | 8 | 3 | 0 | 11 |
| Reviews — Mensuales | 0 | 8 | 4 | 0 | 12 |
| Cuentas | 3 | 4 | 2 | 0 | 9 |
| Cuentas — Fases | 2 | 3 | 1 | 0 | 6 |
| Playbook | 1 | 6 | 5 | 0 | 12 |
| Aprendizaje | 0 | 5 | 4 | 0 | 9 |
| Mercados | 0 | 1 | 6 | 0 | 7 |
| Reglas | 0 | 3 | 3 | 0 | 6 |
| Retiros | 0 | 3 | 3 | 0 | 6 |
| Etiquetas | 0 | 5 | 2 | 0 | 7 |
| Perfil — Datos | 1 | 2 | 4 | 0 | 7 |
| Perfil — Metas | 0 | 4 | 3 | 0 | 7 |
| Perfil — Apariencia | 0 | 3 | 4 | 0 | 7 |
| Perfil — Notificaciones | 0 | 1 | 3 | 0 | 4 |
| Perfil — IA | 2 | 5 | 2 | 0 | 9 |
| Perfil — Exportar | 2 | 1 | 1 | 0 | 4 |
| AI Coach | 1 | 5 | 4 | 0 | 10 |
| Mobile — Responsive | 0 | 6 | 4 | 0 | 10 |
| Mobile — Navegación | 0 | 5 | 1 | 0 | 6 |
| Config Sistema | 5 | 5 | 3 | 1 | 14 |
| **TOTAL** | **33** | **147** | **107** | **3** | **290** |

---

## Priorización de Ejecución

Para una auditoría en tiempo limitado, ejecutar en este orden:

### Bloque 1 — Crítico (P0): ~2 horas
Todos los casos P0 de las secciones: Login, Dashboard, Trades, Cuentas, Perfil-IA, Perfil-Exportar, Configuración del Sistema.

### Bloque 2 — Funcionalidad Core (P1 críticos): ~4 horas
- Reviews (semanales y mensuales) — flujo completo create/edit/delete
- AI Coach — envío de mensajes, errores, rate limiting
- Discipline Score — coherencia entre dashboard y reviews
- Win Rate — consistencia entre todas las pantallas
- Seguridad — IDOR, rate limiting, auth guards

### Bloque 3 — UX y Consistencia (P1 + P2 restantes): ~3 horas
- Psicología de trades
- Playbook y sparklines
- Etiquetas y gestión
- Perfil completo
- Mobile responsive

### Bloque 4 — Edge Cases (P2 + P3): ~2 horas
- Empty states
- Error handling en red lenta
- Accesibilidad ARIA
- Configuración de sistema

---

## Métricas de Éxito de la Auditoría

| Resultado | Umbral |
|-----------|--------|
| Sin fallos P0 | 0 fallos P0 para aprobar |
| Fallos P1 | ≤ 3 fallos P1 para aprobar (condicional) |
| Fallos P2 | Documentar y deferir a Sprint 9 |
| Fallos P3 | Documentar como backlog |
| Regresión de métricas (Win Rate, P&L) | **Cero tolerancia** — cualquier inconsistencia de datos es P0 automático |
