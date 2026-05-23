// TradesTable organism — spec: Trades screen

"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, X } from "lucide-react"
import { TradeRow } from "@/components/trades/trade-row"
import { cn } from "@/lib/utils"
import type { Trade, Account, Setup, TradeDirection, TradeTag, TradeSession } from "@/types"

/* ── Dropdown filter chip ── */
function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = value !== options[0].value
  const displayLabel = isActive
    ? options.find(o => o.value === value)?.label ?? value
    : label

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          height: 32, padding: "0 10px 0 12px",
          borderRadius: 999,
          background: isActive ? "var(--accent)" : "var(--panel)",
          color: isActive ? "white" : "var(--ink-2)",
          border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
          fontSize: 12.5, fontWeight: isActive ? 600 : 400,
          cursor: "pointer", whiteSpace: "nowrap",
          transition: "all .12s",
        }}
      >
        {displayLabel}
        {isActive ? (
          <span
            onClick={e => { e.stopPropagation(); onChange(options[0].value); setOpen(false) }}
            style={{ display: "flex", alignItems: "center", marginLeft: 1, opacity: 0.8 }}
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={12} style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          zIndex: 60, minWidth: 140, overflow: "hidden",
          animation: "fadeSlideDown .1s ease",
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 14px",
                background: value === o.value ? "var(--accent-soft)" : "transparent",
                color: value === o.value ? "var(--accent)" : "var(--ink-2)",
                fontSize: 13, fontWeight: value === o.value ? 600 : 400,
                border: "none", cursor: "pointer", textAlign: "left",
                transition: "background .08s",
              }}
              onMouseEnter={e => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = "var(--panel-2)" }}
              onMouseLeave={e => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              {o.label}
              {value === o.value && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const RESULTADO_OPTIONS = [
  { value: "TODOS",  label: "Resultado" },
  { value: "WIN",    label: "Win" },
  { value: "LOSS",   label: "Loss" },
  { value: "BE",     label: "BE" },
  { value: "OPEN",   label: "Abierto" },
]

const CALIDAD_OPTIONS = [
  { value: "TODAS",     label: "Calidad" },
  { value: "A+",        label: "A+" },
  { value: "Plan",      label: "Plan" },
  { value: "Off-plan",  label: "Off-plan" },
  { value: "Impulsivo", label: "Impulsivo" },
]

const DIRECTION_OPTIONS = [
  { value: "TODAS", label: "Dirección" },
  { value: "LONG",  label: "Long" },
  { value: "SHORT", label: "Short" },
]

const SESSION_OPTIONS = [
  { value: "TODAS",         label: "Sesión" },
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
  const [resultado, setResultado] = useState("TODOS")
  const [calidad,   setCalidad]   = useState("TODAS")
  const [direction, setDirection] = useState("TODAS")
  const [accountF,  setAccountF]  = useState("TODAS")
  const [sessionF,  setSessionF]  = useState("TODAS")

  const accountOptions = [
    { value: "TODAS", label: "Cuenta" },
    ...accounts.map(a => ({ value: a.id, label: a.name })),
  ]

  function getTradeResult(t: Trade): string {
    if (t.status !== "CLOSED" && t.pnl == null) return "OPEN"
    const pnl = t.pnl ?? 0
    if (pnl > 0) return "WIN"
    if (pnl < 0) return "LOSS"
    return "BE"
  }

  const filtered = trades.filter(t => {
    const resOk = resultado  === "TODOS" || getTradeResult(t) === resultado
    const calOk = calidad    === "TODAS" || t.tags.includes(calidad as TradeTag)
    const dirOk = direction  === "TODAS" || t.direction === (direction as TradeDirection)
    const accOk = accountF   === "TODAS" || t.accountId === accountF
    const sesOk = sessionF   === "TODAS" || t.session === (sessionF as TradeSession)
    return resOk && calOk && dirOk && accOk && sesOk
  })

  const netPnl  = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins    = filtered.filter(t => (t.rMultiple ?? 0) > 0).length
  const wr      = filtered.length ? Math.round((wins / filtered.length) * 100) : 0
  const avgR    = filtered.length
    ? filtered.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / filtered.length
    : 0

  const pnlColor = netPnl >= 0 ? "var(--win)" : "var(--loss)"
  const pnlStr   = netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`

  const activeFilters = [resultado !== "TODOS", calidad !== "TODAS", direction !== "TODAS", accountF !== "TODAS", sessionF !== "TODAS"].filter(Boolean).length

  const clearAll = () => { setResultado("TODOS"); setCalidad("TODAS"); setDirection("TODAS"); setAccountF("TODAS"); setSessionF("TODAS") }

  return (
    <div className={cn("flex flex-col gap-0", className)}>

      {/* ── Filter bar ── */}
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: "var(--radius) var(--radius) 0 0",
        padding: "12px 16px 12px",
      }}>
        {/* Summary row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{filtered.length} trades</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: pnlColor }}>{pnlStr}</span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>WR</p>
              <p style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: wr >= 50 ? "var(--win)" : "var(--loss)" }}>{wr}%</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Avg R</p>
              <p style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: avgR >= 0 ? "var(--win)" : "var(--loss)" }}>{avgR >= 0 ? "+" : ""}{avgR.toFixed(1)}R</p>
            </div>
          </div>
        </div>

        {/* Chip row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <FilterChip label="Resultado" options={RESULTADO_OPTIONS} value={resultado} onChange={setResultado} />
          <FilterChip label="Calidad"   options={CALIDAD_OPTIONS}   value={calidad}   onChange={setCalidad} />
          <FilterChip label="Dirección" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          <FilterChip label="Cuenta"    options={accountOptions}    value={accountF}  onChange={setAccountF} />
          <FilterChip label="Sesión"    options={SESSION_OPTIONS}   value={sessionF}  onChange={setSessionF} />
          {activeFilters > 0 && (
            <button
              onClick={clearAll}
              style={{
                height: 32, padding: "0 10px",
                borderRadius: 999, border: "none",
                background: "none", color: "var(--ink-3)",
                fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <X size={11} /> Limpiar
            </button>
          )}
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
                      padding: i === 0 ? "10px 8px 10px 0" : "10px 8px",
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

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
