// KpiStrip molecule — spec: Dashboard > Portfolio, Trades header
// 4-column grid of KpiCard atoms

import { KpiCard } from "@/components/ui/kpi-card"
import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiStripProps {
  items: KpiCardType[]
  className?: string
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  )
}
