"use client"

import { useEffect, useState } from "react"
import { Plus, X, GraduationCap } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { makeMoney, Card, Eyebrow } from "./primitives"
import { deriveGrade, type VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type ReportData = RouterOutputs["monthlyReviews"]["report"]
type Goal = ReportData["goals"][number]

const SERIF = 'Georgia, "Times New Roman", serif'
const TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)",  bg: "var(--win-soft)" },
  mid:  { fg: "var(--be)",   bg: "var(--be-soft)" },
  bad:  { fg: "var(--loss)", bg: "var(--loss-soft)" },
}
const SENTIMENT: Record<string, { sym: string; color: string }> = {
  up:   { sym: "▲", color: "var(--win)" },
  down: { sym: "▼", color: "var(--loss)" },
  warn: { sym: "⚠", color: "var(--be)" },
}
const GOAL_STATUS: Record<string, { sym: string; color: string }> = {
  done:    { sym: "✓", color: "var(--win)" },
  partial: { sym: "◐", color: "var(--be)" },
  pending: { sym: "○", color: "var(--ink-3)" },
}
const NEXT_STATUS: Record<string, "pending" | "partial" | "done"> = { pending: "done", done: "partial", partial: "pending" }

function Pillar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "var(--win)" : value >= 55 ? "var(--be)" : "var(--loss)"
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="font-mono font-bold text-[22px] leading-none" style={{ color }}>{value}</div>
      <div className="h-1 rounded-full mt-1.5" style={{ background: "var(--line)" }}>
        <div className="h-1 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Compromisos (goals) editor ────────────────────────────────────────────────
function GoalsPanel({ goals, year, month }: { goals: Goal[]; year: number; month: number }) {
  const utils = trpc.useUtils()
  const invalidate = () => { utils.monthlyReviews.report.invalidate({ year, month }); utils.monthlyReviews.list.invalidate() }
  const carry  = trpc.monthlyGoals.carryForward.useMutation({ onSuccess: invalidate })
  const add    = trpc.monthlyGoals.add.useMutation({ onSuccess: invalidate })
  const setSt  = trpc.monthlyGoals.setStatus.useMutation({ onSuccess: invalidate })
  const remove = trpc.monthlyGoals.remove.useMutation({ onSuccess: invalidate })
  const [text, setText] = useState("")

  // Seed this month's commitments from the previous month on first visit.
  useEffect(() => { if (goals.length === 0) carry.mutate({ year, month }) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const done = goals.filter(g => g.status === "done").length
  const partial = goals.filter(g => g.status === "partial").length
  const pct = goals.length ? Math.round(((done + 0.5 * partial) / goals.length) * 100) : 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>Compromisos</Eyebrow>
        <div className="grid place-items-center w-8 h-8 rounded-full" style={{ background: `conic-gradient(var(--win) ${pct}%, var(--chip) 0)` }}>
          <span className="grid place-items-center w-[26px] h-[26px] rounded-full bg-[var(--panel)] text-[9px] font-bold text-[var(--ink-2)]">{pct}%</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map(g => {
          const st = GOAL_STATUS[g.status] ?? GOAL_STATUS.pending
          return (
            <div key={g.id} className="flex items-start gap-2.5 group/goal">
              <button
                aria-label="Cambiar estado"
                onClick={() => setSt.mutate({ id: g.id, status: NEXT_STATUS[g.status] ?? "done" })}
                className="mt-0.5 grid place-items-center w-5 h-5 rounded-full text-[12px] font-bold shrink-0 hover:scale-110 transition"
                style={{ color: st.color, border: `1.5px solid ${st.color}` }}
              >
                {st.sym}
              </button>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-[var(--ink-2)]">{g.text}</span>
                {g.note && <span className="text-[11px] text-[var(--ink-3)] ml-1.5">· {g.note}{!g.userConfirmed && " (IA)"}</span>}
              </div>
              <button aria-label="Quitar" onClick={() => remove.mutate(g.id)} className="opacity-0 group-hover/goal:opacity-100 text-[var(--ink-3)] hover:text-[var(--loss)] transition shrink-0">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); const t = text.trim(); if (t) { add.mutate({ year, month, text: t }); setText("") } }}
        className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--line)]"
      >
        <input
          value={text} onChange={e => setText(e.target.value)} placeholder="Nuevo compromiso…"
          className="flex-1 h-8 px-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button type="submit" className="grid place-items-center w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white active:scale-95 transition"><Plus size={15} /></button>
      </form>
    </Card>
  )
}

// ── Campaña: weeks of the month (click → drawer) ───────────────────────────────
function Campaign({ weeks, money }: { weeks: { week: string; pnl: number }[]; money: (n: number) => string }) {
  const [open, setOpen] = useState<{ week: string; pnl: number } | null>(null)
  if (weeks.length === 0) return null
  const maxAbs = Math.max(1, ...weeks.map(w => Math.abs(w.pnl)))
  return (
    <Card>
      <Eyebrow>Campaña del mes · {weeks.length} semana{weeks.length === 1 ? "" : "s"}</Eyebrow>
      <div className="flex flex-col gap-1.5 mt-2">
        {weeks.map((w, i) => (
          <button key={i} onClick={() => setOpen(w)} className="flex items-center gap-2.5 group/wk text-left">
            <span className="w-12 text-[11px] text-[var(--ink-3)]">Sem {i + 1}</span>
            <span className="flex-1 h-4 rounded-[4px] overflow-hidden" style={{ background: "var(--chip)" }}>
              <span className="block h-full rounded-[4px] group-hover/wk:opacity-90" style={{ width: `${Math.max(6, (Math.abs(w.pnl) / maxAbs) * 100)}%`, background: w.pnl >= 0 ? "var(--win)" : "var(--loss)" }} />
            </span>
            <span className="w-16 text-right font-mono text-[11px]" style={{ color: w.pnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(w.pnl)}</span>
          </button>
        ))}
      </div>
      <DrawerPanel open={!!open} onClose={() => setOpen(null)} width={400} ariaLabel="Resumen de la semana">
        {open && (
          <div className="p-1">
            <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Semana del mes</p>
            <p className="text-[20px] font-bold mt-1" style={{ color: "var(--ink)" }}>{open.week}</p>
            <p className="font-mono text-[26px] font-bold mt-3" style={{ color: open.pnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(open.pnl)}</p>
            <p className="text-[12px] text-[var(--ink-3)] mt-4 leading-relaxed">El desglose completo de esta semana vive en su review semanal y en el anexo de métricas de este mes.</p>
          </div>
        )}
      </DrawerPanel>
    </Card>
  )
}

/** "Carta del Gestor" — the editorial monthly summary rendered atop the analytical anexo. */
export function MonthlyLetter({ data, year, month, monthLabel }: {
  data: ReportData
  year: number
  month: number
  monthLabel: string
}) {
  const money = makeMoney(data.baseCurrency)
  const grade = deriveGrade({ disciplineScore: data.kpis.disciplineScore, winRate: data.kpis.winRate, netPnl: data.kpis.netPnl, profitFactor: data.kpis.profitFactor, trades: data.kpis.trades })
  const tone = TONE[grade.tone]
  const rLine = data.kpis.trades > 0 ? `${money(data.kpis.netPnl)} sobre ${data.kpis.trades} operaciones` : "Sin operaciones este mes"

  return (
    <div className="space-y-5">
      {/* Hero-carta */}
      <Card className="!p-6">
        <div className="flex justify-between gap-5 items-start">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">Carta del mes · {monthLabel}</p>
            <h2 style={{ fontFamily: SERIF }} className="text-[24px] font-bold leading-snug mt-2 text-[var(--ink)]">{data.letterTitle}</h2>
            <p className="text-[13px] text-[var(--ink-3)] mt-2">{rLine}</p>
            <p className="text-[14px] leading-relaxed mt-3 text-[var(--ink-2)] max-w-[560px]">{data.verdict}</p>
          </div>
          <div className="text-center shrink-0">
            <div style={{ fontFamily: SERIF, color: tone.fg, background: tone.bg }} className="grid place-items-center w-[88px] h-[88px] rounded-2xl text-[40px] font-extrabold">{grade.letter}</div>
            <div className="font-mono text-[18px] font-bold mt-2 text-[var(--ink)]">{data.pillars.overall}<span className="text-[12px] text-[var(--ink-3)]">/100</span></div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)]">Overall</p>
          </div>
        </div>

        {/* Pilares */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[var(--line)]">
          <Pillar label="Rendimiento" value={data.pillars.performance} />
          <Pillar label="Disciplina"  value={data.pillars.discipline} />
          <Pillar label="Psicología"  value={data.pillars.psychology} />
        </div>
      </Card>

      <Campaign weeks={data.weekTrend} money={money} />

      <div className="grid md:grid-cols-2 gap-5">
        <GoalsPanel goals={data.goals} year={year} month={month} />
        <Card>
          <Eyebrow>Temas dominantes</Eyebrow>
          <div className="flex flex-col gap-2.5 mt-2">
            {data.themes.length === 0
              ? <p className="text-[12px] text-[var(--ink-3)]">Sin temas detectados.</p>
              : data.themes.map((t, i) => {
                  const s = SENTIMENT[t.sentiment] ?? SENTIMENT.warn
                  return (
                    <div key={i}>
                      <p className="text-[13px] font-medium" style={{ color: s.color }}>{s.sym} {t.title}</p>
                      <p className="text-[11.5px] text-[var(--ink-3)] mt-0.5 leading-snug">{t.impact}</p>
                    </div>
                  )
                })}
          </div>
        </Card>
      </div>

      {/* Veredicto causal */}
      <div className="rounded-[var(--radius)] p-3.5" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--panel))", borderLeft: "3px solid var(--accent)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>Veredicto del mes</p>
        <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">{data.verdict}</p>
      </div>

      <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
        <GraduationCap size={13} /> Anexo · métricas completas del mes
      </p>
    </div>
  )
}
