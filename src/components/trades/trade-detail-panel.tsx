// TradeDetailPanel molecule — spec: Trades > Anatomy > Trade Detail Panel
// Right-rail panel shown when a trade row is selected
// Shows P&L + metrics grid + tags + notes + action button

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Trade, TradeTag } from "@/types"

const TAG_VARIANT: Record<TradeTag, "aplus" | "accent" | "default" | "be" | "offplan"> = {
  "A+":        "aplus",
  "A":         "accent",
  "B":         "default",
  "Plan":      "accent",
  "Off-plan":  "offplan",
  "Impulsivo": "offplan",
  "BE":        "be",
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
  onClose?: () => void
  className?: string
}

export function TradeDetailPanel({ trade, onClose, className }: TradeDetailPanelProps) {
  const pnlPositive = (trade.pnl ?? 0) >= 0
  const rPositive   = (trade.rMultiple ?? 0) >= 0

  return (
    <div className={cn("flex flex-col h-full bg-[var(--panel)] border-l border-[var(--line)] p-4 gap-4", className)}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--ink-3)]">{trade.date} · {trade.openTime}</p>
          <p className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">{trade.symbol}</p>
          <p className="text-xs text-[var(--ink-2)]">{trade.setupId}</p>
        </div>
        {onClose && (
          <Button variant="icon" size="icon" onClick={onClose}>
            <X size={14} />
          </Button>
        )}
      </div>

      {/* P&L hero */}
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

      {/* Metrics */}
      <div>
        <p className="text-eyebrow mb-2">Detalles</p>
        <div>
          <MetricRow label="Dirección" value={trade.direction} />
          <MetricRow label="Entry"     value={trade.entry.toLocaleString()} mono />
          <MetricRow label="Stop"      value={trade.stop.toLocaleString()}  mono />
          <MetricRow label="Target"    value={trade.target.toLocaleString()} mono />
          <MetricRow label="Tamaño"    value={`${trade.size} contratos`} />
          <MetricRow label="Sesión"    value={trade.session} />
        </div>
      </div>

      {/* Tags */}
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

      {/* Notes */}
      {trade.notes && (
        <div>
          <p className="text-eyebrow mb-2">Notas</p>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
            {trade.notes}
          </p>
        </div>
      )}

      {/* Action */}
      <div className="mt-auto pt-2">
        <Button variant="ghost" size="md" className="w-full">
          Editar trade
        </Button>
      </div>

    </div>
  )
}
