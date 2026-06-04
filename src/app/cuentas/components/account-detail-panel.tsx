"use client"

import { useState, useEffect } from "react"
import {
  X, Shield, BarChart3,
  Pencil, Archive, Loader2, Trash2, XCircle,
  History, ArrowUpCircle, ArrowLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { RuleBar } from "@/components/ui/rule-bar"
import { MiniSparkline } from "@/components/ui/mini-sparkline"
import {
  TYPE_META, ACCOUNT_STATUS_META, isPropFirmLike,
} from "./account-card"
import type { RawAccount, TradeStats } from "./account-card"
import type { AccountType } from "@/types"

export function AccountDetailPanel({ account, onClose, onDelete, deleting, onEdit, onArchive, onLost, archiving, onOpenHistory, onPromotePhase, stats }: {
  account:   RawAccount
  onClose:   () => void
  onDelete?: () => void; deleting?: boolean
  onEdit?:   () => void
  onArchive?: () => void; archiving?: boolean
  onLost?:  (note: string) => void
  onOpenHistory?: () => void
  onPromotePhase?: () => void
  stats?:    TradeStats
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput,   setDeleteInput]   = useState("")
  const [lostModal,     setLostModal]     = useState(false)
  const [lostNote,      setLostNote]      = useState("")
  const router = useRouter()

  // Escape key to close on desktop
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const type         = account.type as AccountType
  const tm           = TYPE_META[type] ?? TYPE_META.PERSONAL
  const acctStatus   = (account.status as string) ?? "ACTIVE"
  const sm           = ACCOUNT_STATUS_META[acctStatus] ?? ACCOUNT_STATUS_META.ACTIVE
  const isPF         = isPropFirmLike(type)
  const phase        = (account.phase as string) ?? "NONE"
  const initialBalance = Number(account.initialBalance)
  const flatLine     = Array(10).fill(initialBalance)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Mobile back button */}
      <button
        onClick={onClose}
        className="flex md:hidden items-center gap-1 text-xs text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors px-5 pt-3 -mb-1"
      >
        <ArrowLeft size={13} /> Volver
      </button>
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
            const sparkData     = stats?.sparkline && stats.sparkline.length > 1 ? stats.sparkline : flatLine
            const sparkPos      = stats ? stats.netPnl >= 0 : true
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
        {isPF && account.ddTotalPct != null && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">{type === "DEMO_PROP" ? "Reglas Demo PF" : "Reglas Prop Firm"}</p>
              <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(79,110,247,0.12)", color: "#4f6ef7" }}>
                {(account.ddModel as string) ?? "FIXED"}
              </span>
            </div>
            <div className="flex flex-col gap-3 bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4 border border-[var(--line)]">
              <RuleBar label="Drawdown total" usedPct={stats ? Math.min(100, stats.drawdownPct / Number(account.ddTotalPct) * 100) : 0} limitLabel={`${Number(account.ddTotalPct)}% max`} />
              {account.ddDailyPct != null && (
                <RuleBar label="Pérdida diaria" usedPct={stats ? Math.min(100, Math.max(0, -stats.pnlToday) / (initialBalance * Number(account.ddDailyPct) / 100) * 100) : 0} limitLabel={`${Number(account.ddDailyPct)}% límite`} />
              )}
              {account.targetPct != null && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-[var(--ink-3)]">Objetivo ({Number(account.targetPct)}%)</span>
                    <span className="text-[11px] font-mono font-semibold text-[var(--ink-3)]">
                      {stats ? `${(stats.netPnl / initialBalance * 100).toFixed(2)}%` : "—"} / {Number(account.targetPct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${stats ? Math.min(100, Math.max(0, stats.netPnl / (initialBalance * Number(account.targetPct) / 100) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
                {([
                  account.ddTotalPct      != null ? ["Max DD",        `${Number(account.ddTotalPct)}%`]    : null,
                  account.ddDailyPct      != null ? ["Daily Loss",    `${Number(account.ddDailyPct)}%`]    : null,
                  account.maxTradesPerDay != null ? ["Max trades/día", String(account.maxTradesPerDay)]    : null,
                  account.targetPct       != null ? ["Objetivo",      `${Number(account.targetPct)}%`]     : null,
                  account.minTradingDays  != null ? ["Min días",       String(account.minTradingDays)]     : null,
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-[var(--ink-3)]">{k}</span>
                    <span className="font-mono font-semibold text-[var(--ink)]">{v}</span>
                  </div>
                ))}
              </div>
              {(account.allowedSymbols as string[])?.length > 0 && (
                <div className="text-[11px] flex justify-between pt-1 border-t border-[var(--line)]">
                  <span className="text-[var(--ink-3)]">Símbolos</span>
                  <span className="font-mono text-[var(--ink)]">{(account.allowedSymbols as string[]).join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Limits for non-prop accounts */}
        {!isPF && (account.ddDailyPct != null || account.ddMonthlyPct != null || account.ddTotalPct != null || account.targetPct != null) && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">
                {type === "DEMO_PERSONAL" ? "Límites Demo" : type === "BACKTEST" ? "Límites Backtest" : "Límites personales"}
              </p>
            </div>
            <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 border border-[var(--line)] flex flex-col gap-2 text-[11px]">
              {[
                ["DD Diario",  account.ddDailyPct   != null ? `${Number(account.ddDailyPct)}%`   : null],
                ["DD Semanal", account.ddWeeklyPct  != null ? `${Number(account.ddWeeklyPct)}%`  : null],
                ["DD Mensual", account.ddMonthlyPct != null ? `${Number(account.ddMonthlyPct)}%` : null],
                ["DD Total",   account.ddTotalPct   != null ? `${Number(account.ddTotalPct)}%`   : null],
                ["Objetivo",   account.targetPct    != null ? `${Number(account.targetPct)}%`    : null],
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
              ["Balance inicial", `$${Number(account.initialBalance).toLocaleString()}`],
              ["Divisa",          account.currency],
              ["Timezone",        account.timezone],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[var(--ink-3)]">{k}</span>
                <span className="font-mono text-[var(--ink)]">{v as string}</span>
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
          <button
            onClick={() => router.push(`/trades?accountId=${account.id}`)}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
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

        {acctStatus === "LOST" && account.statusNote && (
          <div className="text-[11px] p-3 rounded-[var(--radius-sm)] border border-red-900/30 bg-red-950/20 text-red-400">
            <span className="font-semibold">Nota: </span>{account.statusNote as string}
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
