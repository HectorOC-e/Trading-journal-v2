import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded bg-[var(--chip)]", className)}
      style={style}
    />
  )
}

export function SkeletonKpiStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTableRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--panel)]">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24 flex-1" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAccountCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 w-9 rounded-[var(--radius-sm)]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-32 mb-3" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
      ))}
    </div>
  )
}
