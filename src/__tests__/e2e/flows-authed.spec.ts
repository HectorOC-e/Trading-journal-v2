/**
 * Authed E2E flows — trades, dashboard, retiros (multi-cuenta / multi-moneda).
 * Requires a running app + E2E_USER_EMAIL / E2E_USER_PASSWORD and the seeded
 * "E2E EUR Test" account. Screenshots are written to /tmp/e2e-shots.
 */
import { test, expect, type Page } from "@playwright/test"

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

test("retiros: create USD + EUR withdrawals → per-currency KPIs (multi-moneda/multi-cuenta)", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")

  // ── USD withdrawal on the USD (FTMO) account ──
  await page.getByRole("button", { name: /nuevo retiro/i }).first().click()
  await page.getByRole("button", { name: /FTMO/i }).click()
  await page.getByPlaceholder("5,000…").fill("500")
  await page.getByRole("button", { name: /registrar retiro/i }).click()
  await expect(page.getByText("Pendiente · USD")).toBeVisible({ timeout: 15_000 })

  // ── EUR withdrawal on the EUR (E2E EUR Test) account ──
  await page.getByRole("button", { name: /nuevo retiro/i }).first().click()
  await page.getByRole("button", { name: /E2E EUR Test/i }).click()
  await page.getByPlaceholder("5,000…").fill("300")
  await page.getByRole("button", { name: /registrar retiro/i }).click()
  await expect(page.getByText("Pendiente · EUR")).toBeVisible({ timeout: 15_000 })

  // Both currency groups visible at once = multi-moneda not mixed into one figure
  await expect(page.getByText("Pendiente · USD")).toBeVisible()
  await expect(page.getByText("Pendiente · EUR")).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/03-retiros-multicurrency.png`, fullPage: true })
})

test("retiros: change status to Pagado", async ({ page }) => {
  await login(page)
  await page.goto("/retiros")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: /Cambiar estado/i }).first().click()
  await page.getByRole("menuitem", { name: "Pagado" }).click()
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
  await page.getByRole("button", { name: /FTMO/i }).click()
  await page.getByPlaceholder("5,000…").fill("99999999")
  await page.getByRole("button", { name: /registrar retiro/i }).click()
  await expect(page.getByText(/saldo disponible/i).first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/05-retiros-d02-reject.png`, fullPage: true })
})
