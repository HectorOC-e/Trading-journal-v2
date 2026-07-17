# Cerrar la deuda auditada de S0–S2

> Diseño validado. 2026-07-17. Rama: `chore/s0-s2-audit-closure`.

## Origen

Auditoría de 2026-07-17 de los ítems `DT-x`/`R-x` de S0–S2 (STATUS.md §1) contra
código. De ~10 ítems `DT`, casi todo resultó *ya resuelto* (doc viejo) o *congelado
por diseño*. Accionable de verdad:

- **S0/DT-3** — la capa DB del bus S0 (outbox + persistencia transaccional) no tiene
  ningún test de integración; los tests existentes **mockean prisma por completo**
  (`vi.mock("@/lib/prisma")`), así que la atomicidad real (eventos + escrituras en la
  misma tx, FREEZE-D6) está **sin verificar**. La excusa "bloqueado por falta de BD
  local" quedó vieja: #139 trajo el stack local de Supabase.
- **S1/DT-4** — `Rule.sourceCommitmentId` sigue siendo un uuid pelado sin FK, aunque
  `Commitment` ya existe (S4 hecho).
- **DT-1/DT-2** — el doc los da como "nulos por diseño hasta S3", pero el estimador
  Bayesiano de S3 (`proportionEstimate`) **ya corre** en `toComputedInsight` y rellena
  `confidence`/`credibleInterval`/`effectSize` + `sampleSize` por-detector cuando el
  detector expone `stat`. Están **parcialmente resueltos**; el doc miente.

## Alcance

Tres partes, una rama:

### Parte A — S0/DT-3: arnés de integración + tests del outbox

**Arnés (supabase local, reusando el CI existente):**
- `src/vitest.integration.config.ts` (nuevo): `include: ["__tests__/integration/**/*.test.ts"]`,
  `environment: "node"`, `testTimeout` amplio (p.ej. 30s), `setupFiles` propio,
  `fileParallelism: false` (evita choques sobre la misma BD).
- `src/vitest.config.ts`: añadir `"**/__tests__/integration/**"` a `exclude` para que el
  `pnpm test` puro (1204 tests) siga rápido y sin BD.
- `package.json`: script `"test:integration": "vitest run --config vitest.integration.config.ts"`.
- Setup de integración (`src/__tests__/integration/setup.ts`) con **guard de seguridad**:
  exige `DATABASE_URL` y **aborta si el host no es `localhost`/`127.0.0.1`** — nunca correr
  truncates/deletes contra prod. Expone un `PrismaClient` conectado y un helper de limpieza.
- Aislamiento por test: cada test crea su propio `User` efímero (uuid) y limpia sus filas
  (`domain_events`, `insights` por `userId`) en `afterEach`. No truncados globales.
- CI: un paso nuevo en el job **"Validate migrations (replay from scratch)"** (ya tiene la
  BD fresca tras `supabase db reset`), tras extraer la URL local de `supabase status -o env`:
  `DATABASE_URL="$LOCAL_URL" pnpm --dir src exec vitest run --config vitest.integration.config.ts`.

**Tests (contra Postgres real):**
1. `persistInsights` crea insights nuevos **y** una fila `DomainEvent` `insight.created` por
   cada uno, todo en una transacción (verificar ambas tablas tras la llamada).
2. *touch*: reejecutar con los mismos insights bumpea `lastSeenAt` de los survivors y **no**
   crea eventos nuevos ni duplica insights.
3. *resolve*: reejecutar sin un insight previo → ese pasa a `status="resolved"` +
   `resolvedAt` y emite `DomainEvent` `insight.resolved`.
4. **Atomicidad (FREEZE-D6):** forzar un fallo dentro de la transacción de `persistInsights`
   (inyectar un `PrismaClient` cuyo `publishEvent`/write intermedio lance, o violar una
   constraint) → assert **0 insights y 0 eventos** persistidos (rollback real). Es el test
   que los mocks no pueden dar.
5. `dispatchPending`: sembrar N `DomainEvent` pendientes → drena hasta `batchSize`, los marca
   `processed` (o el estado terminal real del modelo), y una segunda corrida es **idempotente**
   (0 procesados). Verificar el shape real del modelo `DomainEvent` antes de escribir asserts.

### Parte B — S1/DT-4: FK de `Rule.sourceCommitmentId`

- Migración **dual** (SQL en `supabase/migrations/<ts>_rule_source_commitment_fk.sql` + schema
  Prisma), con `npx prisma generate` tras editar el schema.
- SQL: primero NULL defensivo de refs colgantes
  (`UPDATE rules SET source_commitment_id = NULL WHERE source_commitment_id IS NOT NULL AND
  source_commitment_id NOT IN (SELECT id FROM commitments);`), luego
  `ALTER TABLE rules ADD CONSTRAINT rules_source_commitment_id_fkey FOREIGN KEY
  (source_commitment_id) REFERENCES commitments(id) ON DELETE SET NULL;` + índice
  `CREATE INDEX IF NOT EXISTS rules_source_commitment_id_idx ON rules(source_commitment_id);`.
  Usar `IF NOT EXISTS`/guardas idempotentes donde el dialecto lo permita.
- Prisma: como ya existe la relación `Rule.commitments ↔ Commitment.rule` (vía `ruleId`),
  añadir la segunda relación obliga a **nombrar ambas**:
  - `Rule`: `sourceCommitment Commitment? @relation("RuleSourceCommitment", fields: [sourceCommitmentId], references: [id], onDelete: SetNull)` + la existente pasa a `commitments Commitment[] @relation("CommitmentRule")`.
  - `Commitment`: `sourcedRules Rule[] @relation("RuleSourceCommitment")` + la existente `rule Rule? @relation("CommitmentRule", fields: [ruleId], references: [id], onDelete: SetNull)`.
  - Nombrar la relación existente es un cambio **solo de nombre lógico Prisma**, no de columnas
    → no genera SQL ni toca la BD; el drift-check (tablas/columnas, #139) no se ve afectado.
- Verificación: `supabase db reset` (replay desde cero, ya es paso del CI) debe aplicar la
  migración limpia; `prisma generate` + `tsc` verdes.

### Parte C — STATUS.md: cerrar la auditoría

Actualizar §1 con el veredicto verificado de cada ítem auditado:
- **DT-1, DT-2** → ✅ parcialmente resuelto (estimador S3 ya corre; residual = cobertura de
  `stat`, OI-3.3/3.5). Citar `toComputedInsight`.
- **DT-3** → ✅ resuelto (esta pieza: arnés + 5 tests de integración contra supabase local en CI).
- **DT-4** → ✅ resuelto (FK + índice, migración dual).
- **DT-5, DT-6, S1/DT-3, S2/DT-2, S2/DT-3, S2/DT-4 y los `R-x` de S0–S2** → marcar
  **✅ auditado 2026-07-17 — por diseño/diferido**, con el veredicto de una línea, para que el
  ⬜ deje de leerse como deuda abierta.

## Decisiones / notas

1. **Nunca contra prod:** el guard del setup (host localhost) es un invariante de seguridad,
   no un nice-to-have — los tests hacen deletes.
2. **Aislamiento por usuario efímero**, no truncado global: mantiene los tests componibles y
   deja la Bda del job utilizable por pasos posteriores.
3. **Verificar el modelo `DomainEvent` real** (`schema.prisma:876`) antes de escribir asserts:
   nombres de columnas de estado/payload/processed. El diseño asume el patrón outbox estándar
   pero el plan debe fijar los campos exactos.
4. La FK (Parte B) es **hardening preventivo**: la columna hoy no se llena (OI-4.1 sin
   construir). Se incluye por decisión explícita del usuario ("todo de una vez").

## Verificación de cierre

- `pnpm test` puro: 1204/1204 intacto (integración excluida del run por defecto).
- `pnpm test:integration` contra supabase local: 5 tests verdes; y verdes en el job de CI.
- `supabase db reset` aplica la migración de la FK sin error.
- tsc + eslint limpios. STATUS.md refleja el cierre de la auditoría.
