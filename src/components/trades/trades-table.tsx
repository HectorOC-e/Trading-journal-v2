// TradesTable organism — spec: Trades screen

"use client"

import { useState } from "react"
import { TradeRow } from "@/components/trades/trade-row"
import { cn } from "@/lib/utils"
import type { Trade, Account, Setup, TradeDirection, TradeTag, TradeSession } from "@/types"

/* ── Filter pill button ── */
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: "0 12px",
        borderRadius: 999,
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--bg)" : "var(--ink-3)",
        fontSize: 12, fontWeight: active ? 600 : 400,
        border: active ? "1px solid var(--ink)" : "1px solid transparent",
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "all .12s",
      }}
    >
      {label}
    </button>
  )
}

/* ── Filter group with label ── */
function FilterGroup({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", marginRight: 4, whiteSpace: "nowrap" }}>
        {label}
      </span>
      {options.map(o => (
        <Pill key={o.value} label={o.label} active={value === o.value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  )
}

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
  { value: "TODAS",         label: "Todas" },
  { value: "New York",      label: "NY" },
  { value: "London",        label: "London" },
  { value: "Asia",          label: "Asia" },
  { value: "London Close",  label: "LDN Close" },
]

interface TradesTableProps {
  trades: Trade[]
  accounts?: Account[]
  setups?: Setup[]
  selectedId?: string
  onSelect?: (trade: Trade | null) => void
  className?: string
}

export function TradesTable({ trades, accounts = [], setups = [], selectedId, onSelect, className }: TradesTableProps) {
  const [calidad,   setCalidad]   = useState("TODAS")
  const [direction, setDirection] = useState("TODAS")
  const [accountF,  setAccountF]  = useState("TODAS")
  const [sessionF,  setSessionF]  = useState("TODAS")

  const accountOptions = [
    { value: "TODAS", label: "Todas" },
    ...accounts.map(a => ({ value: a.id, label: a.name })),
  ]

  const filtered = trades.filter(t => {
    const calOk = calidad    === "TODAS" || t.tags.includes(calidad as TradeTag)
    const dirOk = direction  === "TODAS" || t.direction === (direction as TradeDirection)
    const accOk = accountF   === "TODAS" || t.accountId === accountF
    const sesOk = sessionF   === "TODAS" || t.session === (sessionF as TradeSession)
    return calOk && dirOk && accOk && sesOk
  })

  const netPnl = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins   = filtered.filter(t => (t.rMultiple ?? 0) > 0).length
  const wr     = filtered.length ? Math.round((wins / filtered.length) * 100) : 0
  const avgR   = filtered.length
    ? filtered.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / filtered.length
    : 0

  const pnlColor = netPnl >= 0 ? "var(--win)" : "var(--loss)"
  const pnlStr   = netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`

  return (
    <div className={cn("flex flex-col gap-0", className)}>

      {/* ── Filter bar ── */}
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: "var(--radius) var(--radius) 0 0",
        padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Summary row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{filtered.length} trades</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: pnlColor }}>{pnlStr} neto</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Win Rate</p>
              <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: wr >= 50 ? "var(--win)" : "var(--loss)" }}>{wr}%</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Avg R</p>
              <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: avgR >= 0 ? "var(--win)" : "var(--loss)" }}>{avgR >= 0 ? "+" : ""}{avgR.toFixed(1)}R</p>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <FilterGroup label="Calidad"   options={CALIDAD_OPTIONS}   value={calidad}   onChange={setCalidad} />
          <div style={{ width: 1, height: 16, background: "var(--line)" }} />
          <FilterGroup label="Dir."      options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          <div style={{ width: 1, height: 16, background: "var(--line)" }} />
          <FilterGroup label="Cuenta"    options={accountOptions}    value={accountF}  onChange={setAccountF} />
          <div style={{ width: 1, height: 16, background: "var(--line)" }} />
          <FilterGroup label="Sesión"    options={SESSION_OPTIONS}   value={sessionF}  onChange={setSessionF} />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderTop: "none",
        borderRadius: "0 0 var(--radius) var(--radius)",
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }}>
                {["", "Símbolo · Setup", "Cuenta", "Fecha", "Sesión", "R", "P&L", "Calidad"].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    style={{
                      padding: i === 0 ? "10px 8px 10px 16px" : "10px 8px",
                      textAlign: i >= 5 ? "right" : "left",
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: ".07em", color: "var(--ink-3)",
                      paddingRight: i === 7 ? 16 : 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
                    No hay trades con estos filtros.
                  </td>
                </tr>
              ) : (
                filtered.map(trade => {
                  const account = accounts.find(a => a.id === trade.accountId)
                  const setup   = setups.find(s => s.id === trade.setupId)
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
