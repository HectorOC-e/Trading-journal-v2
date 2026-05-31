"use client"

import { useMemo } from "react"
import { isWin, calcWinRate } from "@/lib/formulas"
import type { RawAccount, TradeStats } from "../components/account-card"
import type { RouterOutputs } from "@/server/trpc/root"

type TradeItem = RouterOutputs["trades"]["list"]["items"][number]

export function useAccountStats(
  accounts: RawAccount[],
  allTrades: TradeItem[],
): Record<string, TradeStats> {
  return useMemo(() => {
    const now        = new Date()
    const today      = now.toISOString().slice(0, 10)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const map: Record<string, TradeStats> = {}

    for (const t of allTrades) {
      if (t.status !== "CLOSED") continue
      const aid = t.accountId
      if (!map[aid]) map[aid] = { netPnl: 0, pnlMonth: 0, pnlToday: 0, winRate: null, avgR: null, tradesMonth: 0, tradesToday: 0, tradesTotal: 0, drawdownPct: 0, sparkline: [] }
      const s = map[aid]
      s.tradesTotal++
      const pnl = t.pnl ?? 0
      s.netPnl += pnl
      if (t.date >= monthStart) { s.pnlMonth += pnl; s.tradesMonth++ }
      if (t.date === today)     { s.pnlToday += pnl; s.tradesToday++ }
    }

    for (const aid of Object.keys(map)) {
      const acct    = accounts.find(a => a.id === aid)
      const initBal = acct ? Number(acct.initialBalance) : 0
      const trades  = allTrades
        .filter(t => t.accountId === aid && t.status === "CLOSED")
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      if (trades.length === 0) continue
      const wins = trades.filter(t => isWin({ pnl: t.pnl ?? 0 })).length
      map[aid].winRate = calcWinRate(wins, trades.length)
      map[aid].avgR    = trades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / trades.length

      let cumPnl = 0, peakCumPnl = 0
      const equity: number[] = [initBal]
      for (const t of trades) {
        cumPnl += t.pnl ?? 0
        equity.push(initBal + cumPnl)
        if (cumPnl > peakCumPnl) peakCumPnl = cumPnl
      }
      map[aid].sparkline   = equity
      map[aid].drawdownPct = initBal > 0 ? ((peakCumPnl - cumPnl) / initBal) * 100 : 0
    }

    return map
  }, [allTrades, accounts])
}
