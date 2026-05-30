"use client"

import { useState, useMemo } from "react"
import {
  Plus, X, TrendingUp,
  Shield, CheckCircle2, BarChart3,
  Pencil, Archive, Loader2, Trash2, XCircle,
  History, ArrowUpCircle,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { Account, AccountType } from "@/types"
import { RuleBar } from "@/components/ui/rule-bar"
import { MiniSparkline } from "@/components/ui/mini-sparkline"
import {
  AccountCard,
  TYPE_META,
  ACCOUNT_STATUS_META,
  isPropFirmLike,
} from "./components/account-card"
import type { RawAccount, TradeStats } from "./components/account-card"
import { NuevaCuentaModal } from "./modals/create-account-modal"
import { EditarCuentaModal } from "./modals/edit-account-modal"
import { AccountHistoryModal } from "./modals/account-history-modal"
import { PromotePhaseModal } from "./modals/promote-phase-modal"

/* ══════════════════════════════════════
   DETAIL PANEL (kept inline — owns delete / lost dialogs)
══════════════════════════════════════ */
function AccountDetailPanel({ account, rawAccount, onClose, onDelete, deleting, onEdit, onArchive, onLost, archiving, onOpenHistory, onPromotePhase, stats }: {
  account: Account
  rawAccount: RawAccount
  onClose: () => void
  onDelete?: () => void; deleting?: boolean
  onEdit?: () => void
  onArchive?: () => void; archiving?: boolean
  onLost?: (note: string) => void
  onOpenHistory?: () => void
  onPromotePhase?: () => void
  stats?: TradeStats
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput,   setDeleteInput]   = useState("")
  const [lostModal,     setLostModal]     = useState(false)
  const [lostNote,      setLostNote]      = useState("")

  const tm          = TYPE_META[account.type as AccountType]
  const acctStatus  = (rawAccount?.status as string) ?? "ACTIVE"
  const sm          = ACCOUNT_STATUS_META[acctStatus] ?? ACCOUNT_STATUS_META.ACTIVE
  const isPF        = isPropFirmLike(account.type as AccountType)
  const phase       = (rawAccount?.phase as string) ?? "NONE"
  const initialBalance = Number(rawAccount?.initialBalance ?? account.initialBalance)
  const flatLine    = Array(10).fill(initialBalance)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-[var(--line)] sticky top-0 bg-[var(--panel)] z-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[var(--ink)]">{account.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
            </div>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{account.broker} · {account.currency}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)] transition-colors">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-3 px-2 py-1.5 rounded-[var(--radius-sm)] w-fit"
          style={{ background: `${sm.color}18`, color: sm.color }}>
          {sm.icon}
          <span className="text-[10px] font-bold ml-0.5">{sm.label}</span>
          {isPF && phase !== "NONE" && (
            <span className="text-[10px] ml-1 opacity-70">
              · {phase === "PHASE_1" ? "Fase 1" : phase === "PHASE_2" ? "Fase 2" : "Funded"}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Equity curve */}
        <div>
          {(() => {
            const sparkData   = stats?.sparkline && stats.sparkline.length > 1 ? stats.sparkline : flatLine
            const sparkPos    = stats ? stats.netPnl >= 0 : true
            const currentEquity = initialBalance + (stats?.netPnl ?? 0)
            return (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-eyebrow">Equity + Balance</span>
                  <span className="text-[11px] font-mono font-semibold"
                    style={{ color: stats ? (stats.netPnl >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" }}>
                    {stats ? `${stats.netPnl >= 0 ? "+" : "-"}$${Math.abs(stats.netPnl).toFixed(2)}` : "— sin trades"}
                  </span>
                </div>
                <MiniSparkline data={sparkData} positive={sparkPos} />
                <div className="flex justify-between mt-1 text-[10px] text-[var(--ink-3)]">
                  <span>Balance inicial → actual</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    ${initialBalance.toLocaleString()} → ${currentEquity.toFixed(2)}
                  </span>
                </div>
              </>
            )
          })()}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const netPnl      = stats?.netPnl ?? 0
            const currentEq   = initialBalance + netPnl
            const pnlMesStr   = stats && stats.tradesMonth > 0 ? `${stats.pnlMonth >= 0 ? "+" : "-"}$${Math.abs(stats.pnlMonth).toFixed(2)}` : "— sin trades"
            const pnlMesColor = stats && stats.tradesMonth > 0 ? (stats.pnlMonth >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)"
            const wrStr   = stats?.winRate != null ? `${stats.winRate.toFixed(2)}%` : "—"
            const wrColor = stats?.winRate != null ? (stats.winRate >= 50 ? "var(--win)" : "var(--loss)") : "var(--ink-3)"
            const avgRStr   = stats?.avgR != null ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(4)}R` : "—"
            const avgRColor = stats?.avgR != null ? (stats.avgR >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)"
            const ddStr   = stats ? `${stats.drawdownPct.toFixed(2)}%` : "—"
            const ddColor = stats && stats.drawdownPct > 0 ? "var(--loss)" : "var(--ink-3)"
            return [
              { label: "Balance actual",  value: `$${currentEq.toFixed(2)}`, color: netPnl >= 0 ? "var(--win)" : "var(--loss)" },
              { label: "P&L mes",         value: pnlMesStr,   color: pnlMesColor },
              { label: "Win Rate",        value: wrStr,        color: wrColor },
              { label: "Avg R",           value: avgRStr,      color: avgRColor },
              { label: "Drawdown actual", value: ddStr,        color: ddColor },
              { label: "Total trades",    value: stats ? String(stats.tradesTotal) : "—", color: "var(--ink-3)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
                <p className="text-[14px] font-bold font-mono leading-none" style={{ color }}>{value}</p>
              </div>
            ))
          })()}
        </div>

        {/* Prop firm rules */}
        {isPF && rawAccount?.ddTotalPct != null && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">{account.type === "DEMO_PROP" ? "Reglas Demo PF" : "Reglas Prop Firm"}</p>
              <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(79,110,247,0.12)", color: "#4f6ef7" }}>
                {rawAccount?.ddModel ?? "FIXED"}
              </span>
            </div>
            <div className="flex flex-col gap-3 bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4 border border-[var(--line)]">
              <RuleBar label="Drawdown total" usedPct={stats ? Math.min(100, stats.drawdownPct / Number(rawAccount.ddTotalPct) * 100) : 0} limitLabel={`${Number(rawAccount.ddTotalPct)}% max`} />
              {rawAccount.ddDailyPct != null && (
                <RuleBar label="Pérdida diaria" usedPct={stats ? Math.min(100, Math.max(0, -stats.pnlToday) / (initialBalance * Number(rawAccount.ddDailyPct) / 100) * 100) : 0} limitLabel={`${Number(rawAccount.ddDailyPct)}% límite`} />
              )}
              {rawAccount.targetPct != null && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-[var(--ink-3)]">Objetivo ({Number(rawAccount.targetPct)}%)</span>
                    <span className="text-[11px] font-mono font-semibold text-[var(--ink-3)]">
                      {stats ? `${(stats.netPnl / initialBalance * 100).toFixed(2)}%` : "—"} / {Number(rawAccount.targetPct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${stats ? Math.min(100, Math.max(0, stats.netPnl / (initialBalance * Number(rawAccount.targetPct) / 100) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
                {([
                  rawAccount.ddTotalPct      != null ? ["Max DD",        `${Number(rawAccount.ddTotalPct)}%`]    : null,
                  rawAccount.ddDailyPct      != null ? ["Daily Loss",    `${Number(rawAccount.ddDailyPct)}%`]    : null,
                  rawAccount.maxTradesPerDay != null ? ["Max trades/día", String(rawAccount.maxTradesPerDay)]    : null,
                  rawAccount.targetPct       != null ? ["Objetivo",      `${Number(rawAccount.targetPct)}%`]     : null,
                  rawAccount.minTradingDays  != null ? ["Min días",       String(rawAccount.minTradingDays)]     : null,
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-[var(--ink-3)]">{k}</span>
                    <span className="font-mono font-semibold text-[var(--ink)]">{v}</span>
                  </div>
                ))}
              </div>
              {rawAccount.allowedSymbols?.length > 0 && (
                <div className="text-[11px] flex justify-between pt-1 border-t border-[var(--line)]">
                  <span className="text-[var(--ink-3)]">Símbolos</span>
                  <span className="font-mono text-[var(--ink)]">{rawAccount.allowedSymbols.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Limits for non-prop accounts */}
        {!isPF && (rawAccount?.ddDailyPct != null || rawAccount?.ddMonthlyPct != null || rawAccount?.ddTotalPct != null || rawAccount?.targetPct != null) && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">
                {account.type === "DEMO_PERSONAL" ? "Límites Demo" : account.type === "BACKTEST" ? "Límites Backtest" : "Límites personales"}
              </p>
            </div>
            <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 border border-[var(--line)] flex flex-col gap-2 text-[11px]">
              {[
                ["DD Diario",  rawAccount?.ddDailyPct   != null ? `${Number(rawAccount.ddDailyPct)}%`   : null],
                ["DD Semanal", rawAccount?.ddWeeklyPct  != null ? `${Number(rawAccount.ddWeeklyPct)}%`  : null],
                ["DD Mensual", rawAccount?.ddMonthlyPct != null ? `${Number(rawAccount.ddMonthlyPct)}%` : null],
                ["DD Total",   rawAccount?.ddTotalPct   != null ? `${Number(rawAccount.ddTotalPct)}%`   : null],
                ["Objetivo",   rawAccount?.targetPct    != null ? `${Number(rawAccount.targetPct)}%`    : null],
              ].filter(([, v]) => v != null).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-[var(--ink-3)]">{k}</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Config */}
        <div className="flex flex-col gap-2 text-[11px]">
          <p className="text-eyebrow">Configuración</p>
          <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 border border-[var(--line)] flex flex-col gap-2">
            {[
              ["Broker",          account.broker],
              ["Balance inicial", `$${account.initialBalance.toLocaleString()}`],
              ["Divisa",          account.currency],
              ["Timezone",        account.timezone],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[var(--ink-3)]">{k}</span>
                <span className="font-mono text-[var(--ink)]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button onClick={onEdit}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            <Pencil size={11} /> Editar
          </button>
          <button className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            <BarChart3 size={11} /> Ver trades
          </button>
          <button onClick={onOpenHistory}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            <History size={11} /> Historial
          </button>
        </div>

        {/* Phase promotion */}
        {isPF && phase !== "FUNDED" && phase !== "NONE" && (
          <button onClick={onPromotePhase}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-sm)] text-[12px] font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors">
            <ArrowUpCircle size={13} />
            {phase === "PHASE_1" ? "Promover a Fase 2" : "Promover a Funded"}
          </button>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={onArchive} disabled={archiving || acctStatus === "INACTIVE"}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-amber-500 transition-colors disabled:opacity-40">
            {archiving ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
            Archivar
          </button>
          <button onClick={() => setLostModal(true)} disabled={acctStatus === "LOST"}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-orange-500 transition-colors disabled:opacity-40">
            <XCircle size={11} /> Perdida
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--loss)] transition-colors">
            <Trash2 size={11} /> Eliminar
          </button>
        </div>

        {acctStatus === "LOST" && rawAccount?.statusNote && (
          <div className="text-[11px] p-3 rounded-[var(--radius-sm)] border border-red-900/30 bg-red-950/20 text-red-400">
            <span className="font-semibold">Nota: </span>{rawAccount.statusNote}
          </div>
        )}
      </div>

      {/* Hard delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full sm:max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--loss-soft)" }}>
                <Trash2 size={15} className="text-[var(--loss)]" />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--ink)]">Eliminar cuenta</p>
                <p className="text-[11px] text-[var(--ink-3)]">Acción irreversible</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[12.5px] text-[var(--ink-2)] leading-relaxed">
                Se eliminarán todos los trades, retiros y logs asociados. Escribe el nombre exacto para confirmar:
              </p>
              <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                <p className="font-mono text-[13px] font-bold text-[var(--ink)]">{account.name}</p>
              </div>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Escribe el nombre exacto…"
                className="h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--loss)] transition-colors"
              />
            </div>
            <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput("") }}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleteInput !== account.name || deleting}
                onClick={() => { onDelete?.(); setConfirmDelete(false) }}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: "var(--loss)" }}
              >
                {deleting ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as lost dialog */}
      {lostModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full sm:max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "rgba(234,88,12,0.12)" }}>
                <XCircle size={15} style={{ color: "#ea580c" }} />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--ink)]">Marcar como Perdida</p>
                <p className="text-[11px] text-[var(--ink-3)]">El estado se registrará en el historial</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[12.5px] text-[var(--ink-2)] leading-relaxed">
                La cuenta quedará en estado <strong className="text-[var(--ink)]">PERDIDA</strong> y se excluirá del dashboard. Agrega una nota del motivo:
              </p>
              <textarea
                value={lostNote}
                onChange={e => setLostNote(e.target.value)}
                placeholder="Ej: Se llegó al drawdown máximo en la fase 2…"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] text-[13px] p-3 resize-none h-24 focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-3)] transition-colors"
              />
            </div>
            <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex gap-2">
              <button
                onClick={() => { setLostModal(false); setLostNote("") }}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!lostNote.trim()}
                onClick={() => { onLost?.(lostNote); setLostModal(false); setLostNote("") }}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: "#ea580c" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════
   KPI BOX
══════════════════════════════════════ */
function KpiBox({ label, value, sub, positive, icon }: {
  label: string; value: string; sub: string; positive?: boolean; icon: React.ReactNode
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--panel-2)] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-eyebrow mb-0.5">{label}</p>
        <p className={cn("text-[20px] font-mono font-bold leading-none",
          positive === undefined ? "text-[var(--ink)]" : positive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
          {value}
        </p>
        <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   PAGE
══════════════════════════════════════ */
export default function CuentasPage() {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [historyId,  setHistoryId]  = useState<string | null>(null)
  const [promoteId,  setPromoteId]  = useState<string | null>(null)

  const { data: accounts = [], isLoading } = trpc.accounts.list.useQuery()
  const { data: markets = [] }             = trpc.markets.list.useQuery()
  const { data: rawTradesData }            = trpc.trades.list.useQuery()
  const allTrades = rawTradesData?.items ?? []
  const utils = trpc.useUtils()

  const accountStats = useMemo(() => {
    const now        = new Date()
    const today      = now.toISOString().slice(0, 10)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const map: Record<string, TradeStats> = {}

    for (const t of allTrades) {
      if (t.status !== "CLOSED") continue
      const aid = t.accountId
      if (!map[aid]) map[aid] = { netPnl: 0, pnlMonth: 0, pnlToday: 0, winRate: null, avgR: null, tradesMonth: 0, tradesToday: 0, tradesTotal: 0, drawdownPct: 0, sparkline: [] }
      const s = map[aid]
      s.tradesTotal++
      const pnl = t.pnl ?? 0
      s.netPnl += pnl
      if (t.date >= monthStart) { s.pnlMonth += pnl; s.tradesMonth++ }
      if (t.date === today)     { s.pnlToday += pnl; s.tradesToday++ }
    }

    for (const aid of Object.keys(map)) {
      const acct   = accounts.find(a => a.id === aid)
      const initBal = acct ? Number(acct.initialBalance) : 0
      const trades  = allTrades
        .filter(t => t.accountId === aid && t.status === "CLOSED")
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      if (trades.length === 0) continue
      const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
      map[aid].winRate = (wins / trades.length) * 100
      map[aid].avgR    = trades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / trades.length

      let cumPnl = 0, peakCumPnl = 0
      const equity: number[] = [initBal]
      for (const t of trades) {
        cumPnl += t.pnl ?? 0
        equity.push(initBal + cumPnl)
        if (cumPnl > peakCumPnl) peakCumPnl = cumPnl
      }
      map[aid].sparkline   = equity
      map[aid].drawdownPct = initBal > 0 ? ((peakCumPnl - cumPnl) / initBal) * 100 : 0
    }

    return map
  }, [allTrades, accounts])

  const invalidate = () => utils.accounts.list.invalidate()

  const deleteAccount  = trpc.accounts.delete.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const archiveAccount = trpc.accounts.archive.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const changeStatus   = trpc.accounts.changeStatus.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null) } })
  const changePhase    = trpc.accounts.changePhase.useMutation({ onSuccess: () => { invalidate() } })

  const selected       = accounts.find(a => a.id === selectedId) ?? null
  const historyAccount = accounts.find(a => a.id === historyId) ?? null
  const promoteAccount = accounts.find(a => a.id === promoteId) ?? null

  const totalBal    = accounts.reduce((s, a) => s + Number(a.initialBalance), 0)
  const activeCount = accounts.filter(a => a.status === "ACTIVE").length

  return (
    <>
      <div>
        <TopBar
          title="Cuentas"
          subtitle={`${accounts.length} cuentas`}
          actions={[{ label: "Nueva cuenta", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />

        {/* KPI strip */}
        {(() => {
          const totalPnlMonth  = Object.values(accountStats).reduce((s, v) => s + v.pnlMonth, 0)
          const totalTradesAll = Object.values(accountStats).reduce((s, v) => s + v.tradesTotal, 0)
          const pnlStr = `${totalPnlMonth >= 0 ? "+" : "-"}$${Math.abs(totalPnlMonth).toFixed(2)}`
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <KpiBox label="Balance total"  value={`$${totalBal.toLocaleString()}`}
                sub={`${accounts.length} cuentas`}
                icon={<BarChart3 size={15} className="text-[var(--ink-3)]" />} />
              <KpiBox label="P&L este mes" value={totalTradesAll > 0 ? pnlStr : "— sin trades"}
                positive={totalTradesAll > 0 ? totalPnlMonth >= 0 : undefined}
                sub={totalTradesAll > 0 ? `${Object.values(accountStats).reduce((s, v) => s + v.tradesMonth, 0)} trades este mes` : "sin trades cerrados"}
                icon={<TrendingUp size={15} className="text-[var(--ink-3)]" />} />
              <KpiBox label="Total trades" value={String(totalTradesAll)}
                sub="trades cerrados"
                icon={<Shield size={15} className="text-[var(--ink-3)]" />} />
              <KpiBox label="Cuentas activas" value={String(activeCount)}
                sub={`de ${accounts.length} total`}
                icon={<CheckCircle2 size={15} className="text-[var(--ink-3)]" />} />
            </div>
          )
        })()}

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[var(--ink-3)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando cuentas…</span>
          </div>
        )}

        {!isLoading && accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--panel-2)] flex items-center justify-center">
              <BarChart3 size={20} className="text-[var(--ink-3)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">Sin cuentas aún</p>
              <p className="text-sm text-[var(--ink-3)] mt-1">Crea tu primera cuenta para empezar a registrar trades.</p>
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Nueva cuenta
            </Button>
          </div>
        )}

        {!isLoading && accounts.length > 0 && (
          <div className="flex gap-4 items-start">
            <div className={cn("grid gap-4 flex-1", selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
              {accounts.map(a => (
                <AccountCard
                  key={a.id}
                  rawAccount={a}
                  selected={selectedId === a.id}
                  onClick={() => setSelectedId(s => s === a.id ? null : a.id)}
                  stats={accountStats[a.id]}
                />
              ))}
            </div>

            {selected && (
              <div className="detail-panel-mobile" style={{
                width: 340, flexShrink: 0,
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                position: "sticky", top: 0,
                maxHeight: "calc(100vh - 28px)",
                overflowY: "auto",
              }}>
                <AccountDetailPanel
                  account={selected}
                  rawAccount={selected}
                  onClose={() => setSelectedId(null)}
                  onEdit={() => setEditingId(selected.id)}
                  onDelete={() => deleteAccount.mutate(selected.id)}
                  deleting={deleteAccount.isPending}
                  onArchive={() => archiveAccount.mutate(selected.id)}
                  archiving={archiveAccount.isPending}
                  onLost={(note) => changeStatus.mutate({ id: selected.id, status: "LOST", statusNote: note })}
                  onOpenHistory={() => setHistoryId(selected.id)}
                  onPromotePhase={() => setPromoteId(selected.id)}
                  stats={accountStats[selected.id]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <NuevaCuentaModal open={modalOpen} onOpenChange={setModalOpen} markets={markets as never} />

      {editingId && (() => {
        const ea = accounts.find(a => a.id === editingId)
        return ea ? (
          <EditarCuentaModal open onOpenChange={(v) => { if (!v) setEditingId(null) }} account={ea} markets={markets as never} />
        ) : null
      })()}

      {historyId && historyAccount && (
        <AccountHistoryModal
          accountId={historyId}
          accountName={historyAccount.name}
          onClose={() => setHistoryId(null)}
        />
      )}

      {promoteId && promoteAccount && (
        <PromotePhaseModal
          account={promoteAccount}
          onClose={() => setPromoteId(null)}
          onConfirm={(input) => changePhase.mutate(input)}
          saving={changePhase.isPending}
          markets={markets as never}
        />
      )}
    </>
  )
}
