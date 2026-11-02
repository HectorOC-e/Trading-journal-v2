"use client"

import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { localDateISO, safeTimeZone } from "@/lib/datetime/local"

/** Refresh learning data at local midnight and when profile preferences change. */
export function useLearningCalendar() {
  const { data: profile } = trpc.profile.get.useQuery()
  const timezone = safeTimeZone(profile?.timezone)
  const [today, setToday] = useState<string | null>(null)
  const utils = trpc.useUtils()
  useEffect(() => {
    const tick = () => setToday(localDateISO(new Date(), timezone))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timezone])
  useEffect(() => {
    if (!today) return
    void utils.studySessions.home.invalidate()
    void utils.learningResources.stats.invalidate()
  }, [today, timezone, profile?.weeklyGoalMinutes, utils])
  return { timezone, today }
}
