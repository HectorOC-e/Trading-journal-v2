"use client"

import { useState, useEffect, useRef } from "react"
import {
  Plus, X, Loader2, DollarSign, Clock, CheckCircle2,
  XCircle, ArrowDownToLine, Filter, ChevronDown, Trash2, Check,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedList } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
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

/* ── StatusBadge ── */
function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const m = STATUS_META[status]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 999,
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 600,
    }}>
      {m.icon} {m.label}
    </span>
  )
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
              <button key={s} role="menuitem" onClick={() => { onSelect(s); setOpen(false) }}
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

/* ── Withdrawal row ── */
function WithdrawalRow({ w, onStatusChange, onDelete, updating = false, deleting = false }: {
  w: WithdrawalItem
  onStatusChange: (id: string, status: WithdrawalStatus, reference?: string) => void
  onDelete: (id: string) => void
  updating?: boolean
  deleting?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const date    = new Date(w.date)
  const dateStr = date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--line)] last:border-0 flex-wrap sm:flex-nowrap">
      {/* Date + account */}
      <div className="shrink-0 min-w-[110px]">
        <p className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{dateStr}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>{w.account.name}</p>
      </div>

      {/* Amount */}
      <div className="flex-1 min-w-[90px]">
        <p className="font-mono text-[16px] font-bold tabular-nums" style={{ color: "var(--win)" }}>
          +{fmtMoney(Number(w.amount), w.currency)}
        </p>
        <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--ink-3)" }}>{w.currency}</p>
      </div>

      {/* Note / reference */}
      <div className="flex-1 min-w-[80px] hidden sm:block">
        {w.note && <p className="text-[12px]" style={{ color: "var(--ink-2)" }}>{w.note}</p>}
        {w.reference && (
          <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>
            {w.reference}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusSelect
          current={w.status as WithdrawalStatus}
          onSelect={(s) => onStatusChange(w.id, s)}
          loading={updating}
        />
      </div>

      {/* Delete (two-step inline confirm) */}
      <div className="shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(w.id); setConfirming(false) }}
              disabled={deleting}
              aria-label="Confirmar eliminación del retiro"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "none", cursor: "pointer" }}
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => setConfirming(false)}
              aria-label="Cancelar eliminación"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md"
              style={{ background: "var(--chip)", color: "var(--ink-3)", border: "none", cursor: "pointer" }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Eliminar retiro de ${fmtMoney(Number(w.amount), w.currency)}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-[var(--chip)]"
            style={{ background: "transparent", color: "var(--ink-3)", border: "none", cursor: "pointer" }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── New withdrawal modal ── */
interface WForm { accountId: string; amount: string; currency: string; date: string; note: string; reference: string }
const FORM_INIT: WForm = { accountId: "", amount: "", currency: "USD", date: new Date().toISOString().slice(0, 10), note: "", reference: "" }

function NuevoRetiroModal({ open, onOpenChange, accounts }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accounts: { id: string; name: string; currency: string }[]
}) {
  const [form, setForm] = useState<WForm>(FORM_INIT)
  const utils = trpc.useUtils()

  const create = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      utils.withdrawals.list.invalidate()
      onOpenChange(false)
      setForm(FORM_INIT)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const set = <K extends keyof WForm>(k: K, v: WForm[K]) => setForm(f => ({ ...f, [k]: v }))

  function handleSubmit() {
    if (!form.accountId || !form.amount) return
    create.mutate({
      accountId: form.accountId,
      amount:    parseFloat(form.amount.replace(/,/g, "")),
      currency:  form.currency,
      date:      form.date,
      note:      form.note,
      reference: form.reference,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setForm(FORM_INIT) }}>
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
                <button key={a.id} onClick={() => { set("accountId", a.id); set("currency", a.currency) }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8,
                    border: `1px solid ${form.accountId === a.id ? "var(--accent)" : "var(--line)"}`,
                    background: form.accountId === a.id ? "var(--accent-soft)" : "var(--panel-2)",
                    cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.currency}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount + currency */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label className="text-eyebrow block mb-2">Monto *</label>
              <Input placeholder="5,000…" inputMode="decimal" value={form.amount} mono onChange={e => set("amount", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 4, paddingBottom: 2 }}>
              {["USD", "EUR", "MXN"].map(c => (
                <button key={c} onClick={() => set("currency", c)}
                  className={cn("px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                    form.currency === c ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-3)]"
                  )}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-eyebrow block mb-2">Fecha del retiro *</label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>

          {/* Nota */}
          <div>
            <label className="text-eyebrow block mb-2">Nota</label>
            <Input placeholder="Ej. Retiro mensual Phase 2" value={form.note} onChange={e => set("note", e.target.value)} />
          </div>

          {/* Referencia */}
          <div>
            <label className="text-eyebrow block mb-2">Referencia / comprobante</label>
            <Input placeholder="Ej. TXN-12345" value={form.reference} mono onChange={e => set("reference", e.target.value)} />
          </div>

          {create.error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
              {create.error.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={create.isPending || !form.accountId || !form.amount}>
            {create.isPending ? <><Loader2 size={13} className="animate-spin" /> Registrando…</> : "Registrar retiro"}
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
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterStatus, setFilterStatus]   = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: withdrawals = [], isLoading } = trpc.withdrawals.list.useQuery({})
  const { data: accounts = [] } = trpc.accounts.list.useQuery()
  const utils = trpc.useUtils()

  const updateStatus = trpc.withdrawals.updateStatus.useMutation({
    onSuccess: () => { utils.withdrawals.list.invalidate(); setUpdatingId(null) },
    onError:   (err) => { setUpdatingId(null); toast.error(formatErrorForUser(err)) },
  })

  const deleteWithdrawal = trpc.withdrawals.delete.useMutation({
    onSuccess: () => { utils.withdrawals.list.invalidate(); setDeletingId(null); toast.success("Retiro eliminado") },
    onError:   (err) => { setDeletingId(null); toast.error(formatErrorForUser(err)) },
  })

  // Filtered
  const filtered = withdrawals.filter(w => {
    if (filterAccount !== "all" && w.accountId !== filterAccount) return false
    if (filterStatus !== "all" && w.status !== filterStatus) return false
    return true
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
    return { ...a, totalPagado: aw.reduce((s, w) => s + Number(w.amount), 0), count: aw.length }
  }).filter(a => a.count > 0)

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
                  <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.count} retiros</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono','Cascadia Code',monospace", fontVariantNumeric: "tabular-nums", color: "var(--win)", marginLeft: 8 }}>
                  {fmtMoney(a.totalPagado, a.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Filter size={13} aria-hidden style={{ color: "var(--ink-3)" }} />

        {/* Account filter */}
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
          aria-label="Filtrar por cuenta"
          style={{
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12,
            color: "var(--ink)", cursor: "pointer",
          }}
        >
          <option value="all">Todas las cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          aria-label="Filtrar por estado"
          style={{
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12,
            color: "var(--ink)", cursor: "pointer",
          }}
        >
          <option value="all">Todos los estados</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>

        {(filterAccount !== "all" || filterStatus !== "all") && (
          <button onClick={() => { setFilterAccount("all"); setFilterStatus("all") }}
            style={{ fontSize: 11, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel-2)",
        }}>
          {["Fecha / Cuenta", "Monto", "Nota / Referencia", "Estado"].map(h => (
            <p key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", flex: h === "Nota / Referencia" ? 2 : 1, minWidth: h === "Estado" ? 120 : undefined }}>
              {h}
            </p>
          ))}
          {/* spacer for the per-row delete action */}
          <span aria-hidden style={{ width: 28, flexShrink: 0 }} />
        </div>

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 10, color: "var(--ink-3)" }}>
            <Loader2 size={16} className="animate-spin" /> Cargando retiros…
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <ArrowDownToLine size={28} style={{ color: "var(--ink-3)", margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 600, color: "var(--ink)" }}>Sin retiros registrados</p>
            <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Registra tu primer retiro con el botón de arriba.</p>
          </div>
        )}

        {!isLoading && (
          <AnimatedList
            items={filtered}
            getKey={(w) => w.id}
            preset="list"
            className="flex flex-col gap-2.5"
            renderItem={(w) => (
              <WithdrawalRow
                w={w}
                onStatusChange={(id, status) => { setUpdatingId(id); updateStatus.mutate({ id, status }) }}
                onDelete={(id) => { setDeletingId(id); deleteWithdrawal.mutate(id) }}
                updating={updatingId === w.id && updateStatus.isPending}
                deleting={deletingId === w.id && deleteWithdrawal.isPending}
              />
            )}
          />
        )}
      </div>

      <NuevoRetiroModal open={modalOpen} onOpenChange={setModalOpen} accounts={accounts.map(a => ({ id: a.id, name: a.name, currency: a.currency }))} />
    </>
  )
}
