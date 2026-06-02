"use client"

import { useState } from "react"
import {
  Plus, X, Loader2, DollarSign, Clock, CheckCircle2,
  XCircle, ArrowDownToLine, Filter, ChevronDown,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: color ?? "var(--ink)", lineHeight: 1 }}>
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
  const m = STATUS_META[current]
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
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
        <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20,
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: 10, padding: 4, minWidth: 140,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}>
          {STATUS_ORDER.map(s => {
            const sm = STATUS_META[s]
            return (
              <button key={s} onClick={() => { onSelect(s); setOpen(false) }}
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
function WithdrawalRow({ w, onStatusChange, updating = false }: {
  w: WithdrawalItem
  onStatusChange: (id: string, status: WithdrawalStatus, reference?: string) => void
  updating?: boolean
}) {
  const date = new Date(w.date)
  const dateStr = date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })

  function handleStatus(s: WithdrawalStatus) {
    onStatusChange(w.id, s)
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px",
      borderBottom: "1px solid var(--line)",
      flexWrap: "wrap",
    }}>
      {/* Date + account */}
      <div style={{ minWidth: 120, flex: "0 0 auto" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{dateStr}</p>
        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{w.account.name}</p>
      </div>

      {/* Amount */}
      <div style={{ flex: 1, minWidth: 80 }}>
        <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "var(--win)" }}>
          +${Number(w.amount).toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)" }}>{w.currency}</span>
        </p>
      </div>

      {/* Note / reference */}
      <div style={{ flex: 2, minWidth: 100 }}>
        {w.note && <p style={{ fontSize: 12, color: "var(--ink-2)" }}>{w.note}</p>}
        {w.reference && (
          <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "monospace", marginTop: 2 }}>
            Ref: {w.reference}
          </p>
        )}
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusSelect
          current={w.status as WithdrawalStatus}
          onSelect={handleStatus}
          loading={updating}
        />
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
              <Input placeholder="5,000" value={form.amount} mono onChange={e => set("amount", e.target.value)} />
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

  const { data: withdrawals = [], isLoading } = trpc.withdrawals.list.useQuery({})
  const { data: accounts = [] } = trpc.accounts.list.useQuery()
  const utils = trpc.useUtils()

  const updateStatus = trpc.withdrawals.updateStatus.useMutation({
    onSuccess: () => { utils.withdrawals.list.invalidate(); setUpdatingId(null) },
    onError:   (err) => { setUpdatingId(null); toast.error(formatErrorForUser(err)) },
  })

  // Filtered
  const filtered = withdrawals.filter(w => {
    if (filterAccount !== "all" && w.accountId !== filterAccount) return false
    if (filterStatus !== "all" && w.status !== filterStatus) return false
    return true
  })

  // KPIs
  const totalPagado    = withdrawals.filter(w => w.status === "PAGADO").reduce((s, w) => s + Number(w.amount), 0)
  const totalPendiente = withdrawals.filter(w => w.status === "SOLICITADO" || w.status === "EN_PROCESO").reduce((s, w) => s + Number(w.amount), 0)
  const totalCount     = withdrawals.length

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

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiBox label="Total pagado"    value={`$${totalPagado.toLocaleString()}`}    sub="retiros confirmados"  color="var(--win)" />
        <KpiBox label="Pendiente"       value={`$${totalPendiente.toLocaleString()}`} sub="en proceso o solicitado" />
        <KpiBox label="Total retiros"   value={String(totalCount)}                    sub="histórico completo" />
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
                <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "var(--win)", marginLeft: 8 }}>
                  ${a.totalPagado.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Filter size={13} style={{ color: "var(--ink-3)" }} />

        {/* Account filter */}
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
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
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
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

        {!isLoading && filtered.map(w => (
          <WithdrawalRow
            key={w.id}
            w={w}
            onStatusChange={(id, status) => {
              setUpdatingId(id)
              updateStatus.mutate({ id, status })
            }}
            updating={updatingId === w.id && updateStatus.isPending}
          />
        ))}
      </div>

      <NuevoRetiroModal open={modalOpen} onOpenChange={setModalOpen} accounts={accounts.map(a => ({ id: a.id, name: a.name, currency: a.currency }))} />
    </>
  )
}
