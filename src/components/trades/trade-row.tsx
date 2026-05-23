// TradeRow molecule — spec: Trades > Anatomy

import type { Trade, TradeTag, TradeSession, Account, Setup } from "@/types"

const SESSION_CFG: Record<TradeSession, { label: string; color: string; bg: string }> = {
  "New York":     { label: "NY",        color: "#6395f9", bg: "rgba(99,149,249,.12)" },
  "London":       { label: "London",    color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  "Asia":         { label: "Asia",      color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  "London Close": { label: "LDN Close", color: "#c084fc", bg: "rgba(192,132,252,.10)" },
}

const TAG_CFG: Record<string, { color: string; bg: string }> = {
  "A+":       { color: "#16a34a", bg: "rgba(22,163,74,.12)" },
  "A":        { color: "var(--accent)", bg: "var(--accent-soft)" },
  "Plan":     { color: "var(--accent)", bg: "var(--accent-soft)" },
  "Off-plan": { color: "var(--loss)",   bg: "var(--loss-soft)" },
  "Impulsivo":{ color: "var(--loss)",   bg: "var(--loss-soft)" },
  "BE":       { color: "var(--be)",     bg: "var(--be-soft)" },
}

function shortAccount(name: string) {
  const parts = name.split(" ")
  if (parts.length <= 2) return name
  return parts.slice(0, 2).join(" ")
}

// Determine result based on actual closed PnL, not planned rMultiple
function getResult(trade: Trade): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (trade.status !== "CLOSED" && trade.pnl == null) return "OPEN"
  const pnl = trade.pnl ?? 0
  if (pnl > 0) return "WIN"
  if (pnl < 0) return "LOSS"
  return "BE"
}

const RESULT_CFG = {
  WIN:  { label: "WIN",   color: "var(--win)",    bg: "var(--win-soft)" },
  LOSS: { label: "LOSS",  color: "var(--loss)",   bg: "var(--loss-soft)" },
  BE:   { label: "BE",    color: "var(--be)",     bg: "var(--be-soft)" },
  OPEN: { label: "OPEN",  color: "var(--accent)", bg: "var(--accent-soft)" },
}

interface TradeRowProps {
  trade: Trade
  account?: Account
  setup?: Setup
  selected?: boolean
  onClick?: () => void
}

export function TradeRow({ trade, account, setup, selected = false, onClick }: TradeRowProps) {
  const result     = getResult(trade)
  const resultCfg  = RESULT_CFG[result]
  const pnl        = trade.pnl ?? null
  const r          = trade.rMultiple ?? null
  const session    = SESSION_CFG[trade.session]
  const isOpen     = result === "OPEN"

  const qualityTag = trade.tags.find(t =>
    (["A+", "A", "Plan", "Off-plan", "Impulsivo", "BE"] as TradeTag[]).includes(t as TradeTag)
  )
  const tagCfg = qualityTag ? TAG_CFG[qualityTag] : null

  const stripeColor = resultCfg.color

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "1px solid var(--line)",
        background: selected ? "var(--accent-soft)" : "transparent",
        cursor: "pointer",
        transition: "background .1s",
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--panel-2)" }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      {/* Stripe + Direction */}
      <td style={{ padding: "0 8px 0 0", width: 90, paddingLeft: 0 }}>
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <div style={{
            width: 3, alignSelf: "stretch", minHeight: 52,
            background: stripeColor,
            borderRadius: "0 2px 2px 0", marginRight: 10, flexShrink: 0,
            opacity: isOpen ? 0.4 : 1,
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Direction */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 18, borderRadius: 5,
              fontSize: 9, fontWeight: 800, letterSpacing: ".06em",
              background: trade.direction === "LONG" ? "var(--win-soft)" : "var(--loss-soft)",
              color: trade.direction === "LONG" ? "var(--win)" : "var(--loss)",
            }}>
              {trade.direction}
            </span>
            {/* Result badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 18, borderRadius: 5,
              fontSize: 9, fontWeight: 800, letterSpacing: ".06em",
              background: resultCfg.bg, color: resultCfg.color,
              border: isOpen ? `1px solid ${resultCfg.color}33` : "none",
            }}>
              {resultCfg.label}
            </span>
          </div>
        </div>
      </td>

      {/* Symbol + Setup */}
      <td style={{ padding: "14px 8px", minWidth: 130 }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
          {trade.symbol}
        </p>
        {setup && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
              background: "var(--accent-soft)", color: "var(--accent)",
              letterSpacing: ".04em",
            }}>
              {setup.abbreviation}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 90 }}>
              {setup.name}
            </span>
          </div>
        )}
      </td>

      {/* Account */}
      <td style={{ padding: "14px 8px", maxWidth: 150 }}>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
          {account ? shortAccount(account.name) : trade.accountId}
        </p>
        {account && (
          <span style={{
            fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em",
            color: account.type === "PROP_FIRM" ? "var(--accent)" : "var(--ink-3)",
          }}>
            {account.type === "PROP_FIRM" ? "PROP" : "PERSONAL"}
          </span>
        )}
      </td>

      {/* Date + Time */}
      <td style={{ padding: "14px 8px", whiteSpace: "nowrap" }}>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{trade.date}</p>
        <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>{trade.openTime}</p>
      </td>

      {/* Session */}
      <td style={{ padding: "14px 8px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "3px 9px", borderRadius: 999,
          fontSize: 10.5, fontWeight: 600,
          background: session?.bg ?? "var(--chip)",
          color: session?.color ?? "var(--ink-3)",
          whiteSpace: "nowrap",
        }}>
          {session?.label ?? trade.session}
        </span>
      </td>

      {/* R Multiple */}
      <td style={{ padding: "14px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
        {isOpen ? (
          <div>
            <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace" }}>
              {r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}
            </span>
            <p style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 1 }}>objetivo</p>
          </div>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 52, padding: "3px 8px", borderRadius: 6,
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12.5, fontWeight: 800,
            background: resultCfg.bg, color: resultCfg.color,
          }}>
            {r != null ? `${r > 0 ? "+" : ""}${r.toFixed(1)}R` : "—"}
          </span>
        )}
      </td>

      {/* P&L */}
      <td style={{ padding: "14px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
        {pnl != null ? (
          <>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13, fontWeight: 700,
              color: resultCfg.color,
            }}>
              {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toLocaleString()}
            </span>
            <div style={{ height: 3, borderRadius: 99, marginTop: 4, background: "var(--line)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: `${Math.min(100, Math.abs(pnl) / 50)}%`,
                background: resultCfg.color,
              }} />
            </div>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>abierto</span>
        )}
      </td>

      {/* Quality badge */}
      <td style={{ padding: "14px 8px 14px 8px", paddingRight: 16 }}>
        {tagCfg && qualityTag ? (
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 700,
            background: tagCfg.bg, color: tagCfg.color,
          }}>
            {qualityTag}
          </span>
        ) : (
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  )
}
