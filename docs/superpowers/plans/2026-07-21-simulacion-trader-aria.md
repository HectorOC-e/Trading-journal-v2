# Plan de simulación de trader profesional en aria

> Acordado el 2026-07-21. **Ejecutable por fases**: cada una entrega valor sola y se puede parar
> entre medias. Prompt de arranque en `docs/STATUS.md` §7.

**Objetivo.** Validar de punta a punta, con un usuario delante, las funcionalidades que v3 promete
y que **nunca se han ejercitado**: la captura psicológica, el loop conductual, las 5 features de
IA activas y las superficies analíticas.

**Cuenta.** `aria` (`ariaoc89@gmail.com`, UID `5c69e364-3819-4df7-abf0-f484794250ed`) es el banco
de simulación del proyecto por decisión explícita. Datos sintéticos ahí **no contaminan la
muestra: son su propósito**.

---

## Principio rector: dos actividades distintas, no una

El error a evitar es meter 32 trades a mano. Los formularios 6 al 32 no validan nada nuevo —
repiten el mismo flujo — y son ~70 interacciones donde cualquiera puede romperse a mitad.

| Actividad | Cómo | Cuántos trades |
|---|---|---|
| **Validar los inputs** (¿aparece el nudge? ¿funciona el pre-fill? ¿los chips viajan?) | A mano, Playwright, captura en cada punto | 5–6 |
| **Alcanzar los umbrales** (que los detectores tengan de qué disparar) | Por script, reusando el generador de #151 | ~30 |

Mezclarlas cuesta horas y no compra información.

---

## Fase 0 — Limpiar el ruido y fijar la línea base

Los 85 trades de `seed:psych` asignan psicología por tiradas **independientes** (`revengeFlag`
salía de un `rnd()`, no de haber perdido antes). No tienen correlación temporal, así que sólo
diluyen cualquier patrón que introduzcamos. **Los 52 manuales se conservan**: su vacío de campos
cualitativos es la única evidencia que existe de cómo se comportó un humano ante este producto.

- [ ] **Exportar los 52 manuales a CSV antes de tocar nada** (evidencia irrepetible).

```sql
select id, date, open_time, symbol, direction, pnl, size, tags, status
from trades
where user_id = '5c69e364-3819-4df7-abf0-f484794250ed'
  and not ('seed:psych' = any(tags))
order by date, open_time;
```

- [ ] **Borrar sólo los sembrados.** El script trae su propio `--undo`, que es preferible a un
  DELETE a mano porque ya está probado:

```bash
cd src && node scripts/seed-psych-trades.mjs --undo
```

- [ ] **Verificar la línea base.** Debe quedar exactamente esto (medido el 2026-07-21):

| Métrica | Esperado |
|---|---|
| Trades | 52 |
| Perdedores | 23 |
| Pares tras-pérdida | 22 (1 ofensor) |
| Días operados | 30 (6 con 3+ trades) |
| Trades tardíos (3º+ del día) | 7 |
| Tamaño medio | 0.97 |

- [ ] **Limpiar los derivados**, que quedan huérfanos y mentirían: `insights`, `commitments`,
  `reinforcements`, `improvement_scores`, `domain_events`, `feed_ignores`, y las `rules` con
  `source_commitment_id`/`source_insight_id` no nulos.

> ⛔ **No borrar el usuario, sus cuentas ni sus setups.** El job `E2E (authenticated)` de CI corre
> 10/10 contra aria; si desaparece la estructura, CI se pone rojo por algo ajeno al cambio.

---

## Fase 1 — Validar la captura, a mano (aquí está el valor)

Skill: `webapp-testing` (Playwright). Prod `www.tjournalx.com`, credenciales en `STATUS.md` §6.
**Captura de pantalla en cada punto marcado.** Todo trade lleva el tag `sim:<fecha>`.

**5–6 trades, registrados y cerrados uno a uno.** No más: a partir del sexto se repite el flujo.

### 1.1 Registro

- [ ] ¿Se **deriva sola la sesión** desde la hora de apertura (`deriveSession`)?
- [ ] ¿Se **deriva solo el `riskPct`** en servidor (`deriveRiskPct`)? Comprobar en BD, no en la UI.
- [ ] Al escribir una nota, ¿aparecen las **sugerencias de tags** (`NoteTagSuggestions`)? ¿aciertan?
- [ ] Al elegir emoción, ¿aparece el **`EmotionInsight`** con el dato de retorno
      ("tu WR ansioso es X% en N trades")? **Con 52 trades sin emoción, lo esperable es que NO
      aparezca o diga n=0** — eso es correcto, no un fallo. Debería empezar a aparecer hacia el
      3er o 4º trade simulado con la misma emoción.
- [ ] ¿Se auto-taggea **"Off-plan"** al fallar la checklist (`evaluateChecklist`)?

### 1.2 Cierre

- [ ] ¿Aparece el **nudge de emoción a 1 toque**? *(PR #141, mergeado el 16-jul, ejercitado **cero**
      veces. Esta es su primera prueba real.)*
- [ ] ¿Los **chips viajan con el cierre**, sin mandarte a otra pantalla a rellenarlo?
- [ ] Verificar que **no pisa** una emoción ya registrada al abrir (es la garantía de diseño).
- [ ] ¿Están y se guardan los inputs de **MAE / MFE** y el selector de **régimen**?
      ⚠️ Viven en el **cierre** (`trade-detail-panel`), **no** en el registro — un ítem del
      checklist estuvo mal ubicado meses por esto.

### 1.3 Fricción (lo más cercano a la pregunta de producto)

- [ ] Anotar **cuántos clics/campos** cuesta un trade completo con psicología, y en qué punto
      uno lo abandonaría. Esta observación vale más que cualquier assert: los 52 trades reales
      tienen **0 campos cualitativos**, y hasta saber si eso fue un import o fricción de diseño,
      no sabemos si el producto funciona.

---

## Fase 2 — Volumen con patrón, por script

**No a mano.** Reusar la lógica de `src/__tests__/support/behavior-scenario.ts` (#151), que ya
genera correlación temporal real, adaptándola para escribir en prod con el tag `sim:<fecha>`.

**Objetivo dimensionado** (calculado sobre la línea base de 52, no estimado):

| Detector | Umbral | Qué hace falta añadir |
|---|---|---|
| `intraday-decay` | ≥10 tempranos, ≥10 tardíos, caída ≥12 pts | ~8 días × 4 trades → tardíos 7 → 23 |
| `off-plan` | ≥20 % del total | **~17 trades** con tag `Off-plan`/`Impulsivo` |
| `revenge-trading` | ≥30 % de post-pérdida | **~12 revanchas** tras pérdida (base: 1/22) |
| `oversizing` | ≥20 % de post-pérdida | **~8 trades** con tamaño >2× la media (media 0.97) |

**≈32 trades sobre 8–9 días, 4 por día.** Con menos no dispara nada, y eso **no sería un hallazgo**.

- [ ] Generar y escribir los ~32 trades, todos tageados.
- [ ] **Verificar la correlación antes de seguir**: contar los pares pérdida→revancha en orden
      cronológico real. Si la tasa no sale, el problema es la simulación, no el código. Es
      exactamente el error que produjo la conclusión falsa de "patrones planos".

---

## Fase 3 — El loop conductual

- [ ] Disparar el cron `recompute-insights` (o esperar su horario).
- [ ] `/analytics` → **`BehaviorLoopPanel`**: ¿aparecen los insights? ¿con su badge
      **"confianza X% · n=Y"**? (sólo los detectores con `stat`: intraday-decay,
      weekday-discipline, overconfidence).
- [ ] ¿Se activa el **CTA de comprometerse**? Crear un compromiso.
- [ ] **Respaldarlo con una regla** (`linkRule`). ⚠️ **Con `off-plan` debe fallar** con
      `NotEnforceableError` — es correcto, no es prevenible pre-trade. **3 de los 4 son
      respaldables, uno no.** Reportarlo como bug sería un falso positivo.
- [ ] `/reglas`: ¿aparece la regla con su badge de origen "desde compromiso"?
- [ ] Cerrar la ventana del compromiso → ¿se genera el **refuerzo**? El correctivo siempre es
      visible; el positivo sigue **razón variable** (visible en los triangulares 0,1,3,6,10 —
      que no aparezca en el 2º no es un fallo).
- [ ] **Intervención:** provocar 3 pérdidas seguidas el mismo día. ¿Salta la cascada
      (fast-path ≤2 s)? Sería la **primera fila de `interventions`**, que hoy está vacía y por eso
      `OI-7.3` es no-validable.
- [ ] Comprobar que los eventos de la outbox quedan en **`pending`** (el dispatcher está
      des-agendado hasta el primer consumidor de S4 — acumular es lo correcto hoy).

---

## Fase 4 — Las 5 features de IA activas

- [ ] **Paso 0 obligatorio:** `/perfil` → panel **Diagnóstico IA**. Confirmar que cada feature
      resuelve con `source: user` o `env`. **Si sale `none`, parar y decirlo** — sin clave, las
      features son inertes y todo lo que siga no prueba nada. *(aria tiene fila en
      `user_ai_configs` y `user_ai_settings`, así que hay algo configurado; falta confirmar que
      resuelve.)*
- [ ] `ai_chat` — el coach. ¿Responde con contexto real del trader (sus setups, su racha)?
      ¿Propone memoria y la deja en estado `proposed` para que la confirme el usuario
      (frontera anti-poisoning de ADR-003)?
- [ ] `analytics_insights` — la capa de narración sobre los insights deterministas.
- [ ] `psychology_analysis` — `/psicologia`.
- [ ] `weekly_reviews` — `/reviews`: generar una review semanal y una mensual.
- [ ] `embeddings` — búsqueda semántica sobre las notas. Requiere notas con contenido real:
      **depende de la Fase 1**, donde se escriben a mano.

---

## Fase 5 — Superficies analíticas

Recorrer y capturar, comprobando que cada una refleja los datos nuevos:

- [ ] `/dashboard` — KPIs, pestañas (portfolio, operador, playbook, disciplina).
- [ ] `/analytics` — cuadrante institucional, curvas, el panel del loop.
- [ ] `/psicologia` — sesgos, calibración, check-in.
- [ ] `/aprendizaje` — recursos, SRS, transferencia.
- [ ] `/playbook`, `/mercados`, `/etiquetas`, `/retiros`, `/cuentas`, `/notificaciones`.
- [ ] `/trades` — tabla, filtros, detalle, export.

---

## Al terminar

- Resumir en 3 ejes: **backend / observable-en-UI / razón de ser**.
- Actualizar `docs/STATUS.md` §1 con lo encontrado.
- **Anotar explícitamente lo que no se pudo verificar.** Una fase saltada que se reporta como
  hecha es peor que no haberla corrido.

**Lo que esta simulación prueba:** que el mecanismo funciona de punta a punta. Cierra la
verificación live de `S2/OI-1`, `S2/OI-2`, `S2/OI-4` y las de `OI-8.5`/`OI-9.7`/`OI-13.6`.

**Lo que NO prueba:** que a un trader le compense el gesto de capturar psicología. Eso sólo lo
contesta alguien operando de verdad, con dinero y sin saber el resultado. No escribirlo como si
lo hubiera probado.
