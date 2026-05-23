"use client"

import { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type EventType = "OPEN" | "STOP_MOVE" | "TRAIL_STOP" | "TAKE_PROFIT_MOVE" | "PARTIAL_CLOSE" | "SCALE_IN" | "NOTE"
type AddableType = Exclude<EventType, "OPEN">

const EVENT_LABELS: Record<EventType, string> = {
  OPEN:             "Apertura",
  STOP_MOVE:        "Mover stop",
  TRAIL_STOP:       "Trail stop",
  TAKE_PROFIT_MOVE: "Mover TP",
  PARTIAL_CLOSE:    "Cierre parcial",
  SCALE_IN:         "Scale in",
  NOTE:             "Nota",
}

const EVENT_DESCRIPTIONS: Record<AddableType, string> = {
  STOP_MOVE:
    "Desplazas el stop loss a un precio fijo. Útil para llevarlo a breakeven o a un nivel técnico concreto.",
  TRAIL_STOP:
    "Stop dinámico que sigue al precio manteniendo una distancia fija. Proteges ganancias sin fijar un nivel específico.",
  TAKE_PROFIT_MOVE:
    "Mueves el take profit a un nuevo precio. Sirve para ampliar o reducir el objetivo según el comportamiento del mercado.",
  PARTIAL_CLOSE:
    "Cierras una parte de los contratos para asegurar ganancias parciales o reducir exposición. El resto continúa abierto.",
  SCALE_IN:
    "Agregas contratos a una posición ya abierta que está a tu favor (pirámide). Recalcula el precio promedio de entrada.",
  NOTE:
    "Anotación libre sin acción de mercado. Ideal para registrar razones de gestión o cambios de plan.",
}

const EVENT_COLORS: Record<EventType, string> = {
  OPEN:             "",   // handled separately
  STOP_MOVE:        "bg-amber-500/15 text-amber-400",
  TRAIL_STOP:       "bg-orange-500/15 text-orange-400",
  TAKE_PROFIT_MOVE: "bg-[var(--win-soft)] text-[var(--win)]",
  PARTIAL_CLOSE:    "bg-teal-500/15 text-teal-400",
  SCALE_IN:         "bg-blue-500/15 text-blue-400",
  NOTE:             "bg-[var(--chip)] text-[var(--ink-2)]",
}

const ADDABLE_TYPES: AddableType[] = ["STOP_MOVE", "TRAIL_STOP", "TAKE_PROFIT_MOVE", "PARTIAL_CLOSE", "SCALE_IN", "NOTE"]
const PRICE_TYPES:     AddableType[] = ["STOP_MOVE", "TRAIL_STOP", "TAKE_PROFIT_MOVE", "PARTIAL_CLOSE", "SCALE_IN"]
const CONTRACTS_TYPES: AddableType[] = ["PARTIAL_CLOSE", "SCALE_IN"]

interface AccountRules {
  initialBalance: number
  ddDailyPct?: number | null
  ddTotalPct?: number | null
}

interface PositionLogModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  trade: {
    id: string
    symbol: string
    direction: string
    entry: number
    stop: number
    target: number
    size: number
    date: string
    openTime: string
  }
  account?: AccountRules | null
  events?: {
    id: string
    type: string
    price: number | null
    contracts: number | null
    notes: string
    timestamp: string
  }[]
  onAddEvent?: (data: { type: string; price?: number; contracts?: number; notes: string }) => void
  adding?: boolean
}

function fmt(iso: string, mode: "time" | "date") {
  try {
    return mode === "time"
      ? new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
      : new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" })
  } catch { return iso }
}

export function PositionLogModal({
  open, onOpenChange, trade, account, events = [], onAddEvent, adding
}: PositionLogModalProps) {
  const [type,      setType]      = useState<AddableType>("NOTE")
  const [price,     setPrice]     = useState("")
  const [contracts, setContracts] = useState("")
  const [notes,     setNotes]     = useState("")

  const isLong   = trade.direction === "LONG"
  const stopDist = Math.abs(trade.entry - trade.stop)

  // ── Risk warnings ──────────────────────────────────────
  const riskWarnings = useMemo(() => {
    if (type !== "SCALE_IN" || !account) return []
    const c = parseFloat(contracts)
    if (isNaN(c) || c <= 0) return []
    const warns: string[] = []
    const newRiskPts = stopDist * (trade.size + c)
    const curRiskPts = stopDist * trade.size
    if (newRiskPts > curRiskPts * 2)
      warns.push(`Riesgo total se duplica: ${curRiskPts.toFixed(0)} → ${newRiskPts.toFixed(0)} pts`)
    if (account.ddDailyPct) {
      const limit = account.initialBalance * (account.ddDailyPct / 100)
      warns.push(`Límite diario: ${account.ddDailyPct}% del balance ($${limit.toLocaleString()})`)
    }
    if (account.ddTotalPct) {
      const limit = account.initialBalance * (account.ddTotalPct / 100)
      warns.push(`Drawdown máximo: ${account.ddTotalPct}% ($${limit.toLocaleString()})`)
    }
    return warns
  }, [type, contracts, account, trade.size, stopDist])

  // ── Auto-calculations ──────────────────────────────────
  const calc = useMemo(() => {
    const p = parseFloat(price)
    const c = parseFloat(contracts)

    if ((type === "STOP_MOVE" || type === "TRAIL_STOP") && !isNaN(p)) {
      const newDist    = Math.abs(trade.entry - p)
      const rProtected = stopDist > 0 ? (isLong ? trade.entry - p : p - trade.entry) / stopDist : null
      return {
        label: "Nuevo stop",
        lines: [
          `Distancia al entry: ${newDist.toFixed(2)} pts`,
          rProtected != null ? `Riesgo protegido: ${rProtected >= 0 ? "+" : ""}${rProtected.toFixed(2)}R` : null,
          newDist < stopDist ? "✓ Stop reducido" : "⚠ Stop ampliado",
        ].filter(Boolean) as string[],
      }
    }

    if (type === "TAKE_PROFIT_MOVE" && !isNaN(p)) {
      const newReward = isLong ? p - trade.entry : trade.entry - p
      const newRR     = stopDist > 0 ? newReward / stopDist : null
      const oldReward = isLong ? trade.target - trade.entry : trade.entry - trade.target
      return {
        label: "Nuevo TP",
        lines: [
          `Nuevo reward: ${newReward.toFixed(2)} pts`,
          newRR != null ? `Nuevo R:R 1:${newRR.toFixed(2)}` : null,
          `Anterior: ${trade.target} (${oldReward >= 0 ? "+" : ""}${oldReward.toFixed(2)} pts)`,
        ].filter(Boolean) as string[],
      }
    }

    if (type === "PARTIAL_CLOSE" && !isNaN(p)) {
      const pnlPts   = isLong ? p - trade.entry : trade.entry - p
      const numCts   = !isNaN(c) && c > 0 ? c : 1
      const rPartial = stopDist > 0 ? pnlPts / stopDist : null
      return {
        label: "P&L estimado",
        lines: [
          `${pnlPts >= 0 ? "+" : ""}${pnlPts.toFixed(2)} pts/contrato`,
          rPartial != null ? `${rPartial >= 0 ? "+" : ""}${rPartial.toFixed(2)}R` : null,
          !isNaN(c) && c > 0 ? `Est. total: ${(pnlPts * numCts).toFixed(2)} pts` : null,
        ].filter(Boolean) as string[],
      }
    }

    if (type === "SCALE_IN" && !isNaN(p)) {
      const numCts   = !isNaN(c) && c > 0 ? c : 0
      const totalCts = trade.size + numCts
      const avgEntry = totalCts > 0
        ? (trade.entry * trade.size + p * numCts) / totalCts
        : trade.entry
      return {
        label: "Average entry",
        lines: [
          numCts > 0 ? `Nuevo avg: ${avgEntry.toFixed(2)}` : "Ingresa contratos para calcular avg",
          numCts > 0 ? `Total contratos: ${totalCts}` : null,
        ].filter(Boolean) as string[],
      }
    }

    return null
  }, [type, price, contracts, trade.entry, trade.target, stopDist, isLong, trade.size])

  const handleAdd = () => {
    const p = parseFloat(price)
    const c = parseFloat(contracts)
    onAddEvent?.({
      type,
      price:     PRICE_TYPES.includes(type) && !isNaN(p) ? p : undefined,
      contracts: CONTRACTS_TYPES.includes(type) && !isNaN(c) ? c : undefined,
      notes,
    })
    setPrice("")
    setContracts("")
    setNotes("")
  }

  // ── Derived summary row per event ──────────────────────
  function eventSummary(ev: { type: string; price: number | null; contracts: number | null }): string {
    const t = ev.type as EventType
    const parts: string[] = []
    if (ev.price != null)     parts.push(`@ ${ev.price}`)
    if (ev.contracts != null) parts.push(`${ev.contracts} cts`)
    if (t === "OPEN" && ev.price != null) parts.push(`SL/TP en notas`)
    return parts.join(" · ")
  }

  const openColor = isLong ? "bg-[var(--win-soft)] text-[var(--win)]" : "bg-[var(--loss-soft)] text-[var(--loss)]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[520px]">
        <DialogHeader>
          <DialogTitle>Gestión de posición — {trade.symbol}</DialogTitle>
        </DialogHeader>

        {/* Reference card (current state) */}
        <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 mb-3">
          {[
            { label: "Entry", value: trade.entry, color: "text-[var(--ink)]" },
            { label: "Stop",  value: trade.stop,  color: "text-[var(--loss)]" },
            { label: "TP",    value: trade.target, color: "text-[var(--win)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-[var(--ink-3)] font-semibold uppercase tracking-wide">{label}</span>
              <span className={cn("text-sm font-mono font-bold", color)}>{value}</span>
            </div>
          ))}
          <div className="col-span-3 flex gap-3 pt-1 border-t border-[var(--line)] justify-center flex-wrap">
            <span className="text-[10px] text-[var(--ink-3)]">
              Dir: <span className="font-semibold text-[var(--ink-2)]">{trade.direction}</span>
            </span>
            <span className="text-[10px] text-[var(--ink-3)]">
              Contratos: <span className="font-semibold text-[var(--ink-2)] font-mono">{trade.size}</span>
            </span>
            <span className="text-[10px] text-[var(--ink-3)]">
              Stop dist: <span className="font-semibold text-[var(--ink-2)] font-mono">{stopDist.toFixed(2)}</span>
            </span>
            {account?.ddDailyPct && (
              <span className="text-[10px] text-[var(--ink-3)]">
                Límite diario: <span className="font-semibold text-[var(--loss)] font-mono">{account.ddDailyPct}%</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Event log table ── */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden mb-4">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--line)]">
                {["Hora", "Tipo", "Precio", "Cts", "Nota"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-[var(--ink-3)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--ink-3)] text-xs">
                    Sin eventos registrados aún.
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => {
                  const t = ev.type as EventType
                  const isOpenEv = t === "OPEN"
                  const colorClass = isOpenEv
                    ? openColor
                    : (EVENT_COLORS[t] ?? "bg-[var(--chip)] text-[var(--ink-2)]")

                  return (
                    <tr
                      key={ev.id}
                      className={cn(
                        "border-b border-[var(--line)] last:border-0",
                        isOpenEv && "bg-[var(--panel-2)]"
                      )}
                    >
                      {/* Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-[var(--ink-3)]">
                        <span className="block">{fmt(ev.timestamp, "date")}</span>
                        <span className="block font-mono">{fmt(ev.timestamp, "time")}</span>
                      </td>

                      {/* Type badge */}
                      <td className="px-3 py-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap", colorClass)}>
                          {EVENT_LABELS[t] ?? t}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2 font-mono text-[var(--ink-2)]">
                        {ev.price != null ? ev.price : <span className="text-[var(--ink-3)]">—</span>}
                      </td>

                      {/* Contracts */}
                      <td className="px-3 py-2 font-mono text-[var(--ink-2)]">
                        {ev.contracts != null ? ev.contracts : <span className="text-[var(--ink-3)]">—</span>}
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-2 text-[var(--ink-2)] max-w-[140px]">
                        <span className="block truncate" title={ev.notes}>{ev.notes || "—"}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Add event form ── */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 flex flex-col gap-3">
          <p className="text-[10px] text-[var(--ink-3)] font-semibold uppercase tracking-wide">Agregar evento</p>

          <div className="flex gap-1 flex-wrap">
            {ADDABLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                  type === t
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                )}
              >
                {EVENT_LABELS[t]}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-[var(--ink-3)] leading-snug">
            {EVENT_DESCRIPTIONS[type]}
          </p>

          <div className="flex gap-2">
            {PRICE_TYPES.includes(type) && (
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] text-[var(--ink-3)] font-medium">Precio</label>
                <input
                  type="number"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
            )}
            {CONTRACTS_TYPES.includes(type) && (
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] text-[var(--ink-3)] font-medium">Contratos</label>
                <input
                  type="number"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="1"
                  value={contracts}
                  onChange={e => setContracts(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Auto-calculation preview */}
          {calc && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-3 py-2">
              <p className="text-[9px] text-[var(--accent)] font-semibold uppercase tracking-wide mb-1">{calc.label}</p>
              {calc.lines.map((line, i) => (
                <p key={i} className="text-[11px] text-[var(--ink-2)] font-mono leading-snug">{line}</p>
              ))}
            </div>
          )}

          {/* Risk warnings */}
          {riskWarnings.length > 0 && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--loss-soft)] border border-[var(--loss)]/30 px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-[var(--loss)] shrink-0" />
                <p className="text-[10px] text-[var(--loss)] font-semibold uppercase tracking-wide">
                  Advertencia de riesgo
                </p>
              </div>
              {riskWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-[var(--loss)] leading-snug">{w}</p>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[var(--ink-3)] font-medium">Nota</label>
            <input
              type="text"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Descripción del evento…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button
            size="md"
            className={cn(
              "w-full text-white hover:opacity-90",
              riskWarnings.length > 0 ? "bg-[var(--loss)]" : "bg-[var(--accent)]"
            )}
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? "Agregando…" : riskWarnings.length > 0 ? "Agregar igualmente" : "Agregar evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
