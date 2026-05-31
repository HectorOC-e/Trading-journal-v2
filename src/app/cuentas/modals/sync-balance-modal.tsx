"use client"

import { useState } from "react"
import { X, ArrowUpDown, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

interface SyncBalanceModalProps {
  accountId:   string
  accountName: string
  onClose:     () => void
}

export function SyncBalanceModal({ accountId, accountName, onClose }: SyncBalanceModalProps) {
  const [balanceInput, setBalanceInput] = useState("")
  const utils = trpc.useUtils()

  const syncBalance = trpc.accounts.syncBalance.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
    },
  })

  const handleSubmit = () => {
    const val = parseFloat(balanceInput)
    if (isNaN(val)) return
    syncBalance.mutate({ accountId, actualBalance: val })
  }

  const result = syncBalance.data
  const isDone = !!result

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <p className="font-bold text-[var(--ink)]">Sincronizar balance</p>
            <p className="text-[11px] text-[var(--ink-3)]">{accountName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)]">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {!isDone ? (
            <>
              <p className="text-xs text-[var(--ink-2)]">
                Ingresa el balance real de tu broker. Se registrará una corrección de balance para mantener el historial consistente.
              </p>
              <div>
                <label className="text-[10px] font-semibold text-[var(--ink-3)] block mb-1.5">
                  Balance real del broker ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-base font-mono font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="0.00"
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                  disabled={syncBalance.isPending}
                />
              </div>
              {syncBalance.isError && (
                <p className="text-xs text-[var(--loss)]">{syncBalance.error.message}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={syncBalance.isPending || !balanceInput || isNaN(parseFloat(balanceInput))}
                className="w-full py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {syncBalance.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Sincronizando…</>
                ) : (
                  <><ArrowUpDown size={14} /> Sincronizar</>
                )}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-[var(--ink-3)]">Balance calculado</span>
                  <span className="text-xs font-mono font-semibold text-[var(--ink)]">
                    ${result.computedBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-[var(--ink-3)]">Balance real (broker)</span>
                  <span className="text-xs font-mono font-semibold text-[var(--ink)]">
                    ${result.actualBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--line)]">
                  <span className="text-xs font-semibold text-[var(--ink-3)]">Diferencia</span>
                  <span className={`text-sm font-mono font-bold ${result.variance >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"}`}>
                    {result.variance >= 0 ? "+" : ""}${result.variance.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--ink-3)] text-center">Corrección registrada en el historial.</p>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-[var(--radius-sm)] bg-[var(--chip)] text-[var(--ink)] text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
