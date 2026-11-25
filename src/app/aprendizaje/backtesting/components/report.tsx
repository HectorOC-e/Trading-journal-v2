import { ASSESSMENT_LABELS, type BacktestReport } from "@/domains/learning/backtest-session"
import { panel } from "./fields"

const number = (value: number | null, suffix = "") => value === null ? "No disponible" : `${value.toLocaleString("es-HN", { maximumFractionDigits: 3 })}${suffix}`

export function ReportSummary({ report, changes = [] }: { report: Omit<BacktestReport, "captures">; changes?: string[] }) {
  const { metrics } = report
  return <section className={`${panel} space-y-4`} aria-label="Resumen del informe">
    <h2 className="text-lg font-semibold">Resumen de la sesión</h2>
    {metrics.closed ? <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["Cerradas", metrics.closed], ["Acierto", number(metrics.winRate, " %")], ["Expectativa", number(metrics.expectancy, " R")], ["Drawdown", number(metrics.drawdown, " R")], ["Checklist", number(metrics.checklistPct, " %")], ["Cobertura de R", `${metrics.rCoverage}/${metrics.closed}`], ["Checklists evaluados", `${metrics.checklistCoverage}/${metrics.closed}`], ["Resultados conocidos", `${metrics.resultCoverage}/${metrics.closed}`]].map(([label, value]) => <div className="rounded-lg bg-[var(--panel-2)] p-3" key={label}><dt className="text-xs text-[var(--ink-2)]">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
    </dl> : <p>Sin operaciones ejecutadas.</p>}
    {Object.entries(metrics.money).map(([currency, value]) => <p key={currency} className="text-sm">P&L neto en {currency} · {number(value)}</p>)}
    <h3 className="font-semibold">Evaluación de objetivos</h3>
    <ul className="space-y-2 text-sm">{report.objectives.map((o, i) => <li key={i}><strong>{o.title}</strong> · {ASSESSMENT_LABELS[o.state]}<p>{o.criterion}</p>{o.metric !== "manual" && <p>Umbral {number(o.threshold)} · Observado {number(o.observed)} · Muestra {o.sample}</p>}{o.comment && <p className="whitespace-pre-wrap">{o.comment}</p>}</li>)}</ul>
    {report.blockers.length > 0 && <div role="alert" className="rounded-lg bg-[var(--loss-soft)] p-3 text-sm"><strong>Pendiente para cerrar</strong><ul className="list-disc pl-5">{report.blockers.map((v, i) => <li key={i}>{v}</li>)}</ul></div>}
    {report.warnings.length > 0 && <ul className="list-disc pl-5 text-sm text-[var(--ink-2)]">{report.warnings.map((v, i) => <li key={i}>{v}</li>)}</ul>}
    {changes.length > 0 && <details open><summary className="cursor-pointer font-medium">Cambios desde el último cierre ({changes.length})</summary><ul className="list-disc pl-5 text-sm">{changes.map((v, i) => <li key={i}>{v}</li>)}</ul></details>}
  </section>
}

export function ClosedReport({ report }: { report: Omit<BacktestReport, "captures"> }) {
  return <div className="space-y-4">
    <ReportSummary report={report} />
    <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Diario operativo</h2>
      {report.trades.map(t => <details key={t.id} className="border-b border-[var(--line)] pb-2"><summary className="cursor-pointer font-medium">{t.symbol} · {t.date} · {t.included ? number(t.r, " R") : "Excluida"}</summary>
        <p className="text-sm">Entrada {t.entry} · Cierre {t.closePrice ?? "Sin documentar"} · {t.account}</p>
        <p className="whitespace-pre-wrap text-sm">Motivo de entrada · {t.annotations?.entryReason || "Sin documentar"}</p>
        <p className="whitespace-pre-wrap text-sm">Motivo de salida · {t.annotations?.exitReason || "Sin documentar"}</p>
        {t.events.length > 0 && <ul className="text-sm">{t.events.map((e, i) => <li key={i}>{e.type} · {e.at} · {e.price ?? "—"} · {e.notes}</li>)}</ul>}
      </details>)}
      {report.trades.length === 0 && <p className="text-sm">Sin operaciones vinculadas.</p>}
      <h3 className="font-semibold">Prácticas y señales descartadas</h3>
      {report.practices.map(p => <p key={p.id} className="text-sm">{p.title} · {p.date} · {p.duration} min</p>)}
      {report.signals.map((s, i) => <p key={i} className="text-sm">{s.symbol} · {s.date} · {s.reason}</p>)}
      <h3 className="font-semibold">Conclusión</h3><p className="whitespace-pre-wrap text-sm">{report.conclusion}</p>
      <h3 className="font-semibold">Siguiente ejercicio</h3><p className="whitespace-pre-wrap text-sm">{report.nextStep}</p>
      {report.coach && <><h3 className="font-semibold">Análisis del Coach IA</h3><p className="whitespace-pre-wrap text-sm">{report.coach}</p></>}
    </section>
  </div>
}
