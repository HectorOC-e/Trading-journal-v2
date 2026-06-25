# MASTER_PRD.md
### Trading Journal v3 — Product Requirements Document integral

> Documento 2/8. Convierte **todos** los hallazgos de la auditoría en Epics → Capabilities → User Stories → Acceptance Criteria.
> La **§13 Matriz de cobertura** garantiza que C1–C8 y los 50 ítems por ROI tienen representación. Formato de criterios: Gherkin-lite (Dado/Cuando/Entonces).

---

## 0. Índice de Epics

| Epic | Nombre | Superficie/Subsistema | Hallazgos primarios |
|---|---|---|---|
| **E1** | Behavior Engine (loop de mejora) | Subsistema | C5, C8, #2, #5, #14, #29, #49 |
| **E2** | AI Coach v3 (memoria·proactividad·acción) | Subsistema | C1, C2, #1, #6, #13, #25, #28, #47, §4 |
| **E3** | Analítica longitudinal | ANALIZAR | C3, #7, #9, #16, #18, #21, #44 |
| **E4** | Métricas institucionales & visualización | ANALIZAR/HOY | C4, #3, #19, #22, #26, #34, #35, #43 |
| **E5** | Captura de trade v3 | OPERAR | C7, #10, #27, #30, #35, #37 |
| **E6** | Protección, riesgo & prop | PROTEGER | C6, #8, #11, #15, #17, #31, #38, #39, #46 |
| **E7** | Inteligencia psicológica v3 | OPERAR/ANALIZAR/HOY | #16, #23, #30, #40 |
| **E8** | Inteligencia de Playbook | MEJORAR | #12, #21, #32, #50 |
| **E9** | Transferencia de aprendizaje | MEJORAR | #28, #31, #42, #45 |
| **E10** | Edge por instrumento & tags | ANALIZAR | #20, #24, #37 |
| **E11** | Superficie HOY & notificaciones inteligentes | HOY | #28, #36, #44 |
| **E12** | Design System v3 & re-arquitectura de superficies | Transversal | §UX, todo el roadmap |
| **E13** | Onboarding & activación | Transversal | #48 |
| **E14** | Regímenes & modelo de mejora del trader | ANALIZAR | #33, #41 |

---

## E1 — Behavior Engine (núcleo del producto)

**Visión:** ningún hallazgo muere como texto. Todo insight puede convertirse en **compromiso**, que puede respaldarse con una **regla**, se **sigue**, se **verifica** y se **refuerza**.

### Capabilities
- **E1.C1** Crear compromiso desde cualquier insight (1 clic).
- **E1.C2** Vincular un compromiso a una regla de enforcement.
- **E1.C3** Verificación automática del cumplimiento por ventana temporal.
- **E1.C4** Refuerzo (positivo/correctivo) según resultado.
- **E1.C5** Arrastre de compromisos pendientes a la siguiente review.
- **E1.C6** Persistencia e historización de insights (C8).

### User Stories + Acceptance Criteria
- **E1.US1** *Como trader, quiero convertir un insight en compromiso para comprometerme a cambiar.*
  - Dado un insight (p.ej. "revenge trading 50%"), Cuando pulso "Comprometerme", Entonces se crea un `Commitment` con texto editable, ventana de verificación (default 1 semana) y métrica objetivo derivada del insight.
  - El compromiso aparece en HOY y en MEJORAR › Reviews.
- **E1.US2** *Como trader, quiero respaldar el compromiso con una regla para que el sistema me proteja.*
  - Dado un compromiso "no operar tras 2 pérdidas", Cuando pulso "Activar regla", Entonces se crea una `Rule` (mode=enforce) precargada y vinculada; rompe el compromiso ⇒ la regla ya estaba protegiendo.
- **E1.US3** *Como trader, quiero que el sistema verifique si cumplí.*
  - Dado un compromiso con ventana = semana, Cuando termina la ventana, Entonces un job evalúa la métrica (p.ej. nº de revenge trades) y marca `kept|partial|broken` con evidencia (trades concretos).
- **E1.US4** *Como trader, quiero refuerzo según el resultado.*
  - Cuando `kept`, Entonces HOY muestra refuerzo positivo y el coach lo nombra; Cuando `broken`, Entonces el coach abre una micro-reflexión y propone ajustar la regla.
- **E1.US5** *Como trader, quiero ver mis compromisos previos al iniciar una review.*
  - Dado weekly/monthly review, Cuando la abro, Entonces el primer bloque es "¿Cumpliste lo de la vez pasada?" con estado verificado (no autoevaluación).
- **E1.US6 (C8)** *Como sistema, quiero historiar insights con timestamp.*
  - Cuando un detector produce un insight, Entonces se persiste `Insight{type,severity,metric,window,createdAt,status}`; si reaparece, se actualiza `lastSeenAt`; si desaparece, se marca `resolved`.

---

## E2 — AI Coach v3

**Visión:** de "analista que responde" a "coach que acompaña": con **memoria**, **iniciativa**, capacidad de **actuar con permiso** y razonamiento **longitudinal + cuantitativo**.

### Capabilities
- **E2.C1** Memoria persistente (hechos, resúmenes, preferencias).
- **E2.C2** Proactividad en tiempo real (intervención sobre triggers de trade).
- **E2.C3** Acción-con-permiso (crear regla/compromiso/review/tarjeta).
- **E2.C4** Seguimiento de compromisos entre sesiones.
- **E2.C5** Razonamiento longitudinal (ventana actual vs anterior) por defecto.
- **E2.C6** Capa cuantitativa (IC, significancia, proyecciones).
- **E2.C7** Rol mentor-prop (traduce conducta a reglas de la firma).
- **E2.C8** Persistencia de conversaciones (threads).

### User Stories + Acceptance Criteria
- **E2.US1 (C2)** *Como trader, quiero que el coach recuerde lo que hablamos.*
  - Dado que cerré una conversación, Cuando inicio otra días después, Entonces el coach referencia hechos/compromisos previos ("la semana pasada te comprometiste a X — lo cumpliste 3/5 días").
- **E2.US2 (C1)** *Como trader, quiero que el coach intervenga en el momento del error.*
  - Dado que registro la 3ª pérdida del día y doblo tamaño, Cuando se guarda el trade, Entonces el coach emite una **intervención** en ≤2s ("Para. Es tu patrón nº1 de fuga de capital. ¿Cerramos por hoy?") con acciones [Activar bloqueo][Seguir].
- **E2.US3 (#13)** *Como trader, quiero que el coach actúe por mí con permiso.*
  - Cuando el coach propone "activar regla anti-revenge", Entonces ofrece un botón que crea la regla; nunca escribe sin confirmación explícita; toda acción queda auditada.
- **E2.US4 (#25/#47)** *Como trader, quiero respuestas longitudinales y con rigor.*
  - Cuando pregunto "¿cómo voy?", Entonces el coach compara ventana actual vs anterior y cita significancia ("tu WR subió 6pp pero con n=18 no es significativo aún").
- **E2.US5 (#15, mentor-prop)** *Como trader prop, quiero saber si mi conducta invalida la cuenta.*
  - Dado mis límites de firma, Cuando mi comportamiento se acerca a un breach, Entonces el coach lo traduce ("a este ritmo de DD diario, riesgo de invalidar el martes").
- **E2.US6 (#28)** *Como trader, quiero un resumen proactivo semanal con 1 compromiso.*
  - Cada lunes, el coach publica en HOY un resumen de la semana previa + propone **un** compromiso priorizado.

---

## E3 — Analítica longitudinal

### Capabilities
- **E3.C1** Primitiva `rollingWindow(metric, size, step)` reutilizable.
- **E3.C2** Δ vs periodo anterior en cada KPI (#9).
- **E3.C3** Detección de "mejora reciente" y de deterioro (#29/#44).
- **E3.C4** Curvas temporales (disciplina, expectancy, WR) (#21).
- **E3.C5** Persistencia de snapshots para tendencia.

### User Stories + AC
- **E3.US1 (C3/#7)** *Como trader, quiero comparar mis últimas 4 semanas con las 4 previas.*
  - Cuando abro ANALIZAR, Entonces cada métrica clave muestra valor actual, valor previo, Δ y mini-sparkline; la ventana es configurable (4w default).
- **E3.US2 (#44)** *Como trader, quiero que se detecten anomalías diarias.*
  - Cuando opero ≥1.5× mi media diaria o supero mi pérdida media, Entonces aparece una señal "hoy 3× tu media — ¿overtrading?" en HOY.
- **E3.US3 (#9)** *Como trader, quiero ver Δ vs periodo anterior en cada KPI.*
  - Cada tarjeta KPI muestra Δ con color y dirección; sin Δ inventado cuando no hay periodo previo (estado vacío explícito).

---

## E4 — Métricas institucionales & visualización

### Capabilities
- **E4.C1** Max drawdown (peak-to-trough) + DD actual + duración (#3, C4).
- **E4.C2** Distribución de R (histograma) (#19).
- **E4.C3** MAE/MFE captura + análisis de salidas (#35).
- **E4.C4** Sortino/Calmar/Kelly (rolling) (#22).
- **E4.C5** Equity con bandas de DD + scatter de R (#34).
- **E4.C6** Calendario heatmap de P&L (#26).
- **E4.C7** Benchmark global WR real vs esperado (#43).

### User Stories + AC
- **E4.US1 (C4/#3)** *Como trader prop, quiero ver mi max drawdown y DD actual.*
  - Cuando abro HOY/ANALIZAR, Entonces veo max DD histórico, DD actual (% y $), y duración del DD en curso; calculado sobre equity FX-normalizada.
- **E4.US2 (#19)** *Como trader, quiero ver la distribución de mis R.*
  - Entonces un histograma de R-multiple con media, mediana y cola; resalta si la cola izquierda domina (riesgo de outlier).
- **E4.US3 (#35)** *Como trader, quiero saber si gestiono bien las salidas.*
  - Dado MAE/MFE por trade, Entonces ANALIZAR muestra "capturas X% del MFE medio" y "tus stops se tocan en MAE Y% antes de revertir".
- **E4.US4 (#22)** *Como trader, quiero métricas de riesgo institucionales.*
  - Entonces Sortino, Calmar y Kelly fraccional (rolling) con explicación y ventana.

---

## E5 — Captura de trade v3 (OPERAR)

### Capabilities
- **E5.C1** Captura psicológica inline no-silenciosa (C7, #10).
- **E5.C2** Campos derivados automáticamente (sesión, riskPct) (#27).
- **E5.C3** Checklist de pre-entrada obligatorio por setup.
- **E5.C4** Captura MAE/MFE (manual/import) (#35).
- **E5.C5** Auto-tagging IA de notas (FOMO/duda/off-plan) (#37).
- **E5.C6** Contexto de mercado (régimen) en el trade.

### User Stories + AC
- **E5.US1 (C7/#10)** *Como trader, quiero registrar mi estado sin fricción y no olvidarlo.*
  - Cuando cierro un trade sin `emotionBefore`, Entonces un nudge ligero lo pide (1 tap, 5 opciones); si lo omito 2×, el coach lo nota y explica por qué importa.
- **E5.US2 (#27)** *Como trader, no quiero teclear lo que el sistema puede deducir.*
  - Cuando registro un trade con `openTime` y stop, Entonces `session` y `riskPct` se calculan automáticamente y son editables.
- **E5.US3 (E5.C3)** *Como trader, quiero un checklist que me frene si no cumplo el setup.*
  - Dado un setup con checklist, Cuando abro un trade de ese setup, Entonces debo marcar el checklist; ítems sin marcar etiquetan "Off-plan" automáticamente.
- **E5.US4 (#37)** *Como trader, quiero que mis notas se etiqueten solas.*
  - Cuando escribo una nota, Entonces la IA sugiere tags (FOMO/duda/plan) que confirmo con 1 tap.

---

## E6 — Protección, riesgo & prop (PROTEGER)

### Capabilities
- **E6.C1** Unificación Rule/Automation (C6, #11).
- **E6.C2** Plantillas de protección de capital ($ diario/semanal, cool-down) (#8).
- **E6.C3** Reglas sugeridas desde insights (#14) → ver E1/E2.
- **E6.C4** Proyección de paso de fase prop (#15).
- **E6.C5** Riesgo de ruina + "trade máximo hoy" (#17).
- **E6.C6** Reset DD diario configurable por firma (#38).
- **E6.C7** Riesgo correlacionado multi-cuenta (#39).
- **E6.C8** Política de retiros sugerida (#46).
- **E6.C9** Protección de capital a nivel cuenta (freeze agregado).

### User Stories + AC
- **E6.US1 (C6/#11)** *Como trader, quiero un solo concepto de "Regla" y saber si bloquea o avisa.*
  - Cuando creo una regla, Entonces elijo modo `enforce` (bloquea) o `warn` (avisa); la UI muestra un badge claro; los datos de `Rule` y `Automation` v2 se migran a un único modelo sin pérdida.
- **E6.US2 (#15/#17)** *Como trader prop, quiero saber mi probabilidad de pasar la fase y mi riesgo de ruina.*
  - Dado mi expectancy, varianza, objetivo y límites, Entonces PROTEGER muestra P(pasar fase) en ~N sesiones, riesgo de violar DD primero, y "riesgo máximo permitido hoy".
- **E6.US3 (#8)** *Como trader, quiero plantillas de protección listas.*
  - Entonces existen plantillas: stop diario en $, pérdida semanal, cool-down tras 2 pérdidas intradía, no-aumentar-tras-pérdida, energía<3 no operar.
- **E6.US4 (#39)** *Como trader multi-cuenta, quiero ver exposición correlacionada.*
  - Cuando tengo el mismo símbolo abierto en 3 cuentas, Entonces el sistema muestra exposición real agregada (3×) y puede bloquear por riesgo correlacionado.
- **E6.US5 (#46)** *Como trader, quiero una política de retiros que no descapitalice.*
  - Dado que detectamos retiros >40% del P&L, Entonces se sugiere una política (% de ganancias mensuales) y se puede fijar como regla.

---

## E7 — Inteligencia psicológica v3

### Capabilities
- **E7.C1** Detección de **cascadas intradía** (tilt) (#16).
- **E7.C2** Calibración de confianza (declarada vs WR real) (#23).
- **E7.C3** Sesgos adicionales: sunk-cost, recency, anchoring, gambler's fallacy (#40).
- **E7.C4** Estado emocional longitudinal (mood/energía en el tiempo).
- **E7.C5** Check-in pre-sesión que puede bloquear (#30).

### User Stories + AC
- **E7.US1 (#16)** *Como trader, quiero saber cuándo un mal trade dispara una cascada.*
  - Dado un día con pérdida seguida de ≥3 trades con violación/aumento de tamaño, Entonces se detecta "cascada de tilt" y el coach interviene a partir del 2º.
- **E7.US2 (#23)** *Como trader, quiero saber si mi confianza está calibrada.*
  - Entonces una curva: confianza declarada (1–5) vs WR real por bucket; resalta sobreconfianza (alta confianza, bajo WR).
- **E7.US3 (#30)** *Como trader, quiero un check-in antes de operar que me frene en rojo.*
  - Cuando abro OPERAR sin check-in del día, Entonces se pide mood/energía/sueño; si "rojo", el coach recomienda no operar o reducir tamaño y puede activar una regla temporal.

---

## E8 — Inteligencia de Playbook (MEJORAR)

### Capabilities
- **E8.C1** Edge decay por **expectancy/avgR** + significancia (#12).
- **E8.C2** Curva de evolución por setup (#21).
- **E8.C3** Detección de **drift** (operado vs definido) (#32).
- **E8.C4** A/B de variantes de setup (#50).

### User Stories + AC
- **E8.US1 (#12)** *Como trader, quiero que se detecte el deterioro real de un setup, no el ruido.*
  - Dado un setup con ≥N trades, Entonces el decay se evalúa por expectancy/avgR además de WR, con test de significancia (no solo "WR<esperado-10").
- **E8.US2 (#32)** *Como trader, quiero saber si opero mi setup distinto a como lo definí.*
  - Cuando mi R medio, sesión o dirección se alejan de la definición del setup, Entonces se marca "drift" con la dimensión específica.
- **E8.US3 (#21)** *Como trader, quiero ver la evolución de mi edge en el tiempo.*
  - Entonces una curva temporal de WR/expectancy por setup (rolling), no un snapshot.

---

## E9 — Transferencia de aprendizaje (MEJORAR)

### Capabilities
- **E9.C1** Medición de transferencia real (edge antes/después de dominar recurso) (#31).
- **E9.C2** SRS adaptado al rendimiento de mercado (#45).
- **E9.C3** Errores recurrentes → tarjeta de estudio automática (#42).
- **E9.C4** Digest de aprendizaje proactivo (#28 — coordinado con E2).

### User Stories + AC
- **E9.US1 (#31)** *Como trader, quiero saber si estudiar X mejoró mi trading.*
  - Dado un recurso vinculado a un setup, Cuando lo domino, Entonces se compara el edge del setup en la ventana previa vs posterior y se reporta la transferencia (etiquetada como correlación, con n).
- **E9.US2 (#45)** *Como trader, quiero que mis repasos se prioricen por mi rendimiento real.*
  - Cuando un setup vinculado empeora, Entonces el SRS adelanta el repaso del recurso asociado.
- **E9.US3 (#42)** *Como trader, quiero que mis errores recurrentes generen estudio.*
  - Cuando un patrón/insight crítico persiste, Entonces se propone crear una tarjeta de estudio/recurso para corregirlo.

---

## E10 — Edge por instrumento & tags (ANALIZAR; absorbe Mercados/Etiquetas)

### Capabilities
- **E10.C1** Edge por símbolo (WR/expectancy) + sugerencia de podar (#24).
- **E10.C2** Tag analytics (P&L/R medio por tag) (#20).
- **E10.C3** Auto-tagging IA (#37 — compartido con E5).

### User Stories + AC
- **E10.US1 (#24)** *Como trader, quiero saber qué instrumentos me hacen perder.*
  - Entonces una tabla por símbolo con WR/expectancy/nº; si uno tiene edge negativo significativo, se sugiere "podar US30" como compromiso/regla. (Esto es lo que **reemplaza** la pantalla Mercados.)
- **E10.US2 (#20)** *Como trader, quiero saber qué tags me cuestan dinero.*
  - Entonces "tus 'A+' rinden +1.8R; tus 'dudé' −0.4R"; los tags se vuelven señal accionable (crear regla/compromiso).

---

## E11 — Superficie HOY & notificaciones inteligentes

### Capabilities
- **E11.C1** Feed unificado (absorbe Notificaciones) con priorización adaptativa (#36).
- **E11.C2** Digest proactivo del coach (#28).
- **E11.C3** Señales tempranas (anomalía diaria, racha) (#44).
- **E11.C4** Presupuesto de riesgo del día visible.

### User Stories + AC
- **E11.US1 (#36)** *Como trader, no quiero fatiga de alertas.*
  - Cuando ignoro repetidamente un tipo de notificación, Entonces baja su prioridad/frecuencia; las críticas (DD, intervención) nunca se degradan.
- **E11.US2** *Como trader, quiero abrir la app y saber qué hacer hoy.*
  - HOY muestra, en orden: intervenciones/críticos, compromisos del día, presupuesto de riesgo, repasos que vencen, 1 insight accionable.

---

## E12 — Design System v3 & re-arquitectura de superficies

### Capabilities
- **E12.C1** DS v3 (spacing/tipografía/motion/elevation/estados) evolucionando tokens actuales.
- **E12.C2** Shell de 5 superficies + command palette (Raycast).
- **E12.C3** Capa global de intervención del coach (overlay).
- **E12.C4** Estados: empty/loading/coaching/intervention.
- **E12.C5** "Cada gráfico produce una decisión": todo chart lleva un CTA/insight.

### User Stories + AC
- **E12.US1** *Como trader, quiero una navegación que refleje cómo mejoro, no cómo se guardan datos.*
  - La navegación principal son 5 superficies; Ajustes/Perfil salen de la nav primaria.
- **E12.US2** *Como trader, quiero llegar a cualquier acción en 2 teclas.*
  - Command palette (⌘K) con acciones: registrar trade, ver compromiso, preguntar al coach, ir a superficie.
- **E12.US3 (filosofía)** *Como producto, ningún gráfico es decorativo.*
  - Criterio de aceptación de UI: cada visualización tiene un insight/CTA asociado o no se incluye.

---

## E13 — Onboarding & activación

### Capabilities
- **E13.C1** Onboarding que activa los motores desde el día 1 (#48).
- **E13.C2** Configuración guiada de 1 cuenta + 1 setup + 1 regla + captura psico.

### User Stories + AC
- **E13.US1 (#48)** *Como trader nuevo, quiero que el sistema sea útil desde el primer día.*
  - El onboarding fuerza: crear 1 cuenta, definir 1 setup con checklist, activar 1 regla de protección, y hacer el primer check-in; al terminar, HOY ya tiene contenido real.

---

## E14 — Regímenes & modelo de mejora del trader

### Capabilities
- **E14.C1** Detección de cambio de régimen de mercado y rendimiento por régimen (#33).
- **E14.C2** Score/modelo de trayectoria del trader que predice y explica progreso (#41).
- **E14.C3** Vista temporal "coste de indisciplina" (tendencia) (#49).

### User Stories + AC
- **E14.US1 (#33)** *Como trader, quiero saber en qué régimen gano y en cuál pierdo.*
  - Dado un proxy de régimen (volatilidad/tendencia del símbolo o etiqueta manual), Entonces ANALIZAR muestra expectancy por régimen y avisa de cambios de régimen.
- **E14.US2 (#41)** *Como trader, quiero un score de mi trayectoria de mejora.*
  - Entonces un índice compuesto (disciplina + expectancy + cumplimiento de compromisos, rolling) con explicación de los drivers ("subió por +cumplimiento, bajó por −WR en US30").
- **E14.US3 (#49)** *Como trader, quiero ver si mi coste de indisciplina mejora.*
  - Entonces una curva temporal del coste de indisciplina (no solo el total), para reforzar el dolor del mal hábito en descenso.

---

## 13. MATRIZ DE COBERTURA (trazabilidad obligatoria)

### Críticos
| Crítico | Epic(s) |
|---|---|
| C1 Coach reactivo | E2 (C2 proactividad) |
| C2 Sin memoria | E2 (C1 memoria, C8 threads) |
| C3 Sin longitudinal | E3 |
| C4 Métricas institucionales | E4 |
| C5 Loop reviews abierto | E1 (verificación, arrastre) |
| C6 Dualidad reglas | E6 (C1 unificación) |
| C7 Captura psico opcional | E5 (C1), E7 (C5) |
| C8 Insights sin historiar | E1 (C6 persistencia) |

### Top 50 por ROI → Epic
| # | Epic | # | Epic | # | Epic | # | Epic | # | Epic |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E2 | 11 | E6 | 21 | E3/E8 | 31 | E9 | 41 | E14 |
| 2 | E1 | 12 | E8 | 22 | E4 | 32 | E8 | 42 | E9 |
| 3 | E4 | 13 | E2 | 23 | E7 | 33 | E14 | 43 | E4 |
| 4 | E1/E2 | 14 | E1/E6 | 24 | E10 | 34 | E4 | 44 | E3/E11 |
| 5 | E1 | 15 | E6 | 25 | E2 | 35 | E4/E5 | 45 | E9 |
| 6 | E2 | 16 | E7 | 26 | E4 | 36 | E11 | 46 | E6 |
| 7 | E3 | 17 | E6 | 27 | E5 | 37 | E5/E10 | 47 | E2 |
| 8 | E6 | 18 | E1/E3 | 28 | E2/E11 | 38 | E6 | 48 | E13 |
| 9 | E3 | 19 | E4 | 29 | E1 | 39 | E6 | 49 | E14 |
| 10 | E5 | 20 | E10 | 30 | E7 | 40 | E7 | 50 | E8 |

### Hallazgos por módulo → Epic
| Módulo (auditoría §3) | Epics que lo cubren |
|---|---|
| 3.1 Dashboard | E3, E4, E11 |
| 3.2 Trades | E5 |
| 3.3 Psicología | E5, E7 |
| 3.4 Playbook | E8 |
| 3.5 Reviews | E1 |
| 3.6 Aprendizaje | E9 |
| 3.7 Reglas | E6 |
| 3.8 Cuentas/Prop | E6 |
| 3.9 Notificaciones | E11 |
| 3.10 Etiquetas | E10 |
| 3.11 Mercados | E10 |

### Riesgos (§5) → mitigación
| Riesgo | Epic/sección |
|---|---|
| R1 hábito ausente | E1 |
| R2 captura colapsa IA | E5, E7 |
| R3 falsa protección | E6.C1 |
| R4 coste IA | AI_COACH_V3 §NFR |
| R5 sobre-notificación | E11.C1 |
| R6 pseudo-causal | E9.C1 |

### Oportunidades de diferenciación (§6) → Epic
| Oportunidad | Epic |
|---|---|
| Coach interviene en el error | E2 |
| Loop conductual cerrado | E1 |
| Quant de prop firm | E6 |
| Memoria de mentoría | E2 |
| Insight→protección 1 clic | E1/E6 |

> **Garantía:** C1–C8 ✔, #1–#50 ✔, módulos 3.1–3.11 ✔, riesgos R1–R6 ✔, oportunidades ✔. Ningún hallazgo sin Epic.
