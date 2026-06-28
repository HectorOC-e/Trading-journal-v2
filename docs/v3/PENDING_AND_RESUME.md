# PENDING_AND_RESUME.md
### Trading Journal — Pendientes tras v3.2 + prompt para retomar la sesión

> Estado al cierre de la sesión 2026-06-27/28. `main` = `25fcfc5`, limpio y sincronizado, solo la rama `main`. v3.1 cerrado + núcleo de v3.2 completo (5 ejes del compañero cognitivo). Recorrido completo en `docs/v3/RECAP_V3_V32.md`.

---

## ⏳ PENDIENTE

### 1. Ops — acción del usuario (rápido, sin código)
- **🔴 Agendar el cron del digest cognitivo (C4).** La ruta `/api/cron/cognitive-digest` existe y funciona pero **no está programada**. Sin schedule, el digest semanal no se dispara. Añadir en Supabase: pg_cron → pg_net → la ruta, con `Bearer CRON_SECRET` (igual que los demás crons).
- **🟡 Protección de contraseñas filtradas en Supabase Auth.** TODO del audit de seguridad — toggle en el dashboard de Auth (no se puede por migración).

### 2. Roadmap reservado — decisión de producto (no es deuda)
- **A3 — rutas reales de 5 superficies** (`/hoy`, `/operar`, `/analizar`, `/proteger`, `/mejorar`). Refactor de IA grande y cosmético (el agrupado de nav ya da el modelo mental tras flag `tj.v3Shell`). Solo si se quiere cerrar la visión de UX.
- **POST-1..7 — apuestas estratégicas con disparador:**
  - **POST-6** (base de reglas prop-firm como moat) → única "lista" (disparador cumplido tras S9), valor claro para audiencia prop. Sprint dedicado grande.
  - POST-1 realtime/SSE · POST-2 coach multiagente · POST-3 moat cross-user · POST-4 ATR · POST-5 extracción a servicio · POST-7 framework A/B → disparadores **NO activados** (prematuros por su propio diseño).

### 3. Follow-ups menores — sin urgencia
- **Recall episódico por query.** Hoy el coach inyecta los episodios más *salientes*; falta usar el último mensaje del chat como *query* para recuperar los más relevantes (la función `recallEpisodes(query)` ya existe en `memory-episode-service`, solo falta cablearla en `assembleCoachContext`/`coach-agent`). Requiere clave de embeddings; sin ella cae a modo saliencia.
- **Backfill `CoachMemory kind:fact` → `MemoryPattern`.** Conviven sin conflicto; migrar es opcional (P9, conservador).
- **Sesgo de anclaje (#40).** No construido a propósito (detector determinista dudoso, P3). El disposition effect ya está cubierto (`detectHoldingAsymmetry`).

### 4. Pre-existente (anterior a v3)
- **DataTable dev render loop** — re-render infinito solo en dev; columnas responsivas solo en build prod. No afecta prod.

---

## 🔁 PROMPT PARA RETOMAR LA SESIÓN

> Copia y pega esto al iniciar la próxima sesión:

```
Continúo el proyecto Trading Journal. v3.1 está cerrado y el núcleo de v3.2 (los 5 ejes
del compañero cognitivo) está completo y mergeado en main. Lee primero, en este orden:
  1) docs/v3/PENDING_AND_RESUME.md   (pendientes + este prompt)
  2) docs/v3/RECAP_V3_V32.md         (recorrido completo v3 + v3.2)
  3) docs/v3/SESSION_HANDOFF.md      (estado detallado, §0 capacidades del entorno)
  4) docs/v3/ARCHITECTURE_FREEZE.md  (principios/decisiones/entidades congelados)

Confirma al arrancar que tienes acceso a gh, Vercel MCP, Supabase MCP y .env (handoff §0).

Reglas de trabajo (las de toda la sesión anterior):
- Trabaja desde origin/main; una rama por pieza; PR + CI verde + merge yo mismo (gh).
- TDD para dominios puros; migraciones DUALES (SQL en supabase/migrations + modelo
  prisma) con `npx prisma generate`; RLS per-usuario en tablas nuevas.
- Corre la suite vitest COMPLETA antes de cada push (no un subconjunto).
- Re-verifica vs CÓDIGO antes de construir (varias veces la deuda estaba sobre-estimada).
- Verifica vs BD/UI real: smoke con .env para lógica; Playwright + Vercel MCP (bypass SSO)
  para UI; usuario demo ariaoc89@gmail.com (pw S12bVerify!2026, = E2E_USER).
- Node 24 (nvm); binarios vía ./node_modules/.bin/ desde src/.
- Tras cada pieza, resume en 3 ejes: backend / observable-en-UI / razón de ser.

GOTCHA crítico de migraciones: migrate-deploy (ci.yml, job "Apply migrations to
production") corre SOLO en el run del SHA del merge a main (~5 min). `gh run list` justo
tras mergear suele cazar un run anterior — identifica el run por headSha == HEAD y espera
ESE `migrate-deploy: success` antes del smoke post-merge (verifica que la tabla exista).

Lo PRIMERO a decidir conmigo: qué hacer de los pendientes (ver PENDING_AND_RESUME.md).
Mi recomendación de orden de valor:
  (a) Ops: ayudar a agendar el cron del digest cognitivo (1 paso, desbloquea C4).
  (b) Si se quiere capacidad nueva: POST-6 (base de reglas prop-firm, moat) como sprint
      dedicado, o el recall episódico por query (mejora E1, pequeño).
  (c) A3 (rutas reales de 5 superficies) solo si importa cerrar la UX, pese a ser cosmético.
No arranques nada grande sin confirmarlo conmigo primero.
```

---

## 📌 Datos útiles para la próxima sesión
- **Supabase project ref:** `jpojusluihjjsjvcubdp`.
- **Vercel:** projectId `prj_qKKQQLDmGREOf0GYHqA4H95tdsFs`, teamId `team_H1wCGwK6JxmFhFUsBf8zd3M8`. Preview SSO se saltea con `get_access_to_vercel_url` (MCP).
- **Prod:** www.tjournalx.com. **Usuario demo/E2E:** ariaoc89@gmail.com / `S12bVerify!2026` (GH secret `E2E_USER_PASSWORD` igualado). UID demo: `5c69e364-3819-4df7-abf0-f484794250ed`.
- **Migraciones v3.2 aplicadas:** `improvement_scores` (E19), `memory_episodes` (E13, pgvector), `memory_patterns` (E14), `memory_identity` (E15), `feed_ignores` (C3).
- **Crons existentes:** dispatch-events, recompute-insights (+snapshot improvement +patterns), evaluate-commitments, learning-digest, reviews-digest. **Nuevo sin agendar:** cognitive-digest.
