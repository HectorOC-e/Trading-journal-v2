// RegisterTradeModal organism — spec: Trades > Modal "Registrar trade"
// Fields derived from design-spec/trades.html modal anatomy

"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"
import type { TradeDirection, TradeSession, TradeTag } from "@/types"

const SESSION_OPTIONS: { value: TradeSession; label: string }[] = [
  { value: "London",       label: "London" },
  { value: "New York",     label: "New York" },
  { value: "Asia",         label: "Asia" },
  { value: "London Close", label: "London Close" },
]

const TAG_OPTIONS: { value: TradeTag; label: string }[] = [
  { value: "A+",        label: "A+" },
  { value: "A",         label: "A" },
  { value: "B",         label: "B" },
  { value: "Plan",      label: "Plan" },
  { value: "Off-plan",  label: "Off-plan" },
  { value: "Impulsivo", label: "Impulsivo" },
  { value: "BE",        label: "BE" },
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
}

interface RegisterTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tradeCountToday?: number
  onSubmit?: (data: FormState) => void
}

export function RegisterTradeModal({
  open, onOpenChange, tradeCountToday = 0, onSubmit,
}: RegisterTradeModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL)

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const toggleTag = (tag: TradeTag) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }))

  const showWarning = tradeCountToday >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Registrar trade</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">

          {/* Dirección */}
          <div>
            <p className="text-eyebrow mb-2">Dirección</p>
            <div className="flex gap-2">
              {(["LONG", "SHORT"] as TradeDirection[]).map((d) => (
                <button
                  key={d}
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

          {/* Símbolo + Cuenta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-eyebrow block mb-1.5">Símbolo *</label>
              <Input placeholder="NQ" value={form.symbol} onChange={(e) => set("symbol")(e.target.value)} mono />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Cuenta *</label>
              <Input placeholder="FXify 100K" value={form.accountId} onChange={(e) => set("accountId")(e.target.value)} />
            </div>
          </div>

          {/* Setup */}
          <div>
            <label className="text-eyebrow block mb-1.5">Setup *</label>
            <Input placeholder="MMXM — Breaker Block" value={form.setupId} onChange={(e) => set("setupId")(e.target.value)} />
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

          {/* Tamaño */}
          <div>
            <label className="text-eyebrow block mb-1.5">Tamaño (contratos) *</label>
            <Input
              placeholder="2"
              value={form.size}
              onChange={(e) => set("size")(e.target.value)}
              mono
              className="max-w-[120px]"
            />
          </div>

          {/* Fecha + Hora */}
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

          {/* Sesión */}
          <div>
            <p className="text-eyebrow mb-2">Sesión</p>
            <FilterBar
              options={SESSION_OPTIONS}
              value={form.session}
              onChange={(v) => setForm((f) => ({ ...f, session: v as TradeSession }))}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-eyebrow mb-2">Tags / Estado</p>
            <div className="flex gap-1 flex-wrap">
              {TAG_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleTag(value)}
                  className={cn(
                    "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                    form.tags.includes(value)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Do-not-take warning */}
          {showWarning && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--be-soft)] border-l-4 border-[var(--be)]">
              <AlertTriangle size={14} className="text-[var(--be)] shrink-0" />
              <p className="text-xs text-[var(--be)] font-medium">
                Posible Do-Not-Take: {tradeCountToday + 1}er trade del día
              </p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-eyebrow block mb-1.5">Notas</label>
            <Textarea
              placeholder="Entrada en zona de liquidez..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Screenshots upload */}
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
          <Button
            variant="primary"
            onClick={() => { onSubmit?.(form); onOpenChange(false) }}
          >
            Registrar trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
