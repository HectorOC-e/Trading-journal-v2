# BEHAVIOR_ENGINE_V3.md
### Trading Journal v3 — El núcleo: motor de cambio de comportamiento

> Documento 6/8. Resuelve C5 y C8 y materializa la tesis del producto. Implementa #2, #5, #14, #29, #49.
> **Este subsistema es el producto.** Todo lo demás (analytics, coach, superficies) existe para alimentarlo o ejecutarlo.

---

## 1. La cadena de valor
```
   INSIGHT  ─▶  COMPROMISO  ─▶  REGLA  ─▶  SEGUIMIENTO  ─▶  VERIFICACIÓN  ─▶  REFUERZO
 (detector)   (intención)   (enforcement)  (medición)      (kept/broken)    (+/− loop)
     ▲                                                                          │
     └──────────────────── el refuerzo recalibra el siguiente insight ─────────┘
```
Cada eslabón es opcional excepto el primero y el último, pero el valor crece con la cadena completa. La regla incompleta más común hoy ("insight que muere") se vuelve **imposible** por diseño: un insight siempre ofrece "comprometerme".

---

## 2. Modelo de dominio

### 2.1 `Insight` (persistido — C8)
`id, userId, type, category, severity, title, detail, metric, evidence, windowFrom, windowTo, createdAt, lastSeenAt, status('active'|'resolved'|'committed'), sourceDetector`.

### 2.2 `Commitment`
`id, userId, sourceInsightId?, text, metricKey, target, comparator('<='|'>='|'=='), window('day'|'week'|'month'|custom), startAt, endAt, ruleId?, status('active'|'kept'|'partial'|'broken'|'expired'), createdVia('coach'|'self'|'review'), createdAt`.

### 2.3 `CommitmentCheck`
`id, commitmentId, evaluatedAt, observedValue, result('kept'|'partial'|'broken'), evidence(json: trade ids/metric)`.

### 2.4 `Rule` (unificado — C6, ver E6)
`id, userId, name, mode('enforce'|'warn'), trigger, conditions(json), actions(json), enabled, sourceCommitmentId?, sourceInsightId?, lastFiredAt`.

### 2.5 `RuleSuggestion`
`id, userId, insightId, proposedRule(json), reason, status('pending'|'accepted'|'dismissed')`.

### 2.6 `Reinforcement`
`id, userId, commitmentId, kind('positive'|'corrective'), shownAt, channel('today'|'coach'|'review')`.

---

## 3. Máquina de estados del compromiso
```
            create
   ──────────────────▶ ACTIVE
                         │  window end / continuous eval
                         ▼
            ┌──────────┬──────────┬──────────┐
            ▼          ▼          ▼          ▼
          KEPT      PARTIAL     BROKEN     EXPIRED
            │          │          │          │
        +refuerzo  +refuerzo  micro-       (sin datos)
        positivo   mixto      reflexión +  → re-proponer
            │                  ajuste regla
            └──────────── feed al ImprovementScore (E14) ───────────┘
```

- **Continuous eval** para compromisos con regla `enforce` (se evalúa en cada trade relevante).
- **Window-end eval** para compromisos sin regla (job al cerrar la ventana).

---

## 4. Servicios

### 4.1 `createCommitmentFromInsight(insightId, overrides?)` (#2, E1.US1)
Deriva `metricKey/target/comparator/window` del tipo de insight (mapa determinista). Ej:
- insight `revenge-trading` → `metricKey='revengeTradesAfterLoss'`, `comparator='<='`, `target=0`, `window='week'`.
- insight `intraday-decay` → `metricKey='tradesPerDayBeyond2'`, `target=0`, `window='week'`.

### 4.2 `linkRule(commitmentId, template)` (#14, E1.US2)
Crea una `Rule` (mode=enforce por defecto en protección de capital) precargada desde una plantilla y la vincula. La ruptura del compromiso queda **prevenida** por la regla.

### 4.3 `evaluateCommitment(commitmentId)` (E1.US3)
Mide `observedValue` con el motor de Analytics sobre la ventana; produce `CommitmentCheck` y transición de estado con **evidencia** (trades concretos).

### 4.4 `reinforce(commitmentId, result)` (#29, E1.US4)
- `kept` → `Reinforcement(positive)` a HOY + el coach lo nombra.
- `broken` → `Reinforcement(corrective)`: micro-reflexión (1 pregunta) + sugerencia de endurecer la regla.

### 4.5 `suggestRulesFromInsights()` (#14)
Para insights críticos sin compromiso, genera `RuleSuggestion` (la base de "Activar regla anti-revenge" en el punto del insight).

### 4.6 `carryOverCommitments(reviewScope)` (#5, C5)
Al abrir weekly/monthly review, trae los compromisos de la ventana previa con su verificación → bloque "¿Cumpliste?".

---

## 5. Eventos (bus de dominio)
Publicados por trades/analytics, consumidos por coach proactivo y por el engine:
| Evento | Productor | Consumidores |
|---|---|---|
| `insight.created` | detectores/job | engine (oferta de compromiso), HOY feed |
| `commitment.created` | engine | HOY, coach memory |
| `commitment.kept/broken` | evaluador | refuerzo, ImprovementScore, coach |
| `trade.created/closed` | OPERAR | evaluación continua, coach proactivo |
| `rule.fired` | rules engine | HOY feed, intervención |

(Extiende `coach-bus.ts` a un bus de dominio general.)

---

## 6. Jobs / scheduler
| Job | Frecuencia | Función |
|---|---|---|
| `recomputeInsights` | diario + on-demand | recalcula y persiste insights (status active/resolved) |
| `evaluateWindowCommitments` | al cierre de día/semana | verifica compromisos sin regla |
| `snapshotEdge/Improvement` | diario | series temporales (E14, edge) |
| `proactiveDigest` | semanal (lunes) | resumen + 1 compromiso propuesto (#28) |

---

## 7. Integración con superficies
- **HOY:** compromisos del día, refuerzos, sugerencias de regla, insight accionable.
- **OPERAR:** reglas enforce bloquean en vivo; check-in alimenta compromisos del día.
- **MEJORAR › Reviews:** bloque "¿cumpliste?" + crear nuevos compromisos.
- **ANALIZAR:** cada insight tiene CTA "comprometerme"; coste de indisciplina temporal (#49).
- **PROTEGER:** reglas vinculadas a compromisos; plantillas de protección.

---

## 8. Invariantes de diseño
1. **Ningún insight sin CTA** ("comprometerme" / "activar regla" / "estudiar").
2. **Ningún compromiso sin verificación** (siempre hay `evaluateCommitment`).
3. **La verificación es objetiva**, no autoevaluación (mide datos, no opinión).
4. **El refuerzo siempre ocurre** (positivo o correctivo), nunca silencio tras una ventana.
5. **Privacidad:** el trader puede archivar/borrar compromisos; el coste no se usa para culpar, sino para reforzar mejora.

---

## 9. Métricas del engine
- Tasa de conversión insight→compromiso; compromisos activos/usuario; **tasa de cumplimiento** (kept/total); % compromisos respaldados por regla; correlación cumplimiento↔ImprovementScore; reducción de reincidencia del insight tras compromiso.

---

## 10. Cobertura (este doc)
C5 ✔ · C8 ✔ · #2 ✔ · #5 ✔ · #14 ✔ · #29 ✔ · #49 ✔. Es además el destino accionable de **todos** los insights producidos por ANALYTICS_V3 y la base de la proactividad de AI_COACH_V3.
