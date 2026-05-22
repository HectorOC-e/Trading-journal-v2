"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockAccounts } from "@/mock-data"
import type { AccountType } from "@/types"

const KPIS = [
  { label: "Balance Total",  value: "$103,640", sub: "todas las cuentas", trend: "up"      as const, mono: true },
  { label: "Drawdown actual",value: "-0.4%",    sub: "FXify 100K",        trend: "neutral" as const, mono: true },
  { label: "Objetivo fase",  value: "3.6%",     sub: "de 8% objetivo",    trend: "up"      as const, mono: true },
  { label: "Trades hoy",     value: "2",        sub: "límite: 3",         trend: "neutral" as const, mono: true },
]

const ACCOUNT_TYPES: AccountType[] = ["PERSONAL", "PROP_FIRM", "DEMO", "QA"]

function NuevaCuentaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tipo, setTipo] = useState<AccountType>("PROP_FIRM")
  const [nombre, setNombre] = useState("")
  const [broker, setBroker] = useState("")
  const [balance, setBalance] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [timezone, setTimezone] = useState("America/New_York")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <p className="text-eyebrow mb-2">Tipo de cuenta</p>
            <div className="flex gap-1">
              {ACCOUNT_TYPES.map((t) => (
                <button key={t} onClick={() => setTipo(t)}
                  className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors",
                    tipo === t ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-eyebrow block mb-1.5">Nombre de la cuenta *</label>
            <Input placeholder="FXify 100K — Phase 2" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          {/* Broker */}
          <div>
            <label className="text-eyebrow block mb-1.5">Broker / Firma *</label>
            <Input placeholder="FXify" value={broker} onChange={e => setBroker(e.target.value)} />
          </div>

          {/* Balance + currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-eyebrow block mb-1.5">Balance inicial *</label>
              <Input placeholder="100,000" value={balance} onChange={e => setBalance(e.target.value)} mono />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Divisa</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
                {["USD","EUR","MXN"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-eyebrow block mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="America/Chicago">America/Chicago (CT)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          {/* Prop firm rules */}
          {tipo === "PROP_FIRM" && (
            <div className="flex flex-col gap-3 pt-2 border-t border-[var(--line)]">
              <p className="text-eyebrow">Reglas Prop Firm</p>
              <div className="grid grid-cols-2 gap-3">
                {[["Max Drawdown", "10", "%"], ["Daily Loss Limit", "5", "%"], ["Trades por día", "3", ""], ["Objetivo de fase", "8", "%"]].map(([label, ph, unit]) => (
                  <div key={label}>
                    <label className="text-eyebrow block mb-1.5">{label}</label>
                    <div className="flex items-center gap-1">
                      <Input placeholder={ph} mono className="flex-1" />
                      {unit && <span className="text-sm text-[var(--ink-3)]">{unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Símbolos permitidos</label>
                <Input placeholder="NQ, ES, MNQ" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>Crear cuenta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function CuentasPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div>
        <TopBar title="Cuentas" subtitle="1 cuenta activa"
          actions={[{ label: "Nueva cuenta", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />
        <KpiStrip items={KPIS} className="mb-6" />

        <div className="grid grid-cols-2 gap-4">
          {mockAccounts.map(a => (
            <div key={a.id} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{a.name}</p>
                  <p className="text-xs text-[var(--ink-3)] mt-0.5">{a.broker}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  {a.type.replace("_", " ")}
                </span>
              </div>

              {/* Balance row */}
              <div className="flex gap-4">
                <div>
                  <p className="text-eyebrow mb-0.5">Balance</p>
                  <p className="font-mono font-bold text-[var(--ink)]">${a.initialBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-eyebrow mb-0.5">P&L mes</p>
                  <p className="font-mono font-bold text-[var(--win)]">+$3,640</p>
                </div>
              </div>

              {/* Prop firm rules */}
              {a.propFirmRules && (
                <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 text-xs flex flex-col gap-1.5 border border-[var(--line)]">
                  <p className="text-eyebrow mb-1">Reglas prop firm</p>
                  {[
                    ["Max DD", `${a.propFirmRules.maxDrawdownPct}%`],
                    ["Daily Loss", `${a.propFirmRules.dailyLossPct}%`],
                    ["Objetivo", `${a.propFirmRules.targetPct}%`],
                    ["Símbolos", a.propFirmRules.allowedSymbols.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[var(--ink-3)]">{k}</span>
                      <span className="font-mono text-[var(--ink)]">{v}</span>
                    </div>
                  ))}
                  <div className="mt-1">
                    <div className="flex justify-between text-[10px] text-[var(--ink-3)] mb-1">
                      <span>Progreso fase</span>
                      <span className="font-mono text-[var(--win)]">3.6% / 8%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--line)]">
                      <div className="h-full rounded-full bg-[var(--win)]" style={{ width: "45%" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <Button variant="ghost" size="sm" className="flex-1">Ver trades</Button>
                <Button variant="ghost" size="sm" className="flex-1">Editar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NuevaCuentaModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
