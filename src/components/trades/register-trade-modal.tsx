"use client"

import { useState, useEffect, useMemo } from "react"
import { AlertTriangle, CheckCircle2, Circle, Star, Calculator, ImagePlus, X as XIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FilterBar } from "@/components/ui/filter-bar"
import { SymbolCombobox } from "@/components/ui/market-select"
import { cn } from "@/lib/utils"
import type { TradeDirection, TradeSession, TradeTag } from "@/types"

// ── Types ──────────────────────────────────────────────────────────────────

interface AccountLike {
  id: string
  name: string
  type: string
  initialBalance: number
  allowedSymbols?: string[]
  ddDailyPct?: number | null
  maxTradesPerDay?: number | null
  propFirmRules?: {
    maxDrawdownPct: number
    dailyLossPct: number
    maxTradesPerDay: number
    targetPct: number
    allowedSymbols: string[]
  }
}

interface SetupLike {
  id: string
  name: string
  abbreviation: string
  market: string
  aplusChecklist: string[]
  standardChecklist: string[]
}

interface MarketLike {
  id: string
  symbol: string
  name: string
  category: string
  pointValue: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

/** Extract numeric dollar value from strings like "$20", "$10 / lot", "$50" */
function parsePointValue(pv: string): number | null {
  const match = pv.replace(/,/g, "").match(/\$?([\d.]+)/)
  if (!match) return null
  const n = parseFloat(match[1])
  return isNaN(n) ? null : n
}

function computeContracts(params: {
  balance: number
  riskPct: number
  entry: number
  stop: number
  pointValue: number
}): number | null {
  const { balance, riskPct, entry, stop, pointValue } = params
  if (!balance || !riskPct || !entry || !stop || !pointValue) return null
  const stopDistance = Math.abs(entry - stop)
  if (stopDistance === 0) return null
  const riskAmount = balance * (riskPct / 100)
  const riskPerContract = stopDistance * pointValue
  return riskAmount / riskPerContract
}

// ── Form state ─────────────────────────────────────────────────────────────

interface FormState {
  direction: TradeDirection
  symbol: string
  accountId: string
  setupId: string
  entry: string
  stop: string
  target: string
  size: string
  riskPct: string
  date: string
  openTime: string
  session: TradeSession
  tags: TradeTag[]
  notes: string
  checklistItems: Record<string, boolean>
  screenshots: string[]
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
  riskPct: "1",
  date: new Date().toISOString().slice(0, 10),
  openTime: "",
  session: "New York",
  tags: [],
  notes: "",
  checklistItems: {},
  screenshots: [],
}

// ── Auto quality tag ───────────────────────────────────────────────────────

function computeAutoTag(form: FormState, setup: SetupLike | undefined): TradeTag | null {
  if (!setup) return null
  const stdTotal   = setup.standardChecklist.length
  const stdChecked = setup.standardChecklist.filter(i => form.checklistItems[i]).length
  const aplusTotal   = setup.aplusChecklist.length
  const aplusChecked = setup.aplusChecklist.filter(i => form.checklistItems[i]).length
  if (stdTotal === 0) return null
  if (stdChecked === stdTotal && aplusTotal > 0 && aplusChecked === aplusTotal) return "A+"
  if (stdChecked === stdTotal) return "Plan"
  return null
}

// ── Props ──────────────────────────────────────────────────────────────────

interface RegisterTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts?: AccountLike[]
  setups?: SetupLike[]
  markets?: MarketLike[]
  tradeCountToday?: number
  onSubmit?: (data: FormState) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function RegisterTradeModal({
  open,
  onOpenChange,
  accounts = [],
  setups = [],
  markets = [],
  tradeCountToday = 0,
  onSubmit,
}: RegisterTradeModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [sizeManual, setSizeManual] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()
    const urls: string[] = []
    for (const file of files) {
      const ext  = file.name.split(".").pop()
      const path = `trades/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setForm(f => ({ ...f, screenshots: [...f.screenshots, ...urls] }))
    setUploading(false)
    e.target.value = ""
  }

  const removeScreenshot = (idx: number) =>
    setForm(f => ({ ...f, screenshots: f.screenshots.filter((_, i) => i !== idx) }))

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setForm(INITIAL)
        setSizeManual(false)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  const selectedAccount = accounts.find(a => a.id === form.accountId)
  const selectedSetup   = setups.find(s => s.id === form.setupId)
  const selectedMarket  = markets.find(m => m.symbol === form.symbol)
  const autoTag         = computeAutoTag(form, selectedSetup)

  // ── Filtered symbols ───────────────────────────────────────────────────
  // null = no restriction (show all); string[] with items = filter to those
  const allowedSymbols: string[] | null = useMemo(() => {
    if (!selectedAccount) return null
    const raw = (selectedAccount as { allowedSymbols?: string[] }).allowedSymbols
    if (raw && raw.length > 0) return raw
    if (selectedAccount.propFirmRules?.allowedSymbols?.length) {
      return selectedAccount.propFirmRules.allowedSymbols
    }
    return null
  }, [selectedAccount])

  const visibleMarkets = useMemo(() => {
    // If account has no restrictions (null or empty), show all markets
    if (!allowedSymbols || allowedSymbols.length === 0) return markets
    return markets.filter(m => allowedSymbols.includes(m.symbol))
  }, [markets, allowedSymbols])

  // ── Lot size calculator ────────────────────────────────────────────────
  const pointValue = selectedMarket ? parsePointValue(selectedMarket.pointValue) : null
  const balance    = selectedAccount?.initialBalance ?? 0

  const calcContracts = useMemo(() => {
    if (!balance || !pointValue) return null
    return computeContracts({
      balance,
      riskPct:  parseFloat(form.riskPct) || 0,
      entry:    parseFloat(form.entry)   || 0,
      stop:     parseFloat(form.stop)    || 0,
      pointValue,
    })
  }, [balance, pointValue, form.riskPct, form.entry, form.stop])

  const calcRR = useMemo(() => {
    const entry  = parseFloat(form.entry)
    const stop   = parseFloat(form.stop)
    const target = parseFloat(form.target)
    if (!entry || !stop || !target) return null
    const risk   = Math.abs(entry - stop)
    const reward = form.direction === "LONG" ? target - entry : entry - target
    if (risk === 0 || reward <= 0) return null
    return reward / risk
  }, [form.entry, form.stop, form.target, form.direction])

  // Auto-fill size when calculator has a valid result and user hasn't overridden
  useEffect(() => {
    if (calcContracts !== null && !sizeManual) {
      setForm(f => ({ ...f, size: calcContracts.toFixed(2) }))
    }
  }, [calcContracts, sizeManual])

  // ── Checklist helpers ──────────────────────────────────────────────────
  const selectSetup = (setupId: string) => {
    setForm(f => ({ ...f, setupId, checklistItems: {} }))
  }

  const toggleItem = (item: string) =>
    setForm(f => ({
      ...f,
      checklistItems: { ...f.checklistItems, [item]: !f.checklistItems[item] },
    }))

  const toggleManualTag = (tag: TradeTag) =>
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))

  const showWarning = tradeCountToday >= 2

  const handleSubmit = () => {
    const finalTags: TradeTag[] = autoTag ? [autoTag] : form.tags
    onSubmit?.({ ...form, tags: finalTags })
    onOpenChange(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar trade</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">

          {/* ── Cuenta ── */}
          <div>
            <p className="text-eyebrow mb-2">Cuenta *</p>
            {accounts.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, accountId: acc.id, symbol: "" }))
                      setSizeManual(false)
                    }}
                    className={cn(
                      "flex-1 min-w-[160px] text-left rounded-[var(--radius-sm)] p-3 border transition-all",
                      form.accountId === acc.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{acc.name}</p>
                      <span className={cn(
                        "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded",
                        acc.type === "PROP_FIRM"
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--chip)] text-[var(--ink-2)]"
                      )}>
                        {acc.type === "PROP_FIRM" ? "PROP" : acc.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono">
                      ${acc.initialBalance.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-3)]">No hay cuentas activas. Crea una en Cuentas primero.</p>
            )}
          </div>

          {/* ── Dirección ── */}
          <div>
            <p className="text-eyebrow mb-2">Dirección</p>
            <div className="flex gap-2">
              {(["LONG", "SHORT"] as TradeDirection[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, direction: d }))}
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

          {/* ── Símbolo desde mercados ── */}
          <div>
            <p className="text-eyebrow mb-2">Símbolo *</p>
            {markets.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">No hay mercados. Agrégalos en la sección Mercados.</p>
            ) : (
              <>
                <SymbolCombobox
                  markets={visibleMarkets}
                  value={form.symbol}
                  onChange={sym => { setForm(f => ({ ...f, symbol: sym })); setSizeManual(false) }}
                  placeholder="Buscar símbolo…"
                />
                {selectedMarket && (
                  <p className="text-[10px] text-[var(--ink-3)] mt-1">
                    {selectedMarket.name} · Valor/pto: {selectedMarket.pointValue}
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Fecha + Hora ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Fecha *</label>
              <Input type="date" value={form.date} onChange={e => set("date")(e.target.value)} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Hora apertura *</label>
              <Input type="time" value={form.openTime} onChange={e => set("openTime")(e.target.value)} />
            </div>
          </div>

          {/* ── Entry / Stop / Target ── */}
          <div className="grid grid-cols-3 gap-3">
            {(["entry", "stop", "target"] as const).map((key, i) => (
              <div key={key}>
                <label className="text-eyebrow block mb-1.5">
                  {["Entry *", "Stop *", "Target *"][i]}
                </label>
                <Input
                  placeholder={["21,450.00", "21,380.00", "21,590.00"][i]}
                  value={form[key]}
                  onChange={e => {
                    set(key)(e.target.value)
                    setSizeManual(false)
                  }}
                  inputMode="decimal"
                  mono
                />
              </div>
            ))}
          </div>

          {/* ── Calculadora de contratos ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">Tamaño (contratos) *</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[var(--ink-3)] block mb-1">Riesgo %</label>
                <Input
                  placeholder="1"
                  value={form.riskPct}
                  onChange={e => { set("riskPct")(e.target.value); setSizeManual(false) }}
                  inputMode="decimal"
                  mono
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--ink-3)] block mb-1">
                  Contratos
                  {calcContracts !== null && !sizeManual && (
                    <span className="ml-1 text-[var(--win)]">auto</span>
                  )}
                </label>
                <Input
                  placeholder="2"
                  value={form.size}
                  onChange={e => {
                    set("size")(e.target.value)
                    setSizeManual(true)
                  }}
                  inputMode="decimal"
                  mono
                />
              </div>
            </div>

            {/* Calculator explanation + R:R */}
            {(calcContracts !== null || calcRR !== null) && (
              <div className="mt-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] flex flex-col gap-1.5">
                {/* Position size breakdown */}
                {calcContracts !== null && (
                  <p className="text-[10px] text-[var(--ink-3)] font-mono leading-relaxed">
                    ${balance.toLocaleString()} × {form.riskPct}% = <span className="text-[var(--ink-2)]">${(balance * (parseFloat(form.riskPct) || 0) / 100).toFixed(0)} en riesgo</span>
                    {pointValue && parseFloat(form.entry) && parseFloat(form.stop) && (
                      <>
                        {" · "}
                        {Math.abs(parseFloat(form.entry) - parseFloat(form.stop)).toFixed(2)} pts × ${pointValue} = <span className="text-[var(--ink-2)]">${(Math.abs(parseFloat(form.entry) - parseFloat(form.stop)) * pointValue).toFixed(0)}/contrato</span>
                        {" → "}
                        <span className="text-[var(--accent)] font-semibold">{calcContracts.toFixed(2)} contratos</span>
                      </>
                    )}
                  </p>
                )}

                {/* R:R row */}
                {calcRR !== null && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
                    <span className="text-[10px] text-[var(--ink-3)]">Risk:Reward</span>
                    <span className="text-sm font-bold font-mono" style={{
                      color: calcRR >= 2 ? "var(--win)" : calcRR >= 1 ? "var(--be)" : "var(--loss)",
                    }}>
                      1 : {calcRR.toFixed(2)}
                    </span>
                    <span className="text-[10px]" style={{
                      color: calcRR >= 2 ? "var(--win)" : calcRR >= 1 ? "var(--be)" : "var(--loss)",
                    }}>
                      {calcRR >= 2 ? "✓ Bueno" : calcRR >= 1 ? "Aceptable" : "⚠ Bajo"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Missing-fields hint — only when calc can't run */}
            {calcContracts === null && (() => {
              const missing: string[] = []
              if (!selectedAccount)            missing.push("cuenta")
              if (!form.symbol)                missing.push("símbolo")
              if (!parseFloat(form.entry))     missing.push("entry")
              if (!parseFloat(form.stop))      missing.push("stop")
              if (!parseFloat(form.riskPct))   missing.push("riesgo %")
              if (form.symbol && !pointValue)  missing.push("valor/pto del símbolo")
              if (missing.length === 0) return null
              return (
                <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--loss)" }}>
                  <span style={{ fontSize: 10 }}>⚠</span>
                  Falta: {missing.join(", ")}
                </p>
              )
            })()}
          </div>

          {/* ── Setup + Checklists ── */}
          <div>
            <p className="text-eyebrow mb-2">Setup *</p>
            {setups.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {/* Deselect option */}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, setupId: "", checklistItems: {} }))}
                    className={cn(
                      "text-left rounded-[var(--radius-sm)] p-3 border transition-all",
                      !form.setupId
                        ? "border-[var(--loss)] bg-[var(--loss-soft)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-3)]"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--chip)", color: "var(--ink-3)" }}>
                        N/A
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[var(--ink)] leading-tight">Sin setup</p>
                    <p className="text-[10px] text-[var(--ink-3)] mt-1">Off-plan / impulsivo</p>
                  </button>

                  {setups.map(setup => (
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
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
                          {setup.abbreviation}
                        </span>
                        {setup.aplusChecklist.length > 0 && (
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{setup.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)] mt-1">{setup.market}</p>
                    </button>
                  ))}
                </div>

                {/* Checklists — both always visible */}
                {selectedSetup && (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 flex flex-col gap-3">
                    {/* Standard checklist */}
                    {selectedSetup.standardChecklist.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--ink-2)] mb-2">
                          Criterios estándar
                          <span className="ml-1.5 text-[var(--ink-3)] font-normal">
                            {selectedSetup.standardChecklist.filter(i => form.checklistItems[i]).length}/{selectedSetup.standardChecklist.length}
                          </span>
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {selectedSetup.standardChecklist.map(item => {
                            const checked = !!form.checklistItems[item]
                            return (
                              <button key={item} type="button" onClick={() => toggleItem(item)}
                                className="flex items-start gap-2 text-left w-full hover:opacity-80 transition-opacity">
                                {checked
                                  ? <CheckCircle2 size={14} className="text-[var(--win)] shrink-0 mt-px" />
                                  : <Circle size={14} className="text-[var(--ink-3)] shrink-0 mt-px" />
                                }
                                <span className={cn("text-xs", checked ? "text-[var(--ink)]" : "text-[var(--ink-2)]")}>
                                  {item}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* A+ checklist — always visible if exists */}
                    {selectedSetup.aplusChecklist.length > 0 && (
                      <div className="pt-3 border-t border-[var(--line)]">
                        <p className="text-[10px] font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                          <Star size={10} className="fill-amber-400" />
                          Criterios A+
                          <span className="text-amber-400/60 font-normal">
                            {selectedSetup.aplusChecklist.filter(i => form.checklistItems[i]).length}/{selectedSetup.aplusChecklist.length}
                          </span>
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {selectedSetup.aplusChecklist.map(item => {
                            const checked = !!form.checklistItems[item]
                            return (
                              <button key={item} type="button" onClick={() => toggleItem(item)}
                                className="flex items-start gap-2 text-left w-full hover:opacity-80 transition-opacity">
                                {checked
                                  ? <CheckCircle2 size={14} className="text-amber-400 shrink-0 mt-px" />
                                  : <Circle size={14} className="text-amber-400/30 shrink-0 mt-px" />
                                }
                                <span className={cn("text-xs", checked ? "text-amber-400" : "text-[var(--ink-3)]")}>
                                  {item}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--ink-3)]">No hay setups activos. Crea uno en Playbook primero.</p>
            )}
          </div>

          {/* ── Calidad calculada ── */}
          {(autoTag || !selectedSetup) && (
            <div>
              <p className="text-eyebrow mb-2">Calidad calculada</p>
              {autoTag ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                  {autoTag === "A+" ? (
                    <span className="flex items-center gap-1.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: "rgba(251,191,36,0.15)", color: "rgb(251,191,36)" }}>
                        A+
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {autoTag}
                    </span>
                  )}
                  <span className="text-xs text-[var(--ink-3)]">asignado automáticamente</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[var(--ink-3)] mb-2">Sin setup — selecciona manualmente:</p>
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

          {/* ── Sesión ── */}
          <div>
            <p className="text-eyebrow mb-2">Sesión</p>
            <FilterBar
              options={SESSION_OPTIONS}
              value={form.session}
              onChange={v => setForm(f => ({ ...f, session: v as TradeSession }))}
            />
          </div>

          {/* ── Advertencias ── */}
          {showWarning && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--be-soft)] border-l-4 border-[var(--be)]">
              <AlertTriangle size={14} className="text-[var(--be)] shrink-0" />
              <p className="text-xs text-[var(--be)] font-medium">
                Posible Do-Not-Take: {tradeCountToday + 1}er trade del día
              </p>
            </div>
          )}

          {/* ── Notas ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Notas</label>
            <Textarea
              placeholder="Entrada en zona de liquidez..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* ── Screenshots ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Screenshots</label>

            {form.screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.screenshots.map((url, idx) => (
                  <div key={url} className="relative group w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={cn(
              "flex items-center justify-center gap-2 h-10 rounded-[var(--radius-sm)] border border-dashed text-[12px] font-medium transition-colors cursor-pointer",
              uploading
                ? "border-[var(--accent)] text-[var(--accent)] opacity-60"
                : "border-[var(--line)] text-[var(--ink-3)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            )}>
              <ImagePlus size={14} />
              {uploading ? "Subiendo…" : "Subir screenshots"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
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
