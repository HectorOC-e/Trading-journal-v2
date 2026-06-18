"use client"

import { useState, useEffect } from "react"
import { Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MarketMultiSelect } from "@/components/ui/market-select"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { useZodForm } from "@/lib/forms/use-zod-form"
import { accountEditSchema, type AccountFormValues } from "@/domains/trading/schemas/account-form-schema"
import type { AccountType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"
import { TYPE_META, isPropFirmLike } from "../components/account-card"

type RawAccount = RouterOutputs["accounts"]["list"][number]

function accountToForm(account: RawAccount): AccountFormValues {
  return {
    tipo:         account.type as AccountType,
    nombre:       account.name,
    broker:       account.broker,
    balance:      String(Number(account.initialBalance)),
    currency:     account.currency,
    timezone:     account.timezone,
    ddDailyPct:   account.ddDailyPct   != null ? String(Number(account.ddDailyPct))   : "",
    ddWeeklyPct:  account.ddWeeklyPct  != null ? String(Number(account.ddWeeklyPct))  : "",
    ddMonthlyPct: account.ddMonthlyPct != null ? String(Number(account.ddMonthlyPct)) : "",
    ddTotalPct:   account.ddTotalPct   != null ? String(Number(account.ddTotalPct))   : "",
    targetPct:    account.targetPct    != null ? String(Number(account.targetPct))    : "",
    ddModel:      (account.ddModel as "FIXED" | "TRAILING") ?? "FIXED",
    phase:        (account.phase as AccountFormValues["phase"]) ?? "PHASE_1",
    maxTrades:    account.maxTradesPerDay != null ? String(account.maxTradesPerDay) : "",
    symbols:      account.allowedSymbols ?? [],
    minDays:      account.minTradingDays  != null ? String(account.minTradingDays)  : "",
    maxLeverage:    account.maxLeverage    != null ? String(account.maxLeverage)    : "",
    targetLeverage: account.targetLeverage != null ? String(account.targetLeverage) : "",
  }
}

export function EditarCuentaModal({ open, onOpenChange, account, markets = [] }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account: RawAccount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<"general" | "reglas">("general")

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useZodForm(accountEditSchema, { defaultValues: accountToForm(account) })
  const form = watch()

  // Re-seed when pointed at a different account.
  useEffect(() => { reset(accountToForm(account)) }, [account.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof AccountFormValues>(k: K, v: AccountFormValues[K]) =>
    setValue(k, v as never, { shouldValidate: true, shouldDirty: true, shouldTouch: true })

  const update = trpc.accounts.update.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); onOpenChange(false) },
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const onValid = (f: AccountFormValues) => {
    const pf = (v: string) => v ? parseFloat(v) : undefined
    const pi = (v: string) => v ? parseInt(v)   : undefined
    update.mutate({
      id:              account.id,
      name:            f.nombre.trim(),
      broker:          f.broker.trim(),
      type:            f.tipo,
      currency:        f.currency,
      timezone:        f.timezone,
      ddDailyPct:      pf(f.ddDailyPct),
      ddWeeklyPct:     pf(f.ddWeeklyPct),
      ddMonthlyPct:    pf(f.ddMonthlyPct),
      ddTotalPct:      pf(f.ddTotalPct),
      targetPct:       pf(f.targetPct),
      ddModel:         isPropFirmLike(f.tipo) ? f.ddModel  : undefined,
      phase:           isPropFirmLike(f.tipo) ? f.phase    : undefined,
      maxTradesPerDay: isPropFirmLike(f.tipo) ? pi(f.maxTrades) : undefined,
      minTradingDays:  isPropFirmLike(f.tipo) ? pi(f.minDays)   : undefined,
      allowedSymbols:  f.symbols,
      maxLeverage:     pi(f.maxLeverage),
      targetLeverage:  pi(f.targetLeverage),
    })
  }
  const onInvalid = () => setTab("general")

  const tm = TYPE_META[form.tipo]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: tm.bg }}>
              <Shield size={18} style={{ color: tm.color }} />
            </div>
            <div>
              <DialogTitle className="text-[var(--ink)]">Editar — {account.name}</DialogTitle>
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
              {t === "general" ? "General" : "Límites"}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-eyebrow block mb-1.5">Nombre <span className="text-[var(--loss)]">*</span></label>
              <Input error={!!errors.nombre} {...register("nombre")} />
              <FieldError message={errors.nombre?.message} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Broker <span className="text-[var(--loss)]">*</span></label>
              <Input error={!!errors.broker} {...register("broker")} />
              <FieldError message={errors.broker?.message} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Divisa</label>
                <div className="flex gap-1">
                  {["USD","EUR","MXN"].map(c => (
                    <button key={c} onClick={() => set("currency", c)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold",
                        form.currency === c ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-3)]"
                      )}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "reglas" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-eyebrow mb-2">Límites de pérdida (%)</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["ddDailyPct",   "Diario",   "5"],
                  ["ddWeeklyPct",  "Semanal",  "8"],
                  ["ddMonthlyPct", "Mensual",  "10"],
                  ["ddTotalPct",   "Total",    "10"],
                ] as const).map(([field, label, ph]) => (
                  <div key={field}>
                    <label className="text-eyebrow block mb-1.5">{label}</label>
                    <div className="flex items-center gap-2">
                      <Input placeholder={ph} mono {...register(field)} />
                      <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Objetivo de ganancia</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <Input placeholder="8" mono {...register("targetPct")} />
                <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
              </div>
            </div>

            <div>
              <p className="text-eyebrow mb-2">Apalancamiento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-eyebrow block mb-1.5">Máximo (1:X)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--ink-3)] shrink-0">1 :</span>
                    <Input placeholder="30" mono {...register("maxLeverage")} />
                  </div>
                </div>
                <div>
                  <label className="text-eyebrow block mb-1.5">Objetivo sano (efectivo)</label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="5" mono {...register("targetLeverage")} />
                    <span className="text-sm text-[var(--ink-3)] shrink-0">x</span>
                  </div>
                </div>
              </div>
            </div>
            {isPropFirmLike(form.tipo) && (
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-eyebrow mb-3">Extras Prop Firm</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(["FIXED","TRAILING"] as const).map(m => (
                    <button key={m} onClick={() => set("ddModel", m)}
                      className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] font-semibold border transition-[color,background-color,border-color,box-shadow,transform,opacity]",
                        form.ddModel === m ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]" : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                      )}>
                      {m === "FIXED" ? "Fijo" : "Trailing"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-eyebrow block mb-1.5">Max trades / día</label>
                    <Input placeholder="3" mono {...register("maxTrades")} />
                  </div>
                  <div>
                    <label className="text-eyebrow block mb-1.5">Min. días trading</label>
                    <Input placeholder="10" mono {...register("minDays")} />
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
          <Button variant="primary" onClick={handleSubmit(onValid, onInvalid)} disabled={update.isPending}>
            {update.isPending ? <><Loader2 size={13} className="animate-spin" /> Guardando…</> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
