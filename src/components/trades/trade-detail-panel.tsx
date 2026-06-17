// TradeDetailPanel — rich detail panel
// Header: symbol + direction + date/time + session pill
// P&L hero, account section, setup+checklist, metrics, notes, actions

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { TagChip } from "@/components/tags/tag-chip"
import { Button } from "@/components/ui/button"
import { X, CheckCircle2, Circle, Star, ImagePlus, Trash2, ChevronDown, ChevronUp, Edit2, Activity, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react"
import type { Trade, TradeSession, Account, Setup } from "@/types"

const SESSION_COLOR: Record<TradeSession, string> = {
  "New York":     "bg-blue-500/15 text-blue-400",
  "London":       "bg-purple-500/15 text-purple-400",
  "Asia":         "bg-amber-500/15 text-amber-400",
  "London Close": "bg-purple-500/10 text-purple-300",
}

const SESSION_SHORT: Record<TradeSession, string> = {
  "New York":     "NY",
  "London":       "London",
  "Asia":         "Asia",
  "London Close": "LDN Close",
}

interface MetricRowProps {
  label: string
  value: string
  mono?: boolean
  valueClassName?: string
}

function MetricRow({ label, value, mono, valueClassName }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--line)] last:border-0">
      <span className="text-xs text-[var(--ink-3)]">{label}</span>
      <span className={cn("text-xs font-medium text-[var(--ink)]", mono && "font-mono", valueClassName)}>
        {value}
      </span>
    </div>
  )
}

interface TradeDetailPanelProps {
  trade: Trade & {
    status?: string
    closePrice?: number | null
    closeTime?: string | null
    commission?: number | null
  }
  account?: Account
  setup?: Setup
  onClose?: () => void
  onDelete?: () => void
  deleting?: boolean
  onEdit?: () => void
  onPositionLog?: () => void
  onCloseTrade?: (data: { closePrice: number; closeTime: string; commission: number }) => void
  closingTrade?: boolean
  /** Dollar value of one full point for this trade's instrument (e.g. NQ = $20). */
  pointValue?: number
  className?: string
}

export function TradeDetailPanel({
  trade, account, setup, onClose, onDelete, deleting,
  onEdit, onPositionLog, onCloseTrade, closingTrade, pointValue = 1, className
}: TradeDetailPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [closeFormOpen, setCloseFormOpen] = useState(false)

  // Escape key to close on desktop
  useEffect(() => {
    if (!onClose) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])
  const [closePrice, setClosePrice]   = useState("")
  const [closeTime, setCloseTime]     = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
  })
  const [commission, setCommission]   = useState("")
  const [commissionError, setCommissionError] = useState(false)

  const pnlPositive = (trade.pnl ?? 0) >= 0
  const rPositive   = (trade.rMultiple ?? 0) >= 0
  const isAplus     = trade.tags.includes("A+")
  const hasScreenshots = (trade.screenshotUrls?.length ?? 0) > 0

  const tradeStatus = (trade as { status?: string }).status ?? (trade.pnl != null ? "CLOSED" : "OPEN")
  const isOpen = tradeStatus === "OPEN" && trade.pnl == null

  // Compute RR from prices
  const riskPts    = Math.abs(trade.entry - trade.stop)
  const rewardPts  = Math.abs(trade.target - trade.entry)
  const rrComputed = riskPts > 0 ? (rewardPts / riskPts).toFixed(2) : "—"

  // Live P&L preview for close form
  const previewPnl = (() => {
    const cp = parseFloat(closePrice)
    const comm = parseFloat(commission)
    if (isNaN(cp)) return null
    const commVal = isNaN(comm) ? 0 : comm
    const rawPnl = (trade.direction === "LONG"
      ? (cp - trade.entry) * trade.size
      : (trade.entry - cp) * trade.size) * pointValue
    return rawPnl - commVal
  })()

  const handleCloseTrade = () => {
    const cp = parseFloat(closePrice)
    const comm = parseFloat(commission)
    // Commission is optional: empty means $0. Only block on non-empty garbage.
    if (commission.trim() !== "" && isNaN(comm)) {
      setCommissionError(true)
      return
    }
    if (isNaN(cp)) return
    setCommissionError(false)
    onCloseTrade?.({
      closePrice: cp,
      closeTime,
      commission: isNaN(comm) ? 0 : comm,
    })
  }

  return (
    <div className={cn("flex flex-col min-h-full bg-[var(--panel)] p-4 gap-4 pb-8", className)}>

      {/* ── Header ── */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex md:hidden items-center gap-1 text-xs text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors -mt-1 mb-1"
        >
          <ArrowLeft size={13} /> Volver
        </button>
      )}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold font-mono text-[var(--ink)]">{trade.symbol}</p>
            <span
              className={cn(
                "inline-flex items-center justify-center h-5 px-2 rounded text-[10px] font-bold",
                trade.direction === "LONG"
                  ? "bg-[var(--win-soft)] text-[var(--win)]"
                  : "bg-[var(--loss-soft)] text-[var(--loss)]"
              )}
            >
              {trade.direction}
            </span>
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
              SESSION_COLOR[trade.session as TradeSession]
            )}>
              {SESSION_SHORT[trade.session as TradeSession]}
            </span>
          </div>
          <p className="text-xs text-[var(--ink-3)]">{trade.date} · {trade.openTime}</p>
        </div>
        {onClose && (
          <Button variant="icon" size="icon" onClick={onClose}>
            <X size={14} />
          </Button>
        )}
      </div>

      {/* ── Result hero ── */}
      {(() => {
        const closed = tradeStatus === "CLOSED" || trade.pnl != null
        const isWin  = closed && (trade.pnl ?? 0) > 0
        const isLoss = closed && (trade.pnl ?? 0) < 0
        const isBE   = closed && (trade.pnl ?? 0) === 0
        return (
          <div className={cn(
            "rounded-[var(--radius-sm)] p-3",
            !closed ? "bg-[var(--panel-2)] border border-[var(--line)]"
              : isWin  ? "bg-[var(--win-soft)]"
              : isLoss ? "bg-[var(--loss-soft)]"
              : "bg-[var(--chip)]"
          )}>
            {/* Status badge */}
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                !closed ? "bg-[var(--chip)] text-[var(--ink-3)]"
                  : isWin  ? "bg-[var(--win)] text-white"
                  : isLoss ? "bg-[var(--loss)] text-white"
                  : "bg-[var(--ink-3)] text-white"
              )}>
                {!closed ? "ABIERTO" : isWin ? "✓ WIN" : isLoss ? "✗ LOSS" : "BE"}
              </span>
              {closed && trade.rMultiple != null && (
                <span className={cn(
                  "text-sm font-bold font-mono",
                  rPositive ? "text-[var(--win)]" : "text-[var(--loss)]"
                )}>
                  {rPositive ? "+" : ""}{trade.rMultiple.toFixed(1)}R
                </span>
              )}
            </div>
            {/* P&L */}
            {!closed ? (
              <p className="text-sm text-[var(--ink-3)] text-center py-1">
                Trade en curso — cierra para registrar P&L
              </p>
            ) : (
              <p className={cn(
                "text-2xl font-bold font-mono text-center",
                isWin ? "text-[var(--win)]" : isLoss ? "text-[var(--loss)]" : "text-[var(--ink-2)]"
              )}>
                {(trade.pnl ?? 0) >= 0 ? "+" : "-"}${Math.abs(trade.pnl ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Close trade form (only when open) ── */}
      {isOpen && onCloseTrade && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden"
          style={{ background: "var(--panel-2)" }}>
          {/* Header toggle */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--chip)] transition-colors"
            onClick={() => setCloseFormOpen(v => !v)}
          >
            <span className="text-sm font-semibold text-[var(--ink)]">Cerrar trade</span>
            {closeFormOpen ? <ChevronUp size={15} className="text-[var(--ink-3)]" /> : <ChevronDown size={15} className="text-[var(--ink-3)]" />}
          </button>

          {closeFormOpen && (
            <div className="border-t border-[var(--line)]">

              {/* ── Live result card ── */}
              {(() => {
                const cp = parseFloat(closePrice)
                const isWin  = previewPnl != null && previewPnl > 0
                const isLoss = previewPnl != null && previewPnl < 0
                const isBE   = previewPnl != null && previewPnl === 0
                // how far close is between stop↔target (0 = at stop, 1 = at target)
                const pct = !isNaN(cp) ? (() => {
                  const s = trade.stop, t = trade.target, e = trade.entry
                  const isLong = trade.direction === "LONG"
                  const lo = isLong ? s : t
                  const hi = isLong ? t : s
                  return Math.min(1, Math.max(0, (cp - lo) / (hi - lo)))
                })() : null

                return (
                  <div className={cn(
                    "mx-3 mt-3 rounded-[var(--radius-sm)] p-3 transition-colors",
                    previewPnl == null ? "bg-[var(--chip)]"
                      : isWin  ? "bg-[var(--win-soft)]"
                      : isLoss ? "bg-[var(--loss-soft)]"
                      : "bg-[var(--chip)]"
                  )}>
                    {/* Result icon + label */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {previewPnl == null
                          ? <Minus size={13} className="text-[var(--ink-3)]" />
                          : isWin  ? <TrendingUp  size={13} className="text-[var(--win)]" />
                          : isLoss ? <TrendingDown size={13} className="text-[var(--loss)]" />
                          : <Minus size={13} className="text-[var(--ink-3)]" />
                        }
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wide",
                          previewPnl == null ? "text-[var(--ink-3)]"
                            : isWin ? "text-[var(--win)]"
                            : isLoss ? "text-[var(--loss)]"
                            : "text-[var(--ink-3)]"
                        )}>
                          {previewPnl == null ? "Ingresa precio" : isWin ? "WIN" : isLoss ? "LOSS" : "Breakeven"}
                        </span>
                      </div>
                      {/* R múltiplo preview */}
                      {previewPnl != null && (() => {
                        const risk = Math.abs(trade.entry - trade.stop) * trade.size * pointValue
                        const r = risk > 0 ? previewPnl / risk : null
                        return r != null ? (
                          <span className={cn("text-xs font-bold font-mono", r >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                            {r >= 0 ? "+" : ""}{r.toFixed(2)}R
                          </span>
                        ) : null
                      })()}
                    </div>

                    {/* P&L number */}
                    <p className={cn(
                      "text-2xl font-bold font-mono text-center",
                      previewPnl == null ? "text-[var(--ink-3)]"
                        : isWin ? "text-[var(--win)]"
                        : isLoss ? "text-[var(--loss)]"
                        : "text-[var(--ink-2)]"
                    )}>
                      {previewPnl == null ? "—"
                        : `${previewPnl >= 0 ? "+" : "-"}$${Math.abs(previewPnl).toFixed(2)}`}
                    </p>

                    {/* Price range bar: stop ←→ target */}
                    {pct != null && (
                      <div className="mt-2.5">
                        <div className="relative h-1.5 rounded-full bg-[var(--line)]">
                          <div className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color]"
                            style={{
                              width: `${pct * 100}%`,
                              background: isWin ? "var(--win)" : isLoss ? "var(--loss)" : "var(--ink-3)",
                            }} />
                          {/* Marker dot */}
                          <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[var(--panel)] transition-[left,background-color]"
                            style={{
                              left: `calc(${pct * 100}% - 5px)`,
                              background: isWin ? "var(--win)" : isLoss ? "var(--loss)" : "var(--ink-3)",
                            }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-[var(--loss)] font-mono">Stop {trade.stop}</span>
                          <span className="text-[9px] text-[var(--win)] font-mono">Target {trade.target}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Inputs ── */}
              <div className="px-3 pt-3 pb-3 flex flex-col gap-2.5">
                {/* Close price — big input */}
                <div>
                  <label className="text-[10px] text-[var(--ink-3)] font-medium block mb-1">Precio de cierre *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-base font-mono font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    placeholder="0.00"
                    value={closePrice}
                    onChange={e => setClosePrice(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  {/* Close time */}
                  <div>
                    <label className="text-[10px] text-[var(--ink-3)] font-medium block mb-1">Hora cierre</label>
                    <input
                      type="time"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                      value={closeTime}
                      onChange={e => setCloseTime(e.target.value)}
                    />
                  </div>
                  {/* Commission */}
                  <div>
                    <label className={cn(
                      "text-[10px] font-medium block mb-1",
                      commissionError ? "text-[var(--loss)]" : "text-[var(--ink-3)]"
                    )}>
                      Comisión $
                    </label>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className={cn(
                        "w-full rounded-[var(--radius-sm)] border bg-[var(--panel)] px-2.5 py-2 text-xs font-mono text-[var(--ink)] focus:outline-none transition-colors",
                        commissionError
                          ? "border-[var(--loss)] focus:border-[var(--loss)]"
                          : "border-[var(--line)] focus:border-[var(--accent)]"
                      )}
                      placeholder="0.00"
                      value={commission}
                      onChange={e => { setCommission(e.target.value); setCommissionError(false) }}
                    />
                    {commissionError && (
                      <p className="text-[9px] text-[var(--loss)] mt-0.5">Valor inválido — déjalo vacío para $0</p>
                    )}
                  </div>
                </div>

                <Button
                  size="md"
                  className={cn(
                    "w-full font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity]",
                    parseFloat(closePrice) > 0
                      ? "bg-[var(--accent)] text-white hover:opacity-90"
                      : "bg-[var(--chip)] text-[var(--ink-3)] cursor-not-allowed"
                  )}
                  onClick={handleCloseTrade}
                  disabled={closingTrade || !closePrice}
                >
                  {closingTrade ? "Cerrando…" : "Confirmar cierre"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Account section ── */}
      {account && (
        <div>
          <p className="text-eyebrow mb-2">Cuenta</p>
          <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-[var(--ink)]">{account.name}</p>
              <span
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded",
                  account.type === "PROP_FIRM"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[var(--chip)] text-[var(--ink-2)]"
                )}
              >
                {account.type === "PROP_FIRM" ? "PROP" : account.type}
              </span>
            </div>
            <p className="text-[10px] text-[var(--ink-3)] font-mono">
              ${account.initialBalance.toLocaleString()}
            </p>
            {(account.ddTotalPct != null || account.ddDailyPct != null) && (
              <div className="mt-2 pt-2 border-t border-[var(--line)]">
                <div className="flex gap-4">
                  {account.ddTotalPct != null && (
                    <div>
                      <p className="text-[9px] text-[var(--ink-3)] mb-1">Límite DD</p>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--loss-soft)", color: "var(--loss)" }}>
                        {account.ddTotalPct}%
                      </span>
                    </div>
                  )}
                  {account.ddDailyPct != null && (
                    <div>
                      <p className="text-[9px] text-[var(--ink-3)] mb-1">Pérd. diaria</p>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--be-soft)", color: "var(--be)" }}>
                        {account.ddDailyPct}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Setup + Checklist ── */}
      {setup && (
        <div>
          <p className="text-eyebrow mb-2">Setup</p>
          <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--chip)", color: "var(--ink-2)" }}
              >
                {setup.abbreviation}
              </span>
              <p className="text-xs font-semibold text-[var(--ink)]">{setup.name}</p>
              {isAplus && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 ml-auto">
                  <Star size={10} className="fill-amber-400" />
                  A+ Trade
                </span>
              )}
            </div>

            {/* Standard checklist — all shown as ○ since we don't persist per-trade checklist */}
            {setup.standardChecklist.length > 0 && (
              <div>
                <p className="text-[10px] text-[var(--ink-3)] font-semibold mb-1.5">Criterios estándar</p>
                <div className="flex flex-col gap-1.5">
                  {setup.standardChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Circle size={12} className="text-[var(--ink-3)] shrink-0 mt-px" />
                      <span className="text-[11px] text-[var(--ink-2)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A+ checklist if trade is tagged A+ */}
            {isAplus && setup.aplusChecklist.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--line)]">
                <p className="text-[10px] text-amber-400 font-semibold mb-1.5">Criterios A+</p>
                <div className="flex flex-col gap-1.5">
                  {setup.aplusChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-amber-400 shrink-0 mt-px" />
                      <span className="text-[11px] text-[var(--ink-2)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Metrics ── */}
      <div>
        <p className="text-eyebrow mb-2">Detalles</p>
        <div>
          <MetricRow label="Entry"  value={trade.entry.toLocaleString()}  mono />
          <MetricRow label="Stop"   value={trade.stop.toLocaleString()}   mono />
          <MetricRow label="Target" value={trade.target.toLocaleString()} mono />
          <MetricRow label="Tamaño" value={`${trade.size} contratos`} />
          <MetricRow label="RR"     value={`${rrComputed}:1`} mono />
          {(trade as { closePrice?: number | null }).closePrice != null && (
            <MetricRow label="Cierre" value={String((trade as { closePrice?: number | null }).closePrice)} mono />
          )}
          {(trade as { commission?: number | null }).commission != null && (
            <MetricRow label="Comisión" value={`$${(trade as { commission?: number | null }).commission}`} mono />
          )}
        </div>
      </div>

      {/* ── Tags ── */}
      {trade.tags.length > 0 && (
        <div>
          <p className="text-eyebrow mb-2">Tags</p>
          <div className="flex gap-1.5 flex-wrap items-center">
            {(trade.tags as string[]).map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
          </div>
        </div>
      )}

      {/* ── Psicología ── */}
      {(() => {
        const hasPsych = trade.emotionBefore || trade.confidenceRating != null || trade.executionQuality != null || trade.fomoFlag || trade.revengeFlag
        if (!hasPsych) return null
        const EMOTION_LABELS: Record<string, string> = {
          calm: "Tranquilo", anxious: "Ansioso", excited: "Eufórico",
          fearful: "Temeroso", overconfident: "Sobreconfiado",
        }
        return (
          <div>
            <p className="text-eyebrow mb-2">Psicología</p>
            <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 flex flex-col gap-2">
              {trade.emotionBefore && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-3)]">Estado emocional</span>
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {EMOTION_LABELS[trade.emotionBefore] ?? trade.emotionBefore}
                  </span>
                </div>
              )}
              {trade.confidenceRating != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-3)]">Confianza</span>
                  <span className="text-xs font-medium font-mono text-[var(--ink)]">{trade.confidenceRating}/5</span>
                </div>
              )}
              {trade.executionQuality != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-3)]">Calidad ejecución</span>
                  <span className="text-xs font-medium font-mono text-[var(--ink)]">{trade.executionQuality}/5</span>
                </div>
              )}
              {(trade.fomoFlag || trade.revengeFlag) && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {trade.fomoFlag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--loss-soft)] text-[var(--loss)]">FOMO</span>
                  )}
                  {trade.revengeFlag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--loss-soft)] text-[var(--loss)]">Revanche</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Plan pre-operación (TASK-074) ── */}
      {(trade as { planNotes?: string | null }).planNotes && (
        <div>
          <p className="text-eyebrow mb-2">Plan pre-operación</p>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3 border border-[var(--line)]">
            {(trade as { planNotes?: string | null }).planNotes}
          </p>
        </div>
      )}

      {/* ── Notes ── */}
      {trade.notes && (
        <div>
          <p className="text-eyebrow mb-2">Notas</p>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
            {trade.notes}
          </p>
        </div>
      )}

      {/* ── Screenshots ── */}
      {hasScreenshots && (
        <div>
          <p className="text-eyebrow mb-2">Screenshots</p>
          <div className="flex flex-wrap gap-2">
            {trade.screenshotUrls!.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="block w-24 h-24 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)] hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`screenshot ${i + 1}`} width={96} height={96} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="mt-auto pt-2 flex flex-col gap-2">
        {onEdit && (
          <Button variant="ghost" size="md" className="w-full flex items-center gap-1.5" onClick={onEdit}>
            <Edit2 size={13} />
            Editar trade
          </Button>
        )}
        {onPositionLog && (
          <Button variant="ghost" size="md" className="w-full flex items-center gap-1.5" onClick={onPositionLog}>
            <Activity size={13} />
            Gestión de posición
          </Button>
        )}
        {!hasScreenshots && (
          <Button variant="ghost" size="md" className="w-full flex items-center gap-1.5">
            <ImagePlus size={13} />
            Adjuntar screenshot
          </Button>
        )}
        {onDelete && !confirmDelete && (
          <Button
            variant="ghost"
            size="md"
            className="w-full flex items-center gap-1.5 text-[var(--loss)] hover:bg-[var(--loss-soft)]"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} />
            Eliminar trade
          </Button>
        )}
        {confirmDelete && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--loss)] bg-[var(--loss-soft)] p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-[var(--loss)]">¿Eliminar este trade?</p>
            <p className="text-xs text-[var(--ink-3)]">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[var(--loss)] text-white hover:opacity-90"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
