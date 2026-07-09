# Consolidación de `docs/` — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir `docs/` de 146 archivos a 5 (3 vivos + 2 anexos), volcando los 69 open items de v3 a un checklist de QA accionable, sin perder ningún ID trazable.

**Architecture:** Cuatro tareas de escritura (una por documento superviviente, más la extracción mecánica que las alimenta), un commit de consolidación, un commit de borrado separado, y una tarea de reparación de referencias externas. El borrado va **después** y **aparte** para que `git revert` del borrado no arrastre la consolidación.

**Tech Stack:** Markdown, `git`, `graphify` (CLI, actualización AST-only del grafo), Python 3.14 para las extracciones deterministas.

## Global Constraints

- **Regla del proyecto (CLAUDE.md):** ejecutar `graphify query "<pregunta>"` **antes** de cualquier `grep`/`find`/lectura exploratoria. El usuario lo declaró imperativo (2026-07-09). Tras el borrado, `graphify update .` es obligatorio.
- **No renumerar ni normalizar los IDs `FREEZE-*`.** El freeze declara 57 IDs: `P1–P9`, `D1–D18`, `E1–E20`, `EV1–EV10`. Las tablas los escriben **sin** prefijo (`| **P2** |`, `| E1 | Trade |`); la prosa y el mapa de código **con** prefijo (`[FREEZE-D1]`). `src/` cita 19 de ellos con prefijo. Ambas notaciones se conservan tal cual.
- **Nunca verificar IDs `FREEZE-*` con `grep -oE "FREEZE-(P|D|E|EV)[0-9]+"`** — solo encuentra 19 de 57 y da por bueno un documento mutilado. Usar siempre el ID desnudo con `\b`.
- **Los IDs `OI-*` y `GAP-*` conservan su identificador original.** Son la traza al historial de git.
- Todo el contenido en español, como el resto de `docs/`.
- Windows: usar la herramienta Bash (Git Bash) para los comandos POSIX de este plan; `PYTHONIOENCODING=utf-8` en toda invocación de Python que imprima texto de los docs (la consola por defecto es `cp1252` y revienta con `—`, `⌘`, `✅`).

---

## Estructura de archivos

**Se crean:**
- `docs/STATUS.md` — estado vivo: checklist QA (69 `OI-*` + gaps), ops pendientes, deuda técnica, backlog, roadmap, prompt de retoma.

**Se reescriben por completo:**
- `docs/ARCHITECTURE.md` — hoy describe v2 (obsoleto). Pasa a ser `docs/v3/ARCHITECTURE_FREEZE.md` + los 5 ADRs como apéndice.
- `docs/PROJECT_GUIDE.md` — hoy describe v2. Pasa a ser guía a v3.2, fundiendo `FEATURES.md` y el stack de `ARCHITECTURE.md`, con `RECAP_V3_V32.md` como inventario.

**Se conservan intactos:**
- `docs/CHANGELOG.md`, `docs/auditoria-producto-trading-journal-v2.md`.

**Se borran:** 142 archivos (`docs/v3/` 84, `docs/superpowers/` 30 —incluidos el spec y este plan—, `docs/archive/` 11, raíz de `docs/` 17).

> El conteo se mueve si alguien añade un archivo a `docs/` antes de ejecutar (cada spec o plan que
> escriba la skill de brainstorming suma uno). La invariante estable, y la que verifica la Task 5,
> es: **tras el borrado quedan exactamente 5 archivos**. Si la lista no da 142, no improvisar:
> comprobar qué archivo apareció y por qué.

**Se modifican fuera de `docs/`:** `README.md`, `CLAUDE.md`, `src/AGENTS.md`, `src/CLAUDE.md` (rutas rotas), y la memoria `v3-context-entrypoint.md`.

---

### Task 1: Extraer el material del checklist de QA

Extracción mecánica y determinista. No se juzga, no se cruza contra el código: se vuelca. Produce un fichero intermedio que la Task 2 consume.

**Files:**
- Create: `<scratchpad>/qa-items.md` (intermedio, no se comitea)
- Read: `docs/v3/OPEN_ITEMS_SPRINT_{3,4,5,6,7,8,9,10,11,13,14}.md`, `docs/v3/OPENITEMS_CLOSEOUT_S0_S2.md`, `docs/v3/AUDIT_FINAL.md`, `docs/v3/PENDING_AND_RESUME.md`

**Interfaces:**
- Produces: `<scratchpad>/qa-items.md` con exactamente 69 filas `| OI-x.y | descripción | se resuelve en |`, más las secciones de gaps de `AUDIT_FINAL.md` y los pendientes de ops.

- [ ] **Step 1: Orientarse con graphify (obligatorio antes de leer los archivos)**

```bash
graphify query "open items pendientes sin verificar y gaps de auditoria final"
```

Esperado: subgrafo con nodos de `OPEN_ITEMS_*`, `AUDIT_FINAL`, `OPENITEMS_CLOSEOUT_S0_S2`. Sirve para confirmar qué ficheros participan; el detalle de las filas se extrae abajo.

- [ ] **Step 2: Extraer las 69 filas `OI-*`**

Este script está probado y captura 69/69. Los `OPEN_ITEMS_SPRINT_*.md` existen solo para los sprints 3–11, 13, 14 (no hay 0, 1, 2 ni 12: los de S0–S2 están en `OPENITEMS_CLOSEOUT_S0_S2.md`).

```bash
PYTHONIOENCODING=utf-8 python - <<'PY' > "$SCRATCH/qa-items.md"
import re, glob
rows = []
files = sorted(glob.glob('docs/v3/OPEN_ITEMS_SPRINT_*.md'),
               key=lambda p: int(re.search(r'_(\d+)\.md', p).group(1)))
for f in files:
    sprint = re.search(r'_(\d+)\.md', f).group(1)
    for line in open(f, encoding='utf-8'):
        m = re.match(r'\s*\|\s*(OI-[\d.]+)\s*\|(.*)', line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(2).split('|')]
        desc = cells[0] if cells else ''
        where = cells[1] if len(cells) > 1 else ''
        rows.append((m.group(1), sprint, desc, where))

print('| ID | Sprint | Item | Se resuelve en | Estado |')
print('|---|---|---|---|---|')
for oid, sprint, desc, where in rows:
    print(f'| `{oid}` | S{sprint} | {desc} | {where} | ⬜ sin verificar |')
print(f'\n<!-- filas: {len(rows)} -->')
PY
```

- [ ] **Step 3: Verificar que se capturaron los 69**

```bash
grep -oE "OI-[0-9]+\.[0-9]+" "$SCRATCH/qa-items.md" | sort -u | wc -l
```

Esperado: `69`. Si sale menos, **parar**: alguna tabla usa otro formato de fila y se estaría perdiendo un item. Inspeccionar el archivo que falta antes de continuar.

- [ ] **Step 4: Añadir los ítems resueltos de S0–S2**

De `docs/v3/OPENITEMS_CLOSEOUT_S0_S2.md`, la tabla "✅ Resueltos en esta pasada" (`OI-1`, `OI-4`, `DT-1`, `DT-5`, `DT-6`). Se vuelcan con estado `✅ resuelto` y su columna de verificación citada, no como `sin verificar`. Son la excepción documentada en el spec §5.

- [ ] **Step 5: Añadir los gaps de `AUDIT_FINAL.md` y los pendientes de ops**

De `AUDIT_FINAL.md`: las secciones "🟠 Medio", "🟡 Bajo" y "Reclasificado a v3.2". Asignarles IDs `GAP-A1`, `GAP-A2`, `GAP-B1` tal como ya aparecen en el documento.

De `PENDING_AND_RESUME.md` §1 y §3, los pendientes de ops y follow-ups:
- 🔴 Agendar el cron del digest cognitivo (`/api/cron/cognitive-digest` existe y funciona, pero **no está programado**; falta pg_cron → pg_net → ruta con `Bearer CRON_SECRET`).
- 🟡 Protección de contraseñas filtradas en Supabase Auth (toggle de dashboard, no migrable).
- Recall episódico por query (`recallEpisodes(query)` existe en `memory-episode-service`; falta cablearla en `assembleCoachContext`/`coach-agent`; requiere clave de embeddings).
- Backfill `CoachMemory kind:fact` → `MemoryPattern` (opcional, conservador).
- Sesgo de anclaje (#40): no construido a propósito.
- DataTable dev render loop (pre-existente a v3; solo dev, no afecta prod).

- [ ] **Step 6: No hay commit**

El intermedio vive en el scratchpad. La Task 2 lo consume.

---

### Task 2: Escribir `docs/STATUS.md`

El entregable que le importa al usuario: el checklist contra el que ejecutará la ronda de pruebas de V3.

**Files:**
- Create: `docs/STATUS.md`
- Read: `<scratchpad>/qa-items.md`, `docs/QA_STATUS.md`, `docs/RELEASE_STATUS.md`, `docs/TECHNICAL_DEBT.md`, `docs/BACKLOG.md`, `docs/ROADMAP.md`, `docs/v3/PENDING_AND_RESUME.md`, `docs/v3/SESSION_HANDOFF.md`

**Interfaces:**
- Consumes: `<scratchpad>/qa-items.md` de la Task 1.
- Produces: `docs/STATUS.md`, referenciado por `PROJECT_GUIDE.md` (Task 4) y por la memoria (Task 7).

- [ ] **Step 1: Escribir el esqueleto con las 6 secciones**

En este orden exacto (el checklist primero: es la razón de ser del documento):

```markdown
# Status — Trading Journal v3.2

> Estado vivo del proyecto. Qué funciona, qué falta verificar, qué falta construir.
> Última actualización: 2026-07-09.
> Arquitectura canónica: `ARCHITECTURE.md` · Qué es el producto: `PROJECT_GUIDE.md`

## 1. Checklist de QA pendiente de V3
## 2. Ops pendientes (acción del usuario, sin código)
## 3. Deuda técnica
## 4. Backlog
## 5. Roadmap reservado
## 6. Prompt de retoma de sesión
```

- [ ] **Step 2: Rellenar §1 con el volcado de la Task 1**

Encabezar la sección con la advertencia de procedencia, literal:

> Los 69 ítems `OI-*` provienen de los 14 `OPEN_ITEMS_SPRINT_N.md` (hoy borrados; ver git). Se
> volcaron **sin cruzarlos contra el código**: `⬜ sin verificar` significa "nadie lo ha comprobado
> en esta pasada", no "está roto". Cerrarlos es el trabajo de la ronda de QA. Cada ID es trazable
> al historial de git por su identificador original.

Después, la tabla de 69 filas, y bajo ella los `GAP-*` y los resueltos de S0–S2.

- [ ] **Step 3: Rellenar §2–§5**

- §2 Ops: los 2 ítems de `PENDING_AND_RESUME.md` §1 (cron del digest, contraseñas filtradas).
- §3 Deuda: las 3 filas de `TECHNICAL_DEBT.md` (`TD-018`, `TD-019`, `TD-037`) + el DataTable dev render loop. **Verificar antes de copiar** que siguen abiertas; `TECHNICAL_DEBT.md` es del 2026-06-05 y v3 pudo cerrarlas. Si no se puede verificar sin ejecutar código, marcarlas `⬜ sin verificar` igual que los `OI-*` — no afirmar que están abiertas.
- §4 Backlog: las filas P1/P2/P3 de `BACKLOG.md`, con la misma advertencia de frescura.
- §5 Roadmap: `A3` (rutas de las 5 superficies) y `POST-1..7` de `PENDING_AND_RESUME.md` §2, señalando que `POST-6` es el único con disparador cumplido.

- [ ] **Step 4: Rellenar §6 con el prompt de retoma**

Copiar el bloque de `PENDING_AND_RESUME.md` §"PROMPT PARA RETOMAR LA SESIÓN`, **actualizando las 4 rutas de lectura** (que apuntan a archivos que este plan borra) por:

```
  1) docs/STATUS.md        (estado, pendientes, checklist de QA)
  2) docs/PROJECT_GUIDE.md (qué es el producto)
  3) docs/ARCHITECTURE.md  (principios/decisiones/entidades congelados)
```

Conservar íntegro el resto del prompt: las reglas de trabajo, el GOTCHA de `migrate-deploy` (el run del SHA del merge, ~5 min, identificar por `headSha == HEAD`), el usuario demo y la nota de Node 24.

- [ ] **Step 5: Verificar el conteo**

```bash
grep -oE "OI-[0-9]+\.[0-9]+" docs/STATUS.md | sort -u | wc -l
```

Esperado: `69`.

- [ ] **Step 6: No commitear todavía**

Los 3 documentos entran en un único commit al final de la Task 4.

---

### Task 3: Escribir `docs/ARCHITECTURE.md`

Promoción del freeze. **La tarea de mayor riesgo del plan:** aquí se pierde trazabilidad del código si se toca la numeración.

**Files:**
- Overwrite: `docs/ARCHITECTURE.md` (el actual describe v2; se descarta, vive en git)
- Read: `docs/v3/ARCHITECTURE_FREEZE.md`, `docs/v3/adr/ADR-00{0,1,2,3,4}-*.md`

**Interfaces:**
- Produces: `docs/ARCHITECTURE.md` con los 57 IDs (`P1–P9`, `D1–D18`, `E1–E20`, `EV1–EV10`) y los 5 ADRs como apéndice.

- [ ] **Step 1: Snapshot del inventario de IDs del original**

```bash
for p in P D E EV; do grep -oE "\b${p}[0-9]+\b" docs/v3/ARCHITECTURE_FREEZE.md; done | sort -uV > /tmp/ids_before.txt
wc -l < /tmp/ids_before.txt
```

Esperado: `57`.

- [ ] **Step 2: Copiar el freeze tal cual y ajustar solo la cabecera**

```bash
cp docs/v3/ARCHITECTURE_FREEZE.md docs/ARCHITECTURE.md
```

El cuerpo **no se reescribe**. Solo la cabecera, para que deje de anunciarse como consolidador de documentos que ya no existen. Sustituir el bloque de cita inicial por:

```markdown
> **Documento canónico. Fuente de verdad arquitectónica.**
> Consolidó y **resolvió** la auditoría (`auditoria-producto-trading-journal-v2.md`), las specs v3
> y los informes de arquitectura, hoy eliminados y recuperables en el historial de git
> (previos al commit de consolidación de 2026-07-09).
>
> **Regla de control de cambios:** todo cambio arquitectónico futuro DEBE referenciar un ID de este
> documento (`FREEZE-Pxx` principio, `FREEZE-Dxx` decisión, `FREEZE-Exx` entidad, `FREEZE-EVxx`
> evento) y declarar si lo respeta, lo extiende o lo revoca. Revocar una **decisión irreversible
> (§11.1)** requiere un nuevo freeze.
>
> Nota de notación: las tablas declaran los IDs sin prefijo (`P2`, `E1`, `EV3`); la prosa y el mapa
> de código los citan con prefijo (`FREEZE-D1`). `src/` usa siempre la forma con prefijo. No
> renumerar ni normalizar: 19 IDs están citados desde el código.
```

- [ ] **Step 3: Anexar los 5 ADRs**

Al final del archivo, `## Apéndice — ADRs`, con un `###` por ADR (`ADR-000` raíz, `ADR-001` eventos, `ADR-002` estadística, `ADR-003` memoria/privacidad, `ADR-004` cross-user), copiando su contenido íntegro y degradando sus encabezados un nivel para que no colisionen con los `##` del documento.

- [ ] **Step 4: Verificar que no se perdió ni un ID**

```bash
for p in P D E EV; do grep -oE "\b${p}[0-9]+\b" docs/ARCHITECTURE.md; done | sort -uV > /tmp/ids_after.txt
comm -23 /tmp/ids_before.txt /tmp/ids_after.txt
```

Esperado: **salida vacía** (ningún ID del original ausente en el consolidado). Si imprime algo, **parar y restaurar**.

- [ ] **Step 5: Verificar que los 19 IDs citados por el código siguen presentes**

```bash
grep -rhoE "FREEZE-(P|D|EV|E)[0-9]+" src --include=*.ts --include=*.tsx | sort -u \
  | sed 's/FREEZE-//' | sort -uV > /tmp/ids_src.txt
comm -23 /tmp/ids_src.txt /tmp/ids_after.txt
```

Esperado: **salida vacía**. (Se despoja el prefijo porque el documento los declara desnudos en las tablas.)

- [ ] **Step 6: No commitear todavía**

---

### Task 4: Escribir `docs/PROJECT_GUIDE.md` y commitear la consolidación

**Files:**
- Overwrite: `docs/PROJECT_GUIDE.md`
- Read: `docs/PROJECT_GUIDE.md` (actual), `docs/FEATURES.md`, `docs/ARCHITECTURE.md` (versión v2, vía `git show HEAD:docs/ARCHITECTURE.md` — ya sobrescrita en Task 3), `docs/v3/RECAP_V3_V32.md`

**Interfaces:**
- Consumes: `docs/STATUS.md` (Task 2) y `docs/ARCHITECTURE.md` (Task 3) para enlazarlos.
- Produces: el commit de consolidación.

- [ ] **Step 1: Recuperar el stack del `ARCHITECTURE.md` v2**

Task 3 ya lo sobrescribió. La tabla de stack (Next.js App Router 16.2.x, React 19.2.x, …) sigue siendo válida y hay que rescatarla de git:

```bash
git show HEAD:docs/ARCHITECTURE.md | sed -n '1,60p'
```

- [ ] **Step 2: Escribir el documento**

Secciones, en este orden:

1. **Qué es** — la tesis de v3: "capa cognitiva sobre el bróker que cambia el comportamiento del trader"; la unidad de valor es *el cambio de comportamiento verificado*. De `RECAP_V3_V32.md` §"La tesis de v3".
2. **Qué NO es** — no es integración con bróker, ni señales, ni social, ni ejecutor de algos. De `PROJECT_GUIDE.md` §3 (sigue vigente).
3. **Usuarios objetivo** — las 4 personas de `PROJECT_GUIDE.md` §3.
4. **Módulos y rutas** — la tabla de `PROJECT_GUIDE.md` §4 (11 módulos de v2) **ampliada con lo de v3**: behavior engine (`BehaviorLoopPanel` en `/analytics`), intervenciones (`InterventionOverlay`), memoria del coach (drawer), índice de mejora (tab "Mejora" en `/analytics`), reglas unificadas enforce/warn.
5. **Stack** — la tabla rescatada en el Step 1.
6. **Mapa de código** — el árbol `src/domains/...` de `SESSION_HANDOFF.md` §3.
7. **Dónde está todo** — enlaces a `ARCHITECTURE.md` (canónico), `STATUS.md` (estado y pendientes), `CHANGELOG.md`, `auditoria-producto-trading-journal-v2.md`.

**Requisito del spec §4:** el catálogo de módulos de `FEATURES.md` omite todo lo de v3. Si el documento resultante no menciona behavior engine, intervenciones, memoria del coach e índice de mejora, la tarea no está hecha.

- [ ] **Step 3: Verificar que refleja v3, no v2**

```bash
grep -ciE "behavior engine|intervenci|memoria del coach|índice de mejora" docs/PROJECT_GUIDE.md
```

Esperado: `>= 4`.

- [ ] **Step 4: Commitear la consolidación (sin borrar nada)**

Diff legible: los 3 nuevos conviven con los 141 originales, así que git no los muestra como renames.

```bash
git add docs/PROJECT_GUIDE.md docs/ARCHITECTURE.md docs/STATUS.md
git commit -m "$(cat <<'EOF'
docs: consolidar fuente de verdad en PROJECT_GUIDE/ARCHITECTURE/STATUS

ARCHITECTURE.md pasa a ser el freeze de v3.1 (los 57 IDs P/D/E/EV intactos)
con los 5 ADRs como apéndice; sustituye a la versión v2 del 2026-06-05, que
contradecía a docs/v3/ARCHITECTURE_FREEZE.md.

STATUS.md recoge los 69 open items OI-* de los 14 OPEN_ITEMS_SPRINT_N.md
como checklist de QA, volcados sin verificar contra el código.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Borrar los 142 archivos

Commit separado, solo borrados. Permite `git revert` del borrado sin perder la consolidación.

**Files:**
- Delete: `docs/v3/**` (84), `docs/superpowers/**` (30, incluidos el spec y este plan), `docs/archive/**` (11), y 17 de la raíz de `docs/`.

- [ ] **Step 1: Construir la lista y revisarla antes de ejecutar**

```bash
find docs -type f \
  | grep -vE '^docs/(PROJECT_GUIDE|ARCHITECTURE|STATUS|CHANGELOG|auditoria-producto-trading-journal-v2)\.md$' \
  | sort > /tmp/to_delete.txt
wc -l < /tmp/to_delete.txt
```

Esperado: `142`. Si no son 142, **parar** y averiguar qué archivo apareció o desapareció antes de borrar nada.

- [ ] **Step 2: Confirmar que los 5 supervivientes están fuera de la lista**

```bash
grep -cE '^docs/(PROJECT_GUIDE|ARCHITECTURE|STATUS|CHANGELOG|auditoria)' /tmp/to_delete.txt
```

Esperado: `0`.

- [ ] **Step 3: Borrar**

```bash
xargs -a /tmp/to_delete.txt git rm -q --
find docs -type f | wc -l
```

Esperado: `5`.

- [ ] **Step 4: Commitear el borrado**

```bash
git commit -m "$(cat <<'EOF'
docs: eliminar bitácoras de proceso consolidadas (142 archivos)

Bitácoras por sprint (CHANGELOG/DECISIONS/TEST_REPORT/OPEN_ITEMS x14),
specs v3 que ARCHITECTURE_FREEZE declara resueltos, docs/archive/ (2.9 MB),
docs/superpowers/ e informes puntuales.

Todo recuperable en el historial. Los OI-* y los IDs FREEZE-* conservan su
identificador en docs/STATUS.md y docs/ARCHITECTURE.md.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Reparar las referencias externas rotas

Nueve rutas `docs/…` citadas fuera de `docs/` apuntan ahora a archivos inexistentes.

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `src/AGENTS.md`, `src/CLAUDE.md`

**Interfaces:**
- Consumes: los 3 documentos de las Tasks 2–4.

- [ ] **Step 1: Localizar todas las rutas rotas**

```bash
grep -rhoE "docs/[A-Za-z0-9_/.-]+\.(md|pdf)" README.md CLAUDE.md src/AGENTS.md src/CLAUDE.md \
  | sort -u | while read -r p; do [ -f "$p" ] || echo "ROTA: $p"; done
```

Esperado, antes de arreglar (9): `docs/FEATURES.md`, `docs/ROADMAP.md`, `docs/v3/ARCHITECTURE_FREEZE.md`, `docs/v3/AUDIT_FINAL.md`, `docs/v3/MASTER_PRD.md`, `docs/v3/README.md`, `docs/v3/RECAP_V3_V32.md`, `docs/v3/SESSION_HANDOFF.md`, `docs/v3/SPRINT_PLAN.md`.

- [ ] **Step 2: Reapuntarlas**

| Ruta rota | Sustituir por |
|---|---|
| `docs/v3/ARCHITECTURE_FREEZE.md` | `docs/ARCHITECTURE.md` |
| `docs/v3/SESSION_HANDOFF.md`, `docs/v3/AUDIT_FINAL.md` | `docs/STATUS.md` |
| `docs/v3/README.md`, `docs/v3/RECAP_V3_V32.md`, `docs/v3/MASTER_PRD.md`, `docs/v3/SPRINT_PLAN.md`, `docs/FEATURES.md` | `docs/PROJECT_GUIDE.md` |
| `docs/ROADMAP.md` | `docs/STATUS.md` (§5 Roadmap reservado) |

- [ ] **Step 3: Verificar que no queda ninguna rota**

Repetir el comando del Step 1. Esperado: **salida vacía**.

- [ ] **Step 4: Verificar también dentro de los 3 documentos nuevos**

```bash
grep -rhoE "docs/[A-Za-z0-9_/.-]+\.(md|pdf)" docs/*.md \
  | sort -u | while read -r p; do [ -f "$p" ] || echo "ROTA: $p"; done
```

Esperado: **salida vacía**. (`ARCHITECTURE.md` cita la auditoría; `STATUS.md` y `PROJECT_GUIDE.md` se citan entre sí.)

- [ ] **Step 5: Commitear**

```bash
git add README.md CLAUDE.md src/AGENTS.md src/CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: reapuntar referencias a la nueva estructura de docs/

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Actualizar el grafo y la memoria

Dos consumidores de `docs/` que quedan apuntando a rutas muertas y que nada más va a arreglar.

**Files:**
- Modify: `graphify-out/**` (vía CLI)
- Modify: `~/.claude/projects/C--Users-hosorio-.../memory/v3-context-entrypoint.md`

- [ ] **Step 1: Actualizar el grafo**

El grafo tiene 466 nodos con `source_file` en `docs/`, sobre 140 archivos que ya no existen.

```bash
graphify update .
```

- [ ] **Step 2: Verificar que el grafo ya no apunta a rutas muertas**

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
import json
g = json.load(open('graphify-out/graph.json'))
import os
dead = {n['source_file'] for n in g['nodes']
        if (n.get('source_file') or '').startswith('docs/')
        and not os.path.exists(n['source_file'])}
print('nodos docs/ apuntando a archivos inexistentes:', len(dead))
for d in sorted(dead)[:10]:
    print(' ', d)
print('built_at_commit:', g['built_at_commit'])
PY
```

Esperado: `0` rutas muertas, y `built_at_commit` igual al `HEAD` actual (`git rev-parse HEAD`).

- [ ] **Step 3: Corregir la memoria `v3-context-entrypoint`**

Su `description` y su cuerpo apuntan a `docs/v3/SESSION_HANDOFF.md`, borrado en la Task 5. Sin este paso, la próxima sesión arranca leyendo una ruta muerta.

Reescribir para que el punto de entrada sea `docs/STATUS.md` (estado + pendientes + prompt de retoma), `docs/PROJECT_GUIDE.md` (qué es) y `docs/ARCHITECTURE.md` (canónico). Actualizar también el pointer en `MEMORY.md`. Enlazar con `[[graphify-mandatory]]`.

- [ ] **Step 4: Commitear el grafo**

```bash
git add graphify-out
git commit -m "$(cat <<'EOF'
chore(graphify): regenerar el grafo tras la consolidación de docs/

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

(La memoria vive fuera del repo; no entra en el commit.)

---

## Verificación final

- [ ] `find docs -type f | wc -l` → `5`
- [ ] `grep -oE "OI-[0-9]+\.[0-9]+" docs/STATUS.md | sort -u | wc -l` → `69`
- [ ] Los 57 IDs del freeze presentes en `docs/ARCHITECTURE.md` (Task 3, Steps 4–5: ambas salidas vacías)
- [ ] Ninguna ruta `docs/…` rota en `README.md`, `CLAUDE.md`, `src/AGENTS.md`, `src/CLAUDE.md`, `docs/*.md`
- [ ] `graphify-out/graph.json` sin `source_file` inexistentes; `built_at_commit == HEAD`
- [ ] `git log --oneline -4` muestra los 4 commits: consolidación → borrado → referencias → grafo
- [ ] `git show --stat HEAD~2` (el borrado) contiene **solo** borrados, ninguna adición
