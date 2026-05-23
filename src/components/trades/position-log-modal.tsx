"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type EventType = "STOP_MOVE" | "PARTIAL_CLOSE" | "SCALE_IN" | "NOTE"

const EVENT_LABELS: Record<EventType, string> = {
  STOP_MOVE:     "Mover stop",
  PARTIAL_CLOSE: "Cierre parcial",
  SCALE_IN:      "Scale in",
  NOTE:          "Nota",
}

const EVENT_COLORS: Record<EventType, string> = {
  STOP_MOVE:     "bg-amber-500/15 text-amber-400",
  PARTIAL_CLOSE: "bg-[var(--win-soft)] text-[var(--win)]",
  SCALE_IN:      "bg-blue-500/15 text-blue-400",
  NOTE:          "bg-[var(--chip)] text-[var(--ink-2)]",
}

const PRICE_TYPES: EventType[] = ["STOP_MOVE", "PARTIAL_CLOSE", "SCALE_IN"]
const CONTRACTS_TYPES: EventType[] = ["PARTIAL_CLOSE", "SCALE_IN"]

interface PositionLogModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  trade: {
    id: string
    symbol: string
    direction: string
    entry: number
    stop: number
    size: number
  }
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

export function PositionLogModal({
  open, onOpenChange, trade, events = [], onAddEvent, adding
}: PositionLogModalProps) {
  const [type, setType]           = useState<EventType>("NOTE")
  const [price, setPrice]         = useState("")
  const [contracts, setContracts] = useState("")
  const [notes, setNotes]         = useState("")

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

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
    } catch {
      return iso
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" })
    } catch {
      return iso
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[460px]">
        <DialogHeader>
          <DialogTitle>Gestión de posición — {trade.symbol}</DialogTitle>
        </DialogHeader>

        {/* Timeline */}
        {events.length > 0 ? (
          <div className="flex flex-col gap-0 mb-4">
            {events.map((ev, i) => {
              const t = ev.type as EventType
              return (
                <div key={ev.id} className="flex gap-3">
                  {/* Spine */}
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                    {i < events.length - 1 && (
                      <div className="w-px flex-1 bg-[var(--line)] mt-1 mb-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        EVENT_COLORS[t] ?? "bg-[var(--chip)] text-[var(--ink-2)]"
                      )}>
                        {EVENT_LABELS[t] ?? t}
                      </span>
                      <span className="text-[10px] text-[var(--ink-3)]">
                        {formatDate(ev.timestamp)} {formatTime(ev.timestamp)}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[11px] text-[var(--ink-2)] font-mono">
                      {ev.price != null && <span>@ {ev.price}</span>}
                      {ev.contracts != null && <span>{ev.contracts} cts</span>}
                    </div>
                    {ev.notes && (
                      <p className="text-[11px] text-[var(--ink-2)] mt-0.5">{ev.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-3)] text-center py-4 mb-2">
            Sin eventos registrados aún.
          </p>
        )}

        {/* Add event form */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 flex flex-col gap-3">
          <p className="text-[10px] text-[var(--ink-3)] font-semibold uppercase tracking-wide">Agregar evento</p>

          {/* Type selector */}
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(EVENT_LABELS) as EventType[]).map(t => (
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
            className="w-full bg-[var(--accent)] text-white hover:opacity-90"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? "Agregando…" : "Agregar evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
