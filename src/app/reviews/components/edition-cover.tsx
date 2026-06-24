"use client"

import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { DUR, EASE_OUT } from "@/lib/motion"
import type { VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type Edition = RouterOutputs["monthlyReviews"]["list"][number]

const SERIF = 'Georgia, "Times New Roman", serif'

const TONE: Record<VerdictTone, { fg: string; bg: string; bar: string }> = {
  good: { fg: "var(--win)",  bg: "var(--win-soft)",  bar: "var(--win)" },
  mid:  { fg: "var(--be)",   bg: "var(--be-soft)",   bar: "var(--be)" },
  bad:  { fg: "var(--loss)", bg: "var(--loss-soft)", bar: "var(--loss)" },
}

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`

export function EditionCover({ edition, onClick, onDelete }: {
  edition: Edition
  onClick: () => void
  onDelete: () => void
}) {
  const tone = TONE[edition.gradeTone as VerdictTone] ?? TONE.mid
  const hasR = edition.trades > 0 && edition.totalR !== 0
  const result = hasR ? `${edition.totalR >= 0 ? "+" : "−"}${Math.abs(edition.totalR).toFixed(1)}R` : money(edition.netPnl)
  const resultColor = (edition.totalR || edition.netPnl) >= 0 ? "var(--win)" : "var(--loss)"
  const maxW = Math.max(1, ...edition.weeks.map(w => Math.abs(w)))

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
      onClick={onClick}
      className="group relative rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 cursor-pointer overflow-hidden hover:border-[var(--accent)] hover:shadow-md transition-[border-color,box-shadow]"
    >
      <div className="h-[3px] w-full -mt-4 -mx-4 mb-3" style={{ width: "calc(100% + 2rem)", background: `linear-gradient(90deg, ${tone.bar}, color-mix(in srgb, ${tone.bar} 45%, transparent))` }} />

      {/* delete on hover */}
      <button
        aria-label="Eliminar"
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="absolute top-2.5 right-2.5 z-10 grid place-items-center w-6 h-6 rounded-md text-[var(--ink-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--loss)] hover:bg-[var(--loss-soft)] transition active:scale-90"
      >
        <Trash2 size={13} />
      </button>

      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        Edición {String(edition.month).padStart(2, "0")} · {edition.year}
      </div>
      <div className="flex items-start justify-between mt-1">
        <div style={{ fontFamily: SERIF }} className="text-[28px] font-bold leading-none text-[var(--ink)]">
          {edition.monthLabel.split(" ")[0]}
        </div>
        <div className="grid place-items-center w-9 h-9 rounded-xl font-mono font-extrabold text-[15px]" style={{ color: tone.fg, background: tone.bg }}>
          {edition.gradeLetter}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-mono font-bold text-[19px]" style={{ color: resultColor }}>{result}</span>
        {edition.deltaPnl != null && edition.deltaPnl !== 0 && (
          <span className="text-[11px] font-semibold" style={{ color: edition.deltaPnl > 0 ? "var(--win)" : "var(--loss)" }}>
            {edition.deltaPnl > 0 ? "▲" : "▼"} {money(edition.deltaPnl)}
          </span>
        )}
      </div>

      {/* week bars */}
      <div className="flex items-end gap-[3px] h-7 mt-3">
        {edition.weeks.length === 0
          ? <div className="h-px w-full self-center" style={{ background: "var(--line)" }} />
          : edition.weeks.map((w, i) => (
              <span key={i} className="flex-1 rounded-[2px]" style={{ height: `${Math.max(8, (Math.abs(w) / maxW) * 100)}%`, background: w >= 0 ? "var(--win)" : "var(--loss)" }} />
            ))}
      </div>

      {/* goals ring */}
      <div className="flex items-center gap-2 mt-3">
        <div className="grid place-items-center w-8 h-8 rounded-full" style={{ background: `conic-gradient(${tone.bar} ${edition.goalsPct}%, var(--chip) 0)` }}>
          <span className="grid place-items-center w-[26px] h-[26px] rounded-full bg-[var(--panel)] text-[9px] font-bold text-[var(--ink-2)]">{edition.goalsPct}%</span>
        </div>
        <span className="text-[11px] leading-tight text-[var(--ink-3)]">compromisos<br />cumplidos</span>
      </div>
    </motion.div>
  )
}
