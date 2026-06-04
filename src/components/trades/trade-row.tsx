// TradeRow — redesigned: no left-border stripe antipattern.
// Result communicated via P&L color + result pill + row background.

import { cn } from "@/lib/utils"
import type { Trade, TradeTag, TradeSession, Account, Setup } from "@/types"

const SESSION_CFG: Record<TradeSession, { label: string; color: string; bg: string }> = {
  "New York":     { label: "NY",       color: "#4f6ef7", bg: "rgba(79,110,247,0.10)"  },
  "London":       { label: "London",   color: "#7c3aed", bg: "rgba(124,58,237,0.10)"  },
  "Asia":         { label: "Asia",     color: "#d97706", bg: "rgba(217,119,6,0.10)"   },
  "London Close": { label: "LDN Cl",  color: "#9333ea", bg: "rgba(147,51,234,0.09)"  },
}

const TAG_CFG: Record<string, { color: string; bg: string }> = {
  "A+":        { color: "#16a34a",       bg: "rgba(22,163,74,0.10)"  },
  "A":         { color: "var(--accent)", bg: "var(--accent-soft)"    },
  "Plan":      { color: "var(--accent)", bg: "var(--accent-soft)"    },
  "Off-plan":  { color: "var(--loss)",   bg: "var(--loss-soft)"      },
  "Impulsivo": { color: "var(--loss)",   bg: "var(--loss-soft)"      },
  "BE":        { color: "var(--be)",     bg: "var(--be-soft)"        },
}

const RESULT_CFG = {
  WIN:  { label: "W",    color: "var(--win)",    bg: "var(--win-soft)"    },
  LOSS: { label: "L",    color: "var(--loss)",   bg: "var(--loss-soft)"   },
  BE:   { label: "BE",   color: "var(--be)",     bg: "var(--be-soft)"     },
  OPEN: { label: "OPEN", color: "var(--accent)", bg: "var(--accent-soft)" },
}

function shortAccount(name: string) {
  const parts = name.split(" ")
  return parts.length <= 2 ? name : parts.slice(0, 2).join(" ")
}

function getResult(trade: Trade): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (trade.status !== "CLOSED" && trade.pnl == null) return "OPEN"
  const pnl = trade.pnl ?? 0
  if (pnl > 0) return "WIN"
  if (pnl < 0) return "LOSS"
  return "BE"
}

interface TradeRowProps {
  trade:     Trade
  account?:  Account
  setup?:    Setup
  selected?: boolean
  onClick?:  () => void
}

export function TradeRow({ trade, account, setup, selected = false, onClick }: TradeRowProps) {
  const result    = getResult(trade)
  const rc        = RESULT_CFG[result]
  const pnl       = trade.pnl ?? null
  const r         = trade.rMultiple ?? null
  const session   = SESSION_CFG[trade.session as TradeSession]
  const isOpen    = result === "OPEN"

  const qualityTag = trade.tags.find(t =>
    (["A+", "A", "Plan", "Off-plan", "Impulsivo", "BE"] as TradeTag[]).includes(t as TradeTag)
  )
  const tagCfg = qualityTag ? TAG_CFG[qualityTag] : null

  return (
    <tr
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        "cursor-pointer border-b border-[var(--line)] transition-colors duration-100",
        selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--panel-2)]"
      )}
    >
      {/* Result indicator — dot + direction pills, no side stripe */}
      <td className="pl-4 pr-2 py-3 w-[80px]">
        <div className="flex flex-col gap-1">
          {/* Direction */}
          <span
            className="inline-flex items-center justify-center w-[38px] h-[18px] rounded-[4px] text-[9px] font-bold tracking-wider"
            style={{
              background: trade.direction === "LONG" ? "var(--win-soft)" : "var(--loss-soft)",
              color: trade.direction === "LONG" ? "var(--win)" : "var(--loss)",
            }}
          >
            {trade.direction}
          </span>
          {/* Result */}
          <span
            className="inline-flex items-center justify-center w-[38px] h-[18px] rounded-[4px] text-[9px] font-bold tracking-wider"
            style={{
              background: rc.bg,
              color: rc.color,
              border: isOpen ? `1px solid ${rc.color}40` : "none",
            }}
          >
            {rc.label}
          </span>
        </div>
      </td>

      {/* Symbol + Setup */}
      <td className="px-2 py-3 min-w-[120px]">
        <p className="font-mono text-[14px] font-bold leading-none tracking-tight" style={{ color: "var(--ink)" }}>
          {trade.symbol}
        </p>
        {setup && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="text-[9px] font-bold px-1.5 py-px rounded-[3px] tracking-wider"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {setup.abbreviation}
            </span>
            <span className="text-[11px] text-[var(--ink-3)] truncate max-w-[80px]">{setup.name}</span>
          </div>
        )}
      </td>

      {/* Account */}
      <td className="px-2 py-3 max-w-[130px] hidden sm:table-cell">
        <p className="text-[12px] text-[var(--ink-2)] truncate">{account ? shortAccount(account.name) : "—"}</p>
        {account && (
          <p
            className="text-[9px] font-semibold tracking-wider mt-0.5"
            style={{ color: account.type === "PROP_FIRM" ? "var(--accent)" : "var(--ink-3)" }}
          >
            {account.type === "PROP_FIRM" ? "PROP" : account.type === "DEMO_PROP" ? "DEMO" : "PER"}
          </p>
        )}
      </td>

      {/* Date */}
      <td className="px-2 py-3 whitespace-nowrap hidden md:table-cell">
        <p className="text-[12px] text-[var(--ink-2)]">{trade.date}</p>
        {trade.openTime && (
          <p className="font-mono text-[10px] text-[var(--ink-3)] mt-0.5">{trade.openTime}</p>
        )}
      </td>

      {/* Session */}
      <td className="px-2 py-3 hidden lg:table-cell">
        <span
          className="inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-semibold whitespace-nowrap"
          style={{
            background: session?.bg ?? "var(--chip)",
            color: session?.color ?? "var(--ink-3)",
          }}
        >
          {session?.label ?? trade.session}
        </span>
      </td>

      {/* R Multiple */}
      <td className="px-2 py-3 text-right whitespace-nowrap hidden sm:table-cell">
        {isOpen ? (
          <div className="text-right">
            <span className="font-mono text-[11px] text-[var(--ink-3)]">
              {r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}
            </span>
            <p className="text-[9px] text-[var(--ink-3)] mt-0.5">target</p>
          </div>
        ) : (
          <span
            className="inline-flex items-center justify-center min-w-[46px] px-2 py-[3px] rounded-[5px] font-mono text-[12px] font-bold"
            style={{ background: rc.bg, color: rc.color }}
          >
            {r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}
          </span>
        )}
      </td>

      {/* P&L — primary data column */}
      <td className="px-2 py-3 text-right whitespace-nowrap">
        {pnl != null ? (
          <span
            className="font-mono text-[13px] font-bold tabular-nums"
            style={{ color: rc.color }}
          >
            {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--ink-3)]">open</span>
        )}
      </td>

      {/* Quality */}
      <td className="px-2 pl-2 pr-4 py-3 hidden md:table-cell">
        {tagCfg && qualityTag ? (
          <span
            className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[10px] font-bold whitespace-nowrap"
            style={{ background: tagCfg.bg, color: tagCfg.color }}
          >
            {qualityTag}
          </span>
        ) : (
          <span className="text-[var(--ink-3)] text-[11px]">—</span>
        )}
      </td>
    </tr>
  )
}
