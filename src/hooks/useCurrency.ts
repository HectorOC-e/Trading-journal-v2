import { useMemo } from "react"
import { trpc } from "@/lib/trpc/client"

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$",
  CAD: "C$", CHF: "Fr", MXN: "MX$", HNL: "L", BRL: "R$",
  COP: "COP$", ARS: "$", PEN: "S/", CLP: "CLP$", UYU: "$U",
}

export interface CurrencyInfo {
  baseCurrency: string
  symbol:       string
  formatAmount: (amount: number, opts?: { showSign?: boolean; decimals?: number }) => string
}

export function useCurrency(): CurrencyInfo {
  const { data: profile } = trpc.profile.get.useQuery()

  return useMemo(() => {
    const baseCurrency = profile?.baseCurrency ?? "USD"
    const symbol       = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency

    function formatAmount(amount: number, opts?: { showSign?: boolean; decimals?: number }): string {
      const { showSign = false, decimals = 2 } = opts ?? {}
      const sign = showSign && amount >= 0 ? "+" : amount < 0 ? "-" : ""
      return `${sign}${symbol}${Math.abs(amount).toFixed(decimals)}`
    }

    return { baseCurrency, symbol, formatAmount }
  }, [profile?.baseCurrency])
}
