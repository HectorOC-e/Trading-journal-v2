"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Plus, X, Loader2, DollarSign, Clock, CheckCircle2,
  XCircle, ArrowDownToLine, ChevronDown, Trash2, Check,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, DataTableToolbar, DataTablePagination, FacetedFilter, useDataTable, multiSelectFilter } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { useZodForm } from "@/lib/forms/use-zod-form"
import { z } from "zod"
import { parseWithdrawalAmount, isCalendarDate, formatWithdrawalDate } from "@/lib/withdrawal-input"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type WithdrawalItem = RouterOutputs["withdrawals"]["list"][number]
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

/* ── Types ── */
type WithdrawalStatus = "SOLICITADO" | "EN_PROCESO" | "PAGADO" | "RECHAZADO"

const STATUS_META: Record<WithdrawalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SOLICITADO: { label: "Solicitado", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: <Clock size={11} /> },
  EN_PROCESO: { label: "En proceso", color: "#4f6ef7", bg: "rgba(79,110,247,0.1)",  icon: <ArrowDownToLine size={11} /> },
  PAGADO:     { label: "Pagado",     color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: <CheckCircle2 size={11} /> },
  RECHAZADO:  { label: "Rechazado",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: <XCircle size={11} /> },
}

const STATUS_ORDER: WithdrawalStatus[] = ["SOLICITADO", "EN_PROCESO", "PAGADO", "RECHAZADO"]

/** Format an amount in its own currency — never mix currencies into one figure. */
function fmtMoney(amount: number, currency: string): string {
  try {
    return amount.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 2 })
  } catch {
    // Unknown currency code → fall back to plain number + code suffix
    return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

/* ── KPI box ── */
function KpiBox({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "14px 18px",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-3)", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono','Cascadia Code',monospace", fontVariantNumeric: "tabular-nums", color: color ?? "var(--ink)", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{sub}</p>
    </div>
  )
}

/* ── Status dropdown ── */
function StatusSelect({ current, onSelect, loading }: {
  current: WithdrawalStatus
  onSelect: (s: WithdrawalStatus) => void
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [open])
  const m = STATUS_META[current]
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cambiar estado — actual: ${m.label}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 999,
          background: m.bg, color: m.color,
          border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 600,
        }}
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : m.icon}
        {m.label}
        <ChevronDown size={10} aria-hidden />
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: 10, padding: 4, minWidth: 150,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}>
          {STATUS_ORDER.map(s => {
            const sm = STATUS_META[s]
            return (
              <button key={s} role="menuitem" disabled={loading} onClick={() => { if (loading) return; onSelect(s); setOpen(false) }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "7px 10px", borderRadius: 7,
                  background: s === current ? "var(--panel-2)" : "transparent",
                  border: "none", cursor: "pointer",
                  color: sm.color, fontSize: 12, fontWeight: 600,
                }}>
                {sm.icon} {sm.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Retiros DataTable ── */
function RetirosTable({ withdrawals, isLoading, statusPending, deletePending, onStatusChange, onDelete }: {
  withdrawals: WithdrawalItem[]
  isLoading: boolean
  updatingId: string | null
  deletingId: string | null
  statusPending: boolean
  deletePending: boolean
  onStatusChange: (id: string, status: WithdrawalStatus) => void
  onDelete: (id: string) => void
}) {
  const columns = useMemo<ColumnDef<WithdrawalItem>[]>(() => [
    {
      id: "date",
      accessorFn: (w) => new Date(w.date).getTime(),
      meta: { width: "minmax(110px, 1.2fr)", headerLabel: "Fecha" },
      header: () => <span>Fecha</span>,
      cell: ({ row }) => <span className="text-[13px] font-semibold text-[var(--ink)]">{formatWithdrawalDate(row.original.date)}</span>,
    },
    {
      id: "account",
      accessorFn: (w) => w.account.name,
      filterFn: multiSelectFilter,
      meta: { width: "minmax(110px, 1.3fr)", headerLabel: "Cuenta", facet: { label: "Cuenta" }, hideBelow: "md" },
      header: () => <span>Cuenta</span>,
      cell: ({ getValue }) => <span className="text-[12px] text-[var(--ink-2)] truncate">{String(getValue())}</span>,
    },
    {
      id: "amount",
      accessorFn: (w) => Number(w.amount),
      meta: { width: "minmax(110px, 1.1fr)", headerLabel: "Monto", align: "right" },
      header: () => <span>Monto</span>,
      cell: ({ row }) => (
        <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: "var(--win)" }}>+{fmtMoney(Number(row.original.amount), row.original.currency)}</span>
      ),
    },
    {
      id: "currency",
      accessorKey: "currency",
      filterFn: multiSelectFilter,
      meta: { width: "minmax(70px, 0.7fr)", headerLabel: "Divisa", facet: { label: "Divisa" }, hideBelow: "sm" },
      header: () => <span>Divisa</span>,
      cell: ({ getValue }) => <span className="text-[11px] font-semibold text-[var(--ink-3)]">{String(getValue())}</span>,
    },
    {
      id: "note",
      accessorFn: (w) => `${w.note ?? ""} ${w.reference ?? ""}`.trim(),
      enableSorting: false,
      meta: { width: "minmax(100px, 1.6fr)", headerLabel: "Nota / Ref.", hideBelow: "lg" },
      header: () => <span>Nota / Ref.</span>,
      cell: ({ row }) => (
        <div className="min-w-0">
          {row.original.note && <p className="text-[12px] text-[var(--ink-2)] truncate">{row.original.note}</p>}
          {row.original.reference && <p className="font-mono text-[10px] text-[var(--ink-3)] truncate">{row.original.reference}</p>}
          {!row.original.note && !row.original.reference && <span className="text-[var(--ink-3)] text-[11px]">—</span>}
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (w) => w.status,
      filterFn: multiSelectFilter,
      meta: { width: "minmax(130px, 1fr)", headerLabel: "Estado", facet: { label: "Estado" } },
      header: () => <span>Estado</span>,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect current={row.original.status as WithdrawalStatus} onSelect={(s) => onStatusChange(row.original.id, s)} loading={statusPending || deletePending} />
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      meta: { width: "60px", align: "right" },
      header: () => null,
      cell: ({ row }) => (
        <DeleteCell w={row.original} onDelete={onDelete} deleting={statusPending || deletePending} />
      ),
    },
  ], [statusPending, deletePending, onStatusChange, onDelete])

  const { table, density, setDensity } = useDataTable<WithdrawalItem>({
    data: withdrawals,
    columns,
    storageKey: "tj-retiros-table",
    pageSize: 25,
    getRowId: (w) => w.id,
    initialSorting: [{ id: "date", desc: true }],
  })

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar table={table} density={density} onDensityChange={setDensity} searchPlaceholder="Buscar cuenta / nota…" exportFilename="retiros.csv">
        <FacetedFilter column={table.getColumn("status")} title="Estado" format={(v) => STATUS_META[v as WithdrawalStatus]?.label ?? v} order={STATUS_ORDER} />
        <FacetedFilter column={table.getColumn("account")} title="Cuenta" />
        <FacetedFilter column={table.getColumn("currency")} title="Divisa" />
      </DataTableToolbar>
      <DataTable
        table={table}
        density={density}
        isLoading={isLoading}
        empty={
          <div className="flex flex-col items-center gap-1.5 text-center">
            <ArrowDownToLine size={26} className="text-[var(--ink-3)] mb-1" />
            <p className="text-[13px] font-medium text-[var(--ink-2)]">Sin retiros</p>
            <p className="text-[12px] text-[var(--ink-3)]">Registra tu primer retiro con el botón de arriba.</p>
          </div>
        }
      />
      <DataTablePagination table={table} />
    </div>
  )
}

/* Two-step inline delete confirm. */
function DeleteCell({ w, onDelete, deleting }: { w: WithdrawalItem; onDelete: (id: string) => void; deleting: boolean }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {confirming ? (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => { onDelete(w.id); setConfirming(false) }} disabled={deleting} aria-label="Confirmar eliminación" className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--loss)] bg-[var(--loss-soft)] hover:opacity-80 transition active:scale-90">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button onClick={() => setConfirming(false)} aria-label="Cancelar" className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-3)] bg-[var(--chip)] hover:bg-[var(--line)] transition active:scale-90">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button disabled={deleting} onClick={() => setConfirming(true)} aria-label={`Eliminar retiro de ${fmtMoney(Number(w.amount), w.currency)}`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--ink-3)] hover:text-[var(--loss)] hover:bg-[var(--loss-soft)] transition active:scale-90">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

/* ── New withdrawal modal ── */
const withdrawalSchema = z.object({
  accountId: z.string().min(1, "Selecciona una cuenta"),
  amount: z
    .string()
    .min(1, "Requerido")
    .refine((v) => {
      return parseWithdrawalAmount(v) !== null
    }, "Usa un monto positivo con máximo 2 decimales, sin separadores de miles"),
  currency: z.string(),
  date: z.string().refine(isCalendarDate, "Indica una fecha válida"),
  note: z.string(),
  reference: z.string(),
})
type WForm = z.infer<typeof withdrawalSchema>
const FORM_INIT: WForm = { accountId: "", amount: "", currency: "USD", date: new Date().toISOString().slice(0, 10), note: "", reference: "" }

function NuevoRetiroModal({ open, onOpenChange, accounts }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accounts: { id: string; name: string; currency: string; availableBalance: number; reservedWithdrawals: number; paidWithdrawals: number }[]
}) {
  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useZodForm(withdrawalSchema, { defaultValues: FORM_INIT })
  const form = watch()
  const requestId = useRef<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<Parameters<ReturnType<typeof trpc.withdrawals.create.useMutation>["mutate"]>[0] | null>(null)
  const utils = trpc.useUtils()

  const create = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      utils.withdrawals.list.invalidate()
      utils.accounts.list.invalidate()
      utils.trades.dashboardStats.invalidate()
      utils.accountLogs.list.invalidate()
      requestId.current = null
      setPendingPayload(null)
      onOpenChange(false)
      reset(FORM_INIT)
    },
    onError: (err) => {
      if (err.data?.code && !["INTERNAL_SERVER_ERROR", "TIMEOUT"].includes(err.data.code)) {
        requestId.current = null
        setPendingPayload(null)
      }
      toast.error(formatErrorForUser(err))
    },
  })

  const set = <K extends keyof WForm>(k: K, v: WForm[K]) =>
    setValue(k, v as never, { shouldValidate: true, shouldDirty: true, shouldTouch: true })

  const onValid = (f: WForm) => {
    if (create.isPending) return
    requestId.current ??= crypto.randomUUID()
    const payload = pendingPayload ?? {
      requestId: requestId.current,
      accountId: f.accountId,
      amount:    parseWithdrawalAmount(f.amount)!,
      currency:  f.currency,
      date:      f.date,
      note:      f.note,
      reference: f.reference,
    }
    setPendingPayload(payload)
    create.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (create.isPending) return; onOpenChange(v); if (!v && !pendingPayload) reset(FORM_INIT) }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <DialogTitle className="text-[var(--ink)]">Nuevo retiro</DialogTitle>
              <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Registra un retiro de cualquiera de tus cuentas</p>
            </div>
          </div>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>
          {/* Cuenta */}
          <div>
            <label className="text-eyebrow block mb-2">Cuenta *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {accounts.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>No tienes cuentas. Crea una primero.</p>
              ) : accounts.map(a => (
                <button key={a.id} type="button" disabled={create.isPending || !!pendingPayload} onClick={() => { set("accountId", a.id); set("currency", a.currency) }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8,
                    border: `1px solid ${form.accountId === a.id ? "var(--accent)" : "var(--line)"}`,
                    background: form.accountId === a.id ? "var(--accent-soft)" : "var(--panel-2)",
                    cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.currency} · Disponible {fmtMoney(a.availableBalance, a.currency)}</span>
                </button>
              ))}
            </div>
            <FieldError message={errors.accountId?.message} />
          </div>

          {/* Amount + currency */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label htmlFor="withdrawal-amount" className="text-eyebrow block mb-2">Monto <span className="text-[var(--loss)]">*</span></label>
              <Input id="withdrawal-amount" placeholder="5000,50" disabled={create.isPending || !!pendingPayload} inputMode="decimal" mono error={!!errors.amount} {...register("amount")} />
            </div>
            <span className="text-sm font-semibold">{form.currency}</span>
          </div>
          <FieldError message={errors.amount?.message} />

          {/* Fecha */}
          <div>
            <label className="text-eyebrow block mb-2">Fecha del retiro <span className="text-[var(--loss)]">*</span></label>
            <Input disabled={create.isPending || !!pendingPayload} type="date" error={!!errors.date} {...register("date")} />
            <FieldError message={errors.date?.message} />
          </div>

          {/* Nota */}
          <div>
            <label className="text-eyebrow block mb-2">Nota</label>
            <Input disabled={create.isPending || !!pendingPayload} placeholder="Ej. Retiro mensual Phase 2" {...register("note")} />
          </div>

          {/* Referencia */}
          <div>
            <label className="text-eyebrow block mb-2">Referencia / comprobante</label>
            <Input disabled={create.isPending || !!pendingPayload} placeholder="Ej. TXN-12345" mono {...register("reference")} />
          </div>

          {create.error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
              {formatErrorForUser(create.error)}{pendingPayload ? " Reintenta la misma solicitud para confirmar el resultado sin duplicarla." : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" disabled={create.isPending} onClick={() => onOpenChange(false)}>{pendingPayload ? "Cerrar y conservar solicitud" : "Cancelar"}</Button>
          <Button variant="primary" onClick={() => void handleSubmit(onValid)()} disabled={create.isPending}>
            {create.isPending ? <><Loader2 size={13} className="animate-spin" /> Registrando…</> : pendingPayload ? "Reintentar solicitud" : "Registrar retiro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════
   PAGE
══════════════════════════════════════ */
export default function RetirosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const withdrawalQuery = trpc.withdrawals.list.useQuery({})
  const { data: withdrawals = [], isLoading } = withdrawalQuery
  const accountsQuery = trpc.accounts.list.useQuery()
  const { data: accounts = [] } = accountsQuery
  const utils = trpc.useUtils()

  const updateStatus = trpc.withdrawals.updateStatus.useMutation({
    onSuccess: () => { utils.withdrawals.list.invalidate(); utils.accounts.list.invalidate(); utils.trades.dashboardStats.invalidate(); utils.accountLogs.list.invalidate(); setUpdatingId(null) },
    onError:   (err) => { setUpdatingId(null); toast.error(formatErrorForUser(err)) },
  })

  const deleteWithdrawal = trpc.withdrawals.delete.useMutation({
    onSuccess: () => { utils.withdrawals.list.invalidate(); utils.accounts.list.invalidate(); utils.trades.dashboardStats.invalidate(); utils.accountLogs.list.invalidate(); setDeletingId(null); toast.success("Retiro eliminado") },
    onError:   (err) => { setDeletingId(null); toast.error(formatErrorForUser(err)) },
  })

  // KPIs — agrupados por moneda (no se mezclan divisas sin tasa de cambio)
  const byCurrency = (() => {
    const map = new Map<string, { pagado: number; pendiente: number }>()
    for (const w of withdrawals) {
      const cur = w.currency || "USD"
      const e = map.get(cur) ?? { pagado: 0, pendiente: 0 }
      const amt = Number(w.amount)
      if (w.status === "PAGADO") e.pagado += amt
      else if (w.status === "SOLICITADO" || w.status === "EN_PROCESO") e.pendiente += amt
      map.set(cur, e)
    }
    return [...map.entries()].map(([currency, v]) => ({ currency, ...v }))
  })()
  const totalCount = withdrawals.length

  // Group by account for summary
  const byAccount = accounts.map(a => {
    const aw = withdrawals.filter(w => w.accountId === a.id && w.status === "PAGADO")
    return { ...a, totalPagado: a.paidWithdrawals, approximate: aw.some(w => w.currency !== a.currency), count: aw.length }
  })

  return (
    <>
      <TopBar
        title="Retiros"
        subtitle={`${totalCount} registros`}
        actions={[{ label: "Nuevo retiro", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
      />

      {/* KPIs — una tarjeta por moneda: Pagado es el héroe, Pendiente va como sub-dato */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {byCurrency.map(c => (
          <KpiBox
            key={c.currency}
            label={`Pagado · ${c.currency}`}
            value={fmtMoney(c.pagado, c.currency)}
            sub={`${fmtMoney(c.pendiente, c.currency)} pendiente`}
            color="var(--win)"
          />
        ))}
        <KpiBox label="Total retiros" value={String(totalCount)} sub="histórico completo" />
      </div>

      {/* By-account summary */}
      {byAccount.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-3)", marginBottom: 10 }}>
            Por cuenta
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {byAccount.map(a => (
              <div key={a.id} style={{
                background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.count} retiros{a.approximate ? " · conversión aproximada" : ""}</p>
                  <p className="text-xs">Disponible: {fmtMoney(a.availableBalance, a.currency)} · Reservado: {fmtMoney(a.reservedWithdrawals, a.currency)}</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono','Cascadia Code',monospace", fontVariantNumeric: "tabular-nums", color: "var(--win)", marginLeft: 8 }}>
                  {a.approximate ? "≈ " : ""}{fmtMoney(a.totalPagado, a.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(withdrawalQuery.error || accountsQuery.error) && <div role="alert">{formatErrorForUser((withdrawalQuery.error || accountsQuery.error)!)} <Button variant="ghost" onClick={() => { void withdrawalQuery.refetch(); void accountsQuery.refetch() }}>Reintentar</Button></div>}
      {updateStatus.error && <div role="alert">{formatErrorForUser(updateStatus.error)} <Button variant="ghost" disabled={updateStatus.isPending || deleteWithdrawal.isPending} onClick={() => { if (updateStatus.variables) updateStatus.mutate(updateStatus.variables) }}>Reintentar cambio</Button></div>}
      {deleteWithdrawal.error && <div role="alert">{formatErrorForUser(deleteWithdrawal.error)} <Button variant="ghost" disabled={updateStatus.isPending || deleteWithdrawal.isPending} onClick={() => { if (deleteWithdrawal.variables) deleteWithdrawal.mutate(deleteWithdrawal.variables) }}>Reintentar eliminación</Button></div>}
      {/* Table — sortable columns, faceted filters, search */}
      <RetirosTable
        withdrawals={withdrawals}
        isLoading={isLoading}
        updatingId={updatingId}
        deletingId={deletingId}
        statusPending={updateStatus.isPending}
        deletePending={deleteWithdrawal.isPending}
        onStatusChange={(id, status) => { if (updateStatus.isPending || deleteWithdrawal.isPending || !window.confirm(`¿Cambiar el retiro a ${STATUS_META[status].label}?`)) return; setUpdatingId(id); updateStatus.mutate({ id, status }) }}
        onDelete={(id) => { if (updateStatus.isPending || deleteWithdrawal.isPending) return; setDeletingId(id); deleteWithdrawal.mutate(id) }}
      />

      <NuevoRetiroModal open={modalOpen} onOpenChange={setModalOpen} accounts={accounts} />
    </>
  )
}
