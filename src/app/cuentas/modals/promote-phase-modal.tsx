"use client"

import { useState } from "react"
import { X, AlertTriangle, ArrowUpCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarketMultiSelect } from "@/components/ui/market-select"
import type { RouterOutputs } from "@/server/trpc/root"

type RawAccount = RouterOutputs["accounts"]["list"][number]

export function PromotePhaseModal({ account, netPnl = 0, onClose, onConfirm, saving, markets = [] }: {
  account: RawAccount
  netPnl?: number
  onClose: () => void
  onConfirm: (input: {
    id: string; phase: "PHASE_1" | "PHASE_2" | "FUNDED" | "NONE"
    note?: string; objectiveMet: boolean; manualOverride: boolean
    newRules?: {
      initialBalance?: number; ddDailyPct?: number; ddWeeklyPct?: number
      ddMonthlyPct?: number; ddTotalPct?: number; targetPct?: number
      maxTradesPerDay?: number; minTradingDays?: number; allowedSymbols?: string[]
    }
  }) => void
  saving: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const currentPhase = (account.phase as string) ?? "PHASE_1"
  const targetPhase  = currentPhase === "PHASE_1" ? "PHASE_2" : "FUNDED"

  const [note,          setNote]          = useState("")
  const [manualOverride, setManualOverride] = useState(false)
  const [balance,       setBalance]       = useState(String(Number(account.initialBalance)))
  const [ddDaily,       setDdDaily]       = useState(account.ddDailyPct  != null ? String(Number(account.ddDailyPct))  : "")
  const [ddTotal,       setDdTotal]       = useState(account.ddTotalPct  != null ? String(Number(account.ddTotalPct))  : "")
  const [target,        setTarget]        = useState(account.targetPct   != null ? String(Number(account.targetPct))   : "")
  const [maxTrades,     setMaxTrades]     = useState(account.maxTradesPerDay != null ? String(account.maxTradesPerDay) : "")
  const [minDays,       setMinDays]       = useState(account.minTradingDays  != null ? String(account.minTradingDays)  : "")
  const [symbols,       setSymbols]       = useState<string[]>(account.allowedSymbols ?? [])

  const objectiveMet   = account.targetPct != null
    ? netPnl >= Number(account.targetPct) / 100 * Number(account.initialBalance)
    : false
  const needsOverride  = !objectiveMet

  function handleConfirm() {
    if (needsOverride && !manualOverride) return
    onConfirm({
      id: account.id,
      phase: targetPhase as "PHASE_2" | "FUNDED",
      note: note || undefined,
      objectiveMet,
      manualOverride,
      newRules: {
        initialBalance:  parseFloat(balance) || undefined,
        ddDailyPct:      ddDaily   ? parseFloat(ddDaily)   : undefined,
        ddTotalPct:      ddTotal   ? parseFloat(ddTotal)   : undefined,
        targetPct:       target    ? parseFloat(target)    : undefined,
        maxTradesPerDay: maxTrades  ? parseInt(maxTrades)  : undefined,
        minTradingDays:  minDays    ? parseInt(minDays)    : undefined,
        allowedSymbols:  symbols.length > 0 ? symbols : undefined,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] w-full max-w-md max-h-[85vh] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <p className="font-bold text-[var(--ink)]">Promover cuenta</p>
            <p className="text-[11px] text-[var(--ink-3)]">{currentPhase} → {targetPhase}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)]">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {needsOverride && (
            <div className="p-3 rounded-[var(--radius-sm)] border border-amber-700/40 bg-amber-950/20 text-amber-400 text-[12px] flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={13} /> Objetivo no alcanzado aún
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                No hay suficientes trades registrados para confirmar que el objetivo fue cumplido.
                Si la prop firm aprobó manualmente el pase de fase, marca la casilla de abajo.
              </p>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={manualOverride} onChange={e => setManualOverride(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
                <span className="text-[11px]">La prop firm confirmó manualmente el pase a {targetPhase}</span>
              </label>
            </div>
          )}

          <div>
            <p className="text-eyebrow mb-2">Reglas para {targetPhase}</p>
            <p className="text-[11px] text-[var(--ink-3)] mb-3">Se pre-llenan con los valores actuales. Ajusta los que cambien para la nueva fase.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Balance nuevo", val: balance,   set: setBalance,   placeholder: "100000" },
                { label: "DD Diario %",   val: ddDaily,   set: setDdDaily,   placeholder: "5" },
                { label: "DD Total %",    val: ddTotal,   set: setDdTotal,   placeholder: "10" },
                { label: "Objetivo %",    val: target,    set: setTarget,    placeholder: "8" },
                { label: "Max trades/d",  val: maxTrades, set: setMaxTrades, placeholder: "3" },
                { label: "Min días",      val: minDays,   set: setMinDays,   placeholder: "10" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <p className="text-[10px] text-[var(--ink-3)] mb-1">{label}</p>
                  <Input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} className="text-[12px] h-8" />
                </div>
              ))}
            </div>
          </div>

          {markets.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--ink-3)] mb-1">Símbolos permitidos en {targetPhase}</p>
              <MarketMultiSelect markets={markets} value={symbols} onChange={setSymbols} placeholder="Igual que fase anterior…" />
            </div>
          )}

          <div>
            <p className="text-[10px] text-[var(--ink-3)] mb-1">Nota (opcional)</p>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: FTMO aprobó fase 1 el 23 may…" className="text-[12px]" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={saving || (needsOverride && !manualOverride)}
              onClick={handleConfirm}
            >
              {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : <ArrowUpCircle size={13} className="mr-1" />}
              Confirmar promoción
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
