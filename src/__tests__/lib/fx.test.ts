import { describe, it, expect } from "vitest"
import { fxFactor, convertToBase, USD_VALUE, parseFxRates, currencySymbol } from "@/lib/fx"

describe("fx", () => {
  it("same currency → factor 1 (no conversion)", () => {
    expect(fxFactor("USD", "USD")).toBe(1)
    expect(fxFactor("EUR", "EUR")).toBe(1)
    expect(convertToBase(500, "USD", "USD")).toBe(500)
  })

  it("converts a foreign currency into the base", () => {
    // 1 EUR = 1.08 USD
    expect(convertToBase(100, "EUR", "USD")).toBeCloseTo(108, 5)
    // 1000 MXN → USD
    expect(convertToBase(1000, "MXN", "USD")).toBeCloseTo(58, 5)
  })

  it("converts when the base is not USD", () => {
    // 108 USD expressed in EUR = 100
    expect(convertToBase(108, "USD", "EUR")).toBeCloseTo(100, 5)
  })

  it("unknown currency falls back to factor 1 (treated as base)", () => {
    expect(fxFactor("ZZZ", "USD")).toBe(1)
    expect(USD_VALUE.USD).toBe(1)
  })

  it("per-user override takes precedence over the static default", () => {
    // user sets EUR = 1.20 instead of default 1.08
    expect(convertToBase(100, "EUR", "USD", { EUR: 1.20 })).toBeCloseTo(120, 5)
    // unrelated currency still uses default
    expect(convertToBase(1000, "MXN", "USD", { EUR: 1.20 })).toBeCloseTo(58, 5)
  })

  it("USD is never overridable (always 1)", () => {
    expect(fxFactor("USD", "USD", { USD: 5 })).toBe(1)
    expect(convertToBase(100, "USD", "EUR", { USD: 5, EUR: 1.08 })).toBeCloseTo(100 / 1.08, 5)
  })

  it("ignores non-positive overrides, falling back to default", () => {
    expect(convertToBase(100, "EUR", "USD", { EUR: 0 })).toBeCloseTo(108, 5)
    expect(convertToBase(100, "EUR", "USD", { EUR: -2 })).toBeCloseTo(108, 5)
  })

  it("preserves ratios — a loss and a balance scale by the same factor (drawdown % invariant)", () => {
    const f = fxFactor("EUR", "USD")
    const loss = -2500 * f, bal = 50000 * f
    expect(Math.abs(loss) / bal).toBeCloseTo(2500 / 50000, 10)
  })
})

describe("parseFxRates", () => {
  it("parses a JSON string of overrides", () => {
    expect(parseFxRates('{"EUR":1.2,"MXN":0.06}')).toEqual({ EUR: 1.2, MXN: 0.06 })
  })
  it("accepts an already-parsed object", () => {
    expect(parseFxRates({ EUR: 1.1 })).toEqual({ EUR: 1.1 })
  })
  it("returns {} for null, empty, or malformed input", () => {
    expect(parseFxRates(null)).toEqual({})
    expect(parseFxRates("")).toEqual({})
    expect(parseFxRates("not json")).toEqual({})
    expect(parseFxRates("[1,2,3]")).toEqual({})
  })
  it("drops invalid keys and non-positive values; upper-cases codes", () => {
    expect(parseFxRates('{"eur":1.08,"US":1,"GBP":-1,"JPY":0,"CHF":"x"}')).toEqual({ EUR: 1.08 })
  })
})

describe("currencySymbol", () => {
  it("returns the symbol for known codes", () => {
    expect(currencySymbol("USD")).toBe("$")
    expect(currencySymbol("EUR")).toBe("€")
    expect(currencySymbol("GBP")).toBe("£")
  })
  it("falls back to the code for unknown/invalid input", () => {
    expect(currencySymbol("ZZZ")).toBe("ZZZ")
  })
})
