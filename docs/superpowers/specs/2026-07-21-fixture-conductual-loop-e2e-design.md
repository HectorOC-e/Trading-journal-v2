# Fixture conductual + validación del loop de punta a punta — Diseño

> Fecha: 2026-07-21 · Rama: `feat/behavior-fixture-loop-e2e`
> Estado: diseño aprobado, pendiente de plan de implementación.

## 1. Problema

El Behavior Engine v3 está construido y cableado, pero **nunca se ha observado
funcionando**. Prod: `insights = 6` (todos de junio), `interventions = 0`,
`reinforcements = 0`, `commitments = 1`. Los tres detectores que mergeó OI-4.8
(#144) se desplegaron "vivos pero dormidos" y nadie los ha visto disparar, ni en
prod ni en un fixture.

El diagnóstico corriente ("prod tiene poco volumen") es incompleto. Verificado
contra la BD el 2026-07-21, los 137 trades se parten en dos poblaciones y
**ninguna puede activar un detector**:

| Origen | n | Emoción | revenge | fomo |
|---|---|---|---|---|
| `seed:psych` (script) | 85 | 85 | 13 | 15 |
| Manuales (reales) | 52 | 0 | 0 | 0 |

- Los **85 sembrados** por `src/scripts/seed-psych-trades.mjs` asignan resultado y
  emoción por tiradas independientes (`roll < 0.50` → win; `revenge_flag` desde un
  `rnd() < 0.55`). No hay correlación temporal: `revengeFlag` no depende de haber
  perdido el trade anterior. Es ruido con forma de psicología.
- Los **52 reales** no capturaron psicología en absoluto.
- Además el seed etiqueta `'fomo'`/`'revenge'` en minúscula, mientras
  `detectOffPlan` busca `{Off-plan, Impulsivo, Revanche}`. **Cero solape**: el
  detector off-plan no podía disparar ni por accidente.

**Conclusión: los detectores no disparan porque no hay patrón que detectar, por
construcción.** No es un problema de volumen. Esto explica de un tirón los ceros
de arriba y el silencio del digest cognitivo, sin invocar "vacío ≠ roto" caso por
caso.

## 2. Objetivo y no-objetivos

**Objetivo.** Un fixture conductual determinista que genere historiales con patrón
temporal real, y tests permanentes que asserten que la cadena
`insight → commitment → rule → verificación → reinforcement` se encadena de
verdad. Deja red de regresión: si un detector deja de disparar, CI lo caza.

**No-objetivos.**

- **No sustituye a un usuario real con volumen.** Un fixture prueba que la
  maquinaria funciona; no prueba que el producto tenga valor. Sigue siendo el
  cuello de botella y sigue siendo trabajo del usuario.
- **No siembra prod.** Decisión explícita: local/CI primero. Sembrar la cuenta
  demo es una decisión posterior y separada.
- **No construye el primer consumidor S4 del outbox.** El cron de dispatch sigue
  des-agendado (`20260721190000`) y no hay handlers registrados. El test asserta
  que el evento **se emite y se acumula en `pending`**, no que se drene. Drenarlo
  es un sprint aparte.
- **No persiste filas en `interventions`.** Se ejerce el camino puro de decisión.
  Llegar a `runIntervention` real exige pasar por `closeTrade`, que arrastra
  cuentas, setups y el fast-path de 2 s. Queda servido para la pieza siguiente,
  que es la que desbloquearía OI-7.3.

## 3. Umbrales que el fixture debe cruzar

Leídos del código el 2026-07-21. `MIN_SAMPLE = 20` en los cuatro.

| Detector | Condición de disparo |
|---|---|
| `intraday-decay` | `earlyN ≥ 10` **y** `lateN ≥ 10` (≥5 días con 3+ trades) y caída de WR **≥ 12 pts** |
| `revenge-trading` | ≥ 30 % de los trades que siguen a una pérdida con tag `Impulsivo` o `revengeFlag` |
| `oversizing` | ≥ 20 % de los que siguen a pérdida con `size > 2 × avgSize` |
| `off-plan` | ≥ 3 trades y ≥ 20 % con tag en `{Off-plan, Impulsivo, Revanche}` |

Intervención (`domains/cognitive/intervention/engine.ts`): la cascada puntúa
`0.9 × 0.95 × 0.85 × 0.6 = 0.436`, holgadamente sobre `θ = 0.18`. Tres pérdidas
seguidas hoy bastan para disparar.

## 4. Defecto encontrado: la secuencia se resuelve por UUID

`insights-engine.ts:89` ordena por `date` y luego por **`id`** (un UUID):

```ts
function bySymbolDate(a, b) {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
}
```

`verifiers.ts:53` ordena por `date` → **`openTime`** → `id`.

Consecuencia: para el detector, **"el trade que sigue a una pérdida" se resuelve
por orden alfabético de UUID dentro del mismo día**, no cronológicamente. El
detector y su verificador no comparten la noción de secuencia.

Afecta a los **tres** consumidores de `bySymbolDate`, y los tres son sensibles a
la secuencia:

- `detectLosingStreak` (L257) — una racha en orden de UUID no es una racha.
- `detectRevengeTrading` (L278)
- `detectOversizing` (L307)

**Se arregla dentro de esta pieza**: `bySymbolDate` pasa a ordenar
`date → openTime → id`, alineado con `verifiers.ts`. Es una línea. Requiere test
de no-regresión propio (§6.3).

### 4.1 Por qué llevaba invisible

Los tests existentes (`src/__tests__/domains/insights-engine.test.ts:44-47`)
construyen los trades con ids `${d}-1 … ${d}-4` y horas `08:00 … 11:00`. **El
orden lexicográfico de los ids coincide, por accidente, con el cronológico.** Con
los dos criterios alineados, ningún test podía distinguir uno del otro, y el
defecto quedó fuera del alcance de la suite desde el principio.

Consecuencia práctica para la implementación: se espera que el arreglo **preserve
esos tests en verde**. Si alguno se pone rojo, no es ruido — significa que su
expectativa dependía del orden por UUID y hay que leerla de nuevo antes de
tocarla.

## 5. Arquitectura

Cuatro piezas, siguiendo convenciones existentes del repo.

| Pieza | Ruta | Qué es |
|---|---|---|
| Generador | `src/__tests__/support/behavior-scenario.ts` | Módulo puro. Perfil → escenario determinista. No es `*.test.ts`, así que vitest no lo recoge como suite; `.graphifyignore` ya excluye tests del grafo |
| Test de dominio | `src/__tests__/behavior/behavior-loop.test.ts` | Suite normal. Sin BD ni Docker |
| Test de integración | `src/__tests__/integration/behavior-loop.integration.test.ts` | Reusa `_helpers.ts` (`makeUser`/`dropUser`, guard de BD local) |
| Arreglo | `src/domains/analytics/services/insights-engine.ts:89` | `bySymbolDate` → `date → openTime → id` |

`src/__tests__/support/` es hermano de `integration/`, donde el repo ya coloca
helpers compartidos.

### 5.1 Modelo de escenario

El generador emite **dos capas temporales**, porque el sistema las lee distinto:

```
BehaviorProfile { seed, weeks, intradayDecay, revengeAfterLoss,
                  oversizeAfterLoss, offPlanShare }
        │
        ├──► history: ScenarioTrade[]  (semanas) ──► detectores  ──► Insight
        │                                         ──► verificadores ──► kept/broken
        └──► liveDay: ScenarioTrade[]  (hoy)     ──► DayState ──► decisión de intervención
```

`ScenarioTrade` es un tipo superset que satisface a la vez `AnalyticsTrade` (lo
que leen los detectores) y `WindowTrade` (lo que leen los verificadores). El mismo
dato recorre las dos mitades del loop sin adaptadores — que es lo que hace creíble
la aserción de que la cadena encaja.

PRNG sembrado (`mulberry32`, el patrón que ya usa `seed-psych-trades.mjs`): mismo
`seed`, mismo escenario, siempre. Sin determinismo el test es flaky por
construcción.

### 5.2 Flujo que asserta el test de integración

```
persistInsights ──► insights + domain_events(pending)
      │
      ▼
canCommit(type) ──► deriveCommitmentSpec ──► commitment (ACTIVE)
      │
      ├──► linkRule(commitment, template) ──► rules.source_commitment_id
      │
      ▼
verificador sobre la ventana ──► evaluateResult ──► kept | partial | broken
      │
      ▼
planReinforcement ──► reinforcement
```

## 6. Estrategia de test

### 6.1 Self-check del generador

El riesgo: el generador declara `revengeAfterLoss: 0.45`, deriva, emite 0.05, y
los tests siguen verdes porque nadie mide el dato de **entrada**. El test pasaría
probando nada — el mismo modo de fallo que esta pieza existe para evitar, una capa
más abajo.

Defensa: el self-check cuenta **inline, en el propio test**, sin delegar ni en el
generador ni en los verificadores.

```ts
const postLoss = pairsAfterLoss(scenario.history)          // escrito en el test
const flagged = postLoss.filter(t => t.revengeFlag).length
expect(flagged / postLoss.length).toBeCloseTo(profile.revengeAfterLoss, 1)
```

Tres instrumentos independientes: el generador produce, el test cuenta, el
detector interpreta. Si dos discrepan, el test lo dice. Delegar la cuenta al
verificador sería más corto y reintroduciría la circularidad.

### 6.2 Casos negativos

Un perfil `limpio` (sin decay, sin revancha, sin off-plan) debe producir `null` en
los cuatro detectores. Sin esta mitad, un detector que disparase
incondicionalmente pasaría el test de disparo sin que nadie se enterase.

En al menos un umbral, los dos lados: `off-plan` al 19 % calla, al 21 % dispara.
Fija la frontera y caza una regresión de umbral.

### 6.3 El arreglo de ordenamiento, con test en rojo primero

Dos trades el mismo día: pérdida a las 09:00, revancha a las 11:00, con los UUIDs
elegidos **al revés** del orden cronológico. Con `bySymbolDate` actual el detector
ve la revancha antes que la pérdida y no cuenta el par; con el arreglo, sí.

El test se escribe **antes** del arreglo y **se verifica que falla**. Un test de
regresión que nunca se vio en rojo no prueba que el arreglo haga algo.

### 6.4 Integración

Usuario efímero (`makeUser`), sembrar historia, `persistInsights`, assertar filas
en `insights` y `domain_events` en `pending`, derivar commitment, `linkRule`,
evaluar la ventana, `planReinforcement`, `dropUser` (cascadea). El guard de
`_helpers.ts` ya rechaza cualquier `DATABASE_URL` no-local.

## 7. Riesgo de verificación

**El daemon de Docker no responde** en la máquina de desarrollo (`docker info`
sale con código 1), así que el stack de Supabase local no levanta y la capa de
integración **no es verificable localmente ahora**.

Dos salidas, ninguna de las cuales se resuelve sola:

1. Levantar Docker Desktop y correrla antes del PR.
2. Dejarla escrita y verificarla en el job de integración de CI.

**No se afirmará que la capa de integración pasa hasta haberla visto pasar.** La
capa pura sí se corre entera en local (suite completa, no un subconjunto).

## 8. Criterio de éxito

1. Los cuatro detectores disparan sobre un escenario con patrón, y callan sobre
   uno limpio.
2. El self-check confirma que el escenario contiene lo que su perfil declara.
3. El test de ordenamiento se ve **en rojo** antes del arreglo y en verde después.
4. La cadena persistida encadena hasta `reinforcement`, con el evento del outbox
   acumulado en `pending`.
5. Suite completa verde, `tsc` y `eslint` limpios.
