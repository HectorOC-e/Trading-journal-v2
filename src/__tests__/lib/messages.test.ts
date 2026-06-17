import { describe, it, expect } from "vitest"
import { resolveMessage, isMessageCode } from "@/lib/messages/resolve"
import { AppError, toUserMessage } from "@/lib/errors/app-error"

describe("resolveMessage", () => {
  it("interpolates {params} into title and body", () => {
    const m = resolveMessage("ACCOUNT_LOCKED", { name: "FTMO", reason: "Límite diario" })
    expect(m.title).toBe("Cuenta FTMO bloqueada")
    expect(m.body).toBe("Límite diario")
    expect(m.type).toBe("CRITICAL")
    expect(m.priority).toBe("P0")
    expect(m.category).toBe("Cuenta")
  })

  it("drops unknown tokens to empty string", () => {
    const m = resolveMessage("ACCOUNT_LOCKED", { name: "Demo" }) // reason missing
    expect(m.title).toBe("Cuenta Demo bloqueada")
    expect(m.body).toBe("")
  })

  it("falls back en→es when no English text exists", () => {
    const m = resolveMessage("WEEKLY_REPORT_READY", {}, "en") // no `en` defined
    expect(m.title).toBe("Reporte semanal listo")
  })

  it("uses English text when present", () => {
    const m = resolveMessage("ACCOUNT_LOCKED", { name: "FTMO", reason: "x" }, "en")
    expect(m.title).toBe("FTMO account locked")
  })

  it("defaults category to Sistema for ephemeral messages without one", () => {
    const m = resolveMessage("TRADE_SAVED", { symbol: "EURUSD", detail: "+1.8R" })
    expect(m.category).toBe("Sistema")
    expect(m.persist).toBe(false)
    expect(m.title).toBe("Trade guardado")
    expect(m.body).toBe("EURUSD · +1.8R")
  })

  it("resolves action labels (i18n)", () => {
    const es = resolveMessage("ACCOUNT_LOCKED", { name: "X", reason: "y" }, "es")
    expect(es.actions[0]).toMatchObject({ label: "Ver cuenta", href: "/cuentas", style: "primary" })
    const en = resolveMessage("ACCOUNT_LOCKED", { name: "X", reason: "y" }, "en")
    expect(en.actions[0].label).toBe("View account")
  })
})

describe("isMessageCode", () => {
  it("recognises known codes and rejects others", () => {
    expect(isMessageCode("ACCOUNT_LOCKED")).toBe(true)
    expect(isMessageCode("NOPE")).toBe(false)
    expect(isMessageCode(42)).toBe(false)
  })
})

describe("toUserMessage", () => {
  it("resolves an AppError by code + params", () => {
    const m = toUserMessage(new AppError("WITHDRAWAL_EXCEEDS_BALANCE", { amount: "$500", available: "$120" }))
    expect(m.title).toBe("Retiro rechazado")
    expect(m.body).toContain("$500")
    expect(m.body).toContain("$120")
  })

  it("resolves when the error message is itself a catalog code", () => {
    const m = toUserMessage({ message: "NOT_FOUND" })
    expect(m.code).toBe("NOT_FOUND")
  })

  it("maps tRPC data.code to a catalog code", () => {
    expect(toUserMessage({ data: { code: "TOO_MANY_REQUESTS" } }).code).toBe("RATE_LIMITED")
    expect(toUserMessage({ data: { code: "UNAUTHORIZED" } }).code).toBe("UNAUTHORIZED")
  })

  it("falls back to GENERIC_ERROR for unknown errors", () => {
    expect(toUserMessage(new Error("boom")).code).toBe("GENERIC_ERROR")
  })
})
