"use client"

// Horizontal "Edición" header that opens each month-chapter in the unified Reviews
// timeline. Shows the month (Newsreader), letter grade, net P&L + delta vs the prior
// month, per-week P&L bars, a goals-completion ring, and a one-line verdict. Faithful
// port of the Reviews.dc.html edition-header block. The nested weekly cards render
// below it (see reviews-timeline.tsx).

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { DUR, EASE_OUT } from "@/lib/motion"
import type { VerdictTone } from "@/server/services/reviews/verdict"

const SERIF = '"Newsreader", Georgia, "Times New Roman", serif'

const TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)", bg: "var(--win-soft)" },
  mid: { fg: "var(--be)", bg: "var(--be-soft)" },
  bad: { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`

export interface EditionHeaderData {
  monthShort: string
  year: number
  gradeLetter: string
  gradeTone: VerdictTone
  current: boolean
  net: number
  deltaPnl: number | null
  weekPnls: number[]
  goalsPct: number
  verdict: string
}

export function EditionHeader({ data, onOpen }: { data: EditionHeaderData; onOpen: () => void }) {
  const tone = TONE[data.gradeTone] ?? TONE.mid
  const netColor = data.net >= 0 ? "var(--win)" : "var(--loss)"
  const maxW = Math.max(1, ...data.weekPnls.map(w => Math.abs(w)))

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
      onClick={onOpen}
      className="group relative rounded-[13px] border border-[var(--line)] bg-[var(--panel)] overflow-hidden cursor-pointer hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:shadow-md transition-[border-color,box-shadow]"
      style={{ boxShadow: "0 1px 3px rgba(20,20,45,.05)" }}
    >
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${tone.fg}, color-mix(in srgb, ${tone.fg} 25%, transparent))` }} />

      <div className="px-5 py-[15px] flex items-center gap-x-[18px] gap-y-3 flex-wrap">
        {/* Month + grade */}
        <div className="flex items-center gap-[13px]">
          <div style={{ fontFamily: SERIF }} className="text-[30px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--ink)]">{data.monthShort}</div>
          <div>
            <div className="text-[9.5px] font-bold tracking-[0.12em] text-[var(--ink-3)]">EDICIÓN · {data.year}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-mono font-extrabold text-[12px] px-[7px] py-0.5 rounded-md" style={{ color: tone.fg, background: tone.bg }}>{data.gradeLetter}</span>
              {data.current && (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.06em] px-2 py-[3px] rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>● EN CURSO</span>
              )}
            </div>
          </div>
        </div>

        {/* Net + delta */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-[19px]" style={{ color: netColor }}>{money(data.net)}</span>
          {data.deltaPnl != null && data.deltaPnl !== 0 && (
            <span className="text-[11px] font-bold" style={{ color: data.deltaPnl > 0 ? "var(--win)" : "var(--loss)" }}>{data.deltaPnl > 0 ? "▲ " : "▼ "}{money(data.deltaPnl)}</span>
          )}
        </div>

        {/* Week bars */}
        {data.weekPnls.length > 0 && (
          <div className="flex items-end gap-[3px] h-[30px] w-[74px]">
            {data.weekPnls.map((w, i) => (
              <span key={i} className="flex-1 rounded-[2px]" style={{ height: `${Math.max(12, Math.round((Math.abs(w) / maxW) * 100))}%`, background: w >= 0 ? "var(--win)" : "var(--loss)" }} />
            ))}
          </div>
        )}

        {/* Goals ring + open */}
        <div className="flex items-center gap-[9px] ml-auto">
          <div className="grid place-items-center w-[34px] h-[34px] rounded-full" style={{ background: `conic-gradient(${tone.fg} ${data.goalsPct}%, var(--chip) 0)` }}>
            <span className="grid place-items-center w-[26px] h-[26px] rounded-full bg-[var(--panel)] font-mono text-[9px] font-bold text-[var(--ink-2)]">{data.goalsPct}%</span>
          </div>
          <span className="text-[10px] leading-[1.25] text-[var(--ink-3)]">objetivos<br />cumplidos</span>
          <span className="ml-1.5 inline-flex items-center gap-1 text-[12px] font-semibold group-hover:gap-1.5 transition-[gap]" style={{ color: "var(--accent)" }}>Ver edición <ArrowRight size={13} /></span>
        </div>
      </div>

      {data.verdict && <div className="px-5 pb-3.5 text-[12.5px] leading-snug text-[var(--ink-2)]">{data.verdict}</div>}
    </motion.div>
  )
}
