"use client"

import { useState } from "react"
import { Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MarketMultiSelect } from "@/components/ui/market-select"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { AccountType } from "@/types"
import { TYPE_META, isPropFirmLike } from "../components/account-card"

const ACCOUNT_TYPES: AccountType[] = ["PROP_FIRM", "DEMO_PROP", "PERSONAL", "DEMO_PERSONAL", "BACKTEST", "QA"]
const BROKERS = ["FXify", "FTMO", "MyForexFunds", "TopStep", "Apex", "Interactive Brokers", "TD Ameritrade", "Otro"]
const TIMEZONES = [
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago",  label: "America/Chicago (CT)" },
  { value: "Europe/London",    label: "Europe/London (GMT)" },
  { value: "Europe/Madrid",    label: "Europe/Madrid (CET)" },
]

interface AccountForm {
  tipo: AccountType
  nombre: string
  broker: string
  balance: string
  currency: string
  timezone: string
  ddDailyPct: string
  ddWeeklyPct: string
  ddMonthlyPct: string
  ddTotalPct: string
  targetPct: string
  ddModel: "FIXED" | "TRAILING"
  phase: "PHASE_1" | "PHASE_2" | "FUNDED" | "NONE"
  maxTrades: string
  symbols: string[]
  minDays: string
}

const FORM_INIT: AccountForm = {
  tipo: "PROP_FIRM", nombre: "", broker: "", balance: "", currency: "USD",
  timezone: "America/New_York",
  ddDailyPct: "", ddWeeklyPct: "", ddMonthlyPct: "", ddTotalPct: "", targetPct: "",
  ddModel: "FIXED", phase: "PHASE_1", maxTrades: "3", symbols: [], minDays: "",
}

export function NuevaCuentaModal({ open, onOpenChange, markets = [] }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const [form, setForm] = useState<AccountForm>(FORM_INIT)
  const [tab, setTab]   = useState<"general" | "reglas">("general")
  const utils = trpc.useUtils()

  const createAccount = trpc.accounts.create.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      onOpenChange(false)
      setForm(FORM_INIT)
      setTab("general")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const creating = createAccount.isPending

  function buildInput(f: AccountForm) {
    const pf = (v: string) => v ? parseFloat(v) : undefined
    const pi = (v: string) => v ? parseInt(v)   : undefined
    return {
      name:            f.nombre.trim(),
      broker:          f.broker.trim(),
      type:            f.tipo,
      initialBalance:  parseFloat(f.balance.replace(/,/g, "")) || 0,
      currency:        f.currency,
      timezone:        f.timezone,
      ddDailyPct:      pf(f.ddDailyPct),
      ddWeeklyPct:     pf(f.ddWeeklyPct),
      ddMonthlyPct:    pf(f.ddMonthlyPct),
      ddTotalPct:      pf(f.ddTotalPct),
      targetPct:       pf(f.targetPct),
      ddModel:         isPropFirmLike(f.tipo) ? f.ddModel : undefined,
      phase:           isPropFirmLike(f.tipo) ? f.phase   : undefined,
      maxTradesPerDay: isPropFirmLike(f.tipo) ? pi(f.maxTrades) : undefined,
      minTradingDays:  isPropFirmLike(f.tipo) ? pi(f.minDays)   : undefined,
      allowedSymbols:  f.symbols,
    }
  }

  function handleCreate() {
    if (!form.nombre.trim() || !form.broker.trim()) return
    createAccount.mutate(buildInput(form))
  }

  const set = <K extends keyof AccountForm>(k: K, v: AccountForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const tm      = TYPE_META[form.tipo]
  const preview = form.nombre || "Nombre de la cuenta"

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(FORM_INIT); setTab("general") } }}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: tm.bg }}>
              <Shield size={18} style={{ color: tm.color }} />
            </div>
            <div>
              <DialogTitle className="text-[var(--ink)]">{preview}</DialogTitle>
              <p className="text-[11px] mt-0.5" style={{ color: tm.color }}>{tm.label} · {form.currency}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[var(--radius-sm)]">
          {(["general", "reglas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}>
              {t === "general" ? "General" : isPropFirmLike(form.tipo) ? "Prop Firm" : "Límites"}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-eyebrow mb-2">Tipo de cuenta</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ACCOUNT_TYPES.map(t => {
                  const m = TYPE_META[t]
                  return (
                    <button key={t} onClick={() => set("tipo", t)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-sm)] border transition-all"
                      style={{ borderColor: form.tipo === t ? m.color : "var(--line)", background: form.tipo === t ? m.bg : "var(--panel-2)" }}>
                      <span className="text-[11px] font-bold" style={{ color: form.tipo === t ? m.color : "var(--ink-3)" }}>{TYPE_META[t].label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Nombre de la cuenta *</label>
              <Input placeholder="FXify 100K — Phase 2" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Broker / Firma prop *</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {BROKERS.slice(0, 6).map(b => (
                  <button key={b} onClick={() => set("broker", b)}
                    className={cn("px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors",
                      form.broker === b ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}>
                    {b}
                  </button>
                ))}
              </div>
              <Input placeholder="O escribe el nombre…" value={form.broker} onChange={e => set("broker", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Balance inicial *</label>
                <Input placeholder="100,000" value={form.balance} onChange={e => set("balance", e.target.value)} mono />
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Divisa</label>
                <div className="flex gap-1">
                  {["USD", "EUR", "MXN"].map(c => (
                    <button key={c} onClick={() => set("currency", c)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.currency === c ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-3)]"
                      )}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Timezone</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TIMEZONES.map(tz => (
                  <button key={tz.value} onClick={() => set("timezone", tz.value)}
                    className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] text-left transition-colors",
                      form.timezone === tz.value
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]"
                        : "bg-[var(--chip)] text-[var(--ink-3)] border border-transparent hover:text-[var(--ink)]"
                    )}>
                    {tz.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setTab("reglas")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors">
              Continuar → Configurar límites y objetivo
            </button>
          </div>
        )}

        {tab === "reglas" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.2)" }}>
              <Shield size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[var(--accent)]">Límites de drawdown y objetivo</p>
                <p className="text-[11px] text-[var(--ink-3)]">Aplica para todos los tipos de cuenta. Se usarán para calcular alertas y mostrar progreso.</p>
              </div>
            </div>

            <div>
              <p className="text-eyebrow mb-2">Límites de pérdida (%)</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["ddDailyPct",   "Diario",   "5",  "Pérdida máx en un día"],
                  ["ddWeeklyPct",  "Semanal",  "8",  "Pérdida máx en la semana"],
                  ["ddMonthlyPct", "Mensual",  "10", "Pérdida máx en el mes"],
                  ["ddTotalPct",   "Total",    "10", "DD desde balance inicial o pico"],
                ] as const).map(([field, label, ph, hint]) => (
                  <div key={field}>
                    <label className="text-eyebrow block mb-1.5">{label}</label>
                    <div className="flex items-center gap-2">
                      <Input placeholder={ph} value={form[field]} mono onChange={e => set(field, e.target.value)} />
                      <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                    </div>
                    <p className="text-[10px] text-[var(--ink-3)] mt-1">{hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Objetivo de ganancia</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <Input placeholder="8" value={form.targetPct} mono onChange={e => set("targetPct", e.target.value)} />
                <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
              </div>
            </div>

            {isPropFirmLike(form.tipo) && (
              <div className="border-t border-[var(--line)] pt-4">
                <p className="text-eyebrow mb-3">Extras Prop Firm</p>
                <div className="mb-4">
                  <label className="text-eyebrow block mb-2">Modelo de trailing drawdown</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["FIXED", "TRAILING"] as const).map(m => (
                      <button key={m} onClick={() => set("ddModel", m)}
                        className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] font-semibold text-left border transition-all",
                          form.ddModel === m
                            ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                            : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                        )}>
                        {m === "FIXED" ? "Fijo (FTMO, FXify)" : "Trailing (Apex, TopStep)"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-eyebrow block mb-1.5">Fase actual</label>
                    <div className="flex flex-col gap-1">
                      {(["PHASE_1","PHASE_2","FUNDED","NONE"] as const).map(p => (
                        <button key={p} onClick={() => set("phase", p)}
                          className={cn("py-1.5 px-3 rounded-[var(--radius-sm)] text-[11px] font-medium text-left border transition-all",
                            form.phase === p
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                              : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                          )}>
                          {p === "PHASE_1" ? "Phase 1" : p === "PHASE_2" ? "Phase 2" : p === "FUNDED" ? "Funded" : "Sin fase"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-eyebrow block mb-1.5">Max trades / día</label>
                    <Input placeholder="3" value={form.maxTrades} mono onChange={e => set("maxTrades", e.target.value)} />
                    <label className="text-eyebrow block mb-1.5 mt-3">Min. días trading</label>
                    <Input placeholder="10" value={form.minDays} mono onChange={e => set("minDays", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {tab === "reglas" && (
              <div className="mt-3">
                <label className="text-eyebrow block mb-1.5">Mercados / Símbolos</label>
                <MarketMultiSelect markets={markets} value={form.symbols} onChange={syms => set("symbols", syms)} placeholder="Seleccionar mercados…" />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "reglas" && (
            <Button variant="ghost" onClick={() => setTab("general")}>← Volver</Button>
          )}
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 size={13} className="animate-spin" /> Creando…</> : "Crear cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
