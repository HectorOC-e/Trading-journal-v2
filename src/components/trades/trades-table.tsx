// TradesTable organism — spec: Trades screen
// Filters: Calidad · Dirección · Cuenta · Sesión
// Header shows trade count + net P&L
// Passes account/setup to each TradeRow

"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { TradeRow } from "@/components/trades/trade-row"
import { cn } from "@/lib/utils"
import type { Trade, Account, Setup, TradeDirection, TradeTag, TradeSession } from "@/types"

const CALIDAD_OPTIONS = [
  { value: "TODAS",     label: "Todas" },
  { value: "A+",        label: "A+" },
  { value: "Plan",      label: "Plan" },
  { value: "Off-plan",  label: "Off-plan" },
  { value: "Impulsivo", label: "Impulsivo" },
]

const DIRECTION_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "LONG",  label: "Long" },
  { value: "SHORT", label: "Short" },
]

const SESSION_OPTIONS = [
  { value: "TODAS",        label: "Todas" },
  { value: "New York",     label: "NY" },
  { value: "London",       label: "London" },
  { value: "Asia",         label: "Asia" },
  { value: "London Close", label: "LDN Close" },
]

const COLUMN_HEADERS = ["", "Símbolo", "Cuenta", "Fecha", "Sesión", "R", "P&L", "Calidad"]

interface TradesTableProps {
  trades: Trade[]
  accounts?: Account[]
  setups?: Setup[]
  selectedId?: string
  onSelect?: (trade: Trade | null) => void
  className?: string
}

export function TradesTable({
  trades,
  accounts = [],
  setups = [],
  selectedId,
  onSelect,
  className,
}: TradesTableProps) {
  const [calidad,   setCalidad]   = useState("TODAS")
  const [direction, setDirection] = useState("TODAS")
  const [accountF,  setAccountF]  = useState("TODAS")
  const [sessionF,  setSessionF]  = useState("TODAS")

  // Build per-account filter options dynamically from loaded accounts
  const accountOptions = [
    { value: "TODAS", label: "Todas cuentas" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ]

  const filtered = trades.filter((t) => {
    const calOk  = calidad    === "TODAS" || t.tags.includes(calidad as TradeTag)
    const dirOk  = direction  === "TODAS" || t.direction === (direction as TradeDirection)
    const accOk  = accountF   === "TODAS" || t.accountId === accountF
    const sesOk  = sessionF   === "TODAS" || t.session === (sessionF as TradeSession)
    return calOk && dirOk && accOk && sesOk
  })

  const netPnl = filtered.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const netPnlStr = netPnl >= 0
    ? `+$${netPnl.toLocaleString()}`
    : `-$${Math.abs(netPnl).toLocaleString()}`

  return (
    <div className={cn("flex flex-col gap-3", className)}>

      {/* Header: count + net */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">{filtered.length} trades</span>
          {" · "}
          <span className={cn("font-mono font-semibold", netPnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
            {netPnlStr} neto
          </span>
        </p>
      </div>

      {/* Filter bars */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterBar options={CALIDAD_OPTIONS}   value={calidad}   onChange={setCalidad} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={accountOptions}    value={accountF}  onChange={setAccountF} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={SESSION_OPTIONS}   value={sessionF}  onChange={setSessionF} />
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border border-[var(--line)] overflow-hidden bg-[var(--panel)]">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {COLUMN_HEADERS.map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  className={cn(
                    "py-2.5 px-2 text-eyebrow font-semibold text-[var(--ink-3)]",
                    i === 0 ? "pl-4" : "",
                    i === COLUMN_HEADERS.length - 1 ? "pr-4" : "",
                    i >= 5 ? "text-right" : "text-left"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_HEADERS.length} className="py-10 text-center text-sm text-[var(--ink-3)]">
                  No hay trades con estos filtros.
                </td>
              </tr>
            ) : (
              filtered.map((trade) => {
                const account = accounts.find((a) => a.id === trade.accountId)
                const setup   = setups.find((s) => s.id === trade.setupId)
                return (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    account={account}
                    setup={setup}
                    selected={trade.id === selectedId}
                    onClick={() => onSelect?.(trade.id === selectedId ? null : trade)}
                  />
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
