// TradeDetailPanel — rich detail panel
// Header: symbol + direction + date/time + session pill
// P&L hero, account section, setup+checklist, metrics, notes, actions

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, CheckCircle2, Circle, Star, ImagePlus } from "lucide-react"
import type { Trade, TradeTag, TradeSession, Account, Setup } from "@/types"

const TAG_VARIANT: Record<TradeTag, "aplus" | "accent" | "default" | "be" | "offplan"> = {
  "A+":        "aplus",
  "A":         "accent",
  "B":         "default",
  "Plan":      "accent",
  "Off-plan":  "offplan",
  "Impulsivo": "offplan",
  "BE":        "be",
}

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
  trade: Trade
  account?: Account
  setup?: Setup
  onClose?: () => void
  className?: string
}

export function TradeDetailPanel({ trade, account, setup, onClose, className }: TradeDetailPanelProps) {
  const pnlPositive = (trade.pnl ?? 0) >= 0
  const rPositive   = (trade.rMultiple ?? 0) >= 0
  const isAplus     = trade.tags.includes("A+")
  const hasScreenshots = (trade.screenshotUrls?.length ?? 0) > 0

  // Compute RR from prices
  const riskPts    = Math.abs(trade.entry - trade.stop)
  const rewardPts  = Math.abs(trade.target - trade.entry)
  const rrComputed = riskPts > 0 ? (rewardPts / riskPts).toFixed(2) : "—"

  return (
    <div className={cn("flex flex-col h-full bg-[var(--panel)] p-4 gap-4", className)}>

      {/* ── Header ── */}
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
              SESSION_COLOR[trade.session]
            )}>
              {SESSION_SHORT[trade.session]}
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

      {/* ── P&L hero ── */}
      <div className={cn(
        "rounded-[var(--radius-sm)] p-3 text-center",
        pnlPositive ? "bg-[var(--win-soft)]" : "bg-[var(--loss-soft)]"
      )}>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-3)] mb-1">Net P&L</p>
        <p className={cn("text-2xl font-bold font-mono", pnlPositive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
          {pnlPositive ? "+" : ""}${trade.pnl?.toLocaleString()}
        </p>
        <p className={cn("text-sm font-mono font-semibold mt-0.5", rPositive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
          {rPositive ? "+" : ""}{trade.rMultiple?.toFixed(1)}R
        </p>
      </div>

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
            {account.propFirmRules && (
              <div className="mt-2 pt-2 border-t border-[var(--line)]">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] text-[var(--ink-3)] mb-1">DD máx</p>
                    <div className="h-1.5 rounded-full bg-[var(--chip)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--loss)]"
                        style={{ width: "20%" }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--ink-3)] mt-0.5">
                      2% / {account.propFirmRules.maxDrawdownPct}%
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] text-[var(--ink-3)] mb-1">Pérd. diaria</p>
                    <div className="h-1.5 rounded-full bg-[var(--chip)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--be)]"
                        style={{ width: "10%" }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--ink-3)] mt-0.5">
                      0.5% / {account.propFirmRules.dailyLossPct}%
                    </p>
                  </div>
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
        </div>
      </div>

      {/* ── Tags ── */}
      {trade.tags.length > 0 && (
        <div>
          <p className="text-eyebrow mb-2">Tags</p>
          <div className="flex gap-1 flex-wrap">
            {trade.tags.map((tag) => (
              <Badge key={tag} variant={TAG_VARIANT[tag]}>{tag}</Badge>
            ))}
          </div>
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

      {/* ── Actions ── */}
      <div className="mt-auto pt-2 flex flex-col gap-2">
        <Button variant="ghost" size="md" className="w-full">
          Editar trade
        </Button>
        {!hasScreenshots && (
          <Button variant="ghost" size="md" className="w-full flex items-center gap-1.5">
            <ImagePlus size={13} />
            Adjuntar screenshot
          </Button>
        )}
      </div>

    </div>
  )
}
