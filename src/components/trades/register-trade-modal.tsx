// RegisterTradeModal — major redesign
// Steps: Account selector → Direction → Symbol+Date+Time+Size → Setup+Checklist → Session → Notes+Screenshots
// Tags are auto-assigned based on checklist state

"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Circle, Star } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"
import type { Account, Setup, TradeDirection, TradeSession, TradeTag } from "@/types"

const SESSION_OPTIONS: { value: TradeSession; label: string }[] = [
  { value: "London",       label: "London" },
  { value: "New York",     label: "New York" },
  { value: "Asia",         label: "Asia" },
  { value: "London Close", label: "London Close" },
]

const MANUAL_TAG_OPTIONS: { value: TradeTag; label: string }[] = [
  { value: "Off-plan",  label: "Off-plan" },
  { value: "Impulsivo", label: "Impulsivo" },
]

interface FormState {
  direction: TradeDirection
  symbol: string
  accountId: string
  setupId: string
  entry: string
  stop: string
  target: string
  size: string
  date: string
  openTime: string
  session: TradeSession
  tags: TradeTag[]
  notes: string
  checklistItems: Record<string, boolean>
  aplusMode: boolean
}

const INITIAL: FormState = {
  direction: "LONG",
  symbol: "",
  accountId: "",
  setupId: "",
  entry: "",
  stop: "",
  target: "",
  size: "",
  date: new Date().toISOString().slice(0, 10),
  openTime: "",
  session: "New York",
  tags: [],
  notes: "",
  checklistItems: {},
  aplusMode: false,
}

interface RegisterTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts?: Account[]
  setups?: Setup[]
  tradeCountToday?: number
  onSubmit?: (data: FormState) => void
}

function computeAutoTag(form: FormState, setup: Setup | undefined): TradeTag | null {
  if (!setup) return null
  if (form.aplusMode) return "A+"
  const total   = setup.standardChecklist.length
  const checked = setup.standardChecklist.filter((item) => form.checklistItems[item]).length
  if (total === 0) return null
  if (checked === total) return "Plan"
  if (checked > 0) return "Plan"
  return null
}

export function RegisterTradeModal({
  open,
  onOpenChange,
  accounts = [],
  setups = [],
  tradeCountToday = 0,
  onSubmit,
}: RegisterTradeModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL)

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const selectedSetup = setups.find((s) => s.id === form.setupId)
  const autoTag = computeAutoTag(form, selectedSetup)

  // When a setup is selected, reset checklist
  const selectSetup = (setupId: string) => {
    setForm((f) => ({
      ...f,
      setupId,
      checklistItems: {},
      aplusMode: false,
    }))
  }

  // Toggle a single checklist item
  const toggleChecklistItem = (item: string) =>
    setForm((f) => ({
      ...f,
      checklistItems: {
        ...f.checklistItems,
        [item]: !f.checklistItems[item],
      },
    }))

  // Toggle A+ mode: auto-check all items
  const toggleAplusMode = () => {
    if (!selectedSetup) return
    setForm((f) => {
      const newMode = !f.aplusMode
      const allChecked: Record<string, boolean> = {}
      if (newMode) {
        selectedSetup.standardChecklist.forEach((item) => { allChecked[item] = true })
        selectedSetup.aplusChecklist.forEach((item) => { allChecked[item] = true })
      }
      return {
        ...f,
        aplusMode: newMode,
        checklistItems: newMode ? allChecked : {},
      }
    })
  }

  // Toggle manual tag (only for Off-plan / Impulsivo when no setup)
  const toggleManualTag = (tag: TradeTag) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }))

  const showWarning = tradeCountToday >= 2

  const handleSubmit = () => {
    const finalTags: TradeTag[] = autoTag ? [autoTag] : form.tags
    onSubmit?.({ ...form, tags: finalTags })
    onOpenChange(false)
    setForm(INITIAL)
  }

  const selectedAccount = accounts.find((a) => a.id === form.accountId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar trade</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">

          {/* ── Step 1: Account selector ── */}
          <div>
            <p className="text-eyebrow mb-2">Cuenta *</p>
            {accounts.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, accountId: acc.id }))}
                    className={cn(
                      "flex-1 min-w-[160px] text-left rounded-[var(--radius-sm)] p-3 border transition-all",
                      form.accountId === acc.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{acc.name}</p>
                      <span
                        className={cn(
                          "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded",
                          acc.type === "PROP_FIRM"
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--chip)] text-[var(--ink-2)]"
                        )}
                      >
                        {acc.type === "PROP_FIRM" ? "PROP" : acc.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono">
                      ${acc.initialBalance.toLocaleString()}
                    </p>
                    {acc.propFirmRules && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="text-[10px] text-[var(--ink-3)]">
                          DD máx {acc.propFirmRules.maxDrawdownPct}%
                        </span>
                        <span className="text-[10px] text-[var(--ink-3)]">·</span>
                        <span className="text-[10px] text-[var(--ink-3)]">
                          Pérd.diaria {acc.propFirmRules.dailyLossPct}%
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="ID de cuenta"
                value={form.accountId}
                onChange={(e) => set("accountId")(e.target.value)}
              />
            )}
          </div>

          {/* ── Step 2: Direction toggle ── */}
          <div>
            <p className="text-eyebrow mb-2">Dirección</p>
            <div className="flex gap-2">
              {(["LONG", "SHORT"] as TradeDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, direction: d }))}
                  className={cn(
                    "flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors",
                    form.direction === d
                      ? d === "LONG"
                        ? "bg-[var(--win)] text-white"
                        : "bg-[var(--loss)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 3: Symbol + Date + Time + Size ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Símbolo *</label>
              <Input placeholder="NQ" value={form.symbol} onChange={(e) => set("symbol")(e.target.value)} mono />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Tamaño (contratos) *</label>
              <Input placeholder="2" value={form.size} onChange={(e) => set("size")(e.target.value)} mono />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Fecha *</label>
              <Input type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Hora apertura *</label>
              <Input type="time" value={form.openTime} onChange={(e) => set("openTime")(e.target.value)} />
            </div>
          </div>

          {/* Entry / Stop / Target */}
          <div className="grid grid-cols-3 gap-3">
            {(["entry", "stop", "target"] as const).map((key, i) => (
              <div key={key}>
                <label className="text-eyebrow block mb-1.5">
                  {["Entry *", "Stop *", "Target *"][i]}
                </label>
                <Input
                  placeholder={["21,450.00", "21,380.00", "21,590.00"][i]}
                  value={form[key]}
                  onChange={(e) => set(key)(e.target.value)}
                  mono
                />
              </div>
            ))}
          </div>

          {/* ── Step 4: Setup selector + Checklist ── */}
          <div>
            <p className="text-eyebrow mb-2">Setup *</p>
            {setups.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {setups.map((setup) => (
                    <button
                      key={setup.id}
                      type="button"
                      onClick={() => selectSetup(setup.id)}
                      className={cn(
                        "text-left rounded-[var(--radius-sm)] p-3 border transition-all",
                        form.setupId === setup.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--chip)", color: "var(--ink-2)" }}
                        >
                          {setup.abbreviation}
                        </span>
                        {setup.aplusChecklist.length > 0 && (
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{setup.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)] mt-1">{setup.market}</p>
                      <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
                        {setup.standardChecklist.length} criterios
                      </p>
                    </button>
                  ))}
                </div>

                {/* Checklist section — shown when a setup is selected */}
                {selectedSetup && (
                  <div
                    className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3"
                  >
                    {/* A+ toggle */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-[var(--ink)]">
                        Checklist — {selectedSetup.name}
                      </p>
                      <button
                        type="button"
                        onClick={toggleAplusMode}
                        className={cn(
                          "flex items-center gap-1.5 h-6 px-2.5 rounded text-[10px] font-bold transition-colors",
                          form.aplusMode
                            ? "bg-amber-400/20 text-amber-400 border border-amber-400/40"
                            : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        <Star size={9} className={cn(form.aplusMode ? "fill-amber-400" : "")} />
                        A+
                      </button>
                    </div>

                    {form.aplusMode ? (
                      <div className="flex items-center gap-2 py-1.5">
                        <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                        <p className="text-xs font-semibold text-amber-400">
                          A+ — todos los criterios cumplidos
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {selectedSetup.standardChecklist.map((item) => {
                          const checked = !!form.checklistItems[item]
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleChecklistItem(item)}
                              className="flex items-start gap-2 text-left w-full hover:opacity-80 transition-opacity"
                            >
                              {checked
                                ? <CheckCircle2 size={14} className="text-[var(--win)] shrink-0 mt-px" />
                                : <Circle size={14} className="text-[var(--ink-3)] shrink-0 mt-px" />
                              }
                              <span className={cn(
                                "text-xs",
                                checked ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
                              )}>
                                {item}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Show A+ criteria if in A+ mode */}
                    {form.aplusMode && selectedSetup.aplusChecklist.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--line)]">
                        <p className="text-[10px] text-amber-400 font-semibold mb-1.5">Criterios A+</p>
                        <div className="flex flex-col gap-1.5">
                          {selectedSetup.aplusChecklist.map((item) => (
                            <div key={item} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-amber-400 shrink-0 mt-px" />
                              <span className="text-xs text-[var(--ink-2)]">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Input
                placeholder="ID del setup"
                value={form.setupId}
                onChange={(e) => set("setupId")(e.target.value)}
              />
            )}
          </div>

          {/* ── Auto-assigned quality tag ── */}
          {(autoTag || !selectedSetup) && (
            <div>
              <p className="text-eyebrow mb-2">Calidad calculada</p>
              {autoTag ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                  {autoTag === "A+" ? (
                    <span className="flex items-center gap-1.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: "rgba(251,191,36,0.15)", color: "rgb(251,191,36)" }}
                      >
                        A+
                      </span>
                    </span>
                  ) : (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {autoTag}
                    </span>
                  )}
                  <span className="text-xs text-[var(--ink-3)]">asignado automáticamente</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[var(--ink-3)] mb-2">
                    Sin setup o criterios — selecciona manualmente:
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {MANUAL_TAG_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleManualTag(value)}
                        className={cn(
                          "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                          form.tags.includes(value)
                            ? "bg-[var(--loss-soft)] text-[var(--loss)]"
                            : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Session ── */}
          <div>
            <p className="text-eyebrow mb-2">Sesión</p>
            <FilterBar
              options={SESSION_OPTIONS}
              value={form.session}
              onChange={(v) => setForm((f) => ({ ...f, session: v as TradeSession }))}
            />
          </div>

          {/* ── Do-not-take warning ── */}
          {showWarning && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--be-soft)] border-l-4 border-[var(--be)]">
              <AlertTriangle size={14} className="text-[var(--be)] shrink-0" />
              <p className="text-xs text-[var(--be)] font-medium">
                Posible Do-Not-Take: {tradeCountToday + 1}er trade del día
              </p>
            </div>
          )}

          {/* Prop firm warning for selected account */}
          {selectedAccount?.propFirmRules && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)]">
              <AlertTriangle size={14} className="text-[var(--ink-3)] shrink-0 mt-px" />
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold text-[var(--ink-2)]">Reglas {selectedAccount.name}</p>
                <p className="text-[10px] text-[var(--ink-3)]">
                  DD máx {selectedAccount.propFirmRules.maxDrawdownPct}% · Pérdida diaria {selectedAccount.propFirmRules.dailyLossPct}% · Máx {selectedAccount.propFirmRules.maxTradesPerDay} trades/día
                </p>
                <p className="text-[10px] text-[var(--ink-3)]">
                  Símbolos: {selectedAccount.propFirmRules.allowedSymbols.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 6: Notes + Screenshots ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Notas</label>
            <Textarea
              placeholder="Entrada en zona de liquidez..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-eyebrow block mb-1.5">Screenshots</label>
            <div className="border border-dashed border-[var(--line)] rounded-[var(--radius-sm)] p-6 text-center bg-[var(--panel-2)]">
              <p className="text-sm text-[var(--ink-2)]">📎 Arrastra o haz click para subir</p>
              <p className="text-xs text-[var(--ink-3)] mt-1">
                Se sube a Supabase Storage · presigned URL
              </p>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>
            Registrar trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
