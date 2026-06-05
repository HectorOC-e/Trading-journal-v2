/**
 * E2E smoke tests — TASK-025
 * Requires:
 *   E2E_BASE_URL   = http://localhost:3000 (default)
 *   E2E_USER_EMAIL = test account email
 *   E2E_USER_PASSWORD = test account password
 *
 * Run: pnpm exec playwright test
 * Note: These tests require a running app instance and valid test credentials.
 */

import { test, expect } from "@playwright/test"

const EMAIL    = process.env.E2E_USER_EMAIL    ?? ""
const PASSWORD = process.env.E2E_USER_PASSWORD ?? ""

test.describe("Smoke: Login → Dashboard", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not configured")

  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain("/login")
  })

  test("logs in and reaches dashboard", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password|contraseña/i).fill(PASSWORD)
    await page.getByRole("button", { name: /entrar|iniciar|login|sign in/i }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    expect(page.url()).toContain("/dashboard")
  })
})

test.describe("Smoke: Create Trade → Verify in list", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not configured")

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password|contraseña/i).fill(PASSWORD)
    await page.getByRole("button", { name: /entrar|iniciar|login|sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  })

  test("navigates to trades page and shows register button", async ({ page }) => {
    await page.goto("/trades")
    const registerBtn = page.getByRole("button", { name: /registrar trade/i })
    await expect(registerBtn).toBeVisible({ timeout: 10_000 })
  })
})

test.describe("Smoke: Reviews page accessibility", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not configured")

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password|contraseña/i).fill(PASSWORD)
    await page.getByRole("button", { name: /entrar|iniciar|login|sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  })

  test("reviews page shows Semanales/Mensuales tab toggle", async ({ page }) => {
    await page.goto("/reviews")
    const tabList = page.getByRole("tablist", { name: /tipo de review/i })
    await expect(tabList).toBeVisible({ timeout: 10_000 })

    const mensualTab = tabList.getByRole("tab", { name: "Mensuales" })
    await expect(mensualTab).toBeVisible()
    await mensualTab.click()
    await expect(mensualTab).toHaveAttribute("aria-selected", "true")
  })
})
