"use client"

import { useState } from "react"
import {
  Plus, X, TrendingUp, TrendingDown, Shield, Target,
  AlertTriangle, CheckCircle2, Clock, BarChart3, ChevronRight,
  Pencil, Archive,
} from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockAccounts } from "@/mock-data"
import type { Account, AccountType } from "@/types"

/* ══════════════════════════════════════
   EXTENDED MOCK STATS PER ACCOUNT
══════════════════════════════════════ */
interface AccountStats {
  currentBalance: number
  pnlMonth: number
  pnlTotal: number
  drawdownPct: number        // current DD from peak
  dailyLossUsedPct: number   // today's loss as % of daily limit
  tradesMonth: number
  tradeWin: number
  winRate: number
  avgR: number
  daysActive: number
  phase: string
  phaseProgressPct: number   // progress toward target %
  status: "EN_FASE" | "APROBADO" | "PAUSADO" | "FALLIDO"
  sparkline: number[]        // last 10 sessions equity
}

const ACCOUNT_STATS: Record<string, AccountStats> = {
  "acc-1": {
    currentBalance: 103_640, pnlMonth: 3_640, pnlTotal: 3_640,
    drawdownPct: 0.4, dailyLossUsedPct: 0,
    tradesMonth: 23, tradeWin: 15, winRate: 65, avgR: 1.8,
    daysActive: 52, phase: "Phase 2", phaseProgressPct: 45,
    status: "EN_FASE",
    sparkline: [100000, 100420, 101200, 100640, 101900, 102440, 101800, 102960, 103200, 103640],
  },
  "acc-2": {
    currentBalance: 51_080, pnlMonth: 1_080, pnlTotal: 1_080,
    drawdownPct: 1.2, dailyLossUsedPct: 55,
    tradesMonth: 11, tradeWin: 6, winRate: 55, avgR: 1.2,
    daysActive: 21, phase: "Phase 1", phaseProgressPct: 22,
    status: "EN_FASE",
    sparkline: [50000, 50200, 50800, 50400, 51000, 50600, 50900, 51200, 50900, 51080],
  },
  "acc-3": {
    currentBalance: 24_320, pnlMonth: -680, pnlTotal: -680,
    drawdownPct: 2.7, dailyLossUsedPct: 0,
    tradesMonth: 6, tradeWin: 3, winRate: 50, avgR: 0.8,
    daysActive: 18, phase: "Personal", phaseProgressPct: 0,
    status: "PAUSADO",
    sparkline: [25000, 24800, 25100, 24600, 24900, 24400, 24700, 24500, 24350, 24320],
  },
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const TYPE_META: Record<AccountType, { label: string; color: string; bg: string }> = {
  PROP_FIRM: { label: "Prop Firm", color: "#4f6ef7", bg: "rgba(79,110,247,0.12)" },
  PERSONAL:  { label: "Personal",  color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  DEMO:      { label: "Demo",      color: "#9b59b6", bg: "rgba(155,89,182,0.12)" },
  QA:        { label: "QA",        color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
}

const STATUS_META: Record<AccountStats["status"], { label: string; color: string; icon: React.ReactNode }> = {
  EN_FASE:  { label: "En fase",  color: "#4f6ef7", icon: <Target size={10} /> },
  APROBADO: { label: "Aprobado", color: "#22c55e", icon: <CheckCircle2 size={10} /> },
  PAUSADO:  { label: "Pausado",  color: "#f59e0b", icon: <Clock size={10} /> },
  FALLIDO:  { label: "Fallido",  color: "#ef4444", icon: <AlertTriangle size={10} /> },
}

/* ── Mini sparkline ── */
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const W = 120, H = 36
  const max = Math.max(...data), min = Math.min(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 4 - ((v - min) / rng) * (H - 8),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = line + ` L${W},${H} L0,${H} Z`
  const color = positive ? "var(--win)" : "var(--loss)"
  const id = `sp-${positive ? "w" : "l"}-${Math.random().toString(36).slice(2, 6)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ── Risk gauge bar ── */
function RiskBar({ label, usedPct, limitLabel, warnAt = 60, dangerAt = 85 }: {
  label: string; usedPct: number; limitLabel: string; warnAt?: number; dangerAt?: number
}) {
  const color = usedPct >= dangerAt ? "var(--loss)" : usedPct >= warnAt ? "var(--be)" : "var(--win)"
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[var(--ink-3)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold" style={{ color }}>{usedPct.toFixed(0)}%</span>
          <span className="text-[10px] text-[var(--ink-3)]">de {limitLabel}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(usedPct, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   ACCOUNT CARD
══════════════════════════════════════ */
function AccountCard({ account, stats, selected, onClick }: {
  account: Account; stats: AccountStats; selected: boolean; onClick: () => void
}) {
  const tm   = TYPE_META[account.type]
  const sm   = STATUS_META[stats.status]
  const pos  = stats.pnlMonth >= 0
  const ddOk = stats.drawdownPct < (account.propFirmRules?.maxDrawdownPct ?? 10) * 0.7

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
              <p className="font-semibold text-[var(--ink)] leading-tight">{account.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tm.bg, color: tm.color }}>
                {tm.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{account.broker} · {account.currency} · {stats.daysActive}d activa</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full"
            style={{ background: `${sm.color}18`, color: sm.color }}>
            {sm.icon}
            <span className="text-[10px] font-bold ml-1">{sm.label}</span>
          </div>
        </div>

        {/* Balance + P&L */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <p className="text-eyebrow mb-1">Balance actual</p>
            <p className="text-[22px] font-mono font-bold text-[var(--ink)] leading-none">
              ${stats.currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-eyebrow mb-1">P&L mes</p>
            <p className={cn("text-[15px] font-mono font-bold", pos ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {pos ? "+" : ""}${Math.abs(stats.pnlMonth).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-eyebrow mb-1">Win %</p>
            <p className={cn("text-[15px] font-mono font-bold", stats.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {stats.winRate}%
            </p>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ margin: "0 -4px" }}>
          <MiniSparkline data={stats.sparkline} positive={pos} />
        </div>

        {/* Prop firm section */}
        {account.propFirmRules && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield size={11} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">Reglas prop firm</p>
              {stats.phaseProgressPct > 0 && (
                <span className="ml-auto text-[10px] font-mono text-[var(--win)]">
                  {stats.phase} · {stats.phaseProgressPct}% objetivo
                </span>
              )}
            </div>
            <RiskBar
              label="Drawdown total"
              usedPct={(stats.drawdownPct / account.propFirmRules.maxDrawdownPct) * 100}
              limitLabel={`${account.propFirmRules.maxDrawdownPct}%`}
            />
            <RiskBar
              label="Pérdida diaria"
              usedPct={stats.dailyLossUsedPct}
              limitLabel={`${account.propFirmRules.dailyLossPct}%`}
            />
            {/* Phase progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-[var(--ink-3)]">Progreso hacia objetivo</span>
                <span className="text-[11px] font-mono font-semibold text-[var(--win)]">
                  {stats.phaseProgressPct}% / {account.propFirmRules.targetPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-[var(--accent)]"
                  style={{ width: `${Math.min((stats.phaseProgressPct / account.propFirmRules.targetPct) * 100, 100)}%` }} />
              </div>
            </div>
            {/* Trades + symbols */}
            <div className="flex justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1">
                <BarChart3 size={10} className="text-[var(--ink-3)]" />
                <span className="text-[var(--ink-3)]">Trades hoy:</span>
                <span className={cn("font-mono font-semibold ml-0.5",
                  stats.tradesMonth > 0 && account.propFirmRules.maxTradesPerDay > 0
                    ? "text-[var(--ink)]" : "text-[var(--ink-3)]")}>
                  0 / {account.propFirmRules.maxTradesPerDay}
                </span>
              </div>
              <span className="text-[var(--ink-3)] truncate max-w-[130px]">
                {account.propFirmRules.allowedSymbols.join(", ")}
              </span>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex justify-between text-[11px] pt-2 border-t border-[var(--line)]">
          <div>
            <p className="text-[var(--ink-3)] mb-0.5">Trades mes</p>
            <p className="font-mono font-semibold text-[var(--ink)]">{stats.tradesMonth}</p>
          </div>
          <div className="text-center">
            <p className="text-[var(--ink-3)] mb-0.5">Avg R</p>
            <p className={cn("font-mono font-semibold", stats.avgR >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {stats.avgR >= 0 ? "+" : ""}{stats.avgR.toFixed(1)}R
            </p>
          </div>
          <div className="text-right">
            <p className="text-[var(--ink-3)] mb-0.5">Drawdown</p>
            <p className={cn("font-mono font-semibold", ddOk ? "text-[var(--ink-2)]" : "text-[var(--be)]")}>
              -{stats.drawdownPct.toFixed(1)}%
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
function AccountDetailPanel({ account, stats, onClose }: {
  account: Account; stats: AccountStats; onClose: () => void
}) {
  const tm  = TYPE_META[account.type]
  const sm  = STATUS_META[stats.status]
  const pos = stats.pnlMonth >= 0

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
          {account.propFirmRules && (
            <span className="text-[10px] ml-1 opacity-70">· {stats.phase}</span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Equity curve */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-eyebrow">Curva de balance</span>
            <span className={cn("text-[12px] font-mono font-bold", pos ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {pos ? "+" : ""}${Math.abs(stats.pnlMonth).toLocaleString()} este mes
            </span>
          </div>
          <MiniSparkline data={stats.sparkline} positive={pos} />
          <div className="flex justify-between mt-1 text-[10px] text-[var(--ink-3)]">
            <span>Inicio</span>
            <span className="font-mono font-semibold text-[var(--ink)]">${stats.currentBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Balance",     value: `$${stats.currentBalance.toLocaleString()}`, mono: true },
            { label: "P&L mes",     value: `${pos ? "+" : ""}$${Math.abs(stats.pnlMonth).toLocaleString()}`, mono: true, pos },
            { label: "Win Rate",    value: `${stats.winRate}%`,                         mono: true, pos: stats.winRate >= 50 },
            { label: "Avg R",       value: `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(1)}R`, mono: true, pos: stats.avgR >= 0 },
            { label: "Trades mes",  value: String(stats.tradesMonth) },
            { label: "Días activa", value: `${stats.daysActive}d` },
          ].map(({ label, value, mono, pos: p }) => (
            <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
              <p className={cn(
                "text-[14px] font-bold leading-none",
                mono && "font-mono",
                p === undefined ? "text-[var(--ink)]" : p ? "text-[var(--win)]" : "text-[var(--loss)]"
              )}>{value}</p>
            </div>
          ))}
        </div>

        {/* Prop firm rules detail */}
        {account.propFirmRules && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={12} className="text-[var(--ink-3)]" />
              <p className="text-eyebrow">Reglas Prop Firm</p>
            </div>
            <div className="flex flex-col gap-3 bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4 border border-[var(--line)]">
              <RiskBar label="Drawdown total utilizado"
                usedPct={(stats.drawdownPct / account.propFirmRules.maxDrawdownPct) * 100}
                limitLabel={`${account.propFirmRules.maxDrawdownPct}% max`} />
              <RiskBar label="Pérdida diaria utilizada"
                usedPct={stats.dailyLossUsedPct}
                limitLabel={`${account.propFirmRules.dailyLossPct}% límite`} />
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--ink-3)]">Progreso hacia objetivo ({account.propFirmRules.targetPct}%)</span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">{stats.phaseProgressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.min((stats.phaseProgressPct / account.propFirmRules.targetPct) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
                {[
                  ["Max DD", `${account.propFirmRules.maxDrawdownPct}%`],
                  ["Daily Loss", `${account.propFirmRules.dailyLossPct}%`],
                  ["Max trades/día", String(account.propFirmRules.maxTradesPerDay)],
                  ["Objetivo", `${account.propFirmRules.targetPct}%`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-[var(--ink-3)]">{k}</span>
                    <span className="font-mono font-semibold text-[var(--ink)]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] flex justify-between pt-1 border-t border-[var(--line)]">
                <span className="text-[var(--ink-3)]">Símbolos permitidos</span>
                <span className="font-mono text-[var(--ink)]">{account.propFirmRules.allowedSymbols.join(", ")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick info */}
        <div className="flex flex-col gap-2 text-[11px]">
          <p className="text-eyebrow">Configuración</p>
          <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 border border-[var(--line)] flex flex-col gap-2">
            {[
              ["Broker",    account.broker],
              ["Balance inicial", `$${account.initialBalance.toLocaleString()}`],
              ["Divisa",    account.currency],
              ["Timezone",  account.timezone],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[var(--ink-3)]">{k}</span>
                <span className="font-mono text-[var(--ink)]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            <Pencil size={11} /> Editar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            <BarChart3 size={11} /> Ver trades
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--loss)] transition-colors">
            <Archive size={11} /> Archivar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   NUEVA CUENTA MODAL
══════════════════════════════════════ */
const ACCOUNT_TYPES: AccountType[] = ["PROP_FIRM", "PERSONAL", "DEMO", "QA"]
const BROKERS = ["FXify", "FTMO", "MyForexFunds", "TopStep", "Apex", "Interactive Brokers", "TD Ameritrade", "Otro"]
const TIMEZONES = [
  { value: "America/New_York",  label: "America/New_York (ET)" },
  { value: "America/Chicago",   label: "America/Chicago (CT)" },
  { value: "Europe/London",     label: "Europe/London (GMT)" },
  { value: "Europe/Madrid",     label: "Europe/Madrid (CET)" },
]

interface NewAccountForm {
  tipo: AccountType
  nombre: string
  broker: string
  balance: string
  currency: string
  timezone: string
  // prop firm
  maxDrawdown: string
  dailyLoss: string
  maxTrades: string
  targetPct: string
  symbols: string
}

const FORM_INIT: NewAccountForm = {
  tipo: "PROP_FIRM", nombre: "", broker: "", balance: "", currency: "USD",
  timezone: "America/New_York",
  maxDrawdown: "10", dailyLoss: "5", maxTrades: "3", targetPct: "8", symbols: "NQ, ES, MNQ",
}

function NuevaCuentaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<NewAccountForm>(FORM_INIT)
  const [tab, setTab]   = useState<"general" | "reglas">("general")

  const set = <K extends keyof NewAccountForm>(k: K, v: NewAccountForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const tm      = TYPE_META[form.tipo]
  const preview = form.nombre || "Nombre de la cuenta"

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(FORM_INIT); setTab("general") } }}>
      <DialogContent className="max-w-[580px] max-h-[90vh] overflow-y-auto">
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
              {t === "general" ? "🏦 General" : "🛡 Reglas Prop Firm"}
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
                        {t === "PROP_FIRM" ? "PROP" : t}
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

            {form.tipo === "PROP_FIRM" && (
              <button onClick={() => setTab("reglas")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors">
                Continuar → Configurar reglas prop firm
              </button>
            )}
          </div>
        )}

        {tab === "reglas" && (
          <div className="flex flex-col gap-4">
            {/* Info banner */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.2)" }}>
              <Shield size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[var(--accent)]">Reglas Prop Firm</p>
                <p className="text-[11px] text-[var(--ink-3)]">Estas reglas se usan para calcular el risk engine y mostrar alertas antes de cada trade.</p>
              </div>
            </div>

            {/* Limits */}
            <div>
              <p className="text-eyebrow mb-2">Límites de pérdida</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-eyebrow block mb-1.5">Max Drawdown total</label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="10" value={form.maxDrawdown} mono
                      onChange={e => set("maxDrawdown", e.target.value)} />
                    <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                  </div>
                  <p className="text-[10px] text-[var(--ink-3)] mt-1">Pérdida máxima desde balance inicial</p>
                </div>
                <div>
                  <label className="text-eyebrow block mb-1.5">Pérdida diaria máx</label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="5" value={form.dailyLoss} mono
                      onChange={e => set("dailyLoss", e.target.value)} />
                    <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                  </div>
                  <p className="text-[10px] text-[var(--ink-3)] mt-1">Límite de pérdida en un día calendario</p>
                </div>
              </div>
            </div>

            {/* Objective + trades */}
            <div>
              <p className="text-eyebrow mb-2">Objetivo y actividad</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-eyebrow block mb-1.5">Objetivo de la fase</label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="8" value={form.targetPct} mono
                      onChange={e => set("targetPct", e.target.value)} />
                    <span className="text-sm text-[var(--ink-3)] shrink-0">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-eyebrow block mb-1.5">Max trades por día</label>
                  <Input placeholder="3" value={form.maxTrades} mono
                    onChange={e => set("maxTrades", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Symbols */}
            <div>
              <label className="text-eyebrow block mb-1.5">Símbolos permitidos</label>
              <Input placeholder="NQ, ES, MNQ, MES, GC" value={form.symbols}
                onChange={e => set("symbols", e.target.value)} />
              <p className="text-[10px] text-[var(--ink-3)] mt-1">Separados por coma. El risk engine bloqueará trades en otros símbolos.</p>
            </div>

            {/* Preview card */}
            <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] border border-[var(--line)] p-4">
              <p className="text-eyebrow mb-3">Vista previa de reglas</p>
              <div className="flex flex-col gap-2">
                <RiskBar label="Max Drawdown" usedPct={0} limitLabel={`${form.maxDrawdown || 10}%`} />
                <RiskBar label="Pérdida diaria" usedPct={0} limitLabel={`${form.dailyLoss || 5}%`} />
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-[var(--ink-3)]">Progreso hacia {form.targetPct || 8}%</span>
                    <span className="text-[11px] font-mono text-[var(--ink-3)]">0%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--line)]" />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "reglas" && (
            <Button variant="ghost" onClick={() => setTab("general")}>← Volver</Button>
          )}
          <Button variant="primary" onClick={() => onOpenChange(false)}>Crear cuenta</Button>
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
  const [selected, setSelected]   = useState<Account | null>(null)

  const allStats   = mockAccounts.map(a => ACCOUNT_STATS[a.id] ?? ACCOUNT_STATS["acc-1"])
  const totalBal   = allStats.reduce((s, a) => s + a.currentBalance, 0)
  const totalPnl   = allStats.reduce((s, a) => s + a.pnlMonth, 0)
  const bestDD     = Math.min(...allStats.map(a => a.drawdownPct))
  const activeAccs = mockAccounts.filter(a => {
    const st = ACCOUNT_STATS[a.id]?.status
    return st === "EN_FASE" || st === "APROBADO"
  }).length

  const selectedStats = selected ? ACCOUNT_STATS[selected.id] : null

  return (
    <>
      <div style={{ margin: selected ? undefined : undefined }}>
        <TopBar
          title="Cuentas"
          subtitle={`${mockAccounts.length} cuentas · ${activeAccs} activas`}
          actions={[{ label: "Nueva cuenta", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiBox label="Balance total" value={`$${totalBal.toLocaleString()}`}
            sub={`${mockAccounts.length} cuentas`}
            icon={<BarChart3 size={15} className="text-[var(--ink-3)]" />} />
          <KpiBox label="P&L este mes" value={`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString()}`}
            sub="todas las cuentas" positive={totalPnl >= 0}
            icon={totalPnl >= 0 ? <TrendingUp size={15} className="text-[var(--win)]" /> : <TrendingDown size={15} className="text-[var(--loss)]" />} />
          <KpiBox label="Menor drawdown" value={`-${bestDD.toFixed(1)}%`}
            sub="mejor cuenta activa" positive={bestDD < 3}
            icon={<Shield size={15} className="text-[var(--ink-3)]" />} />
          <KpiBox label="Cuentas activas" value={String(activeAccs)}
            sub={`de ${mockAccounts.length} total`}
            icon={<CheckCircle2 size={15} className="text-[var(--ink-3)]" />} />
        </div>

        {/* Main layout */}
        <div className="flex gap-4 items-start">
          {/* Cards */}
          <div className={cn("grid gap-4 flex-1", selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
            {mockAccounts.map(a => (
              <AccountCard
                key={a.id}
                account={a}
                stats={ACCOUNT_STATS[a.id] ?? ACCOUNT_STATS["acc-1"]}
                selected={selected?.id === a.id}
                onClick={() => setSelected(s => s?.id === a.id ? null : a)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selected && selectedStats && (
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
                stats={selectedStats}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      </div>

      <NuevaCuentaModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
