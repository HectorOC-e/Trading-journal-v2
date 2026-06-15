"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer, TrendingUp, TrendingDown } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { currencySymbol } from "@/lib/fx"
import { cn } from "@/lib/utils"

function Delta({ value, suffix = "", invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value == null || value === 0) return <span className="text-[11px] text-[var(--ink-3)]">=</span>
  const good = invert ? value < 0 : value > 0
  return (
    <span className={cn("text-[11px] font-semibold inline-flex items-center gap-0.5", good ? "text-[var(--win)]" : "text-[var(--loss)]")}>
      {value > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {value > 0 ? "+" : ""}{value}{suffix}
    </span>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4", className)}>{children}</div>
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">{children}</p>
}

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function WeeklyReportPage() {
  const params = useParams<{ weekStart: string }>()
  const router = useRouter()
  const weekStart = params.weekStart ?? ""
  const valid = VALID_DATE.test(weekStart)

  const { data: r, isLoading } = trpc.weeklyReviews.report.useQuery(
    { weekStart },
    { enabled: valid },
  )

  if (!valid) return <div className="p-8 text-sm text-[var(--ink-3)]">Semana inválida.</div>
  if (isLoading || !r) return <div className="p-8 text-sm text-[var(--ink-3)]">Cargando reporte…</div>

  const cur = currencySymbol(r.baseCurrency)
  const money = (n: number) => `${n < 0 ? "-" : ""}${cur}${Math.abs(n).toFixed(2)}`
  const maxDay = Math.max(1, ...r.dayTrend.map(d => Math.abs(d.pnl)))

  return (
    <div className="max-w-[900px] mx-auto pb-12">
      {/* Header — hidden in print */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <button onClick={() => router.push("/reviews")} className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} /> Reviews
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90">
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      <h1 className="text-[22px] font-bold text-[var(--ink)]">{r.weekLabel}</h1>
      <p className="text-sm text-[var(--ink-3)] mb-5">Review semanal · {r.kpis.trades} trades · moneda base {r.baseCurrency}</p>

      {/* KPIs with deltas vs prior week */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card>
          <Eyebrow>Net P&amp;L</Eyebrow>
          <p className="num text-[20px] font-bold" style={{ color: r.kpis.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(r.kpis.netPnl)}</p>
          <Delta value={r.deltas.netPnl} suffix="" />
        </Card>
        <Card>
          <Eyebrow>Win rate</Eyebrow>
          <p className="num text-[20px] font-bold text-[var(--ink)]">{r.kpis.winRate}%</p>
          <Delta value={r.deltas.winRate} suffix="pp" />
        </Card>
        <Card>
          <Eyebrow>Disciplina</Eyebrow>
          <p className="num text-[20px] font-bold text-[var(--ink)]">{r.kpis.disciplineScore ?? "—"}</p>
          <Delta value={r.deltas.disciplineScore} />
        </Card>
        <Card>
          <Eyebrow>Profit factor</Eyebrow>
          <p className="num text-[20px] font-bold text-[var(--ink)]">{r.kpis.profitFactor}</p>
          <span className="text-[11px] text-[var(--ink-3)]">{r.kpis.trades} trades</span>
        </Card>
      </div>

      {/* Day trend — Mon→Sun */}
      <Card className="mb-5">
        <Eyebrow>Tendencia día a día</Eyebrow>
        {r.kpis.trades === 0 ? (
          <p className="text-sm text-[var(--ink-3)]">Sin trades esta semana.</p>
        ) : (
          <div className="flex items-end gap-3 h-28">
            {r.dayTrend.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] num mb-1" style={{ color: d.pnl > 0 ? "var(--win)" : d.pnl < 0 ? "var(--loss)" : "var(--ink-3)" }}>{d.pnl !== 0 ? money(d.pnl) : "—"}</span>
                <div className="w-full rounded-t" style={{
                  height: `${Math.max(4, (Math.abs(d.pnl) / maxDay) * 80)}%`,
                  background: d.pnl > 0 ? "var(--win)" : d.pnl < 0 ? "var(--loss)" : "var(--line)",
                }} />
                <span className="text-[10px] text-[var(--ink-3)] mt-1">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        {/* Best/worst day */}
        <Card>
          <Eyebrow>Mejor / peor día</Eyebrow>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-3)]">Mejor</span>
            <span className="num font-semibold" style={{ color: "var(--win)" }}>{r.bestDay ? `${money(r.bestDay.pnl)} · ${r.bestDay.date}` : "—"}</span>
          </div>
          <div className="flex justify-between text-sm mt-1.5">
            <span className="text-[var(--ink-3)]">Peor</span>
            <span className="num font-semibold" style={{ color: "var(--loss)" }}>{r.worstDay ? `${money(r.worstDay.pnl)} · ${r.worstDay.date}` : "—"}</span>
          </div>
        </Card>
        {/* Discipline */}
        <Card>
          <Eyebrow>Disciplina</Eyebrow>
          <div className="flex justify-between text-sm"><span className="text-[var(--ink-3)]">Violaciones</span><span className="num font-semibold">{r.discipline.violations}</span></div>
          <div className="flex justify-between text-sm mt-1.5"><span className="text-[var(--ink-3)]">Costo</span><span className="num font-semibold" style={{ color: r.discipline.costo < 0 ? "var(--loss)" : "var(--ink)" }}>{money(r.discipline.costo)}</span></div>
          <div className="flex justify-between text-sm mt-1.5"><span className="text-[var(--ink-3)]">Racha días limpios</span><span className="num font-semibold">{r.discipline.rachaDiasLimpios}</span></div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        {/* Setups */}
        <Card>
          <Eyebrow>Setups de la semana</Eyebrow>
          {r.setups.length === 0 ? <p className="text-sm text-[var(--ink-3)]">Sin setups asignados.</p> : r.setups.slice(0, 6).map(s => (
            <div key={s.name} className="flex justify-between text-sm py-1 border-b border-[var(--line)] last:border-0">
              <span className="text-[var(--ink-2)]">{s.name} <span className="text-[var(--ink-3)] text-[11px]">· {s.trades}</span></span>
              <span className="num font-semibold" style={{ color: s.pnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(s.pnl)}</span>
            </div>
          ))}
        </Card>
        {/* P&L por cuenta */}
        <Card>
          <Eyebrow>P&amp;L por cuenta</Eyebrow>
          {r.byAccount.length === 0 ? <p className="text-sm text-[var(--ink-3)]">Sin trades.</p> : r.byAccount.map(a => (
            <div key={a.name} className="flex justify-between text-sm py-1 border-b border-[var(--line)] last:border-0">
              <span className="text-[var(--ink-2)]">{a.name}</span>
              <span className="num font-semibold" style={{ color: a.pnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(a.pnl)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Saved review narrative */}
      {r.saved && (r.saved.executiveSummary || r.saved.whatWorked || r.saved.toImprove) && (
        <Card>
          <Eyebrow>Resumen de la semana</Eyebrow>
          {r.saved.executiveSummary
            ? <p className="text-sm text-[var(--ink-2)] mb-3">{r.saved.executiveSummary}</p>
            : <p className="text-sm text-[var(--ink-3)] mb-3">Sin resumen escrito.</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--win)" }}>Qué funcionó</p>
              <p className="text-sm text-[var(--ink-2)] whitespace-pre-wrap">{r.saved.whatWorked || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--loss)" }}>A mejorar</p>
              <p className="text-sm text-[var(--ink-2)] whitespace-pre-wrap">{r.saved.toImprove || "—"}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
