# Manual QA Results — Trading Journal v2

**Plan de referencia:** `docs/MANUAL_QA_TEST_PLAN.md`  
**Versión del producto:** `<!-- ej: v2.8.0 o hash de commit -->`  
**Entorno:** `<!-- staging / producción / local -->`  
**URL probada:** `<!-- https://... -->`  
**Fecha de ejecución:** `<!-- YYYY-MM-DD -->`  
**Ejecutor(es):** `<!-- nombre / equipo -->`  
**Navegador(es):** `<!-- ej: Chrome 125, Safari 17, Firefox 126 -->`  
**Dispositivos:** `<!-- ej: MacBook Pro 16" + iPhone 15 Pro -->`  
**Directorio de capturas:** `docs/qa/screenshots/`

---

## Resumen Ejecutivo

> Completar al finalizar la auditoría.

| Métrica | Valor |
|---------|-------|
| Casos ejecutados | — / 290 |
| Casos pasados | — |
| Hallazgos P0 | — |
| Hallazgos P1 | — |
| Hallazgos P2 | — |
| Hallazgos P3 | — |
| Estado general | `⏳ EN PROGRESO` / `✅ APROBADO` / `❌ RECHAZADO` |

**Criterio de aprobación:**
- ✅ 0 hallazgos P0
- ✅ ≤ 3 hallazgos P1
- ✅ Ninguna inconsistencia de datos (Win Rate, P&L, Discipline Score)

**Decisión:**  
`<!-- APROBADO / RECHAZADO / CONDICIONAL — justificación en 1–2 líneas -->`

---

## Convención de IDs

```
QA-NNN          Hallazgo genérico            QA-001, QA-002 ...
QA-NNN-SCREEN   Con prefijo de pantalla      QA-001-DASH, QA-002-TRD
```

**Estados válidos:**

| Estado | Significado |
|--------|-------------|
| `ABIERTO` | Hallazgo confirmado, sin acción correctiva todavía |
| `EN REVISIÓN` | Desarrollador investigando o workaround en curso |
| `RESUELTO` | Fix desplegado, pendiente verificación |
| `VERIFICADO` | Fix confirmado por ejecutor QA |
| `DIFERIDO` | Aceptado como deuda técnica o backlog futuro |
| `NO REPRODUCIBLE` | No se pudo reproducir tras 3 intentos; documentado |
| `DUPLICADO` | Mismo root cause que otro hallazgo; referencia al original |

---

## Convención de Capturas

Nombrar archivos siguiendo el patrón:

```
docs/qa/screenshots/<ID>-<pantalla>-<descripcion-corta>.<ext>
```

Ejemplos:
```
docs/qa/screenshots/QA-001-dashboard-nan-win-rate.png
docs/qa/screenshots/QA-002-trades-boton-invisible-hover.mp4
docs/qa/screenshots/QA-003-login-redirect-roto-before.png
docs/qa/screenshots/QA-003-login-redirect-roto-after.png
```

Para comparativas antes/después usar sufijos `-before` / `-after`.  
Para videos de reproducción usar `.mp4` o `.webm`.

---

## Registro de Hallazgos

> Añadir una entrada por cada fallo encontrado. Los casos que pasan **no** requieren entrada individual — registrar solo el recuento en la tabla de resultados por pantalla (§ siguiente).

---

### QA-001 — EJEMPLO P0

| Campo | Detalle |
|-------|---------|
| **ID** | QA-001 |
| **Caso de referencia** | 3.2 (Dashboard — Tab Portfolio) |
| **Pantalla** | Dashboard → Tab Portfolio |
| **Severidad** | **P0** |
| **Descripción** | El Win Rate mostrado en el KPI strip (67 %) es inconsistente con el Win Rate calculado en la tabla de trades (52 %). Discrepancia de 15 pp indica bug en el cálculo de métricas del dashboard. |
| **Pasos para reproducir** | 1. Login con cuenta que tenga 20+ trades cerrados. <br>2. Abrir `/dashboard`. <br>3. Leer el valor de "Win Rate" en el KPI strip. <br>4. Navegar a `/trades`. <br>5. Contar manualmente trades ganadores vs. total de la misma semana. |
| **Resultado esperado** | Win Rate idéntico en dashboard y en lista de trades para el mismo período seleccionado. |
| **Resultado actual** | Dashboard muestra 67 %. Cálculo manual de trades: 10 ganadores / 19 totales = 52.6 %. |
| **Evidencia** | `docs/qa/screenshots/QA-001-dashboard-winrate-67.png` <br>`docs/qa/screenshots/QA-001-trades-winrate-manual-52.png` |
| **Estado** | `ABIERTO` |
| **Notas adicionales** | Posible causa: el dashboard excluye trades parcialmente cerrados del denominador. Reproducible en Chrome y Safari. No reproducible con cuenta sin trades abiertos. |

---

### QA-002 — EJEMPLO P1

| Campo | Detalle |
|-------|---------|
| **ID** | QA-002 |
| **Caso de referencia** | 14.3 (Reviews — Crear / Editar Review Semanal) |
| **Pantalla** | Reviews → Crear Review Semanal |
| **Severidad** | **P1** |
| **Descripción** | Al guardar una review semanal con el campo "Discipline Score" vacío, el formulario se cierra sin mostrar error y la review se crea con `disciplineScore: null`. El campo debería requerir un valor entre 0 y 100. |
| **Pasos para reproducir** | 1. Navegar a `/reviews`. <br>2. Pulsar "Nueva Review" o el botón "+" en cualquier semana. <br>3. Rellenar todos los campos excepto "Discipline Score". <br>4. Pulsar "Guardar". |
| **Resultado esperado** | Validación inline o toast de error: "El campo Discipline Score es obligatorio". El formulario no se cierra. |
| **Resultado actual** | El modal se cierra. La review aparece en la lista con una puntuación de "—" o 0. En el prefill de la review mensual correspondiente, esta semana queda excluida del cálculo del promedio. |
| **Evidencia** | `docs/qa/screenshots/QA-002-review-form-empty-discipline.png` <br>`docs/qa/screenshots/QA-002-review-created-null-score.png` |
| **Estado** | `ABIERTO` |
| **Notas adicionales** | Comportamiento secundario: si el usuario crea todas las reviews del mes con score null, la review mensual muestra `overallScore: null` — consistente con la lógica del router, pero el formulario debería validar. |

---

### QA-003 — EJEMPLO P2

| Campo | Detalle |
|-------|---------|
| **ID** | QA-003 |
| **Caso de referencia** | 26.1 (Perfil — Apariencia y Tema) |
| **Pantalla** | Perfil → Apariencia |
| **Severidad** | **P2** |
| **Descripción** | Al cambiar el tema a "Oscuro", el selector de color de la sección "Apariencia" permanece con fondo blanco durante ~500 ms antes de aplicar el nuevo tema. El flash es perceptible en pantallas de alta frecuencia de actualización. |
| **Pasos para reproducir** | 1. Estar en tema "Claro". <br>2. Navegar a `/perfil` → sección "Apariencia". <br>3. Pulsar el toggle "Modo Oscuro". <br>4. Observar la sección del selector de color inmediatamente. |
| **Resultado esperado** | La transición de tema es inmediata (< 50 ms) sin flash visible. |
| **Resultado actual** | Flash blanco de ~500 ms antes de que el tema oscuro se aplique al selector. El resto de la página cambia instantáneamente. |
| **Evidencia** | `docs/qa/screenshots/QA-003-theme-flash.mp4` |
| **Estado** | `DIFERIDO` |
| **Notas adicionales** | Solo reproducible en monitor 120 Hz+. No afecta funcionalidad ni datos. Diferir a Sprint 9 como mejora cosmética. |

---

### QA-004 — EJEMPLO P3

| Campo | Detalle |
|-------|---------|
| **ID** | QA-004 |
| **Caso de referencia** | 2.9 (Dashboard — `aria-busy` durante carga) |
| **Pantalla** | Dashboard |
| **Severidad** | **P3** |
| **Descripción** | El elemento `<main>` no tiene el atributo `aria-busy="true"` durante la carga inicial del dashboard. El atributo está presente en el HTML estático pero no se actualiza dinámicamente durante el fetch de datos. |
| **Pasos para reproducir** | 1. Abrir DevTools → Inspector de elementos. <br>2. Navegar a `/dashboard` con conexión lenta (throttle a "Slow 3G"). <br>3. Observar el atributo `aria-busy` del elemento `<main>` durante el skeleton. |
| **Resultado esperado** | `<main aria-busy="true">` mientras los datos cargan; `<main aria-busy="false">` tras la carga. |
| **Resultado actual** | `<main>` siempre tiene `aria-busy="false"` independientemente del estado de carga. |
| **Evidencia** | `docs/qa/screenshots/QA-004-main-aria-busy-devtools.png` |
| **Estado** | `ABIERTO` |
| **Notas adicionales** | Impacto solo en lectores de pantalla. No bloquea usuarios sighted. |

---

### QA-005 — EJEMPLO NO REPRODUCIBLE

| Campo | Detalle |
|-------|---------|
| **ID** | QA-005 |
| **Caso de referencia** | 11.4 (Trades — Importar CSV) |
| **Pantalla** | Trades → Importar CSV |
| **Severidad** | **P1** (reportado por usuario) |
| **Descripción** | Usuario reportó que la importación de CSV falla para archivos > 1 MB. Reportado en Firefox 125. |
| **Pasos para reproducir** | 1. Navegar a `/trades`. <br>2. Pulsar "Importar CSV". <br>3. Seleccionar un archivo .csv de 1.2 MB con 500+ trades. <br>4. Pulsar "Importar". |
| **Resultado esperado** | Trades importados o mensaje de error claro sobre el límite de tamaño. |
| **Resultado actual** | No se pudo reproducir en Chrome 125, Firefox 126, Safari 17 con archivos de 1.1 MB y 1.5 MB. La importación completa en todos los casos. |
| **Evidencia** | `docs/qa/screenshots/QA-005-csv-import-success-1mb.png` |
| **Estado** | `NO REPRODUCIBLE` |
| **Notas adicionales** | Posiblemente problema específico del entorno del usuario (versión de Firefox 125, extensiones activas). Solicitar más información al usuario que reportó. |

---

<!-- ================================================================ -->
<!-- PLANTILLA VACÍA — copiar y pegar para cada nuevo hallazgo         -->
<!-- ================================================================ -->

### QA-NNN — [TÍTULO CORTO]

| Campo | Detalle |
|-------|---------|
| **ID** | QA-NNN |
| **Caso de referencia** | N.N (Pantalla — Caso) |
| **Pantalla** | |
| **Severidad** | **P?** |
| **Descripción** | |
| **Pasos para reproducir** | 1. <br>2. <br>3. |
| **Resultado esperado** | |
| **Resultado actual** | |
| **Evidencia** | `docs/qa/screenshots/QA-NNN-pantalla-descripcion.png` |
| **Estado** | `ABIERTO` |
| **Notas adicionales** | |

---

## Resultados por Pantalla

> Completar fila por fila durante la ejecución. "Ejecutados" = casos intentados; "OK" = casos pasados; "Fail" = hallazgos abiertos (referenciar IDs).

| # | Pantalla | Total casos | Ejecutados | OK | Fail | IDs hallazgos | Notas |
|---|----------|------------|------------|-----|------|---------------|-------|
| 1 | Login / Autenticación | 7 | | | | | |
| 2 | Dashboard — General | 9 | | | | | |
| 3 | Dashboard — Tab Portfolio | 10 | | | | | |
| 4 | Dashboard — Tab Operador | 6 | | | | | |
| 5 | Dashboard — Tab Disciplina | 7 | | | | | |
| 6 | Dashboard — Tab Playbook | 6 | | | | | |
| 7 | Trades — Lista y KPI Strip | 8 | | | | | |
| 8 | Trades — Registrar Trade | 10 | | | | | |
| 9 | Trades — Detalle de Trade | 9 | | | | | |
| 10 | Trades — Editar Trade | 6 | | | | | |
| 11 | Trades — Importar CSV | 7 | | | | | |
| 12 | Trades — Psicología | 7 | | | | | |
| 13 | Reviews — Tab Semanales | 11 | | | | | |
| 14 | Reviews — Crear / Editar Review Semanal | 11 | | | | | |
| 15 | Reviews — Tab Mensuales | 12 | | | | | |
| 16 | Cuentas (Accounts) | 9 | | | | | |
| 17 | Cuentas — Fases y Promoción | 6 | | | | | |
| 18 | Playbook (Setups) | 12 | | | | | |
| 19 | Aprendizaje (Learning) | 9 | | | | | |
| 20 | Mercados (Markets) | 7 | | | | | |
| 21 | Reglas (Rules) | 6 | | | | | |
| 22 | Retiros (Withdrawals) | 6 | | | | | |
| 23 | Etiquetas (Tags) | 7 | | | | | |
| 24 | Perfil — Datos Personales | 7 | | | | | |
| 25 | Perfil — Metas Semanales | 7 | | | | | |
| 26 | Perfil — Apariencia y Tema | 7 | | | | | |
| 27 | Perfil — Notificaciones | 4 | | | | | |
| 28 | Perfil — Configuración de IA | 9 | | | | | |
| 29 | Perfil — Exportar y Cerrar Sesión | 4 | | | | | |
| 30 | AI Coach (Drawer) | 10 | | | | | |
| 31 | Mobile — Responsive General | 10 | | | | | |
| 32 | Mobile — Navegación y Paneles | 6 | | | | | |
| 33 | Configuración del Sistema | 14 | | | | | |
| | **TOTAL** | **290** | | | | | |

---

## Verificación de Consistencia de Datos

> Estos ítems requieren comparación cruzada entre pantallas. Rellenar durante o después del Bloque 2.

| Métrica | Valor en Dashboard | Valor en Trades | Valor en Reviews | Consistente | Notas |
|---------|--------------------|-----------------|------------------|-------------|-------|
| Win Rate (período actual) | | | | ✅ / ❌ | |
| P&L total (período actual) | | | | ✅ / ❌ | |
| Número de trades | | | | ✅ / ❌ | |
| Discipline Score promedio | | | | ✅ / ❌ | |
| Trades ganadores / perdedores | | | | ✅ / ❌ | |

---

## Checklist de Seguridad

> Marcar con ✅ o ❌. Cualquier ❌ es P0 automático.

- [ ] Rutas protegidas redirigen a `/login` sin sesión activa
- [ ] Cambiar el `userId` en la URL no expone datos de otro usuario (IDOR)
- [ ] La clave API de IA no es visible en respuestas de red (DevTools → Network)
- [ ] El endpoint de AI Coach devuelve 429 tras múltiples requests rápidos (rate limiting)
- [ ] El dashboard no renderiza datos de una sesión expirada (logout + back button)
- [ ] Las exportaciones CSV/JSON solo contienen datos del usuario autenticado

---

## Checklist de Accesibilidad (spot-check)

> Marcar con ✅ o ❌.

- [ ] Todos los botones de acción tienen `aria-label` descriptivo
- [ ] Los tabs del dashboard tienen `role="tab"` y `aria-selected`
- [ ] El drawer del AI Coach es navegable por teclado (Tab / Enter / Escape)
- [ ] Los mensajes de error tienen `role="alert"`
- [ ] Las imágenes decorativas tienen `alt=""` o `aria-hidden="true"`
- [ ] El contraste de texto supera WCAG AA (4.5:1) en modo claro y oscuro

---

## Notas del Ejecutor

> Observaciones generales, problemas de entorno, dudas sobre comportamiento esperado, inconsistencias en el test plan, etc.

```
[fecha] [nombre]: 
```

---

## Historial de Revisiones

| Versión | Fecha | Ejecutor | Cambio |
|---------|-------|----------|--------|
| v1.0 | <!-- YYYY-MM-DD --> | | Ejecución inicial |
| | | | |
