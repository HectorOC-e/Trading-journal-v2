// CategoryChip atom — spec: Aprendizaje > Atoms
// 7 resource types with their spec colors

import { cn } from "@/lib/utils"
import type { ResourceType } from "@/types"

const COLOR_MAP: Record<ResourceType, string> = {
  LIBRO:       "bg-[#4f6ef7]/15 text-[#4f6ef7]",
  VIDEO:       "bg-[#9b59b6]/15 text-[#9b59b6]",
  NOTA:        "bg-[#22c55e]/15 text-[#22c55e]",
  BACKTEST:    "bg-[#f59e0b]/15 text-[#f59e0b]",
  PODCAST:     "bg-[#e91e8c]/15 text-[#e91e8c]",
  DRILL:       "bg-[#14b8a6]/15 text-[#14b8a6]",
  HERRAMIENTA: "bg-[#6b7280]/15 text-[#6b7280]",
}

interface CategoryChipProps {
  type: ResourceType
  className?: string
}

export function CategoryChip({ type, className }: CategoryChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        COLOR_MAP[type],
        className
      )}
    >
      {type}
    </span>
  )
}
