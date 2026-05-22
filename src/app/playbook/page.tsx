"use client"

import { useState } from "react"
import { Plus, X, Star, TrendingUp, TrendingDown, ChevronRight, Circle, CheckCircle2, Pencil, Copy, Pause, Play } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"

/* ── Types ── */
type Direction = "LONG" | "SHORT" | "AMBAS"
type SetupStatus = "ACTIVO" | "PAUSADO"

interface SetupData {
  id: string
  abbr: string
  name: string
  market: string
  direction: Direction
  status: SetupStatus
  description: string
  color: string
  wr: number
  avgR: number
  trades: number
  totalPnl: number
  expectancy: number
  aplusRate: number        // % of trades tagged A+
  sparkline: number[]      // equity curve data points
  bestTrade: { r: number; date: string }
  worstTrade: { r: number; date: string }
  sessionBreakdown: { session: string; wr: number; trades: number }[]
  aplusChecklist: string[]
  standardChecklist: string[]
}

/* ── Mock setups (extended from mockSetups + extra stats) ── */
const SETUPS: SetupData[] = [
  {
    id: "setup-1", abbr: "OR", name: "Opening Range Break", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#f59e0b",
    description: "Ruptura del rango de apertura de los primeros 15 minutos en killzone NY. Alta probabilidad cuando hay confluencia HTF y volumen sobre promedio.",
    wr: 64, avgR: 1.80, trades: 18, totalPnl: 8640, expectancy: 1.15, aplusRate: 72,
    sparkline: [0, 840, 1260, 2940, 2100, 4200, 5460, 6300, 5040, 8640],
    bestTrade: { r: 3.2, date: "19 may" }, worstTrade: { r: -1.2, date: "8 may" },
    sessionBreakdown: [
      { session: "New York", wr: 68, trades: 14 },
      { session: "London",   wr: 50, trades: 4  },
    ],
    aplusChecklist: [
      "Range definido en primeros 15min",
      "Breakout con volumen > 150% promedio",
      "Confluencia HTF 1H/4H alcista",
      "Stop bajo mínimo del rango",
      "Killzone NY activa (9:30–11:00)",
    ],
    standardChecklist: [
      "Setup #1 o #2 del día",
      "Risk ≤ 1R",
      "RR mínimo 1.5:1",
      "Sin noticias en próximos 30min",
    ],
  },
  {
    id: "setup-2", abbr: "FA", name: "Failed Auction", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#ef4444",
    description: "Subasta fallida en nivel de liquidez previo. El precio intenta superar un extremo pero falla con volumen alto, generando reversión.",
    wr: 52, avgR: 8.90, trades: 11, totalPnl: 5082, expectancy: 0.98, aplusRate: 55,
    sparkline: [0, 420, 980, 560, 1120, 700, 1540, 2100, 1680, 5082],
    bestTrade: { r: 8.9, date: "15 may" }, worstTrade: { r: -1.0, date: "6 may" },
    sessionBreakdown: [
      { session: "London",   wr: 60, trades: 5 },
      { session: "New York", wr: 45, trades: 6 },
    ],
    aplusChecklist: [
      "Subasta previa claramente identificada",
      "Rechazo en nivel con volumen alto",
      "Confluencia HTF 4H/D confirma dirección",
      "Stop estructural sobre high/low previo",
      "Sesión London o NY activa",
    ],
    standardChecklist: [
      "Setup #1 o #2 del día",
      "Risk ≤ 1R",
      "RR mínimo 2:1",
      "Nivel de liquidez claramente visible",
    ],
  },
  {
    id: "setup-3", abbr: "BB", name: "MMXM — Breaker Block", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#4f6ef7",
    description: "Modelo MMXM completo en breaker block. Requiere CHoCH confirmado, mitigation en OB previo y entrada en zona premium/discount.",
    wr: 58, avgR: 2.10, trades: 14, totalPnl: 6720, expectancy: 1.22, aplusRate: 64,
    sparkline: [0, 480, 1200, 960, 1920, 1440, 2880, 4320, 3840, 6720],
    bestTrade: { r: 3.8, date: "20 may" }, worstTrade: { r: -1.0, date: "12 may" },
    sessionBreakdown: [
      { session: "London",       wr: 67, trades: 6 },
      { session: "New York",     wr: 55, trades: 7 },
      { session: "London Close", wr: 100, trades: 1 },
    ],
    aplusChecklist: [
      "Breaker block identificado en HTF (1H+)",
      "Mitigation en zona de OB previo",
      "Estructura interna rota (CHoCH confirmado)",
      "Entrada en zona premium/discount",
      "Killzone London o NY activa",
    ],
    standardChecklist: [
      "Modelo MMXM completo presente",
      "Risk ≤ 1R",
      "RR mínimo 2:1",
      "Sin solapamiento de noticias mayores",
    ],
  },
  {
    id: "setup-4", abbr: "LG", name: "Liquidity Grab", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#22c55e",
    description: "Barrida de liquidez en extremos de sesión previa. El precio captura stops y revierte agresivamente.",
    wr: 71, avgR: 2.20, trades: 14, totalPnl: 9240, expectancy: 1.56, aplusRate: 78,
    sparkline: [0, 660, 1320, 2640, 2200, 3960, 5720, 6600, 7480, 9240],
    bestTrade: { r: 4.1, date: "19 may" }, worstTrade: { r: -0.8, date: "5 may" },
    sessionBreakdown: [
      { session: "New York", wr: 75, trades: 8 },
      { session: "London",   wr: 67, trades: 6 },
    ],
    aplusChecklist: [
      "Extremo de sesión previa claramente definido",
      "Barrida con wick > 50% de la vela",
      "Reversión inmediata en misma vela",
      "Confluencia HTF alineada",
      "Killzone activa",
    ],
    standardChecklist: [
      "Liquidez visible en gráfico (highs/lows)",
      "Risk ≤ 1R",
      "RR mínimo 2:1",
      "Sin news de alto impacto",
    ],
  },
  {
    id: "setup-5", abbr: "AS", name: "Asia Sweep", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#14b8a6",
    description: "Barrida del rango asiático al inicio de sesión London. Opera la reversión tras tomar liquidez de la sesión anterior.",
    wr: 55, avgR: 1.10, trades: 9, totalPnl: 2475, expectancy: 0.61, aplusRate: 44,
    sparkline: [0, 275, 550, 825, 550, 1100, 1650, 1375, 2200, 2475],
    bestTrade: { r: 2.4, date: "16 may" }, worstTrade: { r: -1.0, date: "9 may" },
    sessionBreakdown: [
      { session: "London",   wr: 60, trades: 5 },
      { session: "New York", wr: 50, trades: 4 },
    ],
    aplusChecklist: [
      "Rango asiático claramente definido",
      "Barrida limpia del high o low asiático",
      "London Open activa (3:00–5:00 ET)",
      "Confluencia D1/W1 confirma dirección",
      "Stop sobre extremo barrido",
    ],
    standardChecklist: [
      "Rango asiático > 20 puntos NQ",
      "Risk ≤ 1R",
      "RR mínimo 1.5:1",
      "Sin solapamiento con datos macro",
    ],
  },
  {
    id: "setup-6", abbr: "VW", name: "VWAP Reclaim", market: "NQ Futures",
    direction: "AMBAS", status: "ACTIVO", color: "#a855f7",
    description: "Recuperación del VWAP tras rechazo. Opera la continuación cuando el precio reclaima el VWAP con volumen y estructura intraday favorable.",
    wr: 60, avgR: 1.50, trades: 12, totalPnl: 5400, expectancy: 0.90, aplusRate: 58,
    sparkline: [0, 450, 900, 1800, 1350, 2700, 3600, 4050, 4950, 5400],
    bestTrade: { r: 3.0, date: "13 may" }, worstTrade: { r: -1.1, date: "7 may" },
    sessionBreakdown: [
      { session: "New York", wr: 64, trades: 11 },
      { session: "London",   wr: 0,  trades: 1  },
    ],
    aplusChecklist: [
      "Precio bajo VWAP con mínimo 2 rechazos",
      "Reclaim con vela de cuerpo > 60%",
      "Volumen en reclaim > velas previas",
      "HTF 1H/4H en tendencia alcista/bajista",
      "Entrada en primer pullback post-reclaim",
    ],
    standardChecklist: [
      "VWAP visible en gráfico de 5min",
      "Risk ≤ 1R",
      "RR mínimo 1.5:1",
      "Dentro de horario regular (9:30–15:30)",
    ],
  },
  {
    id: "setup-7", abbr: "TC", name: "Trend Continuation", market: "Equities",
    direction: "LONG", status: "PAUSADO", color: "#9b59b6",
    description: "Continuación de tendencia tras pullback a nivel de soporte/resistencia. Setup pausado — resultados inconsistentes en condiciones actuales de mercado.",
    wr: 49, avgR: 0.60, trades: 6, totalPnl: -720, expectancy: -0.29, aplusRate: 33,
    sparkline: [0, 180, -120, 240, -360, 120, -480, -240, -600, -720],
    bestTrade: { r: 1.8, date: "2 may" }, worstTrade: { r: -1.8, date: "10 may" },
    sessionBreakdown: [{ session: "New York", wr: 49, trades: 6 }],
    aplusChecklist: [
      "Tendencia HTF claramente definida (3+ puntos pivote)",
      "Pullback a nivel Fib 50-61.8%",
      "Confluencia con MA de 20 períodos",
      "Volumen decreciente en pullback",
      "Entrada con confirmación en TF de entrada",
    ],
    standardChecklist: [
      "Tendencia visible en 4H",
      "Risk ≤ 1R",
      "RR mínimo 2:1",
      "Sin earnings ni dividendos en 24h",
    ],
  },
  {
    id: "setup-8", abbr: "NF", name: "News Fade — NFP", market: "NQ Futures",
    direction: "AMBAS", status: "PAUSADO", color: "#6b7280",
    description: "Fade de la primera reacción al NFP. Setup experimental — solo operar con tamaño reducido hasta obtener más datos.",
    wr: 41, avgR: -0.20, trades: 5, totalPnl: -500, expectancy: -0.47, aplusRate: 20,
    sparkline: [0, -100, 200, -200, 100, -300, -100, -400, -300, -500],
    bestTrade: { r: 2.1, date: "1 may" }, worstTrade: { r: -2.0, date: "3 abr" },
    sessionBreakdown: [{ session: "New York", wr: 41, trades: 5 }],
    aplusChecklist: [
      "NFP day confirmado en calendario",
      "Primer spike en primeros 30 segundos",
      "Fade contra dirección del spike",
      "Stop sobre extremo del spike",
      "Reducir tamaño a 50% normal",
    ],
    standardChecklist: [
      "Solo primer viernes del mes",
      "Risk ≤ 0.5R (reducido)",
      "RR mínimo 2:1",
      "Liquidez suficiente en mercado",
    ],
  },
]

/* ── Sparkline with gradient fill ── */
function SparklineArea({ data, color, height = 52 }: { data: number[]; color: string; height?: number }) {
  const W = 200
  const H = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pad = 4
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = line + ` L${W},${H} L0,${H} Z`
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.20} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ── Session pill ── */
const SESSION_COLORS: Record<string, { bg: string; text: string }> = {
  "New York":     { bg: "rgba(79,110,247,0.12)", text: "#4f6ef7" },
  "London":       { bg: "rgba(168,85,247,0.12)", text: "#a855f7" },
  "Asia":         { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
  "London Close": { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
}
function SessionPill({ session, trades }: { session: string; trades: number }) {
  const c = SESSION_COLORS[session] ?? SESSION_COLORS["New York"]
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
        {session}
      </span>
      <span className="text-[11px] font-mono text-[var(--ink-3)]">{trades} trades</span>
    </div>
  )
}

/* ── Stat chip ── */
function StatChip({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold">{label}</span>
      <span className={cn(
        "text-[13px] font-mono font-bold",
        positive === undefined ? "text-[var(--ink-2)]"
          : positive ? "text-[var(--win)]" : "text-[var(--loss)]"
      )}>{value}</span>
    </div>
  )
}

/* ── Setup Card ── */
function SetupCard({ setup, selected, onClick }: { setup: SetupData; selected: boolean; onClick: () => void }) {
  const isPositive = setup.totalPnl >= 0
  const sparkColor = setup.status === "PAUSADO" ? "var(--ink-3)"
    : isPositive ? "var(--win)" : "var(--loss)"

  return (
    <div
      onClick={onClick}
      className="rounded-[var(--radius)] border bg-[var(--panel)] flex flex-col cursor-pointer transition-all duration-150 overflow-hidden"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--line)",
        boxShadow: selected ? "0 0 0 1px var(--accent)" : "none",
        opacity: setup.status === "PAUSADO" ? 0.75 : 1,
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: setup.color, opacity: setup.status === "PAUSADO" ? 0.4 : 1 }} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: setup.color, opacity: setup.status === "PAUSADO" ? 0.5 : 1 }}
            >
              {setup.abbr}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--ink)] leading-tight truncate">{setup.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[var(--ink-3)]">{setup.market}</span>
                <span className="text-[var(--line)]">·</span>
                <span className="text-[10px] text-[var(--ink-3)]">{setup.direction}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {setup.status === "PAUSADO" ? (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink-3)]">PAUSADO</span>
            ) : (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ background: "#22c55e" }}>ACTIVO</span>
            )}
            {setup.aplusRate >= 60 && (
              <div className="flex items-center gap-0.5">
                <Star size={9} className="text-[var(--be)] fill-[var(--be)]" />
                <span className="text-[9px] text-[var(--be)] font-semibold">{setup.aplusRate}% A+</span>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ margin: "0 -4px" }}>
          <SparklineArea data={setup.sparkline} color={sparkColor} height={44} />
        </div>

        {/* Stats row */}
        <div className="flex justify-between items-center">
          <StatChip label="Win %" value={`${setup.wr}%`} positive={setup.wr >= 50} />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="Avg R" value={`${setup.avgR >= 0 ? "+" : ""}${setup.avgR.toFixed(1)}R`} positive={setup.avgR >= 0} />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="P&L" value={`${isPositive ? "+" : ""}$${Math.abs(setup.totalPnl).toLocaleString()}`} positive={isPositive} />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="Trades" value={String(setup.trades)} />
        </div>

        {/* Expectancy bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[var(--ink-3)]">Expectancy</span>
            <span className={cn("text-[10px] font-mono font-semibold", setup.expectancy >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {setup.expectancy >= 0 ? "+" : ""}{setup.expectancy.toFixed(2)}R
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(Math.max((setup.expectancy + 1) / 3 * 100, 0), 100)}%`,
              background: setup.expectancy >= 0 ? "var(--win)" : "var(--loss)",
            }} />
          </div>
        </div>

        {/* Footer: best/worst */}
        <div className="flex justify-between text-[10px] pt-1 border-t border-[var(--line)]">
          <div className="flex items-center gap-1">
            <TrendingUp size={9} className="text-[var(--win)]" />
            <span className="text-[var(--win)] font-mono font-semibold">+{setup.bestTrade.r}R</span>
            <span className="text-[var(--ink-3)]">{setup.bestTrade.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown size={9} className="text-[var(--loss)]" />
            <span className="text-[var(--loss)] font-mono font-semibold">{setup.worstTrade.r}R</span>
            <span className="text-[var(--ink-3)]">{setup.worstTrade.date}</span>
          </div>
        </div>

        <button className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors mt-auto">
          Ver detalle <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── Setup Detail Panel ── */
function SetupDetailPanel({ setup, onClose }: { setup: SetupData; onClose: () => void }) {
  const isPositive = setup.totalPnl >= 0

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-[var(--line)] flex items-start justify-between gap-3 sticky top-0 bg-[var(--panel)] z-10">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold text-white"
            style={{ background: setup.color }}>
            {setup.abbr}
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--ink)]">{setup.name}</p>
            <p className="text-[11px] text-[var(--ink-3)]">{setup.market} · {setup.direction}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)] transition-colors">
          <X size={14} className="text-[var(--ink-3)]" />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Equity curve */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-eyebrow">Curva de equity</span>
            <span className={cn("text-[12px] font-mono font-bold", isPositive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
              {isPositive ? "+" : ""}${setup.totalPnl.toLocaleString()}
            </span>
          </div>
          <SparklineArea data={setup.sparkline} color={isPositive ? "var(--win)" : "var(--loss)"} height={64} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Win Rate",   value: `${setup.wr}%`,    pos: setup.wr >= 50 },
            { label: "Avg R",      value: `${setup.avgR >= 0 ? "+" : ""}${setup.avgR.toFixed(1)}R`, pos: setup.avgR >= 0 },
            { label: "Expectancy", value: `${setup.expectancy >= 0 ? "+" : ""}${setup.expectancy.toFixed(2)}R`, pos: setup.expectancy >= 0 },
            { label: "A+ Rate",    value: `${setup.aplusRate}%`, pos: setup.aplusRate >= 50 },
            { label: "Trades",     value: String(setup.trades) },
            { label: "Net P&L",    value: `${isPositive ? "+" : ""}$${Math.abs(setup.totalPnl).toLocaleString()}`, pos: isPositive },
          ].map(({ label, value, pos }) => (
            <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
              <p className={cn(
                "text-[14px] font-mono font-bold",
                pos === undefined ? "text-[var(--ink)]" : pos ? "text-[var(--win)]" : "text-[var(--loss)]"
              )}>{value}</p>
            </div>
          ))}
        </div>

        {/* Session breakdown */}
        <div>
          <p className="text-eyebrow mb-3">Por sesión</p>
          <div className="flex flex-col gap-2">
            {setup.sessionBreakdown.map(sb => {
              const c = SESSION_COLORS[sb.session] ?? SESSION_COLORS["New York"]
              return (
                <div key={sb.session} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: c.bg, color: c.text }}>
                    {sb.session}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${sb.wr}%`, background: sb.wr >= 50 ? "var(--win)" : "var(--loss)" }} />
                  </div>
                  <span className={cn("text-[11px] font-mono font-semibold shrink-0", sb.wr >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{sb.wr}%</span>
                  <span className="text-[10px] text-[var(--ink-3)] shrink-0">{sb.trades}t</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-eyebrow mb-2">Descripción</p>
          <p className="text-[12px] text-[var(--ink-2)] leading-relaxed bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
            {setup.description}
          </p>
        </div>

        {/* A+ Checklist */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star size={11} className="text-[var(--be)] fill-[var(--be)]" />
            <p className="text-eyebrow">A+ Checklist</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {setup.aplusChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
                <CheckCircle2 size={13} className="text-[var(--be)] mt-0.5 shrink-0" />
                <span className="text-[12px] text-[var(--ink-2)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Checklist */}
        <div>
          <p className="text-eyebrow mb-2">Standard Checklist</p>
          <div className="flex flex-col gap-1.5">
            {setup.standardChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
                <Circle size={13} className="text-[var(--ink-3)] mt-0.5 shrink-0" />
                <span className="text-[12px] text-[var(--ink-2)]">{item}</span>
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
            <Copy size={11} /> Duplicar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            {setup.status === "ACTIVO" ? <><Pause size={11} /> Pausar</> : <><Play size={11} /> Activar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── ChecklistEditor helper ── */
function ChecklistEditor({
  title, icon, items, onChange,
}: {
  title: string
  icon?: React.ReactNode
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-eyebrow">{title}</p>
        <span className="text-[10px] text-[var(--ink-3)] ml-auto">{items.length} ítems</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-center shrink-0">
              <span className="text-[9px] text-[var(--ink-3)]">{i + 1}</span>
            </div>
            <input
              className="flex-1 h-8 px-2.5 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              value={item}
              placeholder={`Ítem ${i + 1}…`}
              onChange={e => {
                const next = [...items]; next[i] = e.target.value; onChange(next)
              }}
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1 text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ""])}
          className="flex items-center justify-center gap-1.5 h-8 text-[11px] text-[var(--ink-3)] border border-dashed border-[var(--line)] rounded-[var(--radius-sm)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus size={11} /> Añadir ítem
        </button>
      </div>
    </div>
  )
}

/* ── Nuevo Setup Modal ── */
const COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#4f6ef7", "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#6b7280"]
const MARKETS = ["NQ Futures", "ES Futures", "GC Futures", "FX", "Equities", "Crypto", "Otro"]

interface NewSetupForm {
  name: string
  abbr: string
  market: string
  direction: Direction
  status: SetupStatus
  description: string
  color: string
  aplusChecklist: string[]
  standardChecklist: string[]
}

const FORM_INIT: NewSetupForm = {
  name: "", abbr: "", market: "NQ Futures", direction: "AMBAS", status: "ACTIVO",
  description: "", color: "#4f6ef7",
  aplusChecklist: ["", "", ""],
  standardChecklist: ["Setup #1 o #2 del día", "Risk ≤ 1R", "RR mínimo 2:1", ""],
}

function NuevoSetupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<NewSetupForm>(FORM_INIT)
  const [tab, setTab]   = useState<"info" | "checklist">("info")

  const set = <K extends keyof NewSetupForm>(key: K, val: NewSetupForm[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const preview = {
    abbr: form.abbr || "??",
    name: form.name || "Nombre del setup",
    wr: 0, avgR: 0, trades: 0, totalPnl: 0,
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setForm(FORM_INIT) }}>
      <DialogContent className="max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold text-white"
              style={{ background: form.color }}>
              {preview.abbr}
            </span>
            <div>
              <DialogTitle className="text-[var(--ink)]">{preview.name}</DialogTitle>
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{form.market} · {form.direction}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[var(--radius-sm)] mb-1">
          {(["info", "checklist"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors capitalize",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}>
              {t === "info" ? "📋 Información" : "✓ Checklists"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="flex flex-col gap-4">

            {/* Nombre + Abreviatura */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Nombre del setup *</label>
                <Input placeholder="MMXM — Breaker Block" value={form.name}
                  onChange={e => set("name", e.target.value)} />
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Abreviatura *</label>
                <Input placeholder="BB" value={form.abbr} maxLength={3}
                  onChange={e => set("abbr", e.target.value.toUpperCase())} mono />
              </div>
            </div>

            {/* Mercado */}
            <div>
              <label className="text-eyebrow block mb-1.5">Mercado *</label>
              <div className="flex gap-1.5 flex-wrap">
                {MARKETS.map(m => (
                  <button key={m} onClick={() => set("market", m)}
                    className={cn("px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors",
                      form.market === m
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Dirección + Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-eyebrow mb-1.5">Dirección</p>
                <div className="flex gap-1.5">
                  {(["LONG", "SHORT", "AMBAS"] as Direction[]).map(d => (
                    <button key={d} onClick={() => set("direction", d)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.direction === d
                          ? d === "LONG" ? "bg-[var(--win)] text-white"
                            : d === "SHORT" ? "bg-[var(--loss)] text-white"
                            : "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-eyebrow mb-1.5">Estado</p>
                <div className="flex gap-1.5">
                  {(["ACTIVO", "PAUSADO"] as SetupStatus[]).map(s => (
                    <button key={s} onClick={() => set("status", s)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.status === s
                          ? s === "ACTIVO" ? "text-white" : "bg-[var(--chip)] text-[var(--ink-2)]"
                          : "bg-[var(--chip)] text-[var(--ink-3)]"
                      )}
                      style={form.status === s && s === "ACTIVO" ? { background: "#22c55e" } : {}}>
                      {s === "ACTIVO" ? "✓ Activo" : "⏸ Pausado"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color */}
            <div>
              <p className="text-eyebrow mb-1.5">Color del setup</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => set("color", c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: form.color === c ? `2px solid ${c}` : "none",
                      outlineOffset: 2,
                    }} />
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="text-eyebrow block mb-1.5">Descripción</label>
              <Textarea placeholder="¿En qué condiciones se ejecuta este setup? Describe el contexto de mercado, la estructura necesaria y los puntos clave de entrada…"
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>

            <button
              onClick={() => setTab("checklist")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors"
            >
              Continuar → Definir Checklists
            </button>
          </div>
        )}

        {tab === "checklist" && (
          <div className="flex flex-col gap-5">
            {/* A+ preview banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Star size={14} className="text-[var(--be)] fill-[var(--be)] shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-[var(--be)]">A+ Checklist</p>
                <p className="text-[11px] text-[var(--ink-3)]">Criterios óptimos. Cuando se cumplan todos → el trade se marca automáticamente como A+.</p>
              </div>
            </div>

            <ChecklistEditor
              title="A+ Checklist"
              icon={<Star size={11} className="text-[var(--be)] fill-[var(--be)]" />}
              items={form.aplusChecklist}
              onChange={items => set("aplusChecklist", items)}
            />

            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] mb-4"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <Circle size={14} className="text-[var(--accent)] shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">Standard Checklist</p>
                  <p className="text-[11px] text-[var(--ink-3)]">Criterios mínimos para tomar el trade. Si se cumplen todos → se marca como Plan.</p>
                </div>
              </div>
              <ChecklistEditor
                title="Standard Checklist"
                items={form.standardChecklist}
                onChange={items => set("standardChecklist", items)}
              />
            </div>

            {/* Summary */}
            <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4 border border-[var(--line)]">
              <p className="text-eyebrow mb-3">Resumen del setup</p>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: form.color }}>
                  {form.abbr || "??"}
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">{form.name || "Nombre del setup"}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">{form.market} · {form.direction} · {form.status}</p>
                </div>
              </div>
              <div className="flex gap-4 text-[11px]">
                <div>
                  <Star size={10} className="inline text-[var(--be)] fill-[var(--be)] mr-1" />
                  <span className="text-[var(--ink-3)]">A+:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.aplusChecklist.filter(Boolean).length} ítems</span>
                </div>
                <div>
                  <Circle size={10} className="inline text-[var(--accent)] mr-1" />
                  <span className="text-[var(--ink-3)]">Standard:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.standardChecklist.filter(Boolean).length} ítems</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "checklist" && (
            <Button variant="ghost" onClick={() => setTab("info")}>← Volver</Button>
          )}
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Guardar setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── KPI strip ── */
function KpiBox({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3">
      <p className="text-eyebrow mb-1">{label}</p>
      <p className={cn("text-[22px] font-mono font-bold leading-none",
        positive === undefined ? "text-[var(--ink)]" : positive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
        {value}
      </p>
      <p className="text-[11px] text-[var(--ink-3)] mt-1">{sub}</p>
    </div>
  )
}

/* ── Page ── */
const MARKET_FILTERS = [
  { value: "TODOS",       label: "Todos" },
  { value: "NQ Futures",  label: "NQ" },
  { value: "ES Futures",  label: "ES" },
  { value: "FX",          label: "FX" },
  { value: "Equities",    label: "Equities" },
]
const STATUS_FILTERS = [
  { value: "TODOS",    label: "Todos" },
  { value: "ACTIVO",   label: "Activos" },
  { value: "PAUSADO",  label: "Pausados" },
]

export default function PlaybookPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState<SetupData | null>(null)
  const [marketF, setMarketF]     = useState("TODOS")
  const [statusF, setStatusF]     = useState("ACTIVO")

  const active  = SETUPS.filter(s => s.status === "ACTIVO")
  const totalPnl = active.reduce((a, s) => a + s.totalPnl, 0)
  const avgWr   = Math.round(active.reduce((a, s) => a + s.wr, 0) / (active.length || 1))
  const totalTrades = SETUPS.reduce((a, s) => a + s.trades, 0)
  const bestSetup = [...active].sort((a, b) => b.expectancy - a.expectancy)[0]

  const visible = SETUPS.filter(s => {
    const mOk = marketF === "TODOS" || s.market === marketF
    const sOk = statusF === "TODOS" || s.status === statusF
    return mOk && sOk
  })

  return (
    <>
      <div style={{ margin: selected ? undefined : undefined }}>
        <TopBar
          title="Playbook"
          subtitle={`${active.length} setups activos · ${SETUPS.length} total`}
          actions={[{ label: "Nuevo setup", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiBox label="P&L Total (activos)"  value={`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString()}`} sub={`${active.length} setups activos`} positive={totalPnl >= 0} />
          <KpiBox label="Win Rate promedio"     value={`${avgWr}%`}                       sub="sobre setups activos"          positive={avgWr >= 50} />
          <KpiBox label="Trades totales"        value={String(totalTrades)}               sub="todos los setups" />
          <KpiBox label="Mejor expectancy"      value={bestSetup ? `+${bestSetup.expectancy.toFixed(2)}R` : "—"} sub={bestSetup?.name ?? ""} positive />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <FilterBar options={MARKET_FILTERS} value={marketF} onChange={setMarketF} />
          <div className="w-px h-4 bg-[var(--line)]" />
          <FilterBar options={STATUS_FILTERS} value={statusF} onChange={setStatusF} />
          <span className="text-[11px] text-[var(--ink-3)] ml-auto">
            {visible.length} setup{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Main layout: cards + optional detail panel */}
        <div className={cn("flex gap-4", selected ? "items-start" : "")}>
          {/* Cards grid */}
          <div className={cn(
            "grid gap-3 flex-1 transition-all",
            selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          )}>
            {visible.map(s => (
              <SetupCard
                key={s.id}
                setup={s}
                selected={selected?.id === s.id}
                onClick={() => setSelected(sel => sel?.id === s.id ? null : s)}
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
              <SetupDetailPanel setup={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>

      <NuevoSetupModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
