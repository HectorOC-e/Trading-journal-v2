import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("shimmer rounded-[var(--radius-xs)]", className)}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonKpiStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
          <Skeleton className="h-2.5 w-18 mb-3" />
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-2 w-14" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTableRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-0 rounded-[var(--radius)] border border-[var(--line)] overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn(
          "flex items-center gap-4 px-4 py-3 bg-[var(--panel)]",
          i < rows - 1 && "border-b border-[var(--line)]"
        )}>
          <Skeleton className="h-3 w-14 shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-12 shrink-0" />
          <Skeleton className="h-3 w-14 shrink-0" />
          <Skeleton className="h-3 w-10 shrink-0" />
          <Skeleton className="h-5 w-12 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAccountCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-[var(--radius-xs)]" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-9 w-32" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-[var(--radius-xs)]" />
            <Skeleton className="h-10 rounded-[var(--radius-xs)]" />
            <Skeleton className="h-10 rounded-[var(--radius-xs)]" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-2.5", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  )
}
