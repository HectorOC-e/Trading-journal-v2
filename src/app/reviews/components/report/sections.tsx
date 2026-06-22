"use client"

import { CountUp } from "@/components/ui/count-up"
import { Card, Eyebrow, Delta, pnlColor } from "./primitives"
import type { ReviewReportVM, NarrativeVM } from "./view-model"

type Money = (n: number) => string

// ── KPIs ──────────────────────────────────────────────────────────────────────

export function KpiGrid({ kpis, deltas, money }: { kpis: ReviewReportVM["kpis"]; deltas: ReviewReportVM["deltas"]; money: Money }) {
  const hasTrades = kpis.trades > 0
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <Eyebrow>Net P&amp;L</Eyebrow>
        <CountUp value={money(kpis.netPnl)} className="num text-[20px] font-bold block" style={{ color: pnlColor(kpis.netPnl) }} />
        <Delta value={deltas.netPnl} />
      </Card>
      <Card>
        <Eyebrow>Win rate</Eyebrow>
        <CountUp value={hasTrades ? `${kpis.winRate}%` : "—"} className="num text-[20px] font-bold block text-[var(--ink)]" />
        <Delta value={deltas.winRate} suffix="pp" />
      </Card>
      <Card>
        <Eyebrow>Disciplina</Eyebrow>
        <CountUp value={kpis.disciplineScore ?? "—"} className="num text-[20px] font-bold block text-[var(--ink)]" />
        <Delta value={deltas.disciplineScore} />
      </Card>
      <Card>
        <Eyebrow>Profit factor</Eyebrow>
        <CountUp value={hasTrades ? `${kpis.profitFactor}` : "—"} className="num text-[20px] font-bold block text-[var(--ink)]" />
        <span className="text-[11px] text-[var(--ink-3)]">{kpis.trades} trades</span>
      </Card>
    </div>
  )
}

// ── Best / worst day ────────────────────────────────────────────────────────────

export function DayExtremes({ bestDay, worstDay, money }: { bestDay: ReviewReportVM["bestDay"]; worstDay: ReviewReportVM["worstDay"]; money: Money }) {
  return (
    <Card>
      <Eyebrow>Mejor / peor día</Eyebrow>
      <div className="flex justify-between text-sm">
        <span className="text-[var(--ink-3)]">Mejor</span>
        <span className="num font-semibold" style={{ color: "var(--win)" }}>{bestDay ? `${money(bestDay.pnl)} · ${bestDay.date}` : "—"}</span>
      </div>
      <div className="flex justify-between text-sm mt-1.5">
        <span className="text-[var(--ink-3)]">Peor</span>
        <span className="num font-semibold" style={{ color: "var(--loss)" }}>{worstDay ? `${money(worstDay.pnl)} · ${worstDay.date}` : "—"}</span>
      </div>
    </Card>
  )
}

// ── Discipline ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return "var(--ink-3)"
  if (score >= 80) return "var(--win)"
  if (score >= 60) return "var(--be)"
  return "var(--loss)"
}

export function DisciplinePanel({ discipline, score, money }: { discipline: ReviewReportVM["discipline"]; score: number | null; money: Money }) {
  return (
    <Card>
      <Eyebrow>Disciplina</Eyebrow>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex items-center justify-center rounded-full w-12 h-12 text-[15px] font-bold num"
          style={{ color: scoreColor(score), border: `2px solid ${scoreColor(score)}`, background: "var(--panel-2)" }}
        >
          {score ?? "—"}
        </div>
        <div className="text-[11px] text-[var(--ink-3)] leading-tight">
          Score de disciplina<br />del periodo
        </div>
      </div>
      <div className="flex justify-between text-sm"><span className="text-[var(--ink-3)]">Violaciones</span><span className="num font-semibold">{discipline.violations}</span></div>
      <div className="flex justify-between text-sm mt-1.5"><span className="text-[var(--ink-3)]">Costo</span><span className="num font-semibold" style={{ color: discipline.costo < 0 ? "var(--loss)" : "var(--ink)" }}>{money(discipline.costo)}</span></div>
      <div className="flex justify-between text-sm mt-1.5"><span className="text-[var(--ink-3)]">Racha días limpios</span><span className="num font-semibold">{discipline.rachaDiasLimpios}</span></div>
    </Card>
  )
}

// ── Breakdown bars (setups / sessions) ──────────────────────────────────────────

function BreakdownBars({ title, rows, money, empty }: {
  title: string
  rows: { name: string; pnl: number; trades: number }[]
  money: Money
  empty: string
}) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.pnl)))
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 6).map(r => (
            <div key={r.name}>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ink-2)] truncate pr-2">{r.name} <span className="text-[var(--ink-3)] text-[11px]">· {r.trades}</span></span>
                <span className="num font-semibold whitespace-nowrap" style={{ color: pnlColor(r.pnl) }}>{money(r.pnl)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, (Math.abs(r.pnl) / max) * 100)}%`, background: pnlColor(r.pnl) }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function SetupBreakdown({ setups, money }: { setups: ReviewReportVM["setups"]; money: Money }) {
  return <BreakdownBars title="Setups" rows={setups} money={money} empty="Sin setups asignados." />
}

export function SessionBreakdown({ sessions, money }: { sessions: ReviewReportVM["sessions"]; money: Money }) {
  const rows = sessions.map(s => ({ name: s.session, pnl: s.pnl, trades: s.trades }))
  return <BreakdownBars title="Por sesión" rows={rows} money={money} empty="Sin sesiones registradas." />
}

export function AccountBreakdown({ byAccount, money }: { byAccount: ReviewReportVM["byAccount"]; money: Money }) {
  return (
    <Card>
      <Eyebrow>P&amp;L por cuenta</Eyebrow>
      {byAccount.length === 0 ? <p className="text-sm text-[var(--ink-3)]">Sin trades.</p> : byAccount.map(a => (
        <div key={a.name} className="flex justify-between text-sm py-1 border-b border-[var(--line)] last:border-0">
          <span className="text-[var(--ink-2)]">{a.name}</span>
          <span className="num font-semibold" style={{ color: pnlColor(a.pnl) }}>{money(a.pnl)}</span>
        </div>
      ))}
    </Card>
  )
}

// ── Narrative (saved review) ────────────────────────────────────────────────────

export function NarrativeCard({ narrative }: { narrative: NarrativeVM }) {
  if (narrative.kind === "weekly") {
    const empty = !narrative.executiveSummary && !narrative.whatWorked && !narrative.toImprove
    if (empty) return null
    return (
      <Card>
        <Eyebrow>Resumen de la semana</Eyebrow>
        {narrative.executiveSummary
          ? <p className="text-sm text-[var(--ink-2)] mb-3">{narrative.executiveSummary}</p>
          : <p className="text-sm text-[var(--ink-3)] mb-3">Sin resumen escrito.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--win)" }}>Qué funcionó</p>
            <p className="text-sm text-[var(--ink-2)] whitespace-pre-wrap">{narrative.whatWorked || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--loss)" }}>A mejorar</p>
            <p className="text-sm text-[var(--ink-2)] whitespace-pre-wrap">{narrative.toImprove || "—"}</p>
          </div>
        </div>
      </Card>
    )
  }
  // monthly
  return (
    <Card>
      <Eyebrow>Resumen del mes</Eyebrow>
      {narrative.summary ? <p className="text-sm text-[var(--ink-2)] mb-3">{narrative.summary}</p> : <p className="text-sm text-[var(--ink-3)] mb-3">Sin resumen escrito.</p>}
      <div className="flex flex-wrap gap-1.5">
        {narrative.keyThemes.map(t => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{t}</span>)}
        {narrative.goalsMet.map(g => <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--win-soft)] text-[var(--win)]">✓ {g}</span>)}
        {narrative.goalsSet.filter(g => !narrative.goalsMet.includes(g)).map(g => <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--loss-soft)] text-[var(--loss)]">✗ {g}</span>)}
      </div>
    </Card>
  )
}
