"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2, ChevronDown } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import type { AccountLogPayload } from "@/types"

const EVENT_META: Record<string, { label: string; color: string }> = {
  CREATED:            { label: "Cuenta creada",        color: "#22c55e" },
  PHASE_CHANGE:       { label: "Cambio de fase",       color: "#4f6ef7" },
  STATUS_CHANGE:      { label: "Cambio de estado",     color: "#f59e0b" },
  WITHDRAWAL:         { label: "Retiro",               color: "#a78bfa" },
  WITHDRAWAL_STATUS:  { label: "Estado de retiro",     color: "#c084fc" },
  NOTE:               { label: "Nota",                 color: "#6b7280" },
  BALANCE_CORRECTION: { label: "Corrección de saldo",  color: "#fb923c" },
}

type Log = { id: string; event: string; payload: unknown; createdAt: Date | string }

export function AccountHistoryModal({ accountId, accountName, onClose }: {
  accountId: string
  accountName: string
  onClose: () => void
}) {
  const [cursor, setCursor]   = useState<string | undefined>(undefined)
  const [allLogs, setAllLogs] = useState<Log[]>([])
  const seenCursors           = useRef(new Set<string | undefined>())

  const { data, isLoading, isFetching } = trpc.accountLogs.list.useQuery({ accountId, cursor })

  useEffect(() => {
    if (!data) return
    // Prevent double-appending the same page (StrictMode double-effect or re-render)
    if (seenCursors.current.has(cursor)) return
    seenCursors.current.add(cursor)
    const newItems = data.items as Log[]
    setAllLogs(prev => cursor ? [...prev, ...newItems] : newItems)
  }, [data, cursor])

  const hasMore = !!data?.nextCursor

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <p className="font-bold text-[var(--ink)]">Historial</p>
            <p className="text-[11px] text-[var(--ink-3)]">{accountName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)]">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--ink-3)]">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          )}
          {!isLoading && allLogs.length === 0 && (
            <p className="text-center text-[13px] text-[var(--ink-3)] py-8">Sin eventos registrados</p>
          )}
          {allLogs.length > 0 && (
            <div className="relative flex flex-col gap-0">
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-[var(--line)]" />
              {allLogs.map((log) => {
                const meta = EVENT_META[log.event] ?? { label: log.event, color: "#6b7280" }
                const p = log.payload as AccountLogPayload
                const date = new Date(log.createdAt)
                const dateStr = date.toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })
                const timeStr = date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
                return (
                  <div key={log.id} className="flex gap-3 pb-5 last:pb-0">
                    <div className="w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10"
                      style={{ borderColor: meta.color, background: "var(--panel)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[10px] text-[var(--ink-3)]">{dateStr} · {timeStr}</span>
                      </div>
                      {p.event === "PHASE_CHANGE" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {p.from} → {p.to}
                          {p.manualOverride && <span className="ml-2 text-[var(--ink-3)]">(manual)</span>}
                          {p.note && <span className="ml-2 italic text-[var(--ink-3)]">&ldquo;{p.note}&rdquo;</span>}
                        </p>
                      )}
                      {p.event === "STATUS_CHANGE" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {p.from} → {p.to}
                          {p.note && <span className="ml-2 italic text-[var(--ink-3)]">&ldquo;{p.note}&rdquo;</span>}
                        </p>
                      )}
                      {p.event === "CREATED" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {p.type} · ${Number(p.initialBalance).toLocaleString()} {p.currency}
                        </p>
                      )}
                      {p.event === "WITHDRAWAL" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          ${Number(p.amount).toLocaleString()} {p.currency}
                          {p.reference && <span className="ml-2 text-[var(--ink-3)]">ref: {p.reference}</span>}
                        </p>
                      )}
                      {p.event === "WITHDRAWAL_STATUS" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          Estado: {p.status}
                          {p.reference && <span className="ml-2 text-[var(--ink-3)]">ref: {p.reference}</span>}
                        </p>
                      )}
                      {p.event === "NOTE" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1 italic">&ldquo;{p.text}&rdquo;</p>
                      )}
                      {p.event === "BALANCE_CORRECTION" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {p.variance >= 0 ? "+" : ""}{p.variance.toLocaleString()}
                          {p.note && <span className="ml-2 italic text-[var(--ink-3)]">&ldquo;{p.note}&rdquo;</span>}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {hasMore && (
            <button
              onClick={() => setCursor(data!.nextCursor!)}
              disabled={isFetching}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] py-2 border border-[var(--line)] rounded-[var(--radius-sm)] hover:bg-[var(--chip)] transition-colors disabled:opacity-50"
            >
              {isFetching ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
              {isFetching ? "Cargando…" : "Cargar más"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
