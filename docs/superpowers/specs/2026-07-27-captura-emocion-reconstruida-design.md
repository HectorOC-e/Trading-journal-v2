# Captura de emoción: procedencia, ventana y contrato de correlación

> Diseño validado — 2026-07-27.
> Referencias de freeze: `FREEZE-P2` (determinismo; el LLM narra, no calcula), `FREEZE-P3`
> (rigor honesto sobre muestras retail), `FREEZE-P6` (el LLM propone, los datos confirman),
> `FREEZE-P9` (migración reversible hasta verificación).
> Esta pieza **respeta** los cuatro; no extiende ni revoca ninguno.

---

## 1. El problema, corregido contra la BD

La palanca A se enunció como *"el motor de comportamiento está construido y esperando un gesto
que no ocurre"*. **La BD no sostiene ese enunciado**, y la corrección cambia el alcance de la pieza.

Distribución real de la captura en prod (`ariaoc89@gmail.com`, único usuario con trades):

| Lote de creación | n | con emoción | con notas |
|---|---|---|---|
| 2026-06-10 / 06-18 / 06-19 (sueltos) | 5 | 0 | 0 |
| **2026-06-11 04:00 UTC (una sola hora)** | **47** | **0** | **0** |
| 2026-07-22, 5 horas (simulación) | 16 | 15 | 16 |

Y sobre los 52 anteriores a julio: **0 notas, 0 `confidence_rating`, 0 `execution_quality`**, pero
41 con `setup_id`. Cuatro campos subjetivos vacíos simultáneamente no es un trader que salta una
casilla: es una carga masiva. Lo confirma el código — `csv-import.ts` y `mt4-parser.ts` existen y
**ninguno menciona** `emotion`, `confidence`, `executionQuality` ni `notes`; la ruta de importación
estructuralmente no puede traer psicología. (`import_ticket` está a `NULL` en los 52, así que ni
siquiera entraron por el importador: fue una carga más directa.)

**Conclusión que gobierna el diseño:** los 52 "históricos sin emoción" nunca pasaron por un
formulario, y los 15 que sí la tienen los tecleó un script de simulación siguiendo un guion que
ordenaba capturarla. **No hay evidencia en ningún sentido sobre la voluntad de un trader real.**
Los 52 no son una negativa; los 15 no son una aceptación.

Lo que sí hay son dos defectos reales, verificados en código:

- **El producto esconde el campo que necesita.** `trade-detail-panel.tsx:640` hace
  `if (!hasPsych) return null`: un trade cerrado sin emoción no muestra la sección Psicología
  — ni un hueco, ni una pista de que el campo exista.
- **El producto pide el gesto y no deja hacerlo.** `sections.tsx:230` (`PsychologyPanel`, montado
  en `review-report-shell.tsx:89`) muestra *"Registra tu estado emocional en los trades para ver
  este análisis."* Cuando el trader lee esa frase, los trades de esa semana ya están cerrados y el
  nudge del cierre (`trade-detail-panel:458`) desapareció para siempre. Es una instrucción sin salida.

## 2. Qué entrega esta pieza, y qué no

**Entrega:** que el campo deje de estar escondido; una segunda oportunidad acotada de 7 días para
registrarlo; y que ese dato llegue a la BD **marcado** por su procedencia, disponible para el panel
del trade, el Coach y la búsqueda semántica.

**No entrega:** encender el motor de comportamiento sobre historia pasada. Por decisión explícita
del usuario (§4), la emoción reconstruida queda excluida de los detectores de correlación, así que
lo único que los enciende sigue siendo la emoción capturada en el momento — que ya funciona.
Tampoco recupera los 52 trades actuales: el más reciente cerró hace 38 días y el más viejo hace 90,
así que **ninguno entra en una ventana de 7 días**. La pieza es hacia adelante.

**No verificable hoy:** que el trader capture más emoción. No hay uso real contra la app desde el
22 de julio. Lo verificable es que el gesto existe, está a la vista, cabe en plazo y llega marcado.

## 3. Decisiones tomadas y por qué

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Marca de procedencia + ventana + exclusión de correlación | sólo marca con contrato de uso | Elección explícita del usuario tras ver que la ventana recupera 0 de los 52. Blindaje máximo. |
| Ventana de **7 días** | 14 / 30 / fin de semana natural | Coincide con el ciclo de la review semanal; más allá de una semana el recuerdo de un trade concreto se disuelve (`FREEZE-P3`). |
| Ancla en `Trade.date` | `closeTime` | `date` es lo que agrupa la review (`ensure-analysis.ts:18`: `weekStart → weekStart+6`). Anclar en la hora de cierre daría dos nociones de "esta semana" que se desincronizan en los bordes. |
| Procedencia derivada **por posición**, en servidor | campo declarado por el cliente | Si el cliente la manda, la marca no vale nada: sería una afirmación del mismo sitio del que desconfiamos. |
| Exclusión sólo de `category: "correlation"` | excluir de todo uso | La reconstrucción tolera contexto y visualización; no tolera afirmación causal. La frontera es el tipo de afirmación, no la superficie. |

## 4. Modelo de datos

`Trade` gana `emotionSource String? @map("emotion_source")` — valores `captured` | `reconstructed`,
`NULL` cuando no hay emoción. Texto con los valores en comentario, siguiendo el patrón que ya usa
`emotionBefore` (`schema.prisma:299`); no un enum de Postgres.

**Migración dual** (SQL + `schema.prisma` + `npx prisma generate`):
`supabase/migrations/20260727120000_trade_emotion_source.sql` — la última existente es
`20260724120000_reschedule_dispatch_events_s4.sql`. No es columna `vector`, así que va en los dos
sitios. Columna nueva sobre tabla existente: hereda la RLS de `trades`, no necesita política nueva.

Backfill de la migración:

```sql
UPDATE trades SET emotion_source = 'captured' WHERE emotion_before IS NOT NULL;
```

Son exactamente **15 filas**, todas de la simulación del 22-jul, todas entradas por
`register-trade-modal` en el momento del alta. Es exacto, no una suposición cómoda. (15 y no 16:
uno de los 16 sintéticos no tiene emoción.)

### Quién escribe la procedencia

El servidor, siempre. La regla es posicional y vive en `trade-write-service`, no en cada router:

| Camino de escritura | Procedencia |
|---|---|
| `createTrade` con emoción | `captured` |
| `closeTrade` con emoción (nudge de `trade-detail-panel:458`) | `captured` |
| Cualquier escritura posterior (`updateTrade`, `captureEmotion`) | `reconstructed` |

**Corregir una emoción ya registrada cuenta como escritura posterior.** Un trade capturado al cierre
y modificado tres días después pasa a `reconstructed`: lo que se guarda es la última afirmación del
trader, y ésa se hizo fuera del momento. La regla no admite excepción por "es que me equivoqué al
elegir" — no hay forma de distinguirlo de un recuerdo revisado a la luz del resultado, que es
exactamente el sesgo contra el que existe la marca.

### La ventana

7 días desde `Trade.date`, validados **en la mutación del servidor**. La UI esconde los chips fuera
de plazo; el servidor los rechaza. La UI es cortesía, el servidor es la regla.

## 5. El contrato de exclusión

`AnalyticsTrade` gana `emotionSource?: string | null`. Helper compartido:

```ts
/** La emoción que una afirmación causal puede usar: sólo la registrada en el momento. */
export function capturedEmotion(t: AnalyticsTrade): string | null {
  return t.emotionSource === "captured" ? t.emotionBefore ?? null : null
}
```

Los detectores de `category: "correlation"` que consumen `emotionBefore` son **tres**, y viven en
dos ficheros — mirar sólo `psychology-insights.ts` habría dejado uno fuera:

| Detector | Fichero | Nota |
|---|---|---|
| `emotion-performance` | `insights-engine.ts:172` | el que se escapa si sólo se mira psychology |
| `emotion-before-loss` | `psychology-insights.ts:32` | |
| `violation-emotion` | `psychology-insights.ts:106` | |

Los tres pasan a leer `capturedEmotion(t)` en lugar de `t.emotionBefore`, **incluidas sus puertas de
entrada** (p. ej. el `withEmotion.length < 12` de `insights-engine:173`). Si la puerta admitiera
reconstruida y el cálculo no, el detector se abriría con datos que no puede usar y produciría
silencios inexplicables.

No se tocan: `impulsive-expectancy`, `overconfidence`, `holding-asymmetry`, `clean-streak` — van por
`fomoFlag`/`revengeFlag`/tags, `confidenceRating` y tiempos, no por `emotionBefore`.

**El contrato, en positivo y en negativo:**

- La emoción reconstruida **sí** cuenta para: mostrarse en el panel del trade, la cobertura que se
  le enseña al trader, el contexto del Coach, la búsqueda semántica.
- **No** cuenta para ninguna afirmación de `category: "correlation"`.

## 6. Superficies

### Componente compartido

`components/trades/emotion-capture.tsx` — chips de `EMOTION_OPTIONS`, mutación y estado de ventana.
Presentacional + una mutación, sin lógica de negocio. Es lo que impide que A y B dupliquen el gesto.

### A — el trade cerrado (`trade-detail-panel.tsx:640`)

`if (!hasPsych) return null` deja de esconder la sección. Si el trade está **cerrado, dentro de
ventana y sin emoción**, la sección aparece con los chips. Fuera de ventana y sin emoción sigue sin
aparecer: ahí no hay nada que ofrecer y un hueco permanente sería ruido.

### B — la review semanal (`sections.tsx:226`)

La rama vacía de `PsychologyPanel` deja de mostrar la frase muerta y pasa a listar los trades de esa
semana sin emoción, cada uno con sus chips en línea. **La semana de la review es la ventana**, así
que por construcción todo lo que aparece ahí es rellenable; no hace falta comprobar plazo por fila.

Requiere fontanería: `report-data.ts` y `view-model.ts` deben llevar esos trades hasta el VM. Es el
grueso del coste de la pieza.

En la rama con datos, cada fila de `byEmotion` que incluya reconstruidas lo declara
(`calm · 8 trades · 2 reconstruidas · WR 62%`). El número se muestra, pero no se disfraza.

### El agujero que se tapa de paso

`edit-trade-modal.tsx:445` también escribe `emotionBefore`, hoy sin plazo alguno. Si se queda como
está, **la ventana es decorativa**: bastaría abrir el modal de edición para anotar un trade de abril.
Respeta la misma regla y la misma marca, por la vía de que la regla vive en `trade-write-service` y
las dos rutas de escritura la obedecen.

### La mutación

`trades.captureEmotion({ tradeId, emotion })`, dedicada. Deriva procedencia por posición, valida la
ventana contra `Trade.date` en servidor y rechaza fuera de plazo. No se reutiliza `update` genérico:
allí la emoción viaja entre otros veinte campos y la regla se diluiría.

## 7. Verificación

### El test que sostiene el contrato

Se afirma sobre el **registro completo**, no sobre las tres funciones conocidas hoy, para que siga
siendo cierto cuando alguien añada la cuarta:

> Dado un conjunto de trades donde toda la emoción es `reconstructed`, ni `generatePsychologyInsights`
> ni el motor de insights producen **ningún** insight de `category: "correlation"`.

Con su gemelo en positivo — los mismos datos marcados `captured` **sí** los producen. Sin el
positivo, el test pasa por accidente si los umbrales no se alcanzan, que es exactamente cómo
`revenge` y `oversizing` engañaron antes.

Un detector nuevo que lea `emotionBefore` a pelo rompe la suite el día que se escribe, no el día que
miente al trader.

### El rojo que hay que ver

TDD para lo puro, y **el rojo tiene que ser el correcto**. Si alguno sale verde antes de tocar nada,
el diagnóstico está mal y se para:

| Test | Rojo esperado hoy |
|---|---|
| Contrato de correlación | los tres detectores **sí** disparan con emoción reconstruida |
| Ventana en servidor | escribir emoción en un trade de hace 30 días **se acepta** |
| Procedencia por posición | `updateTrade` guarda emoción **sin marca** |
| `edit-trade-modal` respeta plazo | el modal escribe sin restricción |

### Resto de cobertura

`capturedEmotion` (puro); derivación de procedencia en los tres caminos de escritura; validación de
ventana en `trade-write-service` (dentro → escribe `reconstructed`; fuera → rechaza);
`EmotionCapture` dentro y fuera de plazo; la rama vacía de `PsychologyPanel` pintando la lista en vez
de la frase muerta; la sección de `trade-detail-panel` apareciendo en un trade cerrado sin emoción
dentro de ventana.

Suite **completa** desde `src/` antes de cada push — 1413 hoy, no un subconjunto. Los 2 fallos de
`sentry-wiring` por `@sentry/nextjs` ausente en `node_modules` no son regresión.

### Migración y prod

Replay desde cero en CI (`FREEZE-P9`). Tras el merge, `migrate-deploy` corre sólo en el run del SHA
del merge (~5 min): identificar el run por `headSha == HEAD` y esperar **ese** `success` antes del
smoke. Después, contra prod por Supabase MCP: la columna existe y las 15 filas con emoción quedaron
en `captured`.

### Observable en la UI

Playwright contra `https://www.tjournalx.com` con el usuario QA: abrir un trade cerrado reciente sin
emoción y ver la sección Psicología que hoy no existe; abrir la review de la semana y ver los chips
donde hoy hay una frase muerta. Contando con el overlay de intervención (`fixed inset-0`, "Seguir,
asumo el riesgo") y con que el botón de login nace `disabled` por hidratación.

## 8. Resumen en tres ejes

- **Backend:** columna `emotion_source` con migración dual y backfill de 15 filas; regla de
  procedencia posicional y ventana de 7 días en `trade-write-service`; mutación
  `trades.captureEmotion`; helper `capturedEmotion` y contrato de exclusión en tres detectores.
- **Observable en UI:** la sección Psicología aparece en trades cerrados sin emoción dentro de
  ventana; la review semanal deja de dar una instrucción sin salida y ofrece los chips; las filas de
  `byEmotion` declaran cuántas son reconstruidas.
- **Razón de ser:** el producto pedía un dato, escondía el campo donde se escribe y no ofrecía
  ninguna vía para darlo después. Esta pieza abre esa vía sin pagar el precio de que el motor
  determinista empiece a construir afirmaciones causales sobre recuerdo reconstruido.
