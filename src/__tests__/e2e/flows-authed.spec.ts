/**
 * Authed E2E flows — trades, dashboard, retiros (multi-cuenta / multi-moneda).
 * Requires a running app + E2E_USER_EMAIL / E2E_USER_PASSWORD and the seeded
 * "E2E EUR Test" account. Screenshots are written to /tmp/e2e-shots.
 */
import { test, expect, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import type { PrismaClient } from "@/lib/generated/prisma/client"

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
  let prisma: PrismaClient
  let userId = ""
  let setupId = ""
  let practiceId = ""
  const accountIds: string[] = []
  const tradeIds: string[] = []

  async function createTrade(mode: "BACKTEST" | "DEMO" | "REAL", accountId: string, index: number, totalWeeks: number, rMultiple: number, direction = "LONG") {
    const id = randomUUID()
    const date = new Date(Date.UTC(2026, index % 12, 2 + Math.floor(index / Math.max(1, Math.ceil((index + 1) / totalWeeks))) * 7 + (index % 5)))
    await prisma.trade.create({
      data: {
        id, userId, accountId, setupId, operationalMode: mode,
        direction, symbol: "EURUSD", entry: 1.1, stop: 1.09, target: 1.12, size: 1,
        date, openTime: "09:00", closeTime: "10:00", session: "LONDRES",
        tags: ["E2E_VALIDATION"], notes: "Fixture aislada de validación", screenshotUrls: [],
        rMultiple, pnl: rMultiple * 100, status: "CLOSED", closePrice: rMultiple > 0 ? 1.11 : 1.09,
      },
    })
    await prisma.tradeChecklistResult.create({
      data: { userId, tradeId: id, setupId, itemsChecked: ["Confirmación"], itemsTotal: 1 },
    })
    tradeIds.push(id)
    return id
  }

  test.beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma")
    prisma = prismaModule.prisma
    const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
    if (!user) throw new Error(`No existe el usuario E2E ${EMAIL}`)
    userId = user.id
    setupId = randomUUID()
    await prisma.setup.create({
      data: {
        id: setupId, userId, name: `Validación E2E ${setupId.slice(0, 6)}`, abbreviation: "VQA",
        market: "FX", direction: "LONG", description: "Ruptura confirmada con retroceso y checklist",
        color: "#4f6ef7", images: [], aplusChecklist: ["Confirmación"], standardChecklist: [],
        expectedWr: 60, expectedAvgR: 1,
      },
    })
    for (const [type, name] of [["BACKTEST", "Backtesting"], ["DEMO_PERSONAL", "Demo"], ["PERSONAL", "Real"]] as const) {
      const account = await prisma.account.create({
        data: {
          id: randomUUID(), userId, name: `Validación ${name} ${setupId.slice(0, 6)}`, broker: "E2E",
          type, status: "ACTIVE", initialBalance: 10_000, currency: "USD", timezone: "America/Tegucigalpa",
          allowedSymbols: ["EURUSD"],
        },
      })
      accountIds.push(account.id)
    }
    for (let index = 0; index < 29; index++) await createTrade("BACKTEST", accountIds[0], index, 5, index % 3 === 0 ? -0.5 : 1)
    for (let index = 0; index < 20; index++) await createTrade("DEMO", accountIds[1], index, 4, index % 4 === 0 ? -0.5 : 1)
    for (let index = 0; index < 20; index++) await createTrade("REAL", accountIds[2], index, 4, -1, "SHORT")

    practiceId = randomUUID()
    await prisma.learningPractice.create({
      data: {
        id: practiceId, userId, title: "Práctica E2E de ruptura", date: new Date("2026-10-01"),
        durationMin: 25, exercise: "Revisar confirmación", objective: "Aplicar checklist",
        reflection: "Fixture temporal", kind: "EXECUTION", operationalMode: "BACKTEST",
      },
    })
    await prisma.practiceTradeLink.create({ data: { userId, practiceId, tradeId: tradeIds[0], role: "EXECUTED" } })
    await prisma.practiceAttachment.create({ data: { practiceId, path: `e2e-validation/${practiceId}.png`, mime: "image/png" } })
  })

  test.afterAll(async () => {
    if (!prisma || !userId) return
    if (setupId) await prisma.notification.deleteMany({ where: { userId, sourceId: setupId } })
    if (practiceId) await prisma.learningPractice.deleteMany({ where: { id: practiceId, userId } })
    if (accountIds.length) await prisma.account.deleteMany({ where: { userId, id: { in: accountIds } } })
    if (setupId) await prisma.setup.deleteMany({ where: { id: setupId, userId } })
    await prisma.$disconnect()
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
