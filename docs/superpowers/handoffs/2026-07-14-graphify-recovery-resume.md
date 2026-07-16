# Handoff — retomar recuperación de graphify (chunks 01 + 04)

> Escrito al 99% del límite de sesión (2026-07-14). Pensado para retomarse en otra sesión,
> posiblemente en otra máquina. No asume memoria de la conversación anterior.

## Contexto de negocio (por si la máquina nueva no tiene memoria persistente)

- **TD-018** (extracción de trade-service del router `trades.ts`): CERRADO. PR #130 mergeado a main.
- **S0/DT-4** (drift check SQL↔Prisma en CI): CERRADO en código. **PR #131 abierto, sin mergear**
  — https://github.com/HectorOC-e/Trading-journal-v2/pull/131. Falta que el usuario lo revise/mergee.
- Orden acordado de trabajo tras G2/TD-018: (1) TD-018 ✅, (2) drift check ✅ (PR #131 pendiente
  de merge), (3) Ops de STATUS.md §2 (cron cognitive-digest sin agendar, a propósito, no urgente).
- Esta tarea de graphify es tangencial al roadmap — es mantenimiento del grafo de conocimiento,
  no bloquea ningún entregable del producto.

## Qué se estaba haciendo: actualización de graphify tras TD-018

Se corrió `/graphify . --update` para reflejar los cambios de código de TD-018 (router trades.ts
refactorizado en 5 servicios) más 11 documentos modificados/nuevos (ARCHITECTURE.md, CHANGELOG.md,
PROJECT_GUIDE.md, STATUS.md, README.md, y 6 docs de superpowers/specs+plans+handoffs de G2/POST-6/TD-018).

**Problema encontrado:** el primer intento de re-extracción semántica de esos 11 docs produjo un
grafo MÁS PEQUEÑO que el anterior (2904 nodos nuevos vs 3213 existentes → graphify rechazó el
overwrite por la guardia anti-shrink, #479). Diagnóstico: los subagentes de extracción fueron
demasiado "sparse" comparados con la extracción original (ej. ARCHITECTURE.md tenía 120 nodos
antes, y los intentos de re-extracción no alcanzaban esa densidad).

**Decisión tomada:** re-lanzar la extracción semántica de los 11 docs en 5 chunks, con
instrucciones explícitas de densidad ("EXHAUSTIVE, not sparse", listando cuántos nodos tenía
cada doc antes). Los 5 chunks:

| Chunk | Archivos | Estado |
|---|---|---|
| **01** | `docs/ARCHITECTURE.md` (solo, ~120 nodos esperados: FREEZE-P/D/E, ADRs, entidades E1-E20) | ❌ **PERDIDO** — 2 intentos, ambos murieron por límite de sesión/créditos antes de escribir el chunk file |
| 02 | `docs/CHANGELOG.md` + `README.md` | ✅ completo — `graphify-out/.graphify_chunk_02.json` (107 nodos, 146 edges) |
| 03 | `docs/PROJECT_GUIDE.md` + `docs/STATUS.md` | ✅ completo — `graphify-out/.graphify_chunk_03.json` (121 nodos, 158 edges) |
| **04** | 3 docs POST-6 (spec/plan/handoff prop-firm-rulebase) | ❌ **PERDIDO** — 2 intentos, ambos murieron por límite de sesión/créditos antes de escribir el chunk file |
| 05 | 3 docs G2+TD-018 (spec/plan g2-cutover + plan td018-trade-service) | ✅ completo — `graphify-out/.graphify_chunk_05.json` (106 nodos, 144 edges) |

**Se construyó el grafo con lo disponible** (chunks 02+03+05 fusionados + AST de código, con
`force=True` para saltar la guardia anti-shrink): **2904 nodos, 6475 edges, 170 comunidades**.
Esto es CORRECTO para el código (AST no se perdió nada) pero **INCOMPLETO para
ARCHITECTURE.md y los 3 docs POST-6** — esos quedaron con la extracción vieja/pobre en vez de
la nueva densa.

## Estado exacto de archivos ahora mismo

`git status` en la raíz del repo muestra (todo sin commitear, a propósito — NO se debe commitear
hasta terminar la recuperación):

```
 M graphify-out/GRAPH_REPORT.md
 M graphify-out/cache/stat-index.json
 M graphify-out/graph.json
 M graphify-out/manifest.json
?? graphify-out/.graphify_analysis.json
?? graphify-out/.graphify_ast.json
?? graphify-out/.graphify_chunk_02.json      ← reusar, NO regenerar
?? graphify-out/.graphify_chunk_03.json      ← reusar, NO regenerar
?? graphify-out/.graphify_chunk_05.json      ← reusar, NO regenerar
?? graphify-out/.graphify_detect.json
?? graphify-out/.graphify_extract.json
?? graphify-out/.graphify_incremental.json
?? graphify-out/.graphify_old.json            ← snapshot del graph.json ANTERIOR (3213 nodos), útil para diff
?? graphify-out/.graphify_semantic.json       ← merge actual de 02+03+05 (334 nodos, 448 edges)
?? graphify-out/cache/semantic/*.json (10 archivos)  ← cache de extracción semántica
```

**Nota de portabilidad (otra máquina):** si esta carpeta `graphify-out/` no viaja con el repo
(por ejemplo si se clona limpio en otra máquina sin copiar el working tree sucio), todo este
estado intermedio se pierde y hay que empezar el `/graphify . --update` desde cero. Si es la
MISMA máquina/working tree, todo lo de arriba sigue en disco y es reusable.

## Cómo retomar (pasos exactos)

### 1. Verificar que los intermedios siguen en disco
```bash
ls graphify-out/.graphify_chunk_0*.json
```
Si existen 02, 03, 05 → saltar al paso 2 directamente (no hace falta re-detectar ni re-extraer AST).
Si NO existen (repo clonado limpio en otra máquina) → correr `/graphify . --update` desde cero
y seguir el flujo normal del skill (Step 2 detect → Step 3 Part A/B extract → Step 4+ build).

### 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje)

Usar el mismo prompt de subagente que ya se usó para 02/03/05 (ver la skill graphify,
`references/extraction-spec.md`, con las instrucciones de densidad EXHAUSTIVE). Los prompts
exactos para chunk 01 y chunk 04 se armaron así (reconstruir si hace falta, o mirar el historial
de esta conversación si sigue disponible):

**Chunk 01 — `docs/ARCHITECTURE.md`** (chunk 1 de 5 originalmente):
- Archivo: `C:\Users\hosorio\Documents\SAP-HOSORIO\xtern\Trading-journal-v2\docs\ARCHITECTURE.md`
- Densidad esperada: ~120 nodos (FREEZE-P1..P9, FREEZE-D1..D18, FREEZE-E1..E20, FREEZE-EV1..EV10,
  ADR-000..004, subsistemas Memoria/Coach/Behavior/Intervention/Analytics)
- Node ID pattern: `docs_architecture_<entity>` (ej. `docs_architecture_freeze_d9`)
- Escribir a: `graphify-out/.graphify_chunk_01.json`

**Chunk 04 — POST-6 docs (spec+plan+handoff prop-firm-rulebase)** (chunk 4 de 5 originalmente):
- Archivos:
  - `docs/superpowers/specs/2026-07-10-post6-prop-firm-rulebase-design.md`
  - `docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md`
  - `docs/superpowers/handoffs/2026-07-10-post6-prop-firm-rulebase-qa.md`
- Densidad esperada: ~46 nodos combinados
- Node ID pattern: `docs_superpowers_specs_2026_07_10_post6_..._<entity>` etc (path completo)
- Símbolos de código citados en estos docs deben usar sus IDs AST-compatibles
  (ej. `src_domains_trading_services_prop_firm_guard_<funcion>`)
- Escribir a: `graphify-out/.graphify_chunk_04.json`

**IMPORTANTE:** usar `subagent_type="general-purpose"` (NO Explore — es read-only y no puede
escribir el chunk file). Dispatchar ambos en el mismo mensaje (una sola llamada con 2 bloques
Agent) para que corran en paralelo.

### 3. Validar los 2 chunks nuevos
```bash
"$(cat graphify-out/.graphify_python)" -c "
import json
from pathlib import Path
for c in ['01','04']:
    d = json.loads(Path(f'graphify-out/.graphify_chunk_{c}.json').read_text(encoding='utf-8'))
    print(c, len(d.get('nodes',[])), 'nodes,', len(d.get('edges',[])), 'edges')
"
```
Esperar >= 100 nodos para 01, >= 40 para 04. Si algún chunk sale muy sparse otra vez, revisar
el prompt (puede que el subagente no haya recibido la instrucción de densidad correctamente).

### 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`
```bash
"$(cat graphify-out/.graphify_python)" -c "
import json
from pathlib import Path
merged = {'nodes': [], 'edges': [], 'hyperedges': []}
for c in ['01','02','03','04','05']:
    d = json.loads(Path(f'graphify-out/.graphify_chunk_{c}.json').read_text(encoding='utf-8'))
    merged['nodes'].extend(d.get('nodes', []))
    merged['edges'].extend(d.get('edges', []))
    merged['hyperedges'].extend(d.get('hyperedges', []))
merged['input_tokens'] = 0
merged['output_tokens'] = 0
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Merged: {len(merged[\"nodes\"])} nodes, {len(merged[\"edges\"])} edges')
"
```
Esperar ~550-600 nodos totales (334 actuales de 02+03+05 + ~120 de 01 + ~46 de 04 ≈ 500-560).

### 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo

El AST (`.graphify_ast.json`, 178 nodos/628 edges de los 27 archivos de código de TD-018) ya
está en disco y no cambió. Hace falta re-generar `.graphify_extract.json` combinando AST +
semantic nuevo (no solo pisar semantic.json — extract.json es lo que `build_from_json` lee).
Revisar cómo el skill graphify hace ese merge en su Part C (buscar `.graphify_extract.json` en
`~/.claude/skills/graphify/SKILL.md`) y aplicar el mismo patrón, o simplemente re-ejecutar desde
Step 3 Part C en adelante del skill con `.graphify_ast.json` + `.graphify_semantic.json` ya
poblados (evita repetir Part A/B).

Luego reconstruir con build+cluster+export (mismo patrón que se usó antes con `force=True`
porque el nuevo total con 01+04 debería superar los 3213 nodos del `graph.json` viejo, así que
probablemente **no** hará falta `force=True` esta vez — dejar que la guardia anti-shrink lo
verifique solo; si el nuevo total es >= 3213, no hace falta forzar).

### 6. Limpiar intermedios y commitear
```bash
rm -f graphify-out/.graphify_chunk_*.json graphify-out/.graphify_old.json \
      graphify-out/.graphify_ast.json graphify-out/.graphify_semantic.json \
      graphify-out/.graphify_extract.json graphify-out/.graphify_detect.json \
      graphify-out/.graphify_analysis.json graphify-out/.graphify_incremental.json
git add graphify-out/
git commit -m "chore(graphify): update graph after TD-018 (services extraction + docs)

Full re-extraction of 11 changed docs (ARCHITECTURE, CHANGELOG, PROJECT_GUIDE,
STATUS, README, 6 superpowers specs/plans/handoffs) + AST of 27 changed code
files from the TD-018 trade-service extraction.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```
(Ajustar mensaje si aplica; el usuario indicó que él hace merges/pushes — confirmar si quiere
que esto se pushee directo o quede en la rama actual para su revisión. Rama actual al momento
de escribir esto: `feat/td-018-trade-service`, con PR #131 abierto para el drift check — este
commit de graphify probablemente debería ir en una rama/PR separado, no mezclado con #131.)

## Pendientes fuera de graphify (no olvidar)

- **PR #131** (drift check S0/DT-4): abierto, sin mergear. El usuario debe revisarlo y mergearlo
  cuando quiera — ver https://github.com/HectorOC-e/Trading-journal-v2/pull/131
- Tras el merge de #131: seguir con Ops de STATUS.md §2 (cron cognitive-digest), que el usuario
  pospuso a propósito, no es urgente.

## Referencias

- Memoria persistente relevante: `td018-trade-service-status.md`, `g2-cutover-status.md`,
  `workflow-merges-tests-migrations.md` (en `~/.claude/projects/.../memory/`)
- Skill: `~/.claude/skills/graphify/SKILL.md` (Step 3 Part C tiene el merge AST+semantic;
  Step 4+ tiene build/cluster/export)
