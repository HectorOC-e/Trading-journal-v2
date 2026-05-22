// TradeRow molecule — spec: Trades > Anatomy
// Columns: Direction | Symbol+Setup | Account | Date+Time | Session | R | P&L | Quality

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Trade, TradeTag, TradeSession, Account, Setup } from "@/types"

const TAG_VARIANT: Record<TradeTag, "aplus" | "accent" | "default" | "be" | "offplan"> = {
  "A+":        "aplus",
  "A":         "accent",
  "B":         "default",
  "Plan":      "accent",
  "Off-plan":  "offplan",
  "Impulsivo": "offplan",
  "BE":        "be",
}

const SESSION_COLOR: Record<TradeSession, string> = {
  "New York":     "bg-blue-500/15 text-blue-400",
  "London":       "bg-purple-500/15 text-purple-400",
  "Asia":         "bg-amber-500/15 text-amber-400",
  "London Close": "bg-purple-500/10 text-purple-300",
}

const SESSION_SHORT: Record<TradeSession, string> = {
  "New York":     "NY",
  "London":       "London",
  "Asia":         "Asia",
  "London Close": "LDN Close",
}

interface TradeRowProps {
  trade: Trade
  account?: Account
  setup?: Setup
  selected?: boolean
  onClick?: () => void
}

export function TradeRow({ trade, account, setup, selected = false, onClick }: TradeRowProps) {
  const pnlPositive = (trade.pnl ?? 0) >= 0
  const rPositive   = (trade.rMultiple ?? 0) >= 0

  // Primary quality tag
  const qualityTag = trade.tags.find((t) =>
    (["A+", "A", "B", "Plan", "Off-plan", "Impulsivo"] as TradeTag[]).includes(t)
  )

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
      <td className="py-3 pl-4 pr-2 w-14">
        <span
          className={cn(
            "inline-flex items-center justify-center w-12 h-5 rounded text-[10px] font-bold tracking-wide",
            trade.direction === "LONG"
              ? "bg-[var(--win-soft)] text-[var(--win)]"
              : "bg-[var(--loss-soft)] text-[var(--loss)]"
          )}
        >
          {trade.direction}
        </span>
      </td>

      {/* Symbol + Setup abbreviation */}
      <td className="py-3 px-2 min-w-[110px]">
        <p className="font-bold text-[var(--ink)] font-mono text-sm leading-tight">{trade.symbol}</p>
        {setup ? (
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 font-medium">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-flex items-center justify-center px-1 h-3.5 rounded text-[9px] font-bold tracking-wide"
                style={{ background: "var(--chip)", color: "var(--ink-2)" }}
              >
                {setup.abbreviation}
              </span>
              <span className="truncate max-w-[80px]">{setup.name}</span>
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{trade.setupId}</p>
        )}
      </td>

      {/* Account */}
      <td className="py-3 px-2 max-w-[140px]">
        <p className="text-xs text-[var(--ink-2)] truncate max-w-[130px]">{account?.name ?? trade.accountId}</p>
        {account && (
          <p className="text-[10px] text-[var(--ink-3)] mt-0.5 font-medium">
            {account.type === "PROP_FIRM" ? "PROP" : account.type === "PERSONAL" ? "PERSONAL" : account.type}
          </p>
        )}
      </td>

      {/* Date + Time */}
      <td className="py-3 px-2 whitespace-nowrap">
        <p className="text-xs text-[var(--ink-2)]">{trade.date}</p>
        <p className="text-[11px] text-[var(--ink-3)] mt-0.5 font-mono">{trade.openTime}</p>
      </td>

      {/* Session pill */}
      <td className="py-3 px-2">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
          SESSION_COLOR[trade.session]
        )}>
          {SESSION_SHORT[trade.session]}
        </span>
      </td>

      {/* R Multiple */}
      <td className="py-3 px-2 text-right whitespace-nowrap">
        <span className={cn(
          "font-mono font-semibold text-sm",
          rPositive ? "text-[var(--win)]" : "text-[var(--loss)]"
        )}>
          {rPositive ? "+" : ""}{trade.rMultiple?.toFixed(1)}R
        </span>
      </td>

      {/* P&L */}
      <td className="py-3 px-2 text-right whitespace-nowrap">
        <span className={cn(
          "font-mono text-sm font-semibold",
          pnlPositive ? "text-[var(--win)]" : "text-[var(--loss)]"
        )}>
          {pnlPositive ? "+" : ""}${trade.pnl?.toLocaleString()}
        </span>
      </td>

      {/* Quality badge */}
      <td className="py-3 px-2 pr-4">
        {qualityTag ? (
          <Badge variant={TAG_VARIANT[qualityTag]}>{qualityTag}</Badge>
        ) : (
          <span className="text-[var(--ink-3)] text-xs">—</span>
        )}
      </td>
    </tr>
  )
}
