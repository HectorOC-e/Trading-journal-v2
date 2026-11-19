/**
 * Authed E2E flows — trades, dashboard, retiros (multi-cuenta / multi-moneda).
 * Requires a running app + E2E_USER_EMAIL / E2E_USER_PASSWORD and the seeded
 * "E2E EUR Test" account. Screenshots are written to /tmp/e2e-shots.
 */
import { test, expect, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"

const EMAIL    = process.env.E2E_USER_EMAIL    ?? ""
const PASSWORD = process.env.E2E_USER_PASSWORD ?? ""
const SHOTS    = "/tmp/e2e-shots"

test.skip(!EMAIL || !PASSWORD, "E2E creds not configured")
test.describe.configure({ mode: "serial" })

async function login(page: Page) {
  await page.goto("/login")
  await page.locator("#email").fill(EMAIL)
  await page.locator("#password").fill(PASSWORD)
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 })
}

test("auth → dashboard renders", async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true })
})

test("trades page lists trades + register action", async ({ page }) => {
  await login(page)
  await page.goto("/trades")
  await expect(page.getByRole("button", { name: /registrar trade/i })).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: `${SHOTS}/02-trades.png`, fullPage: true })
})

test("operational worlds and learning practices visual QA", async ({ page }) => {
  await login(page)
  await page.waitForLoadState("networkidle")

  const modeSelector = page.getByRole("tablist", { name: "Modalidad de operativa" })
  await expect(modeSelector).toBeVisible({ timeout: 15_000 })
  await modeSelector.getByRole("tab", { name: "Demo" }).click()
  await expect(modeSelector.getByRole("tab", { name: "Demo" })).toHaveAttribute("aria-selected", "true")
  await page.screenshot({ path: `${SHOTS}/06-dashboard-demo.png`, fullPage: true })

  await page.goto("/aprendizaje")
  await page.getByRole("tab", { name: "Prácticas" }).click()
  await expect(page.getByRole("heading", { name: "Prácticas", exact: true })).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: `${SHOTS}/07-aprendizaje-practicas.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/dashboard")
  await expect(page.getByRole("tablist", { name: "Modalidad de operativa" })).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/08-dashboard-mobile.png`, fullPage: true })
})

test("retiros: create a USD withdrawal → per-currency KPI", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")

  // ── USD withdrawal on the USD (FTMO) account ──
  await page.getByRole("button", { name: /nuevo retiro/i }).first().click()
  // Withdraw from the seeded funded USD account. There are two USD FTMO accounts
  // ("FTMO 100K — Phase 1 USD" and "FTMO Funded USD"); only the funded one has a
  // withdrawable balance, and its name is unique (avoids the /FTMO/i clash).
  await page.getByRole("dialog").getByRole("button", { name: /FTMO Funded/i }).click()
  await page.getByRole("dialog").getByLabel(/Monto/).fill("500")
  await page.getByRole("button", { name: /registrar retiro/i }).click()
  // Redesigned retiros UI shows one KPI card per currency ("Pagado · <cur>" with
  // a "<amount> pendiente" sub) — there is no "Pendiente · <cur>" text anymore.
  await expect(page.getByText("Pagado · USD")).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/03-retiros-usd.png`, fullPage: true })
})

test("retiros: change status to Pagado", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: /Cambiar estado/i }).first().click()
  page.once("dialog", dialog => dialog.accept())
  await page.getByRole("menuitem", { name: "Pagado" }).click()
  await expect(page.getByRole("button", { name: /Cambiar estado.*Pagado/i }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Pagado ·/).first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/04-retiros-paid.png`, fullPage: true })
})

test("retiros: delete with inline confirm", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")
  const rowsBefore = await page.getByRole("button", { name: /Cambiar estado/i }).count()
  await page.getByRole("button", { name: /Eliminar retiro/i }).first().click()
  await page.getByRole("button", { name: /Confirmar eliminación/i }).click()
  await expect(async () => {
    const after = await page.getByRole("button", { name: /Cambiar estado/i }).count()
    expect(after).toBe(rowsBefore - 1)
  }).toPass({ timeout: 15_000 })
})

test("retiros: D-02 over-withdrawal is rejected", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: /nuevo retiro/i }).first().click()
  // Withdraw from the seeded funded USD account. There are two USD FTMO accounts
  // ("FTMO 100K — Phase 1 USD" and "FTMO Funded USD"); only the funded one has a
  // withdrawable balance, and its name is unique (avoids the /FTMO/i clash).
  await page.getByRole("dialog").getByRole("button", { name: /FTMO Funded/i }).click()
  await page.getByRole("dialog").getByLabel(/Monto/).fill("99999999")
  await page.getByRole("button", { name: /registrar retiro/i }).click()
  await expect(page.getByText(/saldo disponible/i).first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/05-retiros-d02-reject.png`, fullPage: true })
})

test.describe("ruta de validación de estrategias", () => {
  let pool: Pool | undefined
  let userId = ""
  let setupId = ""
  let practiceId = ""
  const accountIds: string[] = []
  const tradeIds: string[] = []

  async function createTrade(mode: "BACKTEST" | "DEMO" | "REAL", accountId: string, index: number, totalWeeks: number, rMultiple: number, direction = "LONG") {
    if (!pool) throw new Error("Pool E2E no inicializado")
    const id = randomUUID()
    const date = new Date(Date.UTC(2026, index % 12, 2 + Math.floor(index / Math.max(1, Math.ceil((index + 1) / totalWeeks))) * 7 + (index % 5)))
    await pool.query(
      `INSERT INTO public.trades (
        id, user_id, account_id, setup_id, operational_mode, direction, symbol,
        entry, stop, target, size, date, open_time, close_time, session, tags,
        notes, screenshot_urls, r_multiple, pnl, status, close_price
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'EURUSD',
        1.1, 1.09, 1.12, 1, $7, '09:00', '10:00', 'LONDRES', $8::text[],
        'Fixture aislada de validación', ARRAY[]::text[], $9, $10, 'CLOSED', $11
      )`,
      [id, userId, accountId, setupId, mode, direction, date, ["E2E_VALIDATION"], rMultiple, rMultiple * 100, rMultiple > 0 ? 1.11 : 1.09],
    )
    await pool.query(
      `INSERT INTO public.trade_checklist_results
        (user_id, trade_id, setup_id, items_checked, items_total)
       VALUES ($1, $2, $3, $4::text[], 1)`,
      [userId, id, setupId, ["Confirmación"]],
    )
    tradeIds.push(id)
    return id
  }

  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada para el E2E autenticado")
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
    const userResult = await pool.query<{ id: string }>("SELECT id FROM public.users WHERE email = $1 LIMIT 1", [EMAIL])
    const user = userResult.rows[0]
    if (!user) throw new Error(`No existe el usuario E2E ${EMAIL}`)
    userId = user.id
    setupId = randomUUID()
    await pool.query(
      `INSERT INTO public.setups (
        id, user_id, name, abbreviation, market, direction, description, color,
        images, aplus_checklist, standard_checklist, expected_wr, expected_avg_r
      ) VALUES ($1, $2, $3, 'VQA', 'FX', 'LONG', $4, '#4f6ef7',
        ARRAY[]::text[], $5::text[], ARRAY[]::text[], 60, 1)`,
      [setupId, userId, `Validación E2E ${setupId.slice(0, 6)}`, "Ruptura confirmada con retroceso y checklist", ["Confirmación"]],
    )
    for (const [type, name] of [["BACKTEST", "Backtesting"], ["DEMO_PERSONAL", "Demo"], ["PERSONAL", "Real"]] as const) {
      const accountId = randomUUID()
      await pool.query(
        `INSERT INTO public.accounts (
          id, user_id, name, broker, type, status, initial_balance, currency, timezone, allowed_symbols
        ) VALUES ($1, $2, $3, 'E2E', $4, 'ACTIVE', 10000, 'USD', 'America/Tegucigalpa', $5::text[])`,
        [accountId, userId, `Validación ${name} ${setupId.slice(0, 6)}`, type, ["EURUSD"]],
      )
      accountIds.push(accountId)
    }
    for (let index = 0; index < 29; index++) await createTrade("BACKTEST", accountIds[0], index, 5, index % 3 === 0 ? -0.5 : 1)
    for (let index = 0; index < 20; index++) await createTrade("DEMO", accountIds[1], index, 4, index % 4 === 0 ? -0.5 : 1)
    for (let index = 0; index < 20; index++) await createTrade("REAL", accountIds[2], index, 4, -1, "SHORT")

    practiceId = randomUUID()
    await pool.query(
      `INSERT INTO public.learning_practices (
        id, user_id, title, date, duration_min, exercise, objective, reflection, kind, operational_mode
      ) VALUES ($1, $2, 'Práctica E2E de ruptura', DATE '2026-10-01', 25,
        'Revisar confirmación', 'Aplicar checklist', 'Fixture temporal', 'EXECUTION', 'BACKTEST')`,
      [practiceId, userId],
    )
    await pool.query(
      "INSERT INTO public.practice_trade_links (user_id, practice_id, trade_id, role) VALUES ($1, $2, $3, 'EXECUTED')",
      [userId, practiceId, tradeIds[0]],
    )
    await pool.query(
      "INSERT INTO public.practice_attachments (practice_id, path, mime) VALUES ($1, $2, 'image/png')",
      [practiceId, `e2e-validation/${practiceId}.png`],
    )
  })

  test.afterAll(async () => {
    if (!pool) return
    try {
      if (userId && setupId) await pool.query("DELETE FROM public.notifications WHERE user_id = $1 AND source_id = $2", [userId, setupId])
      if (userId && practiceId) await pool.query("DELETE FROM public.learning_practices WHERE id = $1 AND user_id = $2", [practiceId, userId])
      if (userId && accountIds.length) await pool.query("DELETE FROM public.accounts WHERE user_id = $1 AND id = ANY($2::uuid[])", [userId, accountIds])
      if (userId && setupId) await pool.query("DELETE FROM public.setups WHERE id = $1 AND user_id = $2", [setupId, userId])
    } finally {
      await pool.end()
    }
  })

  test("brecha → práctica → elegibilidad → Demo → monitoreo Real", async ({ page }) => {
    await login(page)
    await page.goto(`/playbook?highlight=${setupId}`)
    const route = page.getByRole("region", { name: "Hipótesis → Backtesting → Demo → Real" })
    await expect(route).toBeVisible({ timeout: 20_000 })
    await route.getByRole("tab", { name: /Backtesting/ }).click()
    await expect(route.getByRole("tabpanel")).toContainText("29 operaciones")
    await expect(route.getByRole("table", { name: "Comparación por modalidad" }).getByRole("row", { name: /Backtesting 29/ })).toBeVisible()
    await expect(route).not.toContainText(/total combinado|p&l total/i)
    await page.screenshot({ path: `${SHOTS}/09-validacion-brecha-desktop.png`, fullPage: true })

    await route.getByRole("link", { name: "Crear práctica" }).click()
    const practiceDialog = page.getByRole("dialog", { name: /Registrar práctica/i })
    await expect(practiceDialog).toBeVisible({ timeout: 20_000 })
    await expect(practiceDialog.getByLabel("Qué practicaste")).toHaveValue(/Validación.*Backtesting/)
    await expect(practiceDialog.getByText(/Borrador sugerido desde la ruta de validación/)).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/10-validacion-practica-borrador.png`, fullPage: true })
    await practiceDialog.getByRole("button", { name: "Cancelar" }).click()
    await page.goto(`/playbook?highlight=${setupId}`)

    await createTrade("BACKTEST", accountIds[0], 29, 5, 1)
    const refreshedRoute = page.getByRole("region", { name: "Hipótesis → Backtesting → Demo → Real" })
    await expect(refreshedRoute).toBeVisible({ timeout: 20_000 })
    await refreshedRoute.getByRole("tab", { name: /Backtesting/ }).click()
    await expect(refreshedRoute.getByRole("tabpanel")).toContainText("30 operaciones")
    await expect(refreshedRoute.getByRole("tabpanel")).toContainText("Elegible para avanzar")

    await refreshedRoute.getByRole("tab", { name: /Hipótesis/ }).click()
    await refreshedRoute.getByRole("button", { name: "Revisar avance" }).click()
    await expect(page.getByRole("dialog", { name: /Decisión de validación/ })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/11-validacion-decision.png`, fullPage: true })
    await page.getByRole("button", { name: "Confirmar decisión" }).click()
    await expect(refreshedRoute.getByRole("tab", { name: /Backtesting/ })).toHaveAttribute("aria-selected", "true")

    for (const expectedStage of ["Demo", "Real"] as const) {
      await refreshedRoute.getByRole("button", { name: "Revisar avance" }).click()
      await page.getByRole("button", { name: "Confirmar decisión" }).click()
      await expect(refreshedRoute.getByRole("tab", { name: new RegExp(expectedStage) })).toHaveAttribute("aria-selected", "true")
    }
    await expect(refreshedRoute).toContainText("Monitoreo continuo")
    await expect(refreshedRoute).toContainText(/deterioro|alejó de la definición/i)
    await expect(refreshedRoute.getByRole("tab", { name: /Real/ })).toHaveAttribute("aria-selected", "true")

    await page.setViewportSize({ width: 390, height: 844 })
    await refreshedRoute.getByRole("tab", { name: /Real/ }).focus()
    await page.keyboard.press("Enter")
    await expect(refreshedRoute.getByRole("tabpanel")).toContainText("Monitoreo continuo")
    await page.screenshot({ path: `${SHOTS}/12-validacion-real-mobile.png`, fullPage: true })
  })
})
