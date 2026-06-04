# Manual QA Test Plan V2 — Trading Journal v2

**Versión:** 2.0  
**Reemplaza:** docs/MANUAL_QA_TEST_PLAN.md  
**Fecha:** 2026-06-03  
**Cobertura:** funcionalidades modificadas + previamente bloqueadas + regresión crítica

---

## Prerequisitos

1. **Aplicar migración 010:** ejecutar `psql $DATABASE_URL < prisma/migrations/010_psychology_plan_notes.sql`
2. **Dev server corriendo:** `pnpm dev` en `/src`
3. **Cuenta de prueba con datos:** mínimo 1 cuenta activa + 1 cuenta archivada con trades

---

## Convención de resultados

- ✅ PASA — comportamiento correcto confirmado
- ❌ FALLA — bug encontrado, documentar con screenshot
- ⏭ OMITIR — no aplicable en el entorno actual

---

## Módulo 1 — Dashboard (QA-002/003/004/005/009 corregidos)

### T1.1 — Portfolio tab excluye cuentas archivadas

**Precondición:** Usuario tiene ≥1 cuenta archivada (status INACTIVE) con trades.

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/cuentas`, archivar una cuenta con trades | Cuenta desaparece de la lista activa |
| 2 | Ir a `/dashboard` → tab Portfolio | KPI "Net P&L" NO incluye trades de la cuenta archivada |
| 3 | Revisar "Comparación de cuentas" | La cuenta archivada NO aparece en la tabla |
| 4 | Revisar "P&L diario por cuenta" | Solo cuentas activas/pausadas |

### T1.2 — Operador tab excluye cuentas archivadas

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Dashboard → tab Operador | KPIs de equity no incluyen la cuenta archivada |
| 2 | "Trades recientes" | No muestra trades de la cuenta archivada |

### T1.3 — Disciplina tab excluye cuentas archivadas

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Dashboard → tab Disciplina | Score y heatmap calculados sin trades de cuenta archivada |
| 2 | Sección "Reglas activas" visible | Lista las reglas habilitadas del usuario con severidad |
| 3 | Click "Gestionar reglas →" | Navega a `/reglas` |

### T1.4 — Playbook tab excluye cuentas archivadas + navega

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Dashboard → tab Playbook | Métricas de setups NO incluyen trades de cuenta archivada |
| 2 | Click sobre tarjeta de un setup | Navega a `/playbook` con el drawer del setup abierto |

---

## Módulo 2 — Trades (QA-008/009/010/011 corregidos)

### T2.1 — Lista de trades carga correctamente

**Precondición:** migración 010 aplicada.

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/trades` | Tabla carga con todos los trades. KPI strip muestra métricas. |
| 2 | "Sin trades registrados" | Solo aparece si el usuario NO tiene trades (empty state correcto) |

### T2.2 — Registrar trade (QA-010)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Click "Registrar trade" | Modal se abre |
| 2 | Seleccionar cuenta, símbolo, dirección | Formulario responde |
| 3 | Completar entry, stop, target. Hora de apertura vacía | Permite continuar (00:00 por defecto) |
| 4 | Click "Registrar trade" | Trade se guarda. NO aparece toast de error interno |
| 5 | Tabla de trades muestra el nuevo trade | ✅ |

### T2.3 — Custom tags en formulario (QA-011)

**Precondición:** Usuario tiene trades con tags custom (creados desde `/etiquetas`).

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Modal "Registrar trade" → sección "Calidad calculada" (sin setup seleccionado) | Tags custom del usuario aparecen como botones |
| 2 | Click sobre un tag custom | Se selecciona (color acento) |
| 3 | Guardar trade | Trade se guarda con el tag custom incluido |

### T2.4 — KPIs excluyen trades de cuentas archivadas (QA-009)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/trades` | KPI "Net P&L" solo cuenta trades de cuentas activas/pausadas |

---

## Módulo 3 — Cuentas (QA-014/018 corregidos)

### T3.1 — Filtro de estado de cuentas (QA-014)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/cuentas` | Tabs visibles: Activas / Pausadas / Archivadas / Todas |
| 2 | Tab "Activas" (default) | Solo cuentas con status ACTIVE |
| 3 | Tab "Archivadas" | Cuentas INACTIVE y LOST visibles con su nombre real |
| 4 | Tab "Todas" | Todas las cuentas sin excepción |
| 5 | Cambiar tab | Contadores actualizados. Panel de detalle se cierra. |

### T3.2 — "Ver trades" navega (QA-018)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Click sobre una cuenta en `/cuentas` | Panel de detalle se abre |
| 2 | Click "Ver trades" | Navega a `/trades?accountId={id}` |

---

## Módulo 4 — Reviews (QA-012/013 corregidos)

### T4.1 — Disciplina no muestra 100 sin trades (QA-012)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/reviews` → crear nueva review | Modal se abre |
| 2 | Seleccionar semana sin trades | Sección de disciplina muestra "0" o valor bajo, NO "100" |
| 3 | Crear review y ver en detalle | "Disciplina: —" (no 100) cuando tradeCount = 0 |

### T4.2 — Sin botón "Editar" duplicado (QA-013)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Lista de reviews | Cards NO tienen botón "Editar" en el footer |
| 2 | Click sobre una review | Panel de detalle se abre |
| 3 | Panel de detalle | Botón de edición: solo el ícono de lápiz en el header |

---

## Módulo 5 — Playbook (QA-015 corregido)

### T5.1 — Health indicator visible en cards (QA-015)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/playbook` | Tarjetas de setup muestran dot de salud (🟢/🟡/🔴/⚪) |
| 2 | Hover sobre el dot | Tooltip con estado y métricas |
| 3 | Setup con < 5 trades | Dot ⚪ "Insuficiente" |

---

## Módulo 6 — Retiros (QA-020/021 corregidos)

### T6.1 — Validación de balance en retiro (QA-020)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `/retiros` → "Nuevo retiro" | Modal se abre |
| 2 | Seleccionar cuenta con balance $75 | |
| 3 | Ingresar monto $100 (supera balance) | |
| 4 | Click "Registrar retiro" | Error: "El monto del retiro ($100) supera el balance actual ($75.00)" |
| 5 | Ingresar monto $50 (dentro del balance) | Retiro se registra correctamente |

### T6.2 — Dropdown de estado funciona (QA-021)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Lista de retiros con al menos un registro | Visible con badge de estado |
| 2 | Click sobre el badge de estado | Dropdown se abre (no clipeado) |
| 3 | Seleccionar nuevo estado | Estado actualizado. Dropdown se cierra. |
| 4 | Click fuera del dropdown | Dropdown se cierra |

---

## Módulo 7 — Regresión (funcionalidades no modificadas)

### T7.1 — Login y autenticación

| Paso | Resultado esperado |
|---|---|
| Ir a `/login` | Formulario visible |
| Login con credenciales válidas | Redirige a `/dashboard` |

### T7.2 — Mercados

| Paso | Resultado esperado |
|---|---|
| Ir a `/mercados` | Lista de mercados carga |
| Crear nuevo mercado | Se guarda y aparece en lista |

### T7.3 — Playbook CRUD

| Paso | Resultado esperado |
|---|---|
| Crear setup | Se guarda correctamente |
| Editar setup | Cambios persistidos |
| Cambiar status (Activo → En prueba) | Badge actualizado |

### T7.4 — Etiquetas (Tags)

| Paso | Resultado esperado |
|---|---|
| Ir a `/etiquetas` | Lista de tags con conteos de uso |
| Renombrar tag | Actualiza en todos los trades |
| Eliminar tag | Removido de todos los trades |

### T7.5 — Perfil y preferencias

| Paso | Resultado esperado |
|---|---|
| Ir a `/perfil` | Datos del usuario cargados |
| Cambiar configuración de IA | Se guarda |
| Toggle de tema (claro/oscuro/sistema) | Cambia inmediatamente |

### T7.6 — Aprendizaje

| Paso | Resultado esperado |
|---|---|
| Ir a `/aprendizaje` | Recursos cargados |
| Crear recurso | Se guarda |
| Marcar como revisado | Estado actualizado, SRS programado |

---

## Criterio de aprobación V2

- ✅ 0 hallazgos P0 (funcionalidad completamente rota)
- ✅ ≤ 3 hallazgos P1 (UX defectuosa pero funcional)
- ✅ Migración 010 aplicada y trades funcionando completamente
- ✅ Cuentas archivadas excluidas de todos los dashboards
- ✅ Sin datos de disciplina erróneos (100 sin trades)
