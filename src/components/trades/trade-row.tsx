// TradeRow molecule — spec: Trades > Anatomy
// Variants: normal (default) and selected (accent border-left + bg highlight)

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Trade, TradeTag } from "@/types"

const TAG_VARIANT: Record<TradeTag, "aplus" | "accent" | "default" | "be" | "offplan"> = {
  "A+":        "aplus",
  "A":         "accent",
  "B":         "default",
  "Plan":      "accent",
  "Off-plan":  "offplan",
  "Impulsivo": "offplan",
  "BE":        "be",
}

interface TradeRowProps {
  trade: Trade
  selected?: boolean
  onClick?: () => void
}

export function TradeRow({ trade, selected = false, onClick }: TradeRowProps) {
  const pnlPositive = (trade.pnl ?? 0) >= 0
  const rPositive   = (trade.rMultiple ?? 0) >= 0

  return (
    <tr
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-colors text-sm",
        selected
          ? "bg-[var(--accent-soft)] border-l-2 border-[var(--accent)]"
          : "hover:bg-[var(--panel-2)] border-l-2 border-transparent"
      )}
    >
      {/* Direction */}
      <td className="py-2.5 pl-4 pr-2 w-12">
        <span
          className={cn(
            "inline-flex items-center justify-center w-10 h-5 rounded text-[10px] font-bold",
            trade.direction === "LONG"
              ? "bg-[var(--win-soft)] text-[var(--win)]"
              : "bg-[var(--loss-soft)] text-[var(--loss)]"
          )}
        >
          {trade.direction}
        </span>
      </td>

      {/* Symbol + Setup */}
      <td className="py-2.5 px-2">
        <p className="font-semibold text-[var(--ink)] font-mono">{trade.symbol}</p>
        <p className="text-[11px] text-[var(--ink-3)] truncate max-w-[140px]">{trade.setupId}</p>
      </td>

      {/* Date */}
      <td className="py-2.5 px-2 text-[var(--ink-2)] text-xs whitespace-nowrap">
        {trade.date}
      </td>

      {/* R Multiple */}
      <td className="py-2.5 px-2 text-right">
        <span className={cn("font-mono font-semibold text-sm", rPositive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
          {rPositive ? "+" : ""}{trade.rMultiple?.toFixed(1)}R
        </span>
      </td>

      {/* P&L */}
      <td className="py-2.5 px-2 pr-4 text-right">
        <span className={cn("font-mono text-sm", pnlPositive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
          {pnlPositive ? "+" : ""}${trade.pnl?.toLocaleString()}
        </span>
      </td>

      {/* Tags */}
      <td className="py-2.5 px-2 pr-4">
        <div className="flex gap-1 flex-wrap">
          {trade.tags.map((tag) => (
            <Badge key={tag} variant={TAG_VARIANT[tag]}>{tag}</Badge>
          ))}
        </div>
      </td>
    </tr>
  )
}
