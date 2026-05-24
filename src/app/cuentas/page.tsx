"use client"

import { useState, useMemo } from "react"
import {
  Plus, X, TrendingUp, TrendingDown, Shield, Target,
  AlertTriangle, CheckCircle2, BarChart3, ChevronRight,
  Pencil, Archive, Loader2, Trash2, PauseCircle, XCircle,
  History, ArrowUpCircle,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MarketMultiSelect } from "@/components/ui/market-select"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { Account, AccountType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"
import { RuleBar } from "@/components/ui/rule-bar"
import { MiniSparkline } from "@/components/ui/mini-sparkline"

type RawAccount = RouterOutputs['accounts']['list'][number]

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const TYPE_META: Record<AccountType, { label: string; color: string; bg: string }> = {
  PROP_FIRM:    { label: "Prop Firm",    color: "#4f6ef7", bg: "rgba(79,110,247,0.12)"  },
  PERSONAL:     { label: "Personal",     color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  DEMO_PROP:    { label: "Demo PF",      color: "#9b59b6", bg: "rgba(155,89,182,0.12)"  },
  DEMO_PERSONAL:{ label: "Demo",         color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  BACKTEST:     { label: "Backtest",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  QA:           { label: "QA",           color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
}



/* ══════════════════════════════════════
   ACCOUNT CARD
══════════════════════════════════════ */
interface TradeStats {
  netPnl: number
  pnlMonth: number
  pnlToday: number
  winRate: number | null
  avgR: number | null
  tradesMonth: number
  tradesToday: number
  tradesTotal: number
  drawdownPct: number    // current drawdown from equity peak as % of initial balance
  sparkline: number[]   // equity curve starting at initialBalance
}

function AccountCard({ rawAccount, selected, onClick, stats }: { rawAccount: RawAccount; selected: boolean; onClick: () => void; stats?: TradeStats }) {
  const type   = rawAccount.type as AccountType
  const tm     = TYPE_META[type] ?? TYPE_META.PERSONAL
  const status = (rawAccount.status as string) ?? "ACTIVE"
  const sm     = ACCOUNT_STATUS_META[status] ?? ACCOUNT_STATUS_META.ACTIVE
  const isPF   = isPropFirmLike(type)
  const phase  = (rawAccount.phase as string) ?? "NONE"

  const initialBalance = Number(rawAccount.initialBalance)
  // Days active since createdAt
  const daysActive = Math.max(0, Math.floor((Date.now() - new Date(rawAccount.createdAt).getTime()) / 86_400_000))

  const flatLine   = Array(10).fill(initialBalance)
  const sparkData  = (stats?.sparkline && stats.sparkline.length > 1) ? stats.sparkline : flatLine
  const sparkPos   = stats ? stats.netPnl >= 0 : true

  return (
    <div
      onClick={onClick}
      className="rounded-[var(--radius)] border bg-[var(--panel)] flex flex-col cursor-pointer transition-all duration-150 overflow-hidden"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--line)",
        boxShadow: selected ? "0 0 0 1px var(--accent)" : "none",
      }}
    >
      {/* Type color bar */}
      <div style={{ height: 3, background: tm.color }} />

      <div className="p-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--ink)] leading-tight">{rawAccount.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
            </div>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
              {rawAccount.broker} · {rawAccount.currency} · {daysActive}d activa
            </p>
          </div>
          {/* Badge: phase for prop firms, account status for others */}
          {isPF ? (
            <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]">
              <Target size={10} />
              <span className="text-[10px] font-bold ml-1">
                {phase === "PHASE_1" ? "Fase 1" : phase === "PHASE_2" ? "Fase 2" : phase === "FUNDED" ? "Funded" : "En fase"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full"
              style={{ background: `${sm.color}18`, color: sm.color }}>
              {sm.icon}
              <span className="text-[10px] font-bold ml-1">{sm.label}</span>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <p className="text-eyebrow mb-1">Balance inicial</p>
            <p className="text-[22px] font-mono font-bold text-[var(--ink)] leading-none">
              ${initialBalance.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-eyebrow mb-1">P&L mes</p>
            <p className="text-[13px] font-mono" style={{ color: stats && stats.tradesMonth > 0 ? (stats.pnlMonth >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" }}>
              {stats && stats.tradesMonth > 0 ? `${stats.pnlMonth >= 0 ? "+" : "-"}$${Math.abs(stats.pnlMonth).toFixed(2)}` : "— sin trades"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-eyebrow mb-1">Win %</p>
            <p className="text-[13px] font-mono" style={{ color: stats && stats.winRate != null ? (stats.winRate >= 50 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" }}>
              {stats && stats.winRate != null ? `${stats.winRate.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>

        {/* Sparkline — flat until real equity data */}
        <div style={{ margin: "0 -4px" }}>
          <MiniSparkline data={sparkData} positive={sparkPos} />
        </div>

        {/* Rules / limits section — shown for ANY account type that has limits configured */}
        {(rawAccount.ddDailyPct != null || rawAccount.ddWeeklyPct != null || rawAccount.ddMonthlyPct != null || rawAccount.ddTotalPct != null || rawAccount.targetPct != null) && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield size={11} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">
                {isPF
                  ? (type === "DEMO_PROP" ? "Reglas Demo PF" : "Reglas Prop Firm")
                  : type === "BACKTEST" ? "Objetivos Backtest"
                  : type === "DEMO_PERSONAL" ? "Límites Demo"
                  : "Objetivos & Límites"}
              </p>
              {isPF && (
                <span className="ml-auto text-[10px] font-mono text-[var(--ink-3)]">
                  {phase === "PHASE_1" ? "Fase 1" : phase === "PHASE_2" ? "Fase 2" : "Funded"}
                  {rawAccount.targetPct != null ? ` · objetivo ${Number(rawAccount.targetPct)}%` : ""}
                </span>
              )}
            </div>

            {/* DD bars */}
            {rawAccount.ddTotalPct != null && (
              <RuleBar label="Drawdown total" usedPct={stats ? Math.min(100, stats.drawdownPct / Number(rawAccount.ddTotalPct) * 100) : 0} limitLabel={`${Number(rawAccount.ddTotalPct)}%`} />
            )}
            {rawAccount.ddDailyPct != null && (
              <RuleBar label="Pérdida diaria" usedPct={stats ? Math.min(100, Math.max(0, -stats.pnlToday) / (initialBalance * Number(rawAccount.ddDailyPct) / 100) * 100) : 0} limitLabel={`${Number(rawAccount.ddDailyPct)}%`} />
            )}
            {rawAccount.ddWeeklyPct != null && (
              <RuleBar label="Pérdida semanal" usedPct={0} limitLabel={`${Number(rawAccount.ddWeeklyPct)}%`} />
            )}
            {rawAccount.ddMonthlyPct != null && (
              <RuleBar label="Pérdida mensual" usedPct={stats ? Math.min(100, Math.max(0, -stats.pnlMonth) / (initialBalance * Number(rawAccount.ddMonthlyPct) / 100) * 100) : 0} limitLabel={`${Number(rawAccount.ddMonthlyPct)}%`} />
            )}

            {/* Objective progress */}
            {rawAccount.targetPct != null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--ink-3)]">
                    {isPF ? "Progreso hacia objetivo" : "Objetivo"}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--ink-3)]">
                    {stats ? `${(stats.netPnl / initialBalance * 100).toFixed(2)}%` : "—"} / {Number(rawAccount.targetPct)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${stats ? Math.min(100, Math.max(0, stats.netPnl / (initialBalance * Number(rawAccount.targetPct) / 100) * 100)) : 0}%` }} />
                </div>
              </div>
            )}

            {/* Prop firm extras */}
            {isPF && (rawAccount.maxTradesPerDay != null || rawAccount.allowedSymbols?.length > 0) && (
              <div className="flex justify-between text-[11px] pt-1">
                {rawAccount.maxTradesPerDay != null && (
                  <div className="flex items-center gap-1">
                    <BarChart3 size={10} className="text-[var(--ink-3)]" />
                    <span className="text-[var(--ink-3)]">Trades hoy:</span>
                    <span className="font-mono font-semibold ml-0.5 text-[var(--ink-3)]">
                      {stats?.tradesToday ?? 0} / {rawAccount.maxTradesPerDay}
                    </span>
                  </div>
                )}
                {rawAccount.allowedSymbols?.length > 0 && (
                  <span className="text-[var(--ink-3)] truncate max-w-[130px]">
                    {rawAccount.allowedSymbols.join(", ")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex justify-between text-[11px] pt-2 border-t border-[var(--line)]">
          <div>
            <p className="text-[var(--ink-3)] mb-0.5">Trades mes</p>
            <p className="font-mono font-semibold text-[var(--ink-3)]">{stats ? String(stats.tradesMonth) : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-[var(--ink-3)] mb-0.5">Avg R</p>
            <p className="font-mono font-semibold" style={{ color: stats?.avgR != null ? (stats.avgR >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" }}>
              {stats?.avgR != null ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(4)}R` : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[var(--ink-3)] mb-0.5">Drawdown</p>
            <p className="font-mono font-semibold" style={{ color: stats && stats.drawdownPct > 0 ? "var(--loss)" : "var(--ink-3)" }}>
              {stats ? `${stats.drawdownPct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>

        <button className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors">
          Ver detalle <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   DETAIL PANEL
══════════════════════════════════════ */
const ACCOUNT_STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE:   { label: "Activa",   color: "#22c55e", icon: <CheckCircle2 size={10} /> },
  PAUSED:   { label: "Pausada",  color: "#f59e0b", icon: <PauseCircle size={10} /> },
  INACTIVE: { label: "Inactiva", color: "#6b7280", icon: <Archive size={10} /> },
  LOST:     { label: "Perdida",  color: "#ef4444", icon: <XCircle size={10} /> },
}

const isPropFirmLike = (type: AccountType) => type === "PROP_FIRM" || type === "DEMO_PROP"

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
  const [deleteInput, setDeleteInput] = useState("")
  const [lostModal, setLostModal] = useState(false)
  const [lostNote, setLostNote] = useState("")

  const tm  = TYPE_META[account.type]
  const acctStatus = (rawAccount?.status as string) ?? "ACTIVE"
  const sm  = ACCOUNT_STATUS_META[acctStatus] ?? ACCOUNT_STATUS_META.ACTIVE
  const isPF = isPropFirmLike(account.type)
  const phase = (rawAccount?.phase as string) ?? "NONE"
  const initialBalance = Number(rawAccount?.initialBalance ?? account.initialBalance)
  const flatLine = Array(10).fill(initialBalance)

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

        {/* Equity / Balance curve */}
        <div>
          {(() => {
            const sparkData = stats?.sparkline && stats.sparkline.length > 1 ? stats.sparkline : flatLine
            const sparkPos  = stats ? stats.netPnl >= 0 : true
            const currentEquity = initialBalance + (stats?.netPnl ?? 0)
            return (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-eyebrow">Equity + Balance</span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: stats ? (stats.netPnl >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" }}>
                    {stats ? `${stats.netPnl >= 0 ? "+" : "-"}$${Math.abs(stats.netPnl).toFixed(2)}` : "— sin trades"}
                  </span>
                </div>
                <MiniSparkline data={sparkData} positive={sparkPos} />
                <div className="flex justify-between mt-1 text-[10px] text-[var(--ink-3)]">
                  <span>Balance inicial → actual</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">${initialBalance.toLocaleString()} → ${currentEquity.toFixed(2)}</span>
                </div>
              </>
            )
          })()}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const netPnl    = stats?.netPnl ?? 0
            const currentEq = initialBalance + netPnl
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

        {/* Prop firm rules — ONLY for PROP_FIRM and DEMO_PROP */}
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
                    <span className="text-[11px] font-mono font-semibold text-[var(--ink-3)]">{stats ? `${(stats.netPnl / initialBalance * 100).toFixed(2)}%` : "—"} / {Number(rawAccount.targetPct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${stats ? Math.min(100, Math.max(0, stats.netPnl / (initialBalance * Number(rawAccount.targetPct) / 100) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
                {([
                  rawAccount.ddTotalPct     != null ? ["Max DD",          `${Number(rawAccount.ddTotalPct)}%`]     : null,
                  rawAccount.ddDailyPct     != null ? ["Daily Loss",      `${Number(rawAccount.ddDailyPct)}%`]     : null,
                  rawAccount.maxTradesPerDay != null ? ["Max trades/día",  String(rawAccount.maxTradesPerDay)]      : null,
                  rawAccount.targetPct      != null ? ["Objetivo",         `${Number(rawAccount.targetPct)}%`]     : null,
                  rawAccount.minTradingDays  != null ? ["Min días",         String(rawAccount.minTradingDays)]      : null,
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

        {/* Limits section — for non-prop-firm accounts that have DD/target configured */}
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
                ["DD Diario",   rawAccount?.ddDailyPct   != null ? `${Number(rawAccount.ddDailyPct)}%`   : null],
                ["DD Semanal",  rawAccount?.ddWeeklyPct  != null ? `${Number(rawAccount.ddWeeklyPct)}%`  : null],
                ["DD Mensual",  rawAccount?.ddMonthlyPct != null ? `${Number(rawAccount.ddMonthlyPct)}%` : null],
                ["DD Total",    rawAccount?.ddTotalPct   != null ? `${Number(rawAccount.ddTotalPct)}%`   : null],
                ["Objetivo",    rawAccount?.targetPct    != null ? `${Number(rawAccount.targetPct)}%`    : null],
              ].filter(([, v]) => v != null).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-[var(--ink-3)]">{k}</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick info */}
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

        {/* Phase promotion — only for PROP_FIRM / DEMO_PROP, not FUNDED */}
        {isPF && phase !== "FUNDED" && phase !== "NONE" && (
          <button onClick={onPromotePhase}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-sm)] text-[12px] font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors">
            <ArrowUpCircle size={13} />
            {phase === "PHASE_1" ? "Promover a Fase 2" : "Promover a Funded"}
          </button>
        )}

        <div className="flex gap-2 flex-wrap">
          {/* Archive (soft delete) */}
          <button onClick={onArchive} disabled={archiving || acctStatus === "INACTIVE"}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-amber-500 transition-colors disabled:opacity-40">
            {archiving ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
            Archivar
          </button>
          {/* Mark as lost */}
          <button onClick={() => setLostModal(true)} disabled={acctStatus === "LOST"}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-orange-500 transition-colors disabled:opacity-40">
            <XCircle size={11} /> Perdida
          </button>
          {/* Hard delete */}
          <button onClick={() => setConfirmDelete(true)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--loss)] transition-colors">
            <Trash2 size={11} /> Eliminar
          </button>
        </div>

        {/* Status note if LOST */}
        {acctStatus === "LOST" && rawAccount?.statusNote && (
          <div className="text-[11px] p-3 rounded-[var(--radius-sm)] border border-red-900/30 bg-red-950/20 text-red-400">
            <span className="font-semibold">Nota: </span>{rawAccount.statusNote}
          </div>
        )}
      </div>

      {/* Confirm hard delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full sm:max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden">
            {/* Header strip */}
            <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--loss-soft)" }}>
                <Trash2 size={15} className="text-[var(--loss)]" />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--ink)]">Eliminar cuenta</p>
                <p className="text-[11px] text-[var(--ink-3)]">Acción irreversible</p>
              </div>
            </div>
            {/* Body */}
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
            {/* Actions */}
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
            {/* Header strip */}
            <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "rgba(234,88,12,0.12)" }}>
                <XCircle size={15} style={{ color: "#ea580c" }} />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--ink)]">Marcar como Perdida</p>
                <p className="text-[11px] text-[var(--ink-3)]">El estado se registrará en el historial</p>
              </div>
            </div>
            {/* Body */}
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
            {/* Actions */}
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
   NUEVA CUENTA MODAL
══════════════════════════════════════ */
const ACCOUNT_TYPES: AccountType[] = ["PROP_FIRM", "DEMO_PROP", "PERSONAL", "DEMO_PERSONAL", "BACKTEST", "QA"]
const BROKERS = ["FXify", "FTMO", "MyForexFunds", "TopStep", "Apex", "Interactive Brokers", "TD Ameritrade", "Otro"]
const TIMEZONES = [
  { value: "America/New_York",  label: "America/New_York (ET)" },
  { value: "America/Chicago",   label: "America/Chicago (CT)" },
  { value: "Europe/London",     label: "Europe/London (GMT)" },
  { value: "Europe/Madrid",     label: "Europe/Madrid (CET)" },
]

interface AccountForm {
  tipo: AccountType
  nombre: string
  broker: string
  balance: string
  currency: string
  timezone: string
  // drawdown & target (all types)
  ddDailyPct: string
  ddWeeklyPct: string
  ddMonthlyPct: string
  ddTotalPct: string
  targetPct: string
  // prop firm extras
  ddModel: "FIXED" | "TRAILING"
  phase: "PHASE_1" | "PHASE_2" | "FUNDED" | "NONE"
  maxTrades: string
  symbols: string[]
  minDays: string
}

const FORM_INIT: AccountForm = {
  tipo: "PROP_FIRM", nombre: "", broker: "", balance: "", currency: "USD",
  timezone: "America/New_York",
  ddDailyPct: "", ddWeeklyPct: "", ddMonthlyPct: "", ddTotalPct: "", targetPct: "",
  ddModel: "FIXED", phase: "PHASE_1", maxTrades: "3", symbols: [], minDays: "",
}

type NewAccountForm = AccountForm

function NuevaCuentaModal({ open, onOpenChange, markets = [] }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const [form, setForm] = useState<NewAccountForm>(FORM_INIT)
  const [tab, setTab]   = useState<"general" | "reglas">("general")
  const utils = trpc.useUtils()

  const createAccount = trpc.accounts.create.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      onOpenChange(false)
      setForm(FORM_INIT)
      setTab("general")
    },
  })

  const creating = createAccount.isPending

  function buildMutationInput(form: AccountForm) {
    const pf = (v: string) => v ? parseFloat(v) : undefined
    const pi = (v: string) => v ? parseInt(v)   : undefined
    return {
      name:            form.nombre.trim(),
      broker:          form.broker.trim(),
      type:            form.tipo,
      initialBalance:  parseFloat(form.balance.replace(/,/g, "")) || 0,
      currency:        form.currency,
      timezone:        form.timezone,
      ddDailyPct:      pf(form.ddDailyPct),
      ddWeeklyPct:     pf(form.ddWeeklyPct),
      ddMonthlyPct:    pf(form.ddMonthlyPct),
      ddTotalPct:      pf(form.ddTotalPct),
      targetPct:       pf(form.targetPct),
      ddModel:         isPropFirmLike(form.tipo) ? form.ddModel  : undefined,
      phase:           isPropFirmLike(form.tipo) ? form.phase    : undefined,
      maxTradesPerDay: isPropFirmLike(form.tipo) ? pi(form.maxTrades) : undefined,
      minTradingDays:  isPropFirmLike(form.tipo) ? pi(form.minDays)   : undefined,
      allowedSymbols:  form.symbols,
    }
  }

  function handleCreate() {
    if (!form.nombre.trim() || !form.broker.trim()) return
    createAccount.mutate(buildMutationInput(form))
  }

  const set = <K extends keyof NewAccountForm>(k: K, v: NewAccountForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const tm      = TYPE_META[form.tipo]
  const preview = form.nombre || "Nombre de la cuenta"

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(FORM_INIT); setTab("general") } }}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{ background: tm.bg }}>
              <Shield size={18} style={{ color: tm.color }} />
            </div>
            <div>
              <DialogTitle className="text-[var(--ink)]">{preview}</DialogTitle>
              <p className="text-[11px] mt-0.5" style={{ color: tm.color }}>{tm.label} · {form.currency}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[var(--radius-sm)]">
          {(["general", "reglas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}>
              {t === "general" ? "🏦 General" : isPropFirmLike(form.tipo) ? "🛡 Prop Firm" : "📊 Límites"}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="flex flex-col gap-4">

            {/* Tipo */}
            <div>
              <p className="text-eyebrow mb-2">Tipo de cuenta</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ACCOUNT_TYPES.map(t => {
                  const m = TYPE_META[t]
                  return (
                    <button key={t} onClick={() => set("tipo", t)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-sm)] border transition-all"
                      style={{
                        borderColor: form.tipo === t ? m.color : "var(--line)",
                        background: form.tipo === t ? m.bg : "var(--panel-2)",
                      }}>
                      <span className="text-[11px] font-bold" style={{ color: form.tipo === t ? m.color : "var(--ink-3)" }}>
                        {TYPE_META[t].label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="text-eyebrow block mb-1.5">Nombre de la cuenta *</label>
              <Input placeholder="FXify 100K — Phase 2" value={form.nombre}
                onChange={e => set("nombre", e.target.value)} />
            </div>

            {/* Broker */}
            <div>
              <label className="text-eyebrow block mb-1.5">Broker / Firma prop *</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {BROKERS.slice(0, 6).map(b => (
                  <button key={b} onClick={() => set("broker", b)}
                    className={cn("px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors",
                      form.broker === b ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}>
                    {b}
                  </button>
                ))}
              </div>
              <Input placeholder="O escribe el nombre…" value={form.broker}
                onChange={e => set("broker", e.target.value)} />
            </div>

            {/* Balance + currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Balance inicial *</label>
                <Input placeholder="100,000" value={form.balance}
                  onChange={e => set("balance", e.target.value)} mono />
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Divisa</label>
                <div className="flex gap-1">
                  {["USD", "EUR", "MXN"].map(c => (
                    <button key={c} onClick={() => set("currency", c)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.currency === c ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-3)]"
                      )}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="text-eyebrow block mb-1.5">Timezone</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TIMEZONES.map(tz => (
                  <button key={tz.value} onClick={() => set("timezone", tz.value)}
                    className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] text-left transition-colors",
                      form.timezone === tz.value
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]"
                        : "bg-[var(--chip)] text-[var(--ink-3)] border border-transparent hover:text-[var(--ink)]"
                    )}>
                    {tz.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setTab("reglas")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors">
              Continuar → Configurar límites y objetivo
            </button>
          </div>
        )}

        {tab === "reglas" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.2)" }}>
              <Shield size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[var(--accent)]">Límites de drawdown y objetivo</p>
                <p className="text-[11px] text-[var(--ink-3)]">Aplica para todos los tipos de cuenta. Se usarán para calcular alertas y mostrar progreso.</p>
              </div>
            </div>

            {/* Drawdown 4-grid */}
            <div>
              <p className="text-eyebrow mb-2">Límites de pérdida (%)</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["ddDailyPct",   "Diario",   "5",  "Pérdida máx en un día"],
                  ["ddWeeklyPct",  "Semanal",  "8",  "Pérdida máx en la semana"],
                  ["ddMonthlyPct", "Mensual",  "10", "Pérdida máx en el mes"],
                  ["ddTotalPct",   "Total",    "10", "DD desde balance inicial o pico"],
                ] as const).map(([field, label, ph, hint]) => (
                  <div key={field}>
                    <label className="text-eyebrow block mb-1.5">{label}</label>
                    <div className="flex items-center gap-2">
                      <Input placeholder={ph} value={form[field]} mono onChange={e => set(field, e.target.value)} />
                      <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                    </div>
                    <p className="text-[10px] text-[var(--ink-3)] mt-1">{hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <label className="text-eyebrow block mb-1.5">Objetivo de ganancia</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <Input placeholder="8" value={form.targetPct} mono onChange={e => set("targetPct", e.target.value)} />
                <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
              </div>
            </div>

            {/* Prop Firm extras */}
            {isPropFirmLike(form.tipo) && (
              <>
                <div className="border-t border-[var(--line)] pt-4">
                  <p className="text-eyebrow mb-3">Extras Prop Firm</p>

                  {/* DD model */}
                  <div className="mb-4">
                    <label className="text-eyebrow block mb-2">Modelo de trailing drawdown</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["FIXED", "TRAILING"] as const).map(m => (
                        <button key={m} onClick={() => set("ddModel", m)}
                          className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] font-semibold text-left border transition-all",
                            form.ddModel === m
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                              : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                          )}>
                          {m === "FIXED" ? "🔒 Fijo (FTMO, FXify)" : "📈 Trailing (Apex, TopStep)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phase + max trades */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-eyebrow block mb-1.5">Fase actual</label>
                      <div className="flex flex-col gap-1">
                        {(["PHASE_1","PHASE_2","FUNDED","NONE"] as const).map(p => (
                          <button key={p} onClick={() => set("phase", p)}
                            className={cn("py-1.5 px-3 rounded-[var(--radius-sm)] text-[11px] font-medium text-left border transition-all",
                              form.phase === p
                                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                                : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                            )}>
                            {p === "PHASE_1" ? "Phase 1" : p === "PHASE_2" ? "Phase 2" : p === "FUNDED" ? "✅ Funded" : "Sin fase"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-eyebrow block mb-1.5">Max trades / día</label>
                      <Input placeholder="3" value={form.maxTrades} mono onChange={e => set("maxTrades", e.target.value)} />
                      <label className="text-eyebrow block mb-1.5 mt-3">Min. días trading</label>
                      <Input placeholder="10" value={form.minDays} mono onChange={e => set("minDays", e.target.value)} />
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* Symbols — shown for all account types */}
            {tab === "reglas" && (
              <div className="mt-3">
                <label className="text-eyebrow block mb-1.5">Mercados / Símbolos</label>
                <MarketMultiSelect
                  markets={markets}
                  value={form.symbols}
                  onChange={syms => set("symbols", syms)}
                  placeholder="Seleccionar mercados…"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "reglas" && (
            <Button variant="ghost" onClick={() => setTab("general")}>← Volver</Button>
          )}
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 size={13} className="animate-spin" /> Creando…</> : "Crear cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════ */
function EditarCuentaModal({ open, onOpenChange, account, markets = [] }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account: RawAccount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<"general" | "reglas">("general")

  const [form, setForm] = useState<AccountForm>(() => ({
    tipo:        account.type as AccountType,
    nombre:      account.name,
    broker:      account.broker,
    balance:     String(Number(account.initialBalance)),
    currency:    account.currency,
    timezone:    account.timezone,
    ddDailyPct:  account.ddDailyPct   != null ? String(Number(account.ddDailyPct))   : "",
    ddWeeklyPct: account.ddWeeklyPct  != null ? String(Number(account.ddWeeklyPct))  : "",
    ddMonthlyPct:account.ddMonthlyPct != null ? String(Number(account.ddMonthlyPct)) : "",
    ddTotalPct:  account.ddTotalPct   != null ? String(Number(account.ddTotalPct))   : "",
    targetPct:   account.targetPct    != null ? String(Number(account.targetPct))    : "",
    ddModel:     (account.ddModel as "FIXED"|"TRAILING") ?? "FIXED",
    phase:       (account.phase as AccountForm["phase"])  ?? "PHASE_1",
    maxTrades:   account.maxTradesPerDay != null ? String(account.maxTradesPerDay) : "",
    symbols:     account.allowedSymbols ?? [],
    minDays:     account.minTradingDays != null ? String(account.minTradingDays) : "",
  }))

  const set = <K extends keyof AccountForm>(k: K, v: AccountForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const update = trpc.accounts.update.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); onOpenChange(false) },
  })

  function handleSave() {
    if (!form.nombre.trim() || !form.broker.trim()) return
    const pf = (v: string) => v ? parseFloat(v) : undefined
    const pi = (v: string) => v ? parseInt(v)   : undefined
    update.mutate({
      id:              account.id,
      name:            form.nombre.trim(),
      broker:          form.broker.trim(),
      type:            form.tipo,
      currency:        form.currency,
      timezone:        form.timezone,
      ddDailyPct:      pf(form.ddDailyPct),
      ddWeeklyPct:     pf(form.ddWeeklyPct),
      ddMonthlyPct:    pf(form.ddMonthlyPct),
      ddTotalPct:      pf(form.ddTotalPct),
      targetPct:       pf(form.targetPct),
      ddModel:         isPropFirmLike(form.tipo) ? form.ddModel : undefined,
      phase:           isPropFirmLike(form.tipo) ? form.phase   : undefined,
      maxTradesPerDay: isPropFirmLike(form.tipo) ? pi(form.maxTrades) : undefined,
      minTradingDays:  isPropFirmLike(form.tipo) ? pi(form.minDays)   : undefined,
      allowedSymbols:  form.symbols,
    })
  }

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
              {t === "general" ? "🏦 General" : "📊 Límites"}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-eyebrow block mb-1.5">Nombre *</label>
              <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} />
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Broker *</label>
              <Input value={form.broker} onChange={e => set("broker", e.target.value)} />
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
                      <Input placeholder={ph} value={form[field]} mono onChange={e => set(field, e.target.value)} />
                      <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-eyebrow block mb-1.5">Objetivo de ganancia</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <Input placeholder="8" value={form.targetPct} mono onChange={e => set("targetPct", e.target.value)} />
                <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
              </div>
            </div>
            {isPropFirmLike(form.tipo) && (
              <div className="border-t border-[var(--line)] pt-3">
                <p className="text-eyebrow mb-3">Extras Prop Firm</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(["FIXED","TRAILING"] as const).map(m => (
                    <button key={m} onClick={() => set("ddModel", m)}
                      className={cn("py-2 px-3 rounded-[var(--radius-sm)] text-[11px] font-semibold border transition-all",
                        form.ddModel === m ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]" : "bg-[var(--chip)] text-[var(--ink-3)] border-transparent"
                      )}>
                      {m === "FIXED" ? "🔒 Fijo" : "📈 Trailing"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-eyebrow block mb-1.5">Max trades / día</label>
                    <Input placeholder="3" value={form.maxTrades} mono onChange={e => set("maxTrades", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-eyebrow block mb-1.5">Min. días trading</label>
                    <Input placeholder="10" value={form.minDays} mono onChange={e => set("minDays", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Symbols — shown for all account types */}
            {tab === "reglas" && (
              <div className="mt-3">
                <label className="text-eyebrow block mb-1.5">Mercados / Símbolos</label>
                <MarketMultiSelect
                  markets={markets}
                  value={form.symbols}
                  onChange={syms => set("symbols", syms)}
                  placeholder="Seleccionar mercados…"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <><Loader2 size={13} className="animate-spin" /> Guardando…</> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [promoteId, setPromoteId] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = trpc.accounts.list.useQuery()
  const { data: markets = [] } = trpc.markets.list.useQuery()
  const { data: allTrades = [] } = trpc.trades.list.useQuery()
  const utils = trpc.useUtils()

  const accountStats = useMemo(() => {
    const now = new Date()
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
      const acct = accounts.find(a => a.id === aid)
      const initBal = acct ? Number(acct.initialBalance) : 0
      const trades = allTrades
        .filter(t => t.accountId === aid && t.status === "CLOSED")
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      if (trades.length === 0) continue
      const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
      map[aid].winRate = (wins / trades.length) * 100
      map[aid].avgR    = trades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / trades.length

      // Build equity curve + current drawdown from peak
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

  const deleteAccount = trpc.accounts.delete.useMutation({
    onSuccess: () => { invalidate(); setSelectedId(null) },
  })

  const archiveAccount = trpc.accounts.archive.useMutation({
    onSuccess: () => { invalidate(); setSelectedId(null) },
  })

  const changeStatus = trpc.accounts.changeStatus.useMutation({
    onSuccess: () => { invalidate(); setSelectedId(null) },
  })

  const changePhase = trpc.accounts.changePhase.useMutation({
    onSuccess: () => { invalidate() },
  })

  const selected = accounts.find(a => a.id === selectedId) ?? null
  const historyAccount = accounts.find(a => a.id === historyId) ?? null
  const promoteAccount = accounts.find(a => a.id === promoteId) ?? null

  // KPI totals desde datos reales
  const totalBal = accounts.reduce((s, a) => s + Number(a.initialBalance), 0)
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
          const totalPnlMonth = Object.values(accountStats).reduce((s, v) => s + v.pnlMonth, 0)
          const totalTradesAll = Object.values(accountStats).reduce((s, v) => s + v.tradesTotal, 0)
          const pnlStr = `${totalPnlMonth >= 0 ? "+" : "-"}$${Math.abs(totalPnlMonth).toFixed(2)}`
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <KpiBox label="Balance total" value={`$${totalBal.toLocaleString()}`}
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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[var(--ink-3)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando cuentas…</span>
          </div>
        )}

        {/* Empty state */}
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

        {/* Main layout */}
        {!isLoading && accounts.length > 0 && (
          <div className="flex gap-4 items-start">
            {/* Cards */}
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

            {/* Detail panel */}
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
                  account={{
                    id: selected.id,
                    name: selected.name,
                    broker: selected.broker,
                    type: selected.type as AccountType,
                    initialBalance: Number(selected.initialBalance),
                    currency: selected.currency,
                    timezone: selected.timezone,
                    createdAt: String(selected.createdAt),
                    propFirmRules: (selected.type === "PROP_FIRM" || selected.type === "DEMO_PROP") && selected.ddTotalPct != null ? {
                      maxDrawdownPct: Number(selected.ddTotalPct),
                      dailyLossPct: Number(selected.ddDailyPct ?? 5),
                      maxTradesPerDay: selected.maxTradesPerDay ?? 3,
                      targetPct: Number(selected.targetPct ?? 8),
                      allowedSymbols: selected.allowedSymbols,
                    } : undefined,
                  }}
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

/* ══════════════════════════════════════
   ACCOUNT HISTORY MODAL
══════════════════════════════════════ */
const EVENT_META: Record<string, { label: string; color: string }> = {
  CREATED:       { label: "Cuenta creada",     color: "#22c55e" },
  PHASE_CHANGE:  { label: "Cambio de fase",    color: "#4f6ef7" },
  STATUS_CHANGE: { label: "Cambio de estado",  color: "#f59e0b" },
  WITHDRAWAL:    { label: "Retiro",            color: "#a78bfa" },
  NOTE:          { label: "Nota",              color: "#6b7280" },
}

function AccountHistoryModal({ accountId, accountName, onClose }: {
  accountId: string; accountName: string; onClose: () => void
}) {
  const { data: logs = [], isLoading } = trpc.accountLogs.list.useQuery({ accountId })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <p className="font-bold text-[var(--ink)]">Historial</p>
            <p className="text-[11px] text-[var(--ink-3)]">{accountName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)]">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--ink-3)]">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          )}
          {!isLoading && logs.length === 0 && (
            <p className="text-center text-[13px] text-[var(--ink-3)] py-8">Sin eventos registrados</p>
          )}
          {!isLoading && logs.length > 0 && (
            <div className="relative flex flex-col gap-0">
              {/* vertical line */}
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-[var(--line)]" />
              {(logs as { id: string; event: string; payload: unknown; createdAt: Date | string }[]).map((log) => {
                const meta = EVENT_META[log.event] ?? { label: log.event, color: "#6b7280" }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = log.payload as any
                const date = new Date(log.createdAt)
                const dateStr = date.toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })
                const timeStr = date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
                return (
                  <div key={log.id} className="flex gap-3 pb-5 last:pb-0">
                    <div className="w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10"
                      style={{ borderColor: meta.color, background: "var(--panel)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[10px] text-[var(--ink-3)]">{dateStr} · {timeStr}</span>
                      </div>
                      {log.event === "PHASE_CHANGE" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {payload.from} → {payload.to}
                          {payload.manualOverride && <span className="ml-2 text-[var(--ink-3)]">(manual)</span>}
                          {payload.note && <span className="ml-2 italic text-[var(--ink-3)]">"{payload.note}"</span>}
                        </p>
                      )}
                      {log.event === "STATUS_CHANGE" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {payload.from} → {payload.to}
                          {payload.note && <span className="ml-2 italic text-[var(--ink-3)]">"{payload.note}"</span>}
                        </p>
                      )}
                      {log.event === "CREATED" && (
                        <p className="text-[11px] text-[var(--ink-2)] mt-1">
                          {payload.type} · ${Number(payload.initialBalance).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   PROMOTE PHASE MODAL
══════════════════════════════════════ */
function PromotePhaseModal({ account, onClose, onConfirm, saving, markets = [] }: {
  account: RawAccount
  onClose: () => void
  onConfirm: (input: {
    id: string; phase: "PHASE_1" | "PHASE_2" | "FUNDED" | "NONE"
    note?: string; objectiveMet: boolean; manualOverride: boolean
    newRules?: { initialBalance?: number; ddDailyPct?: number; ddWeeklyPct?: number; ddMonthlyPct?: number; ddTotalPct?: number; targetPct?: number; maxTradesPerDay?: number; minTradingDays?: number; allowedSymbols?: string[] }
  }) => void
  saving: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markets?: any[]
}) {
  const currentPhase = (account.phase as string) ?? "PHASE_1"
  const targetPhase = currentPhase === "PHASE_1" ? "PHASE_2" : "FUNDED"

  const [note, setNote] = useState("")
  const [manualOverride, setManualOverride] = useState(false)
  // New rules — inherit from current account
  const [balance, setBalance] = useState(String(Number(account.initialBalance)))
  const [ddDaily, setDdDaily] = useState(account.ddDailyPct != null ? String(Number(account.ddDailyPct)) : "")
  const [ddTotal, setDdTotal] = useState(account.ddTotalPct != null ? String(Number(account.ddTotalPct)) : "")
  const [target, setTarget] = useState(account.targetPct != null ? String(Number(account.targetPct)) : "")
  const [maxTrades, setMaxTrades] = useState(account.maxTradesPerDay != null ? String(account.maxTradesPerDay) : "")
  const [minDays, setMinDays] = useState(account.minTradingDays != null ? String(account.minTradingDays) : "")
  const [symbols, setSymbols] = useState<string[]>(account.allowedSymbols ?? [])

  // Simulate objective check — will be real when trades are connected
  const objectiveMet = false // TODO: compare real trade PnL vs targetPct
  const needsOverride = !objectiveMet

  function handleConfirm() {
    if (needsOverride && !manualOverride) return
    onConfirm({
      id:             account.id,
      phase:          targetPhase as "PHASE_2" | "FUNDED",
      note:           note || undefined,
      objectiveMet,
      manualOverride,
      newRules: {
        initialBalance:  parseFloat(balance) || undefined,
        ddDailyPct:      ddDaily  ? parseFloat(ddDaily)  : undefined,
        ddTotalPct:      ddTotal  ? parseFloat(ddTotal)  : undefined,
        targetPct:       target   ? parseFloat(target)   : undefined,
        maxTradesPerDay: maxTrades ? parseInt(maxTrades) : undefined,
        minTradingDays:  minDays   ? parseInt(minDays)   : undefined,
        allowedSymbols:  symbols.length > 0 ? symbols : undefined,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] w-full max-w-md max-h-[85vh] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <p className="font-bold text-[var(--ink)]">Promover cuenta</p>
            <p className="text-[11px] text-[var(--ink-3)]">{currentPhase} → {targetPhase}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)]">
            <X size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Objective check warning */}
          {needsOverride && (
            <div className="p-3 rounded-[var(--radius-sm)] border border-amber-700/40 bg-amber-950/20 text-amber-400 text-[12px] flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={13} />
                Objetivo no alcanzado aún
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                No hay suficientes trades registrados para confirmar que el objetivo fue cumplido.
                Si la prop firm aprobó manualmente el pase de fase, marca la casilla de abajo.
              </p>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={manualOverride} onChange={e => setManualOverride(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[var(--accent)]" />
                <span className="text-[11px]">La prop firm confirmó manualmente el pase a {targetPhase}</span>
              </label>
            </div>
          )}

          {/* New rules for incoming phase */}
          <div>
            <p className="text-eyebrow mb-2">Reglas para {targetPhase}</p>
            <p className="text-[11px] text-[var(--ink-3)] mb-3">
              Se pre-llenan con los valores actuales. Ajusta los que cambien para la nueva fase.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Balance nuevo", val: balance, set: setBalance, placeholder: "100000" },
                { label: "DD Diario %",   val: ddDaily,   set: setDdDaily,   placeholder: "5" },
                { label: "DD Total %",    val: ddTotal,   set: setDdTotal,   placeholder: "10" },
                { label: "Objetivo %",    val: target,    set: setTarget,    placeholder: "8" },
                { label: "Max trades/d",  val: maxTrades, set: setMaxTrades, placeholder: "3" },
                { label: "Min días",      val: minDays,   set: setMinDays,   placeholder: "10" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <p className="text-[10px] text-[var(--ink-3)] mb-1">{label}</p>
                  <Input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                    className="text-[12px] h-8" />
                </div>
              ))}
            </div>
          </div>

          {/* Symbols for new phase */}
          {markets.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--ink-3)] mb-1">Símbolos permitidos en {targetPhase}</p>
              <MarketMultiSelect
                markets={markets}
                value={symbols}
                onChange={setSymbols}
                placeholder="Igual que fase anterior…"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-[10px] text-[var(--ink-3)] mb-1">Nota (opcional)</p>
            <Input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ej: FTMO aprobó fase 1 el 23 may…" className="text-[12px]" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" className="flex-1"
              disabled={saving || (needsOverride && !manualOverride)}
              onClick={handleConfirm}>
              {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : <ArrowUpCircle size={13} className="mr-1" />}
              Confirmar promoción
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
