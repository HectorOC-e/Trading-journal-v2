"use client"

import Link from "next/link"
import { GraduationCap, ArrowRight } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, Eyebrow } from "./primitives"

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-[18px] leading-none" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</span>
      <span className="text-[10px] font-medium mt-1 uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  )
}

/** Read-only learning slice for the weekly review (study minutes, streak, repasos). */
export function LearningSummary({ weekStart }: { weekStart: string }) {
  const { data } = trpc.weeklyReviews.learningSummary.useQuery({ weekStart })
  if (!data) return null

  // Nothing to show if the user didn't study or have streak/review activity.
  if (data.minutes === 0 && data.reviewsDone === 0 && data.streakCurrent === 0 && data.markedForReview === 0) return null

  const hrs = Math.floor(data.minutes / 60)
  const mins = data.minutes % 60
  const minutesLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={13} style={{ color: "var(--accent)" }} /> Aprendizaje esta semana
          </span>
        </Eyebrow>
        <Link href="/aprendizaje" className="inline-flex items-center gap-1 text-[11px] font-medium hover:gap-1.5 transition-[gap]" style={{ color: "var(--accent)" }}>
          Ir a Aprendizaje <ArrowRight size={12} />
        </Link>
      </div>
      <div className="flex items-center gap-7 sm:gap-9 flex-wrap">
        <Stat label="Estudiado"  value={minutesLabel}             accent />
        <Stat label="Racha"      value={`${data.streakCurrent}d`} />
        <Stat label="Mejor"      value={`${data.streakBest}d`} />
        <Stat label="Repasos"    value={String(data.reviewsDone)} />
        <Stat label="Por repasar" value={String(data.markedForReview)} />
      </div>
    </Card>
  )
}
