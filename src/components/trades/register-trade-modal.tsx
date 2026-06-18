"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Circle, Star, Calculator, ImagePlus, X as XIcon, ChevronDown, ChevronUp, Brain } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/ui/field"
import { FilterBar } from "@/components/ui/filter-bar"
import { SymbolCombobox } from "@/components/ui/market-select"
import { cn } from "@/lib/utils"
import { useZodForm } from "@/lib/forms/use-zod-form"
import { tradeFormSchema, type TradeFormValues } from "@/domains/trading/schemas/trade-form-schema"
import type { TradeDirection, TradeSession, TradeTag } from "@/types"

// ── Psychology types ────────────────────────────────────────────────────────

type EmotionBefore = "calm" | "anxious" | "excited" | "fearful" | "overconfident"

const EMOTION_OPTIONS: { value: EmotionBefore; label: string }[] = [
  { value: "calm",          label: "Tranquilo" },
  { value: "anxious",       label: "Ansioso" },
  { value: "excited",       label: "Eufórico" },
  { value: "fearful",       label: "Temeroso" },
  { value: "overconfident", label: "Sobreconfiado" },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface AccountLike {
  id: string
  name: string
  type: string
  initialBalance: number
  /** Equity = initial + realized P&L (from accounts.list). Sizing base. */
  currentBalance?: number
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
  status?: string
  aplusChecklist: string[]
  standardChecklist: string[]
}

/** A setup can be picked only when active/in-test. Paused/discarded are read-only. */
function isSelectableSetup(s: SetupLike): boolean {
  return s.status !== "PAUSADO" && s.status !== "DESCARTADO"
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

// ── Form defaults ────────────────────────────────────────────────────────────

const INITIAL: TradeFormValues = {
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
  planNotes: "",
  checklistItems: {},
  screenshots: [],
  // Psychology fields
  emotionBefore: null,
  confidenceRating: null,
  executionQuality: null,
  fomoFlag: false,
  revengeFlag: false,
}

/** Order in which to surface/scroll to the first validation error. */
const ERROR_FIELD_ORDER = ["accountId", "symbol", "date", "openTime", "entry", "stop", "target", "size"] as const

// ── Auto quality tag ───────────────────────────────────────────────────────

function computeAutoTag(form: TradeFormValues, setup: SetupLike | undefined): TradeTag | null {
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

export type RegisterTradeFormData = TradeFormValues

interface RegisterTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts?: AccountLike[]
  setups?: SetupLike[]
  markets?: MarketLike[]
  /** True while accounts/setups/markets are still being fetched. */
  loading?: boolean
  /** True while the create mutation is in flight (modal stays open until success). */
  submitting?: boolean
  customTags?: string[]
  tradeCountToday?: number
  onSubmit?: (data: RegisterTradeFormData) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function RegisterTradeModal({
  open,
  onOpenChange,
  accounts = [],
  setups = [],
  markets = [],
  loading = false,
  submitting = false,
  customTags = [],
  tradeCountToday = 0,
  onSubmit,
}: RegisterTradeModalProps) {
  const {
    register, handleSubmit, watch, setValue, getValues, reset,
    formState: { errors },
  } = useZodForm(tradeFormSchema, { defaultValues: INITIAL })

  const form = watch()
  // Purely-UI toggles that aren't part of the validated form payload.
  const [uploading, setUploading] = useState(false)
  const [psychOpen, setPsychOpen] = useState(false)
  const [sizeManual, setSizeManual] = useState(false)

  const update = <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) =>
    // RHF's setValue value type is a per-key conditional; the cast is safe since
    // K and value are tied together by the generic signature above.
    setValue(key, value as never, { shouldValidate: true, shouldDirty: true, shouldTouch: true })

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
    setValue("screenshots", [...getValues("screenshots"), ...urls])
    setUploading(false)
    e.target.value = ""
  }

  const removeScreenshot = (idx: number) =>
    setValue("screenshots", getValues("screenshots").filter((_, i) => i !== idx))

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        reset(INITIAL)
        setSizeManual(false)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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
  // Size off current equity (initial + realized P&L) — what the rest of the app
  // shows as "Balance actual"; falls back to initial if equity isn't provided.
  const balance    = selectedAccount?.currentBalance ?? selectedAccount?.initialBalance ?? 0

  // Cheap derived values — computed inline so the React Compiler can memoize
  // them (manual useMemo over `watch()` values trips its mutation analysis).
  const calcContracts: number | null = (() => {
    if (!balance || !pointValue) return null
    return computeContracts({
      balance,
      riskPct:  parseFloat(form.riskPct) || 0,
      entry:    parseFloat(form.entry)   || 0,
      stop:     parseFloat(form.stop)    || 0,
      pointValue,
    })
  })()

  const calcRR: number | null = (() => {
    const entry  = parseFloat(form.entry)
    const stop   = parseFloat(form.stop)
    const target = parseFloat(form.target)
    if (!entry || !stop || !target) return null
    const risk   = Math.abs(entry - stop)
    const reward = form.direction === "LONG" ? target - entry : entry - target
    if (risk === 0 || reward <= 0) return null
    return reward / risk
  })()

  // Auto-fill size when calculator has a valid result and user hasn't overridden
  useEffect(() => {
    if (calcContracts !== null && !sizeManual) {
      setValue("size", calcContracts.toFixed(2), { shouldValidate: true })
    }
  }, [calcContracts, sizeManual]) // eslint-disable-line react-hooks/exhaustive-deps

  // Futures/equities trade in whole units. If the risk %-derived size is below
  // one unit, a single contract/share already exceeds the intended risk — warn.
  const wholeUnitMarket = selectedMarket?.category === "FUTUROS" || selectedMarket?.category === "EQUITIES"
  const subOneUnit = calcContracts !== null && wholeUnitMarket && calcContracts > 0 && calcContracts < 1
  const riskPerUnit = pointValue && parseFloat(form.entry) && parseFloat(form.stop)
    ? Math.abs(parseFloat(form.entry) - parseFloat(form.stop)) * pointValue
    : null

  // ── Checklist helpers ──────────────────────────────────────────────────
  const selectSetup = (setupId: string) => {
    setValue("setupId", setupId)
    setValue("checklistItems", {})
  }

  const toggleItem = (item: string) =>
    setValue("checklistItems", { ...getValues("checklistItems"), [item]: !getValues("checklistItems")[item] })

  const toggleManualTag = (tag: TradeTag) => {
    const tags = getValues("tags")
    update("tags", tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])
  }

  const showWarning = tradeCountToday >= 2

  const onValid = (values: TradeFormValues) => {
    const finalTags: TradeTag[] = (autoTag ? [autoTag] : values.tags) as TradeTag[]
    onSubmit?.({ ...values, tags: finalTags })
    // NOTE: the modal no longer closes here. The parent closes it on mutation
    // success, so a server rejection keeps the modal open with input intact.
  }

  const onInvalid = () => {
    const first = ERROR_FIELD_ORDER.find(k => k in errors)
    if (first) {
      const el = document.querySelector(`[data-field="${first}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar trade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div className="flex flex-col gap-5">

          {/* ── Cuenta ── */}
          <div data-field="accountId">
            <p className="text-eyebrow mb-2">Cuenta <span className="text-[var(--loss)]">*</span></p>
            {accounts.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setValue("accountId", acc.id, { shouldValidate: true, shouldTouch: true })
                      setValue("symbol", "")
                      setSizeManual(false)
                    }}
                    className={cn(
                      "flex-1 min-w-[160px] text-left rounded-[var(--radius-sm)] p-3 border transition-[color,background-color,border-color,box-shadow,transform,opacity]",
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
                      ${(acc.currentBalance ?? acc.initialBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-3)]">{loading ? "Cargando cuentas…" : "No hay cuentas activas. Crea una en Cuentas primero."}</p>
            )}
            <FieldError message={errors.accountId?.message} />
          </div>

          {/* ── Dirección ── */}
          <div>
            <p className="text-eyebrow mb-2">Dirección</p>
            <div className="flex gap-2">
              {(["LONG", "SHORT"] as TradeDirection[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update("direction", d)}
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
          <div data-field="symbol">
            <p className="text-eyebrow mb-2">Símbolo <span className="text-[var(--loss)]">*</span></p>
            {markets.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">{loading ? "Cargando mercados…" : "No hay mercados. Agrégalos en la sección Mercados."}</p>
            ) : (
              <>
                <SymbolCombobox
                  markets={visibleMarkets}
                  value={form.symbol}
                  onChange={sym => { update("symbol", sym); setSizeManual(false) }}
                  placeholder="Buscar símbolo…"
                />
                {selectedMarket && (
                  <p className="text-[10px] text-[var(--ink-3)] mt-1">
                    {selectedMarket.name} · Valor/pto: {selectedMarket.pointValue}
                  </p>
                )}
              </>
            )}
            <FieldError message={errors.symbol?.message} />
          </div>

          {/* ── Fecha + Hora ── */}
          <div className="grid grid-cols-2 gap-3">
            <div data-field="date">
              <label className="text-eyebrow block mb-1.5">Fecha <span className="text-[var(--loss)]">*</span></label>
              <Input type="date" error={!!errors.date} {...register("date")} />
              <FieldError message={errors.date?.message} />
            </div>
            <div data-field="openTime">
              <label className="text-eyebrow block mb-1.5">Hora apertura <span className="text-[var(--loss)]">*</span></label>
              <Input type="time" error={!!errors.openTime} {...register("openTime")} />
              <FieldError message={errors.openTime?.message} />
            </div>
          </div>

          {/* ── Entry / Stop / Target ── */}
          <div className="grid grid-cols-3 gap-3">
            {(["entry", "stop", "target"] as const).map((key, i) => (
              <div key={key} data-field={key}>
                <label className="text-eyebrow block mb-1.5">
                  {["Entry", "Stop", "Target"][i]} <span className="text-[var(--loss)]">*</span>
                </label>
                <Input
                  placeholder={["21,450.00", "21,380.00", "21,590.00"][i]}
                  inputMode="decimal"
                  mono
                  error={!!errors[key]}
                  {...register(key, { onChange: () => setSizeManual(false) })}
                />
                <FieldError message={errors[key]?.message} />
              </div>
            ))}
          </div>

          {/* ── Calculadora de contratos ── */}
          <div data-field="size">
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">Tamaño (contratos) <span className="text-[var(--loss)]">*</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[var(--ink-3)] block mb-1">Riesgo %</label>
                <Input
                  placeholder="1"
                  inputMode="decimal"
                  mono
                  {...register("riskPct", { onChange: () => setSizeManual(false) })}
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
                  inputMode="decimal"
                  mono
                  error={!!errors.size}
                  {...register("size", { onChange: () => setSizeManual(true) })}
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

                {/* Whole-unit warning: <1 contract means 1 unit already over-risks */}
                {subOneUnit && riskPerUnit !== null && (
                  <p className="text-[10px] text-[var(--loss)] leading-snug">
                    ⚠ 1 {selectedMarket?.category === "EQUITIES" ? "acción" : "contrato"} arriesga ${riskPerUnit.toFixed(0)} ({(riskPerUnit / balance * 100).toFixed(1)}% del balance), por encima de tu {form.riskPct}%. Considera un micro (MNQ/MES) o un stop más ajustado.
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

            <FieldError message={errors.size?.message} />

            {/* Missing-fields hint — only when calc can't run */}
            {calcContracts === null && (() => {
              const missing: string[] = []
              if (!selectedAccount)            missing.push("cuenta")
              if (selectedAccount && balance <= 0) missing.push("balance de la cuenta (edítala)")
              if (!form.symbol)                missing.push("símbolo")
              if (!parseFloat(form.entry))     missing.push("entry")
              if (!parseFloat(form.stop))      missing.push("stop")
              if (!parseFloat(form.riskPct))   missing.push("riesgo %")
              if (form.symbol && !pointValue)  missing.push("valor/pto del símbolo")
              if (missing.length === 0) return null
              return (
                <p className="text-[10px] mt-1.5 flex items-center gap-1 text-[var(--ink-3)]">
                  <Calculator size={10} />
                  Calculadora: falta {missing.join(", ")}
                </p>
              )
            })()}
          </div>

          {/* ── Setup + Checklists ── */}
          <div>
            <p className="text-eyebrow mb-2">Setup <span className="text-[var(--loss)]">*</span></p>
            {setups.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {/* Deselect option */}
                  <button
                    type="button"
                    onClick={() => { setValue("setupId", ""); setValue("checklistItems", {}) }}
                    className={cn(
                      "text-left rounded-[var(--radius-sm)] p-3 border transition-[color,background-color,border-color,box-shadow,transform,opacity]",
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

                  {setups.map(setup => {
                    const selectable = isSelectableSetup(setup)
                    const paused = setup.status === "PAUSADO"
                    if (!selectable) {
                      return (
                        <div
                          key={setup.id}
                          aria-disabled="true"
                          title={paused ? "Setup pausado — no disponible para registrar" : "Setup descartado — no disponible"}
                          className="text-left rounded-[var(--radius-sm)] p-3 border border-[var(--line)] bg-[var(--panel-2)] opacity-50 cursor-not-allowed select-none"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--chip)", color: "var(--ink-3)" }}>
                              {setup.abbreviation}
                            </span>
                            <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full"
                              style={{ background: "var(--chip)", color: "var(--ink-3)" }}>
                              {paused ? "PAUSADO" : "DESCARTADO"}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[var(--ink-3)] leading-tight">{setup.name}</p>
                          <p className="text-[10px] text-[var(--ink-3)] mt-1">{setup.market}</p>
                        </div>
                      )
                    }
                    return (
                      <button
                        key={setup.id}
                        type="button"
                        onClick={() => selectSetup(setup.id)}
                        className={cn(
                          "text-left rounded-[var(--radius-sm)] p-3 border transition-[color,background-color,border-color,box-shadow,transform,opacity]",
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
                    )
                  })}
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
              <p className="text-xs text-[var(--ink-3)]">{loading ? "Cargando setups…" : "No hay setups activos. Crea uno en Playbook primero."}</p>
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
                    {customTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleManualTag(tag as TradeTag)}
                        className={cn(
                          "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                          (form.tags as string[]).includes(tag)
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {tag}
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
              onChange={v => update("session", v as TradeSession)}
            />
          </div>

          {/* ── Advertencias ── */}
          {showWarning && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--be-soft)] border border-[var(--be)]">
              <AlertTriangle size={14} className="text-[var(--be)] shrink-0" />
              <p className="text-xs text-[var(--be)] font-medium">
                Posible Do-Not-Take: {tradeCountToday + 1}er trade del día
              </p>
            </div>
          )}

          {/* ── Plan pre-operación (TASK-074) ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Plan pre-operación</label>
            <Textarea
              placeholder="¿Por qué vas a tomar este trade? Nivel clave, catalizador, invalidación…"
              rows={2}
              maxLength={500}
              {...register("planNotes")}
            />
            {form.planNotes.length > 400 && (
              <p className="text-[10px] text-[var(--ink-3)] mt-1">{form.planNotes.length}/500</p>
            )}
          </div>

          {/* ── Notas ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Notas</label>
            <Textarea
              placeholder="Entrada en zona de liquidez…"
              {...register("notes")}
            />
          </div>

          {/* ── Psicología (collapsible) ── */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--panel-2)] transition-colors"
              onClick={() => setPsychOpen(!psychOpen)}
            >
              <Brain size={12} className="text-[var(--ink-3)]" />
              <span className="text-eyebrow flex-1">Psicología</span>
              <span className="text-[10px] text-[var(--ink-3)] mr-1">Opcional</span>
              {psychOpen ? <ChevronUp size={12} className="text-[var(--ink-3)]" /> : <ChevronDown size={12} className="text-[var(--ink-3)]" />}
            </button>

            {psychOpen && (
              <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--panel-2)]">
                {/* Emoción antes del trade */}
                <div>
                  <label className="text-[10px] text-[var(--ink-3)] font-medium block mb-1.5">Estado emocional</label>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => update("emotionBefore", null)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                        !form.emotionBefore
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                      )}
                    >
                      —
                    </button>
                    {EMOTION_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("emotionBefore", value)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                          form.emotionBefore === value
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confianza + Calidad de ejecución */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--ink-3)] font-medium block mb-1.5">Confianza (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => update("confidenceRating", form.confidenceRating === n ? null : n)}
                          className={cn(
                            "w-8 h-8 rounded-[var(--radius-sm)] text-xs font-bold transition-colors",
                            form.confidenceRating === n
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--ink-3)] font-medium block mb-1.5">Calidad de ejecución (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => update("executionQuality", form.executionQuality === n ? null : n)}
                          className={cn(
                            "w-8 h-8 rounded-[var(--radius-sm)] text-xs font-bold transition-colors",
                            form.executionQuality === n
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FOMO + Revanche flags */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.fomoFlag}
                      onChange={e => update("fomoFlag", e.target.checked)}
                      className="accent-[var(--accent)] w-3.5 h-3.5"
                    />
                    <span className="text-xs text-[var(--ink-2)]">¿FOMO?</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.revengeFlag}
                      onChange={e => update("revengeFlag", e.target.checked)}
                      className="accent-[var(--accent)] w-3.5 h-3.5"
                    />
                    <span className="text-xs text-[var(--ink-2)]">¿Revanche?</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Screenshots ── */}
          <div>
            <label className="text-eyebrow block mb-1.5">Screenshots</label>

            {form.screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.screenshots.map((url, idx) => (
                  <div key={url} className="relative group w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`screenshot ${idx + 1}`} width={80} height={80} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar trade"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
