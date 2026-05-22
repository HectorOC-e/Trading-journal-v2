// TradesTable organism — spec: Trades screen
// Composes: FilterBar (calidad + dirección) + table of TradeRow molecules
// Manages selected trade state internally, calls onSelect for detail panel

"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { TradeRow } from "@/components/trades/trade-row"
import { cn } from "@/lib/utils"
import type { Trade, TradeDirection, TradeTag } from "@/types"

const CALIDAD_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "A+",    label: "A+" },
  { value: "Plan",  label: "Plan" },
  { value: "Off-plan", label: "Off-plan" },
  { value: "Impulsivo", label: "Impulsivo" },
]

const DIRECTION_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "LONG",  label: "Long" },
  { value: "SHORT", label: "Short" },
]

interface TradesTableProps {
  trades: Trade[]
  selectedId?: string
  onSelect?: (trade: Trade | null) => void
  className?: string
}

export function TradesTable({ trades, selectedId, onSelect, className }: TradesTableProps) {
  const [calidad, setCalidad] = useState("TODAS")
  const [direction, setDirection] = useState("TODAS")

  const filtered = trades.filter((t) => {
    const calOk = calidad === "TODAS" || t.tags.includes(calidad as TradeTag)
    const dirOk = direction === "TODAS" || t.direction === (direction as TradeDirection)
    return calOk && dirOk
  })

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Filter bars */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterBar options={CALIDAD_OPTIONS} value={calidad} onChange={setCalidad} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border border-[var(--line)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["", "Símbolo", "Fecha", "R", "P&L", "Tags"].map((h) => (
                <th key={h} className="py-2.5 px-2 first:pl-4 last:pr-4 text-left text-eyebrow font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-[var(--ink-3)]">
                  No hay trades con estos filtros.
                </td>
              </tr>
            ) : (
              filtered.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  selected={trade.id === selectedId}
                  onClick={() => onSelect?.(trade.id === selectedId ? null : trade)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
