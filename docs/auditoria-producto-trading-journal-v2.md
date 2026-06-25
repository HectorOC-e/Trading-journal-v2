# AUDITORÍA DE PRODUCTO — Trading Journal v2
### Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect

> Auditoría anclada en el código real de los subsistemas críticos: AI Coach (`coach-agent`, `coach-tools`, `coach-service`, `ai-context`), los tres motores de detección (`pattern-detector`, `insights-engine`, `psychology-insights`), el modelo de datos (`schema.prisma`), el motor de reglas (`rules/engine` + automatizaciones), dashboard (`dashboard-analytics`), playbook (`setups`, `setup-health`) y reviews (`weekly-report`, commitments mensuales).

---

## 1. EXECUTIVE SUMMARY

**Veredicto:** Trading Journal v2 es un **journal de élite con una capa analítica determinista sólida**, pero **todavía no es la "capa cognitiva sobre el broker"** que promete la visión. La distancia entre lo que el sistema *registra* y lo que el sistema *hace para que el trader mejore* es el problema central.

Lo que está genuinamente bien (raro de ver):
- **Motor de reglas con bloqueo pre-trade real** (`TRADE_PRE_CREATE` puede impedir la operación: anti-revenge, límite de trades/día, drawdown). Esto es enforcement de verdad, no decoración.
- **Tres motores de insights deterministas y testeables** (18 detectores entre patrones, analytics y psicología) que no dependen de un LLM para producir señal.
- **Separación práctica/real** rigurosa: el dinero demo no contamina el track record.
- **AI Coach agéntico** con 10 herramientas read-only y prompt-caching.
- **Edge-decay básico en Playbook** (WR de últimos 20 trades vs esperado → PAUSE/REVIEW_EDGE).

El problema estructural, en una frase:

> **El sistema es reactivo, episódico y sin memoria. Espera a que el trader pregunte, analiza ventanas fijas sin contexto temporal, y nunca cierra el loop entre "lo que descubrió" y "lo que el trader cambió".**

Las tres deudas que más limitan el impacto:
1. **El AI Coach no tiene iniciativa ni memoria.** Solo responde cuando lo invocan; no detecta deterioro en tiempo real, no recuerda conversaciones previas, no hace seguimiento de compromisos. Nivel actual: **Útil**, no Profesional.
2. **No hay análisis longitudinal.** Casi todo se calcula sobre "todos los trades" o "este mes". No hay ventanas rodantes, no hay "estás peor que hace 3 semanas", no hay detección de cambio de régimen ni de tendencia. El trader no puede ver su *trayectoria de mejora* salvo en Reviews.
3. **El loop de mejora está roto.** Las reviews generan "qué mejorar" como texto libre que nadie vuelve a leer. Solo los *commitments* mensuales se arrastran. No hay verificación de si el trader hizo lo que dijo que haría.

**Si un trader usa esto 6 meses, ¿mejora?** Mejora su **disciplina** (por las reglas con bloqueo y el coste-de-indisciplina visible) y su **registro**. Pero su **toma de decisiones y su edge** mejoran poco, porque el sistema no le muestra su evolución temporal ni convierte insights en cambios verificados.

---

## 2. HALLAZGOS CRÍTICOS (los que mueven la aguja)

**C1 — El coach es reactivo puro.** `streamCoachReply` solo se ejecuta cuando el usuario manda un mensaje. No existe ningún job que vigile trades entrantes y dispare una intervención. Un revenge-trade detectado solo se comenta *si el trader pregunta*. El momento de máximo valor de un coach (el instante del error) se pierde siempre.

**C2 — El coach no tiene memoria entre conversaciones.** `messages` viene solo del hilo actual; no hay tabla de memoria del coach, ni resúmenes, ni "la semana pasada te comprometiste a X". Cada conversación empieza de cero. Imposible construir relación de mentoría.

**C3 — Cero análisis longitudinal / ventanas rodantes.** `buildKpis`, `ai-context`, y los detectores operan sobre el conjunto completo o "este mes". El único sitio con ventana móvil es el Playbook (últimos 20). No hay "tu WR de las últimas 4 semanas vs las 4 anteriores", ni Sharpe rodante, ni detección de tendencia. Sin esto, "mejorar" es invisible.

**C4 — Métricas institucionales ausentes.** No hay **max drawdown** (peak-to-trough de equity), ni **MAE/MFE** (el schema `Trade` no captura excursión adversa/favorable), ni **Sortino/Calmar/Kelly**, ni **distribución de R**, ni **duración del drawdown**. Un prop trader serio espera todas. Hay Sharpe y profit factor, nada más del cuadrante de riesgo.

**C5 — El loop de reviews no se cierra.** `WeeklyReport.saved` guarda `whatWorked`/`toImprove` como texto. No genera compromisos verificables ni se compara con la semana siguiente. El módulo que debería ser el motor de mejora es un diario bonito de una sola pasada.

**C6 — Dualidad Reglas vs Automatizaciones confusa.** Existen `Rule` (nombre+severidad, descriptivo, es lo que ve el coach) y `Automation` (motor real con condiciones/bloqueo). Son dos sistemas. El coach razona sobre las `Rule` descriptivas, pero el enforcement real vive en `Automation`. Riesgo alto de que el trader crea que una "regla" lo protege cuando no ejecuta nada.

**C7 — Captura psicológica opcional → motores ciegos.** `emotionBefore`, `confidenceRating`, `executionQuality`, `fomoFlag` son todos opcionales. Los detectores de psicología exigen 6–15 muestras con emoción. Si el trader no rellena (lo normal), toda la inteligencia psicológica queda muda y no hay nada que lo empuje a rellenarla.

**C8 — Los insights se calculan pero no se historian ni se accionan.** `generateInsights`/`generatePsychologyInsights` se recalculan en cada request. No se persisten, así que no se puede saber si un insight "ansiedad antes de pérdidas" mejoró o empeoró, ni notificar cuando aparece uno nuevo crítico.

---

## 3. HALLAZGOS POR MÓDULO

### 3.1 Dashboard
**Qué hace:** KPIs (WR, PF, expectancy R/$, Sharpe, racha, mejor/peor día), equity curve, P&L por fecha/símbolo/sesión/hora, exposición por cuenta, estado prop-firm, disciplina.

**Débil / faltante:**
- **Max drawdown y duración del DD** ausentes — la métrica nº1 que mira una prop firm.
- **Sin comparativa temporal:** ningún KPI dice "vs periodo anterior" en el dashboard (sí en weekly-report). Falta Δ y sparkline por KPI.
- **Sin distribución de R** (histograma) ni **curva de expectativa por tamaño de muestra** (¿es significativo tu edge?).
- **Sin "¿qué cambió?"**: el dashboard no destaca anomalías ("hoy operaste 3× tu media"). Tiene los datos (`buildHourStats`, streaks) pero no los convierte en alerta.
- **Sin benchmark contra tu propio plan:** WR real vs WR esperado agregado (existe por setup, no global).
- **Visualización faltante:** equity con bandas de drawdown, R-multiple scatter, calendario de P&L (heatmap) — estándar en el sector.

> *"¿Qué esperaría ver aquí un trader rentable que no existe?"* → Su drawdown máximo y actual, su expectancy con intervalo de confianza, y un "estás un 12% por debajo de tu mejor mes; la causa principal es X".

### 3.2 Trades (journaling)
**Qué captura:** precio/stop/target/size, R, P&L, tags, notas, screenshots, eventos (scale-in/parcial), y psicología opcional.

**Débil / faltante:**
- **MAE/MFE no se capturan** → imposible analizar "dejas correr perdedores / cortas ganadores" salvo por tiempo (lo hace `detectHoldingAsymmetry` con `holdMin`, aproximación pobre).
- **Campos inferibles que se piden a mano:** `riskPct`, R esperado, sesión (se puede derivar de `openTime`), dirección vs setup. Más fricción = menos registro.
- **Sin captura de contexto de mercado:** régimen (tendencia/rango), volatilidad, noticias. El trade vive sin su entorno.
- **Psicología post-trade ausente:** se captura `emotionBefore` pero no "¿cómo te sentiste al cerrar?" ni si respetaste el plan (sí hay `executionQuality` pero opcional y sin prompt).
- **Sin checklist de pre-entrada obligatorio** ligado al setup (hay `TradeChecklistResult` en el schema pero no parece forzado en el flujo).
- **Datos potencialmente innecesarios:** `screenshotUrls` múltiple sin OCR/anotación aporta poco hoy.

### 3.3 Psicología
**Qué hace:** 6 detectores deterministas (emoción antes de pérdida, expectancy impulsivo, sobreconfianza, asimetría de holding, emoción de violación, racha limpia).

**Débil / faltante (visión de un trading psychologist):**
- **Sesgos no cubiertos:** anchoring, recency bias, gambler's fallacy, sunk-cost (promediar a la baja), hot-hand, disposición a "vengarse del mercado" tras DD grande, *fear of missing out* solo como flag binario.
- **Sin análisis longitudinal del estado:** `avgPreMood`/`avgEnergy` son promedios globales. No hay "tu mood viene cayendo 3 semanas" ni correlación mood→drawdown temporal.
- **Sin correlación tilt→cascada:** no se detecta la secuencia pérdida→tilt→serie de errores en un mismo día (la unidad real del daño psicológico).
- **Confianza no calibrada en el tiempo:** `detectOverconfidence` es estático; falta curva de calibración (confianza declarada vs WR real por bucket).
- **Todo depende de captura manual opcional** (C7). Sin nudges para registrar, los motores no ven nada.

> *"¿Qué descubriría un psicólogo que el sistema no?"* → Que el daño no son los trades impulsivos sueltos, sino las **cascadas**: un mal trade que dispara 4 más el mismo día. Eso no se mide.

### 3.4 Playbook
**Qué hace (bien):** stats por setup, salud (`calcSetupHealth`), y **motor de sugerencias** (PAUSE / REVIEW_EDGE / setup muerto) sobre WR de últimos 20 trades.

**Débil / faltante:**
- **Edge-decay solo por WR, no por expectancy/avgR.** Un setup puede mantener WR y perder dinero (R cae). Se ignora.
- **Ventana fija de 20, sin significancia estadística.** 20 trades es ruido; falta intervalo de confianza / test de que el deterioro es real, no varianza.
- **Sin tracking de edge en el tiempo (curva):** no se ve la *evolución* del WR/expectancy del setup, solo el snapshot reciente vs esperado.
- **Sin detección de "drift":** operas el setup distinto a como lo definiste (p.ej. R medio se aleja del esperado, sesiones cambian). Hay datos (`computeSessionMatrix`, `computeDirectionBreakdown`) pero no se cruzan con la definición.
- **Sin A/B de variantes** ni correlación setup×régimen×sesión.

### 3.5 Reviews
**Qué hace:** weekly (KPIs + deltas vs semana previa + texto AI whatWorked/toImprove), monthly (con commitments arrastrados del mes anterior — único loop cerrado real), trayectoria de disciplina (el rediseño reciente).

**Débil / faltante:**
- **Weekly no cierra loop (C5):** `toImprove` es texto que muere. No se convierte en compromiso ni se verifica la semana siguiente.
- **Sin "¿cumpliste lo de la semana pasada?"** al inicio de cada review. El monthly lo hace parcialmente; el weekly no.
- **La IA resume, no confronta.** El valor de un coach en review es señalar el patrón incómodo ("dijiste que pararías tras 2 pérdidas y lo rompiste 4 veces"). Eso requiere cruzar commitments × comportamiento real, que no existe en weekly.

> *"¿Mejora un trader tras 6 meses de este módulo?"* → Mejora la **conciencia** (ve sus números semana a semana). Mejora poco el **comportamiento**, porque reflexionar sin compromiso verificado no cambia hábitos. La ciencia conductual es clara: *intención sin seguimiento ≈ ruido*.

### 3.6 Aprendizaje
**Qué hace:** biblioteca + SRS, sesiones de estudio cronometradas, vínculo recurso→setup, "impacto en tu trading", `suggest_study` (cruza peor setup con recursos vinculados).

**Débil / faltante:**
- **"Impacto en el trading" probablemente no es causal.** Vincular recurso a setup y mostrar WR del setup no demuestra transferencia. Falta medir WR del setup *antes vs después* de estudiar/dominar el recurso.
- **SRS no se adapta al rendimiento real:** los intervalos crecen por repaso, no porque el setup asociado mejore. El loop "estudio → mejoro en el mercado → menos repaso necesario" no está cerrado.
- **Sin extracción de lecciones desde los trades:** los errores recurrentes no generan automáticamente una tarjeta de estudio.

### 3.7 Reglas
**Qué hace (fuerte):** automatizaciones con triggers (`PRE_CREATE`/`CREATED`/`CLOSED`/`UPDATED`), condiciones ricas (riskPct, drawdownPct, minsSinceLastLoss, tradesToday, winRate…), acciones (notificar/crítico/recordar/bloquear/tag), plantillas.

**Débil / faltante:**
- **Dualidad Rule/Automation (C6)** — confusa y peligrosa.
- **Reglas que deberían existir y no hay plantilla:** stop diario de pérdidas en $ (no solo %), límite de pérdida semanal, "no operar con energía < 3", "no aumentar tamaño tras pérdida", "máximo 1 setup nuevo por semana", cool-down tras 2 pérdidas *intradía*, bloqueo de viernes-tarde si `friday-bias` está activo.
- **Sin reglas sugeridas por los insights:** el sistema *detecta* revenge trading pero no ofrece "¿activo la regla anti-revenge de 15 min?". El puente detección→protección no existe.
- **Sin enforcement de protección de capital a nivel cuenta** que congele *todas* las cuentas tras un DD agregado.

### 3.8 Cuentas / Prop firms
**Qué hace:** tipos, fases, divisa, límites DD diario/total, objetivo %, bloqueo, FX a moneda base, `buildPropFirmStatus`.

**Débil / faltante:**
- **Sin proyección a objetivo:** "a tu ritmo actual (y tu varianza), probabilidad de pasar la fase / tiempo estimado / riesgo de violar DD primero" — el cálculo de prop firm que más importa.
- **Sin simulación de riesgo de ruina** dado tu expectancy y tamaño.
- **DD diario sin reset horario configurable** por prop firm (cada firma corta a hora distinta).
- **Sin "trade máximo permitido hoy"** dado lo que queda hasta el límite diario (position sizing defensivo).
- **Sin agregación multi-cuenta de riesgo correlacionado** (mismo símbolo en 3 cuentas = 3× exposición real).

### 3.9 Notificaciones
**Qué hace:** centro de eventos (cuenta bloqueada, regla disparada, review vencida, digests email).

**Débil / faltante:**
- **Reactivas, no inteligentes.** Notifican lo que pasó, no lo que está por pasar ("llevas 2 pérdidas, históricamente la 3ª es impulsiva").
- **Riesgo de fatiga sin priorización adaptativa:** no hay aprendizaje de qué notificaciones el usuario ignora.
- **Sin "momento de coaching" empujado**: la notificación de mayor valor —"para ahora"— no existe en tiempo real.

### 3.10 Etiquetas
**Qué hace:** catálogo con semántica (violation/quality), colores, system tags bloqueados.

**Débil / faltante:**
- **Taxonomía manual, sin descubrimiento:** no sugiere tags nuevos desde clusters de notas (hay embeddings de notas — infrautilizados aquí).
- **Sin tag analytics dedicado:** "tus trades 'A+' rinden +1.8R; tus 'dudé' rinden −0.4R" debería ser una vista de primer nivel.
- **Sin auto-tagging por IA** de notas (FOMO/duda/plan) más allá de los flags manuales.

### 3.11 Mercados
**Qué hace:** watchlist (símbolo+nombre), usada como contexto del coach.

**Débil / faltante:** prácticamente informativo. **Pantalla de bajo valor hoy.** Sin estadística por instrumento cruzada con tu edge ("tu WR en US30 es 38% — considera quitarlo"), sin correlaciones, sin sesión óptima por símbolo. Tiene los datos para ser útil y no los usa.

---

## 4. HALLAZGOS DEL AI COACH (sección central)

### 4.1 Qué hace actualmente (exacto, leído del código)
- **Chat agéntico** (`coach-agent.ts`) sobre Anthropic (streaming tool-use nativo) u OpenAI/OpenRouter, con fallback a contexto estático si el modelo no soporta tools. Máx 5 rondas de tools.
- **Contexto estático rico** (`buildSystemPrompt` + `ai-context.ts`): rendimiento, comportamiento/disciplina, aprendizaje, metas, últimos 10 trades, **patrones detectados**, cuentas, setups, retiros, reglas, psicología agregada, watchlist.
- **10 herramientas read-only** (`coach-tools.ts`): detalle de cuenta/setup/trade, `search_trades`, `get_period_stats`, `semantic_search` (sobre notas, con embeddings), agenda de estudio, `suggest_study`, búsqueda semántica de recursos, notificaciones recientes.
- **Prompt-caching** del bloque estático. **Separación práctica/real** en las métricas. Guía sobre la app pero **no ejecuta acciones** (solo lectura).

### 4.2 Qué debería hacer (faltante)
- **Proactividad:** vigilar trades/sesiones e intervenir sin que le pregunten.
- **Memoria persistente:** recordar conversaciones, compromisos y su cumplimiento.
- **Escribir/actuar (con permiso):** proponer y crear una regla, marcar una review, abrir una tarjeta de estudio, etiquetar trades. Hoy es de solo-lectura.
- **Razonamiento longitudinal:** comparar ventanas temporales, no solo snapshots.
- **Detección en tiempo real** de deterioro (ver 4.4).
- **Cuantitativo de verdad:** intervalos de confianza, significancia, proyecciones de prop firm, riesgo de ruina.
- **Seguimiento de objetivos** activo entre sesiones.

### 4.3 Nivel actual: **ÚTIL** (no Profesional, no Elite)
**Justificación:** tiene tools read-only, contexto real y separación práctica/real (lo saca de "Juguete"). Pero le faltan los tres atributos de un coach Profesional: **iniciativa, memoria y capacidad de actuar**. Hoy es un *analista que responde bien cuando lo consultas*, no un *coach que te acompaña*. Un coach Profesional intervendría en el momento del error; uno Elite habría aprendido tu patrón y lo habría prevenido.

### 4.4 Capacidades críticas faltantes
Cruzando lo que el sistema *ya detecta en batch* contra lo que el coach *hace en vivo*:

| Capacidad | ¿Existe motor? | ¿Coach lo usa proactivo? |
|---|---|---|
| Detección de patrones | ✅ (5 detectores) | ❌ solo si preguntas |
| Revenge trading | ✅ pattern + flag | ❌ no en tiempo real |
| Sobreoperación | ✅ intraday-decay/overtrading | ❌ |
| Deterioro psicológico | ⚠️ estático | ❌ sin tendencia |
| Edge decay (playbook) | ✅ WR last-20 | ❌ no avisa, no por R |
| Cambio de régimen de mercado | ❌ | ❌ |
| Drift del playbook | ❌ | ❌ |
| Detección de mejoras recientes | ❌ (sin longitudinal) | ❌ |
| Hábitos ganadores | ⚠️ clean-streak | ❌ no refuerza |
| Cascada/tilt intradía | ❌ | ❌ |
| Calibración de confianza temporal | ❌ | ❌ |
| Riesgo de ruina / proyección prop | ❌ | ❌ |

**Conclusión:** el sistema **detecta más de lo que el coach aprovecha**. La inteligencia existe en batch pero el coach no la consume proactivamente ni la historia.

### 4.5 Cómo sería una versión 10x (coach + psicólogo + quant + mentor prop)
1. **Demonio en tiempo real:** hook en `TRADE_CREATED`/`TRADE_CLOSED` que corre los detectores sobre la ventana del día y, si dispara crítico (revenge, 3ª pérdida, oversizing), emite una **intervención** ("Para. Llevas 2 pérdidas y acabas de doblar tamaño — es tu patrón nº1 de fuga de capital. ¿Cerramos por hoy?").
2. **Memoria de coach** (tabla `CoachMemory`): compromisos, su estado, hechos del trader, resúmenes de conversación. Cada sesión arranca con "la semana pasada te comprometiste a X — lo cumpliste 3/5 días".
3. **Acción con permiso:** "Te propongo activar la regla anti-revenge (bloqueo 15 min). [Activar]". Convierte insight→protección en un clic.
4. **Quant real:** expectancy con IC, significancia del edge-decay, proyección de fase prop ("72% de pasar en ~18 sesiones; tu mayor riesgo es DD diario los martes").
5. **Longitudinal por defecto:** todo razonamiento compara ventana actual vs anterior. "Tu disciplina subió 14 pts en 3 semanas — esto funciona, no lo sueltes."
6. **Psicólogo:** detecta cascadas y tilt, calibra confianza, y hace *check-ins* de estado pre-sesión que bloquean ejecución en rojo.
7. **Mentor prop:** conoce las reglas de cada firma y traduce tu comportamiento a "esto invalida tu cuenta".

---

## 5. RIESGOS DE PRODUCTO

- **R1 — "Pantalla bonita, hábito ausente":** mucho registro, poco cambio conductual verificado → el trader percibe esfuerzo sin mejora y abandona (ver §6).
- **R2 — Captura psicológica opcional colapsa el diferencial IA:** sin datos de emoción, el 60% de los motores quedan mudos y el producto se ve como "otro journal".
- **R3 — Dualidad Reglas/Automatizaciones:** falsa sensación de protección; un trader que cree estar bloqueado y no lo está es un incidente de confianza grave.
- **R4 — Coste/latencia IA:** el coach reconstruye contexto pesado por request (`buildTraderContext` hace ~12 queries). Proactividad + memoria sin caché/colas puede disparar coste.
- **R5 — Sobre-notificación:** añadir alertas inteligentes sin priorización adaptativa = fatiga = silenciar todo.
- **R6 — Métricas que parecen causales y no lo son** ("impacto del aprendizaje"): erosionan credibilidad con usuarios sofisticados.

---

## 6. OPORTUNIDADES DE DIFERENCIACIÓN

1. **El coach que interviene en el momento del error** (no el que resume después). Casi ningún journal lo hace.
2. **Loop conductual cerrado y verificado:** compromiso → enforcement → "lo cumpliste". Esto es lo que de verdad cambia traders.
3. **Quant de prop firm:** proyección de paso de fase y riesgo de ruina — lenguaje que ningún journal generalista habla.
4. **Memoria de mentoría:** un coach que te conoce en el mes 6 mejor que en el día 1.
5. **De detección a protección en un clic:** insight → regla activable. El puente que nadie construye.

---

## 7. ROADMAP PRIORIZADO

### QUICK WINS (alto impacto, bajo esfuerzo) — ~2 sprints
1. Δ vs periodo anterior + sparkline en cada KPI del dashboard.
2. **Max drawdown** y DD actual en KPIs (ya tienes equity curve).
3. Histograma de distribución de R.
4. Calendario heatmap de P&L mensual.
5. Unificar nomenclatura Rule/Automation en la UI (un solo concepto "Regla", con badge "bloquea/avisa").
6. Plantillas de regla faltantes: stop diario en $, pérdida semanal, cool-down 2 pérdidas intradía, no-aumentar-tras-pérdida.
7. CTA "Activar regla anti-revenge" donde el insight de revenge se muestra.
8. En weekly review: bloque "¿Cumpliste tu 'a mejorar' de la semana pasada?" (arrastrar como en monthly).
9. Nudge para rellenar `emotionBefore` cuando falta (al cerrar trade).
10. Tag analytics: tabla "P&L/R medio por tag".
11. Mercados: "tu WR por símbolo" + sugerencia de podar instrumentos perdedores.
12. Derivar `session`/`riskPct` automáticamente del `openTime`/stop.
13. Coach: inyectar comparativa "esta semana vs anterior" en el contexto.
14. Persistir insights con timestamp (habilita histórico sin UI nueva todavía).
15. Proyección simple prop firm: "a tu ritmo, X sesiones para el objetivo".

### MEDIUM IMPACT — 1–2 trimestres
16. Ventanas rodantes (4w vs 4w previas) como primitiva compartida en analytics.
17. Sharpe/Sortino/Calmar/Kelly rodantes.
18. Edge-decay del Playbook por **expectancy/avgR** + significancia, no solo WR.
19. Curva de evolución de cada setup (WR/expectancy en el tiempo).
20. Calibración de confianza (declarada vs WR real por bucket).
21. Detección de **cascadas intradía** (pérdida→serie de errores) en psicología.
22. Memoria de coach (compromisos + cumplimiento) — tabla + inyección en prompt.
23. Coach con acción-con-permiso: crear regla / marcar review / crear tarjeta.
24. Reglas sugeridas automáticamente desde insights críticos.
25. Riesgo de ruina y "trade máximo permitido hoy" dado límite diario.
26. MAE/MFE: capturar (manual o import) y analizar gestión de salida.
27. Auto-tagging IA de notas (FOMO/duda/off-plan) además de flags.
28. Medir transferencia real del aprendizaje (WR del setup antes/después de dominar recurso).
29. Check-in de estado pre-sesión que puede bloquear ejecución en rojo.
30. Priorización adaptativa de notificaciones (aprende qué ignoras).
31. Reset de DD diario configurable por prop firm.
32. Riesgo correlacionado multi-cuenta (mismo símbolo).
33. Equity curve con bandas de drawdown + scatter de R.
34. Digest semanal del coach proactivo (resumen + 1 compromiso).

### GAME CHANGERS — apuestas estratégicas
35. **Coach en tiempo real** (demonio sobre triggers): intervención en el instante del error.
36. **Loop conductual cerrado y verificado** como columna vertebral del producto.
37. **Detección de cambio de régimen de mercado** y rendimiento por régimen.
38. **Memoria de mentoría longitudinal** (el coach que te conoce a los 6 meses).
39. **Motor cuantitativo de prop firm** (probabilidad de paso, tiempo, riesgo de invalidación).
40. **Detección de drift del playbook** (operas distinto a como lo definiste).
41. **"Insight → protección" como flujo central:** todo hallazgo crítico ofrece una acción.
42. **Modelo de mejora del trader:** un score de trayectoria que predice y explica tu progreso.

---

## 8. TOP 50 MEJORAS ORDENADAS POR ROI

ROI = (impacto en ganar dinero / preservar capital / disciplina / aprendizaje) ÷ esfuerzo. Orden descendente.

| # | Mejora | Por qué (palanca) | Esfuerzo |
|---|---|---|---|
| 1 | Coach proactivo en tiempo real sobre triggers de trade | Captura el momento del error = máxima preservación de capital | Alto |
| 2 | Loop conductual cerrado: compromiso→enforcement→verificación | Lo único que cambia hábitos de verdad | Medio |
| 3 | Max drawdown + DD actual en dashboard | Métrica nº1 de supervivencia; trivial con equity curve existente | Bajo |
| 4 | CTA insight→activar regla (empezando por anti-revenge) | Convierte detección en protección en 1 clic | Bajo |
| 5 | "¿Cumpliste lo de la semana pasada?" en weekly review | Cierra el loop del módulo de mejora | Bajo |
| 6 | Memoria de coach (compromisos + cumplimiento) | Habilita mentoría real y seguimiento | Medio |
| 7 | Ventanas rodantes como primitiva (4w vs 4w) | Desbloquea TODO el análisis longitudinal | Medio |
| 8 | Plantillas de regla de protección de capital ($ diario/semanal, cool-down) | Protección directa, bajo coste | Bajo |
| 9 | Δ vs periodo anterior + sparkline por KPI | Hace visible la mejora; barato | Bajo |
| 10 | Nudge para captura de `emotionBefore` al cerrar | Alimenta el 60% de motores hoy mudos | Bajo |
| 11 | Unificar Reglas/Automatizaciones en UI | Elimina falsa sensación de protección (riesgo de confianza) | Bajo |
| 12 | Edge-decay por expectancy/avgR + significancia | Evita seguir un setup que mantiene WR y pierde dinero | Medio |
| 13 | Coach con acción-con-permiso (crear regla/review/tarjeta) | Pasa de "Útil" a "Profesional" | Medio |
| 14 | Reglas auto-sugeridas desde insights críticos | Puente detección→protección sistemático | Medio |
| 15 | Proyección de paso de fase prop firm | Lenguaje que importa al público objetivo | Medio |
| 16 | Detección de cascadas intradía (tilt) | Mide la unidad real del daño psicológico | Medio |
| 17 | Riesgo de ruina + "trade máximo hoy" según límite diario | Position sizing defensivo accionable | Medio |
| 18 | Persistir insights con timestamp | Prerrequisito de "mejoró/empeoró" y de alertas | Bajo |
| 19 | Histograma de distribución de R | Lectura de edge que el WR oculta | Bajo |
| 20 | Tag analytics (P&L/R por tag) | Convierte etiquetas en señal accionable | Bajo |
| 21 | Curva de evolución por setup | Ver edge en el tiempo, no snapshot | Medio |
| 22 | Sortino/Calmar/Kelly rodantes | Cuadrante de riesgo institucional | Medio |
| 23 | Calibración de confianza (declarada vs real) | Corrige sobreconfianza con dato | Medio |
| 24 | Mercados: WR por símbolo + podar perdedores | Mejora directa de expectancy agregada | Bajo |
| 25 | Inyectar comparativa temporal en contexto del coach | Respuestas longitudinales sin motor nuevo | Bajo |
| 26 | Calendario heatmap de P&L | Patrón temporal de un vistazo | Bajo |
| 27 | Derivar campos (sesión, riskPct) automáticamente | Menos fricción = más registro = más señal | Bajo |
| 28 | Digest semanal proactivo del coach (con 1 compromiso) | Loop de hábito + retención | Medio |
| 29 | Detección de "mejora reciente" + refuerzo | Behavioral: reforzar lo que funciona | Medio |
| 30 | Check-in de estado pre-sesión (puede bloquear) | Previene el día-tilt antes de empezar | Medio |
| 31 | Medir transferencia real del aprendizaje (antes/después) | Hace honesto y útil el módulo Aprendizaje | Medio |
| 32 | Drift del playbook (operado vs definido) | Detecta la fuga silenciosa de edge | Alto |
| 33 | Detección de cambio de régimen + rendimiento por régimen | Contextualiza el edge | Alto |
| 34 | Equity con bandas de DD + scatter de R | Visual institucional | Medio |
| 35 | MAE/MFE captura + análisis de salidas | Optimiza gestión de trade | Alto |
| 36 | Priorización adaptativa de notificaciones | Evita fatiga, sube relevancia | Medio |
| 37 | Auto-tagging IA de notas | Escala la captura cualitativa | Medio |
| 38 | Reset DD diario configurable por prop firm | Exactitud de riesgo prop | Bajo |
| 39 | Riesgo correlacionado multi-cuenta | Exposición real, no nominal | Medio |
| 40 | Sesgos extra en psicología (sunk-cost, recency, anchoring) | Cobertura conductual más completa | Medio |
| 41 | Score de trayectoria del trader (modelo de mejora) | Diferenciador y motor de engagement | Alto |
| 42 | Errores recurrentes → tarjeta de estudio automática | Cierra trading→aprendizaje | Medio |
| 43 | Benchmark global WR real vs esperado | "¿Estás a la altura de tu plan?" | Bajo |
| 44 | Detección de anomalía diaria en dashboard ("hoy 3× tu media") | Alerta temprana de sobreoperación | Bajo |
| 45 | SRS adaptado al rendimiento de mercado | Estudio dirigido por resultados reales | Alto |
| 46 | Política de retiros sugerida (ya detectas el impacto) | Protege interés compuesto | Bajo |
| 47 | Coach: significancia estadística en sus afirmaciones | Credibilidad cuantitativa | Medio |
| 48 | Onboarding que fuerza 1 setup + 1 regla + captura psico | Activa los motores desde el día 1 | Medio |
| 49 | Vista "coste de indisciplina" temporal (tendencia) | Refuerza el dolor del mal hábito | Bajo |
| 50 | A/B de variantes de setup | Optimización fina de edge | Alto |

---

## Retención (resumen del análisis pedido)
- **Por qué abandonan a los 30 días:** registran mucho y no *ven* que mejoran (sin longitudinal), el coach no toma iniciativa (hay que acordarse de preguntarle), y reflexionar en reviews no cambia su semana. Esfuerzo percibido > valor percibido.
- **Por qué se quedarían años:** un coach que interviene en el momento justo, recuerda sus compromisos y le muestra su trayectoria de mejora mes a mes. **Momento "aha" faltante:** "el sistema me paró antes de que tirara la cuenta" y "veo que soy mejor trader que hace 3 meses, y por qué".

---

## Siguiente paso sugerido

¿Quieres que convierta alguno de estos bloques en un spec accionable (con la skill de brainstorming → plan)? Mi recomendación para empezar, por ROI/esfuerzo: **#3 (max drawdown), #4 (insight→regla), #5 (loop de review) y #10 (nudge de captura psico)** como primer sprint de quick wins, y en paralelo arrancar el diseño de **#7 (ventanas rodantes)** porque desbloquea casi todo lo longitudinal.
