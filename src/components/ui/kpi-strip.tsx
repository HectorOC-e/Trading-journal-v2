// KpiStrip molecule — spec: Dashboard > Portfolio, Trades header
// 4-column grid of KpiCard atoms, staggered in on mount.
"use client"

import { KpiCard } from "@/components/ui/kpi-card"
import { Stagger, StaggerItem } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiStripItem extends KpiCardType { icon?: React.ReactNode }

interface KpiStripProps {
  items: KpiStripItem[]
  className?: string
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <Stagger className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((item) => (
        <StaggerItem key={item.label}>
          <KpiCard {...item} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}
