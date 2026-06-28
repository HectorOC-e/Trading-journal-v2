"use client"

// Hierarchical memory layers, made VISIBLE (E1, v3.2 / ADR-003 §3). Read-only:
// semantic patterns are confirmed by the trader's own data (D9) and episodes are
// append-only evidence — neither is user-edited here (identity + facts are, above).

import { Network, Clock } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

const EVENT_LABEL: Record<string, string> = {
  intervention: "Intervención",
  commitment_broken: "Compromiso roto",
  commitment_kept: "Compromiso cumplido",
  checkin_red: "Check-in rojo",
  trade_emotional: "Trade emocional",
  streak: "Racha",
  manual: "Nota",
}

const fmtDate = (iso: string) => iso.slice(0, 10)

export function CoachMemoryLayers() {
  const { data: patterns = [] } = trpc.coach.patterns.useQuery(undefined, { staleTime: 30_000 })
  const { data: episodes = [] } = trpc.coach.episodes.useQuery(undefined, { staleTime: 30_000 })

  if (patterns.length === 0 && episodes.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {patterns.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Network size={13} className="text-[var(--accent)]" />
            <p className="text-[12px] font-bold text-[var(--ink)]">Patrones</p>
            <span className="text-[10px] text-[var(--ink-3)]">— confirmados por tus datos</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
                <span className="text-[12px] text-[var(--ink)] leading-snug">{p.text}</span>
                <span className="shrink-0 num text-[10px] text-[var(--ink-3)]">{Math.round(p.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {episodes.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={13} className="text-[var(--coach)]" />
            <p className="text-[12px] font-bold text-[var(--ink)]">Momentos recordados</p>
            <span className="text-[10px] text-[var(--ink-3)]">— evidencia, por relevancia</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {episodes.map((e) => (
              <div key={e.id} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{EVENT_LABEL[e.eventType] ?? e.eventType}</span>
                  <span className="text-[9px] text-[var(--ink-3)]">· {fmtDate(e.occurredAt)}</span>
                </div>
                <p className="text-[12px] text-[var(--ink)] leading-snug">{e.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
