# Consolidación de `docs/` a tres fuentes de verdad

> Diseño aprobado 2026-07-09. Reduce `docs/` de 146 archivos a 5 (3 vivos + 2 anexos).

---

## 1. Problema

`docs/` tiene 146 archivos. La cantidad no es el problema principal; el problema es que
**hay dos fuentes de verdad arquitectónicas en conflicto**:

- `docs/ARCHITECTURE.md` — "Trading Journal v2 … refleja el estado real del código", última
  actualización 2026-06-05.
- `docs/v3/ARCHITECTURE_FREEZE.md` — "Documento canónico. Fuente de verdad arquitectónica",
  v3.1, vigente a 2026-06-28.

Todos los documentos de la raíz de `docs/` datan del 2026-06-05 y describen v2. Entre esa fecha
y el 2026-06-28, v3 (S0–S14) y el núcleo de v3.2 se construyeron y mergearon a `main`. La raíz de
`docs/` describe un producto que ya no existe.

Además, `docs/DOCUMENTATION_MIGRATION_REPORT.md` acredita que esta consolidación **ya se hizo una
vez** (114 → 20 archivos, 2026-06-05). v3 añadió 66 archivos encima sin integrarse. Sin un punto
de entrada único, el patrón se repetirá.

Por composición, los 146 archivos son:

| Clase | Archivos | Ejemplos |
|---|---|---|
| Bitácora de proceso | ~60 | `CHANGELOG_SPRINT_N`, `DECISIONS_SPRINT_N`, `TEST_REPORT_SPRINT_N`, `OPEN_ITEMS_SPRINT_N` (14 sprints × 4) |
| Specs de diseño ya implementados | ~14 | `MASTER_PRD`, `PRODUCT_MASTER_PLAN`, `BEHAVIOR_ENGINE_V3`, `ANALYTICS_V3`, `AI_COACH_V3`, `SPRINT_PLAN` |
| Specs/plans de features (`superpowers/`) | 30 | regenerables por la skill de brainstorming |
| Archivo histórico (`docs/archive/`) | 11 | 2.9 MB, ya apartado |
| Informes puntuales | ~17 | `UI_UX_IMPLEMENTATION_REPORT`, `PSYCHOLOGY_INTELLIGENCE_REPORT`, … |
| Canónico / vivo | ~14 | `ARCHITECTURE_FREEZE`, `adr/*`, `RECAP_V3_V32`, `PENDING_AND_RESUME`, `auditoria`, `CHANGELOG` |

## 2. Restricción que ordena el trabajo

**Quedan pruebas completas pendientes sobre todo lo entregado en v3.** Los documentos v3 son hoy la
única especificación contra la cual se pueden ejecutar. Por tanto: **consolidar antes de borrar**,
extrayendo un checklist de QA al documento superviviente. Las pruebas se ejecutan después, contra
ese checklist.

Borrar es recuperable (git). Lo que no es recuperable es el conocimiento que nunca se consolidó
antes de borrar.

## 3. Por qué es seguro borrar los specs v3

No por análisis de grafo — se intentó y el instrumento resultó romo (graphify produce ~65 aristas
doc→código sobre 466 nodos de doc; archivos enteros dan 0, lo que refleja la escasez de aristas
entre extractores distintos, no que el concepto esté sin implementar).

La razón es que `ARCHITECTURE_FREEZE.md` **se escribió precisamente para reemplazarlos**. Su
cabecera:

> Consolida y **resuelve** la auditoría, las specs v3 (`docs/v3/*`), el `REHYDRATION_REPORT.md`, el
> `ARCHITECTURE_CHALLENGE.md` y el `ARCHITECTURE_V3_1_DELTA.md`. Donde esos documentos discrepan o
> dejan una decisión abierta, **este documento decide**.

Borrar los specs que el freeze consolida es la conclusión de ese diseño, no una pérdida.

## 4. Estructura final

### `docs/PROJECT_GUIDE.md` — punto de entrada
Qué es el producto, para quién, módulos y rutas, stack, mapa de código.

Fuentes: `PROJECT_GUIDE.md` + `FEATURES.md` + la sección descriptiva de `ARCHITECTURE.md`
(stack, capas), reescrito a v3.2 usando `RECAP_V3_V32.md` como inventario de lo construido.

Requisito: debe reflejar v3.2, no v2. El catálogo de módulos de `FEATURES.md` omite todo lo de
v3 (behavior engine, intervenciones, memoria del coach, índice de mejora).

### `docs/ARCHITECTURE.md` — canónico
`docs/v3/ARCHITECTURE_FREEZE.md` promovido a la raíz, con los 5 ADRs (`adr/ADR-000..004`)
incorporados como apéndice.

Requisito: **conservar los IDs `FREEZE-Pxx` / `FREEZE-Dxx` / `FREEZE-Exx` / `FREEZE-EVxx` sin
renumerar**. El código, los commits y los mensajes de PR los citan. Conservar también la regla de
control de cambios (todo cambio arquitectónico cita un ID y declara si lo respeta, extiende o revoca).

Requisito: el archivo v2 actual (`docs/ARCHITECTURE.md`) se sobrescribe, no se funde. Describe una
arquitectura superada.

### `docs/STATUS.md` — estado vivo
El documento que responde "¿dónde estamos y qué falta?". Secciones:

1. **Checklist de QA pendiente de V3** — el entregable central.
2. Ops pendientes (acción del usuario, sin código).
3. Deuda técnica.
4. Backlog priorizado.
5. Roadmap reservado (apuestas con disparador).
6. Prompt de retoma de sesión.

Fuentes: `PENDING_AND_RESUME.md`, `SESSION_HANDOFF.md`, `QA_STATUS.md`, `RELEASE_STATUS.md`,
`TECHNICAL_DEBT.md`, `BACKLOG.md`, `ROADMAP.md`, `AUDIT_FINAL.md`, los 14 `OPEN_ITEMS_SPRINT_N.md`
y los 14 `TEST_REPORT_SPRINT_N.md`.

### Anexos que sobreviven sin fundir
- `docs/CHANGELOG.md` — historial por hito; append-only por naturaleza.
- `docs/auditoria-producto-trading-journal-v2.md` — spec vinculante original. `ARCHITECTURE.md`
  la cita como el enunciado del problema (hallazgos C1–C8, 50 ítems ROI, riesgos R1–R6); borrarla
  dejaría ese vocabulario huérfano.

## 5. El checklist de QA

Se construye volcando **los 69 open items `OI-*` únicos** hallados en los 14
`OPEN_ITEMS_SPRINT_N.md`, más:

- los gaps de `AUDIT_FINAL.md` (medio / bajo / reclasificados a v3.2),
- lo declarado no verificado en los 14 `TEST_REPORT_SPRINT_N.md`,
- los pendientes de `PENDING_AND_RESUME.md`: cron del digest cognitivo sin agendar, protección de
  contraseñas filtradas en Supabase Auth, recall episódico por query sin cablear, backfill
  `CoachMemory kind:fact` → `MemoryPattern`.

**Decisión (aprobada):** los `OI-*` se vuelcan **todos, marcados `sin verificar`**, sin cruzarlos
contra el código en esta pasada. Cerrarlos es trabajo de la ronda de pruebas, no de la limpieza.
Excepción: los ya marcados resueltos en `OPENITEMS_CLOSEOUT_S0_S2.md` se vuelcan como `resuelto`
con su verificación citada.

Cada fila conserva su ID original (`OI-7.3`, `GAP-A1`) para que sea trazable al historial de git.

## 6. Alcance del borrado

142 archivos. Por directorio:

| Directorio | Archivos | Nota |
|---|---|---|
| `docs/v3/` | 84 | incluye `adr/` (absorbido en `ARCHITECTURE.md`) |
| `docs/superpowers/` | 30 | **aprobado borrar**; la skill de brainstorming los regenera |
| `docs/archive/` | 11 | 2.9 MB; ya era archivo histórico |
| `docs/` (raíz) | 17 | informes puntuales + los fundidos |

Incluye este propio documento de diseño, que queda en el historial de git.

Los 4 supervivientes de la raíz (`PROJECT_GUIDE`, `ARCHITECTURE`, `CHANGELOG`, `auditoria`) se
reescriben o se conservan; `STATUS.md` es nuevo.

## 7. Ejecución

Cuatro commits, en este orden:

1. **`docs: consolidar fuente de verdad en PROJECT_GUIDE/ARCHITECTURE/STATUS`**
   Escribe los 3 archivos. No borra nada. Revisable de forma aislada: se puede leer el diff nuevo
   con los originales todavía presentes en el árbol.

2. **`docs: eliminar bitácoras de proceso consolidadas (142 archivos)`**
   Solo borrados, vía `git rm`.

3. **`docs: reapuntar referencias a la nueva estructura de docs/`**
   Nueve rutas `docs/…` citadas desde `README.md`, `CLAUDE.md`, `src/AGENTS.md` y `src/CLAUDE.md`
   quedan rotas tras el commit 2.

4. **`chore(graphify): regenerar el grafo tras la consolidación de docs/`**
   `graphify update .` — el grafo tiene 466 nodos con `source_file` en `docs/`, apuntando a 142
   archivos que dejarán de existir.

Separar 1 y 2 permite `git revert` del borrado sin perder la consolidación, y hace el primer diff
legible (si fuese un commit único, git mostraría los nuevos como renames de los borrados).

Fuera del repo, un quinto paso: la memoria `v3-context-entrypoint` apunta a
`docs/v3/SESSION_HANDOFF.md` y hay que reapuntarla a `docs/STATUS.md`, o la próxima sesión arranca
leyendo una ruta muerta.

## 8. Verificación

Antes del commit de borrado:

- [ ] `docs/STATUS.md` contiene los 69 IDs `OI-*`. Comprobable:
      `grep -oE "OI-[0-9]+\.[0-9]+" docs/STATUS.md | sort -u | wc -l` → `69`.
- [ ] `docs/ARCHITECTURE.md` conserva los **57 IDs** del freeze: `P1–P9`, `D1–D18`, `E1–E20`,
      `EV1–EV10`.

      **Ojo con la notación.** El freeze los declara **sin prefijo** en las tablas (`| **P2** | …`,
      `| E1 | Trade |`) y **con** prefijo en la prosa y el mapa de código (`[FREEZE-D1]`). El código
      de `src/` los cita siempre con prefijo. Un `grep -oE "FREEZE-(P|D|E|EV)[0-9]+"` solo encuentra
      19 de 57 y daría por bueno un documento mutilado. La comprobación correcta usa el ID desnudo:
      `for p in P D E EV; do grep -oE "\b${p}[0-9]+\b" <archivo> | sort -uV; done`, comparando
      conjuntos entre el original y el consolidado.

      Corolario: **no renumerar ni normalizar la notación.** `src/` cita 19 IDs con prefijo
      (`FREEZE-D1`, `FREEZE-E1`, `FREEZE-EV3`, `FREEZE-P2`, …); cambiar la forma de las tablas rompe
      la búsqueda humana, y renumerar rompe el código.
- [ ] `docs/ARCHITECTURE.md` contiene el contenido de los 5 ADRs.
- [ ] `docs/PROJECT_GUIDE.md` menciona los módulos de v3 (behavior engine, intervenciones, memoria
      del coach, índice de mejora), no solo los 11 módulos de v2.

Después del borrado:

- [ ] Ningún enlace roto: ninguna ruta `docs/...` referenciada desde `README.md`, `CLAUDE.md`,
      `src/AGENTS.md` o los 3 documentos nuevos apunta a un archivo inexistente.
- [ ] `find docs -type f | wc -l` → `5`.
- [ ] `graphify update .` termina sin error y `built_at_commit` avanza.

## 9. Fuera de alcance

- No se reescribe `CHANGELOG.md` ni `auditoria-...md`.
- No se ejecutan las pruebas de V3. Este trabajo produce el checklist; la ronda de QA lo consume.
- No se tocan `README.md` ni `CLAUDE.md` salvo para corregir rutas que queden rotas.
