"use client"

import { useState } from "react"
import {
  Target, Shield, BarChart3, ChevronRight,
  CheckCircle2, PauseCircle, Archive, XCircle, ArrowUpDown, Lock,
} from "lucide-react"
import { RuleBar } from "@/components/ui/rule-bar"
import { MiniSparkline } from "@/components/ui/mini-sparkline"
import { isPermanentLockReason } from "@/domains/trading/services/risk-engine"
import type { AccountType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"
import { trpc } from "@/lib/trpc/client"

export type RawAccount = RouterOutputs["accounts"]["list"][number]

type AccountRisk = RouterOutputs["trades"]["dashboardStats"]["accountStats"][number]["risk"]

export interface TradeStats {
  netPnl: number
  pnlMonth: number
  pnlWeek: number
  pnlToday: number
  winRate: number | null
  avgR: number | null
  tradesMonth: number
  tradesToday: number
  tradesTotal: number
  drawdownPct: number
  sparkline: number[]
  risk: AccountRisk
}

export const TYPE_META: Record<AccountType, { label: string; color: string; bg: string }> = {
  PROP_FIRM:    { label: "Prop Firm",    color: "#4f6ef7", bg: "rgba(79,110,247,0.12)"  },
  PERSONAL:     { label: "Personal",     color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  DEMO_PROP:    { label: "Demo PF",      color: "#9b59b6", bg: "rgba(155,89,182,0.12)"  },
  DEMO_PERSONAL:{ label: "Demo",         color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  BACKTEST:     { label: "Backtest",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  QA:           { label: "QA",           color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
}

export const ACCOUNT_STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE:   { label: "Activa",   color: "#22c55e", icon: <CheckCircle2 size={10} /> },
  PAUSED:   { label: "Pausada",  color: "#f59e0b", icon: <PauseCircle size={10} /> },
  INACTIVE: { label: "Inactiva", color: "#6b7280", icon: <Archive size={10} /> },
  LOST:     { label: "Perdida",  color: "#ef4444", icon: <XCircle size={10} /> },
}

export const isPropFirmLike = (type: AccountType) => type === "PROP_FIRM" || type === "DEMO_PROP"

export function KpiBox({ label, value, sub, positive, icon }: {
  label: string; value: string; sub: string; positive?: boolean; icon: React.ReactNode
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--panel-2)] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-eyebrow mb-0.5">{label}</p>
        <p className={`text-[20px] font-mono font-bold leading-none ${positive === undefined ? "text-[var(--ink)]" : positive ? "text-[var(--win)]" : "text-[var(--loss)]"}`}>
          {value}
        </p>
        <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export function AccountCard({ rawAccount, selected, onClick, stats, onSyncBalance }: {
  rawAccount:     RawAccount
  selected:       boolean
  onClick:        () => void
  stats?:         TradeStats
  onSyncBalance?: (e: React.MouseEvent) => void
}) {
  const { data: varianceData } = trpc.accounts.getBalanceVariance.useQuery(rawAccount.id)
  const variance = varianceData?.totalVariance ?? null

  const type   = rawAccount.type as AccountType
  const tm     = TYPE_META[type] ?? TYPE_META.PERSONAL
  const status = (rawAccount.status as string) ?? "ACTIVE"
  const sm     = ACCOUNT_STATUS_META[status] ?? ACCOUNT_STATUS_META.ACTIVE
  const isPF   = isPropFirmLike(type)
  const phase  = (rawAccount.phase as string) ?? "NONE"

  const initialBalance = Number(rawAccount.initialBalance)
  // Current equity = starting capital + realized trade P&L + balance adjustments
  // (sync corrections). Adjustments move the balance but not trade-derived metrics.
  const balanceAdjustment = variance ?? 0
  const currentEquity = initialBalance + (stats?.netPnl ?? 0) + balanceAdjustment
  // Read clock once at mount — keeps render pure (Date.now() is impure during render)
  const [now] = useState(() => Date.now())
  const daysActive = Math.max(0, Math.floor((now - new Date(rawAccount.createdAt).getTime()) / 86_400_000))

  const flatLine  = Array(10).fill(initialBalance)
  const sparkData = (stats?.sparkline && stats.sparkline.length > 1) ? stats.sparkline : flatLine
  const sparkPos  = stats ? stats.netPnl >= 0 : true

  // Lock badge: permanent locks (total DD / manual) persist via the DB flag;
  // temporal locks (daily/weekly/monthly) reflect the live current-period breach
  // so they clear automatically once the period rolls over.
  const lockReason = (rawAccount as { lockReason?: string }).lockReason ?? ""
  const isLocked   = (rawAccount as { locked?: boolean }).locked ?? false
  const isBlocked  = (isLocked && isPermanentLockReason(lockReason)) || !!stats?.risk.breach

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="rounded-[var(--radius)] border bg-[var(--panel)] flex flex-col cursor-pointer transition-all duration-150 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--line)",
        boxShadow: selected
          ? "0 0 0 1px var(--accent), var(--shadow-sm)"
          : undefined,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)" }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "var(--line)" }}
    >
      <div style={{ height: 4, background: tm.color }} />

      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[var(--ink)] leading-tight">{rawAccount.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
              {isBlocked && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--loss-soft)", color: "var(--loss)" }}>
                  <Lock size={8} /> BLOQUEADA
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{rawAccount.broker} · {rawAccount.currency} · {daysActive}d activa</p>
          </div>
          {isPF ? (
            <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full bg-[rgba(79,110,247,0.12)] text-[#4f6ef7]">
              <Target size={10} />
              <span className="text-[10px] font-bold ml-1">
                {phase === "PHASE_1" ? "Fase 1" : phase === "PHASE_2" ? "Fase 2" : phase === "FUNDED" ? "Funded" : "En fase"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full" style={{ background: `${sm.color}18`, color: sm.color }}>
              {sm.icon}
              <span className="text-[10px] font-bold ml-1">{sm.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-eyebrow mb-1">Balance actual</p>
            <p className="text-[22px] font-mono font-bold text-[var(--ink)] leading-none truncate">
              ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[var(--ink-3)] mt-1">inicial ${initialBalance.toLocaleString()}</p>
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

        <div style={{ margin: "0 -4px" }}>
          <MiniSparkline data={sparkData} positive={sparkPos} />
        </div>

        {(rawAccount.ddDailyPct != null || rawAccount.ddWeeklyPct != null || rawAccount.ddMonthlyPct != null || rawAccount.ddTotalPct != null || rawAccount.targetPct != null) && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield size={11} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">
                {isPF ? (type === "DEMO_PROP" ? "Reglas Demo PF" : "Reglas Prop Firm") : type === "BACKTEST" ? "Objetivos Backtest" : type === "DEMO_PERSONAL" ? "Límites Demo" : "Objetivos & Límites"}
              </p>
              {isPF && (
                <span className="ml-auto text-[10px] font-mono text-[var(--ink-3)]">
                  {phase === "PHASE_1" ? "Fase 1" : phase === "PHASE_2" ? "Fase 2" : "Funded"}
                  {rawAccount.targetPct != null ? ` · objetivo ${Number(rawAccount.targetPct)}%` : ""}
                </span>
              )}
            </div>
            {/* Risk gauges — single source of truth (stats.risk). Bar fills by limit
                utilization; the number shows actual% / limit% (BUG#1 fix). */}
            {rawAccount.ddTotalPct != null && (
              <RuleBar label="Drawdown total" usedPct={stats?.risk.total.usedPct ?? 0}
                displayRight={stats ? `${stats.risk.total.actualPct.toFixed(1)}% / ${Number(rawAccount.ddTotalPct).toFixed(1)}%` : `— / ${Number(rawAccount.ddTotalPct)}%`} />
            )}
            {rawAccount.ddDailyPct != null && (
              <RuleBar label="Pérdida diaria" usedPct={stats?.risk.daily.usedPct ?? 0}
                displayRight={stats ? `${stats.risk.daily.actualPct.toFixed(1)}% / ${Number(rawAccount.ddDailyPct).toFixed(1)}%` : `— / ${Number(rawAccount.ddDailyPct)}%`} />
            )}
            {rawAccount.ddWeeklyPct != null && (
              <RuleBar label="Pérdida semanal" usedPct={stats?.risk.weekly.usedPct ?? 0}
                displayRight={stats ? `${stats.risk.weekly.actualPct.toFixed(1)}% / ${Number(rawAccount.ddWeeklyPct).toFixed(1)}%` : `— / ${Number(rawAccount.ddWeeklyPct)}%`} />
            )}
            {rawAccount.ddMonthlyPct != null && (
              <RuleBar label="Pérdida mensual" usedPct={stats?.risk.monthly.usedPct ?? 0}
                displayRight={stats ? `${stats.risk.monthly.actualPct.toFixed(1)}% / ${Number(rawAccount.ddMonthlyPct).toFixed(1)}%` : `— / ${Number(rawAccount.ddMonthlyPct)}%`} />
            )}
            {rawAccount.targetPct != null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--ink-3)]">{isPF ? "Progreso hacia objetivo" : "Objetivo"}</span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--ink-3)]">
                    {stats ? `${Math.max(0, stats.netPnl / initialBalance * 100).toFixed(2)}%` : "—"} / {Number(rawAccount.targetPct)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${stats ? Math.min(100, Math.max(0, stats.netPnl / (initialBalance * Number(rawAccount.targetPct) / 100) * 100)) : 0}%` }} />
                </div>
              </div>
            )}
            {isPF && (rawAccount.maxTradesPerDay != null || rawAccount.allowedSymbols?.length > 0) && (
              <div className="flex justify-between text-[11px] pt-1">
                {rawAccount.maxTradesPerDay != null && (
                  <div className="flex items-center gap-1">
                    <BarChart3 size={10} className="text-[var(--ink-3)]" />
                    <span className="text-[var(--ink-3)]">Trades hoy:</span>
                    <span className="font-mono font-semibold ml-0.5 text-[var(--ink-3)]">{stats?.tradesToday ?? 0} / {rawAccount.maxTradesPerDay}</span>
                  </div>
                )}
                {rawAccount.allowedSymbols?.length > 0 && (
                  <span className="text-[var(--ink-3)] truncate max-w-[130px]">{rawAccount.allowedSymbols.join(", ")}</span>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* ── Balance adjustment from sync corrections (baked into equity above) ── */}
        {variance != null && variance !== 0 && (
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line)]">
            <span className="text-[var(--ink-3)]">Ajuste de balance</span>
            <span className={`font-mono font-semibold ${variance >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"}`}>
              {variance >= 0 ? "+" : ""}${variance.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
          {onSyncBalance && (
            <button
              onClick={onSyncBalance}
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors"
            >
              <ArrowUpDown size={11} />
              Sincronizar balance
            </button>
          )}
          <button className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors ml-auto">
            Ver detalle <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
