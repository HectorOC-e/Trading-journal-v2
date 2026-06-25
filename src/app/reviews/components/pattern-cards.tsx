"use client"

// "Patrón recurrente" cards for the Reviews index rail. Extracted from the old
// TrajectoryPanel right column so the rail can surface up to two recurring-pattern
// insights (from the Analytics insights engine) beside the timeline.

import { motion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import type { VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type Pattern = RouterOutputs["weeklyReviews"]["overview"]["patterns"][number]

const TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)", bg: "var(--win-soft)" },
  mid: { fg: "var(--be)", bg: "var(--be-soft)" },
  bad: { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

export function PatternCards({ patterns }: { patterns: Pattern[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[10px] font-bold tracking-[0.13em] text-[var(--ink-3)]">PATRÓN RECURRENTE</div>
      {patterns.length === 0 ? (
        <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">
          Aún no hay suficientes operaciones para detectar patrones. Sigue registrando tus semanas.
        </p>
      ) : (
        patterns.map((p, i) => {
          const t = TONE[p.tone]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.1 + i * 0.08 }}
              whileHover={{ y: -2 }}
              className="rounded-[11px] bg-[var(--panel)] border border-[var(--line)] p-3.5 transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] hover:shadow-[0_6px_18px_rgba(20,20,45,.08)]"
            >
              <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-[3px] tracking-[0.02em]" style={{ color: t.fg, background: t.bg }}>{p.tag}</span>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{p.body}</p>
            </motion.div>
          )
        })
      )}
    </div>
  )
}
