"use client"

import { useEffect, useState } from "react"

/** Isolated ticking component so the resource library doesn't render every second. */
export function ProfileClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const time = now ? new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(now) : "--:--:--"

  return (
    <div className="mb-4 flex items-center gap-2 text-[var(--ink-3)]">
      <time dateTime={now?.toISOString()} aria-label={`Hora actual en ${timezone}`} className="font-mono tabular-nums text-sm text-[var(--ink)]">{time}</time>
      <span className="text-[11px]">{timezone}</span>
    </div>
  )
}
