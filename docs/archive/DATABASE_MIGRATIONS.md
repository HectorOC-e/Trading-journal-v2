# Database Migrations — Policy & Workflow

**Política (obligatoria):** Ningún cambio de base de datos se hace a mano
(SQL Editor de Supabase, psql, consola, dashboard, ni vía MCP `apply_migration`
ad-hoc). **Todo cambio de esquema vive como una migración versionada en el
repositorio** y se aplica mediante el flujo del proyecto. El esquema completo
debe poder recrearse desde cero usando solo el código + `supabase/migrations/`.

---

## Fuente única de verdad

```
supabase/
  config.toml            # project_id = jpojusluihjjsjvcubdp, Postgres 17
  migrations/            # ← TODAS las migraciones, en orden por timestamp
    20260523004843_initial_schema.sql
    ...
    20260605043438_create_user_ai_configs.sql
```

- El sistema de migraciones del proyecto es el **Supabase CLI**, rastreado en
  producción por `supabase_migrations.schema_migrations`.
- `prisma/schema.prisma` describe los **modelos para el cliente Prisma** (typing
  y queries). **No** aplica DDL. Debe mantenerse coherente con las migraciones,
  pero la verdad del esquema son los archivos de `supabase/migrations/`.
- La antigua carpeta `src/prisma/migrations/*.sql` (SQL a mano, sin runner) fue
  **eliminada**: estaba huérfana y desincronizada con producción, y fue la causa
  raíz del bug de OpenRouter (tabla declarada en el schema pero nunca migrada).

---

## Flujo normal

### 1. Vincular el proyecto (una vez por máquina, interactivo)
```bash
supabase login
supabase link --project-ref jpojusluihjjsjvcubdp
```

### 2. Crear una migración nueva
```bash
supabase migration new <descripcion_en_snake_case>
# crea supabase/migrations/<timestamp>_<descripcion>.sql  → editar el SQL ahí
```

### 3. Probar localmente desde cero (reproducibilidad)
```bash
supabase db reset      # recrea el esquema replayendo TODAS las migraciones
```

### 4. Aplicar a producción
```bash
supabase db push       # aplica solo las migraciones pendientes al remoto vinculado
```

> Recomendado: aplicar primero contra una **branch** de Supabase y luego mergear,
> según `docs/target-architecture.md`.

### 5. Acompañar el cambio (checklist de la política)
Cuando una migración cambia el esquema, en el mismo PR:
1. ✅ Migración en `supabase/migrations/`
2. ✅ `prisma/schema.prisma` actualizado (modelos/tipos) + `prisma generate`
3. ✅ Servicios/routers actualizados
4. ✅ Tests actualizados
5. ✅ Documentación actualizada

---

## Verificación de reproducibilidad

El repo ya contiene la **historia canónica completa** (36 migraciones,
materializadas desde `supabase_migrations.schema_migrations`). Una BD nueva se
reconstruye idéntica a producción con:

```bash
supabase db reset
```

No se depende de ningún cambio manual hecho en el dashboard de Supabase.

---

## Qué NO hacer

- ❌ Ejecutar `ALTER`/`CREATE` a mano en el SQL Editor / psql / dashboard.
- ❌ `prisma db push` contra producción (crea divergencia esquema↔migraciones).
- ❌ Aplicar SQL suelto vía MCP sin dejar el archivo versionado.
- ❌ Editar una migración ya aplicada en producción — crear una nueva en su lugar.
