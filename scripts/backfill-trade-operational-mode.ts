// Dry-run by default. Idempotent, bounded batches; never assigns unknowns to REAL.
import { createRequire } from "node:module"
const { Pool } = createRequire(new URL("../src/package.json", import.meta.url))("pg")
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
try {
  let changed = 0
  if (process.argv.includes("--apply")) {
    for (;;) {
      const result = await pool.query(`
        WITH batch AS (
          SELECT t.id FROM public.trades t JOIN public.accounts a ON a.id=t.account_id AND a.user_id=t.user_id
          WHERE t.operational_mode IS NULL AND public.operational_mode_for_type(a.type) IS NOT NULL
          ORDER BY t.id LIMIT $1 FOR UPDATE OF t SKIP LOCKED
        )
        UPDATE public.trades t SET operational_mode=public.operational_mode_for_type(a.type)
        FROM batch b, public.accounts a WHERE t.id=b.id AND a.id=t.account_id AND a.user_id=t.user_id
      `, [1000])
      changed += result.rowCount
      if (result.rowCount === 0) break
    }
  }
  const result = await pool.query(`SELECT a.type, t.operational_mode, count(*)::int AS count
    FROM public.trades t JOIN public.accounts a ON a.id=t.account_id
    GROUP BY a.type,t.operational_mode ORDER BY a.type,t.operational_mode`)
  console.log(JSON.stringify({ applied: process.argv.includes("--apply"), changed, cohorts: result.rows }))
} finally {
  await pool.end()
}
