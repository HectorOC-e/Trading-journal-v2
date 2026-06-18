"use client"

import { cn } from "@/lib/utils"
import { z } from "zod"
import { X, ArrowUpDown, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { FieldError } from "@/components/ui/field"
import { useZodForm } from "@/lib/forms/use-zod-form"

interface SyncBalanceModalProps {
  accountId:   string
  accountName: string
  onClose:     () => void
}

const syncSchema = z.object({
  balance: z
    .string()
    .min(1, "Ingresa el balance real")
    .refine((v) => !Number.isNaN(parseFloat(v)), "Número inválido"),
})
type SyncValues = z.infer<typeof syncSchema>

export function SyncBalanceModal({ accountId, accountName, onClose }: SyncBalanceModalProps) {
  const { register, handleSubmit, formState: { errors } } = useZodForm(syncSchema, {
    defaultValues: { balance: "" },
  })
  const utils = trpc.useUtils()

  const syncBalance = trpc.accounts.syncBalance.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      // Equity on the card includes the adjustment → refresh the variance query.
      utils.accounts.getBalanceVariance.invalidate(accountId)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const onValid = (v: SyncValues) =>
    syncBalance.mutate({ accountId, actualBalance: parseFloat(v.balance) })

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
                Ingresa el balance real de tu broker. Se ajustará tu balance actual para que cuadre, sin alterar el balance inicial ni el P&amp;L de tus trades.
              </p>
              <div>
                <label className="text-[10px] font-semibold text-[var(--ink-3)] block mb-1.5">
                  Balance real del broker ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  aria-invalid={!!errors.balance || undefined}
                  className={cn(
                    "w-full rounded-[var(--radius-sm)] border bg-[var(--panel)] px-3 py-2 text-base font-mono font-semibold text-[var(--ink)] focus:outline-none transition-colors",
                    errors.balance
                      ? "border-[var(--loss)] focus:border-[var(--loss)]"
                      : "border-[var(--line)] focus:border-[var(--accent)]",
                  )}
                  placeholder="0.00"
                  disabled={syncBalance.isPending}
                  {...register("balance")}
                />
                <FieldError message={errors.balance?.message} />
              </div>
              <button
                onClick={handleSubmit(onValid)}
                disabled={syncBalance.isPending}
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
                  <span className="text-xs text-[var(--ink-3)]">Balance actual (app)</span>
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
                  <span className="text-xs font-semibold text-[var(--ink-3)]">Ajuste aplicado</span>
                  <span className={`text-sm font-mono font-bold ${result.variance >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"}`}>
                    {result.variance >= 0 ? "+" : ""}${result.variance.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--ink-3)] text-center">Tu balance actual ahora coincide con el broker.</p>
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
