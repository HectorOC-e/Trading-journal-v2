import { ASSESSMENT_LABELS, type BacktestReport } from "@/domains/learning/backtest-session"
import { safeTimeZone } from "@/lib/datetime/local"

function escape(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

const field = (label: string, value: string | number | null | undefined) => `<div class="field"><strong>${escape(label)}</strong><div>${escape(value === null || value === undefined || value === "" ? "Sin documentar" : String(value))}</div></div>`
const percent = (value: number | null) => value === null ? "No disponible" : `${value.toFixed(1)} %`
const r = (value: number | null) => value === null ? "No disponible" : `${value} R`
const eventLabels: Record<string, string> = { STOP_MOVE: "Ajuste de stop", PARTIAL_CLOSE: "Cierre parcial", SCALE_IN: "Ampliación de posición", NOTE: "Nota", CLOSE: "Cierre" }
const practiceLabels: Record<string, string> = { CONCEPT: "Conceptual", EXECUTION: "Ejecución", REVIEW: "Revisión" }

function curveSvg(curve: BacktestReport["metrics"]["curve"]) {
  if (curve.length < 2) return "<p>Curva no disponible.</p>"
  const values = curve.map(p => p.r)
  const low = Math.min(-1, ...values), high = Math.max(1, ...values)
  const y = (value: number) => 115 - (value - low) / (high - low) * 100
  const points = values.map((value, index) => `${(38 + index * (610 / (values.length - 1))).toFixed(2)},${y(value).toFixed(2)}`).join(" ")
  return `<svg viewBox="0 0 664 140" role="img" aria-label="Curva acumulada en R"><line x1="38" x2="648" y1="${y(0)}" y2="${y(0)}" stroke="#a2b1c5" stroke-dasharray="4 4"/><text x="2" y="${y(0) + 4}" font-size="11">0 R</text><polyline points="${points}" fill="none" stroke="#365be6" stroke-width="2.5"/><text x="38" y="133" font-size="11">Inicio</text><text x="648" y="133" text-anchor="end" font-size="11">${values.length - 1} cierres con R</text></svg>`
}

function image(capture: BacktestReport["captures"][number]) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(capture.mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(capture.data)) return ""
  return `<figure><img src="data:${capture.mime};base64,${capture.data}" alt="Captura seleccionada"><figcaption>${escape(capture.label)}</figcaption></figure>`
}

export function renderBacktestHtml(report: BacktestReport, meta: { number: number; closedAt: Date }) {
  const { plan, metrics } = report
  const closedOn = new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeStyle: "short", timeZone: safeTimeZone(report.timeZone) }).format(meta.closedAt)
  const cards = [
    ["Operaciones cerradas", metrics.closed], ["Acierto", percent(metrics.winRate)], ["Expectativa", r(metrics.expectancy)],
    ["Drawdown máximo", r(metrics.drawdown)], ["Checklist", percent(metrics.checklistPct)],
  ].map(([label, value]) => `<div class="kpi"><span>${escape(String(label))}</span><strong>${escape(String(value))}</strong></div>`).join("")
  const trades = report.trades.map((t, index) => {
    const a = t.annotations
    const events = t.events.length ? `<table><thead><tr><th>Evento y fecha</th><th>Precio</th><th>Tamaño</th><th>Resultado ${escape(t.currency)}</th><th>Nota</th></tr></thead><tbody>${t.events.map(e => `<tr><td>${escape(eventLabels[e.type] ?? e.type)}<br>${escape(e.at)}</td><td>${escape(e.price ?? "—")}</td><td>${escape(e.size ?? "—")}</td><td>${escape(e.pnl ?? "—")}</td><td>${escape(e.notes || "—")}</td></tr>`).join("")}</tbody></table>` : "<p>Sin eventos registrados.</p>"
    const adjustments = a?.adjustments?.length ? `<h4>Ajustes de stop documentados en la sesión</h4><table><thead><tr><th>Fecha y hora de mercado</th><th>Nuevo stop</th><th>Motivo</th></tr></thead><tbody>${[...a.adjustments].sort((l, r) => `${l.date} ${l.time}`.localeCompare(`${r.date} ${r.time}`)).map(item => `<tr><td>${escape(`${item.date} ${item.time}`)}</td><td>${escape(item.price)}</td><td>${escape(item.reason)}</td></tr>`).join("")}</tbody></table>` : ""
    return `<article><h3>${index + 1}. ${escape(t.symbol)} · ${escape(t.date)} · ${escape(t.direction)}${t.included ? "" : t.status === "CANCELLED" ? " · Cancelada" : " · Excluida"}</h3>
      <div class="data">${field("Cuenta", t.account)}${field("Zona del mercado", t.marketTimeZone)}${field("Apertura", t.marketOpenedAt ?? t.openTime)}${field("Cierre", t.marketClosedAt ?? t.closeTime)}${field("Entrada", t.entry)}${field("Stop registrado", t.stop)}${field("Objetivo de precio", t.target)}${field("Precio de cierre", t.closePrice)}${field("Tamaño inicial", t.size)}${field("Riesgo inicial", t.risk ? `${t.risk} ${t.currency}` : null)}${field("Resultado neto", t.pnl === null ? null : `${t.pnl} ${t.currency}`)}${field("Comisión", t.commission === null ? null : `${t.commission} ${t.currency}`)}${field("Resultado en R", r(t.r))}${field("Checklist", t.checklist ? `${t.checklist.compliant ? "Cumplido" : "Incumplido"} · ${t.checklist.source === "journal" ? "Trades" : "evaluación de sesión"}` : "Sin evaluar")}</div>
      <div class="notes">${field("Contexto", a?.context)}${field("Motivo de entrada", a?.entryReason)}${field("Invalidación y riesgo planeado", a?.riskPlan)}${field("Motivo de ajustes", a?.adjustmentReason)}${field("Motivo de salida", a?.exitReason)}${field("Lección", a?.lesson)}${t.planNotes ? field("Plan registrado en Trades", t.planNotes) : ""}${t.notes ? field("Notas registradas en Trades", t.notes) : ""}${t.outsideRange ? field("Justificación fuera del rango", a?.outOfRange) : ""}${!t.included ? field("Motivo de exclusión", a?.excluded) : ""}</div>
      <h4>Gestión y parciales</h4>${events}${adjustments}</article>`
  }).join("")
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escape(plan.title)}</title><style>
    *{box-sizing:border-box}body{margin:0;color:#19243a;font:11px/1.5 Arial,sans-serif}header{border-top:6px solid #365be6;padding:18px 0 14px;border-bottom:1px solid #ced9eb}h1,h2,h3,h4{line-height:1.2;overflow-wrap:anywhere;break-after:avoid}h1{font-size:28px;margin:6px 0 9px}h2{font-size:17px;border-bottom:1px solid #ced9eb;padding:0 0 6px;margin:23px 0 10px}h3{font-size:13px;margin:16px 0 8px}h4{font-size:11px;margin:10px 0 5px}p{margin:5px 0}p,td,li,.field{overflow-wrap:anywhere;white-space:pre-wrap}ul{padding-left:16px}.eyebrow,.kpi span,.field strong{font-size:9px;color:#39517c}.eyebrow{color:#365be6;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.data,.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.field,.kpi{background:#f1f5fc;padding:5px 7px;border-radius:4px}.kpi strong{display:block;font-size:13px}.field div{margin-top:2px}.notes>.field{margin:4px 0;background:white;border-bottom:1px solid #e5ebf7}.notes{margin-top:7px}article{border-top:1px solid #ced9eb;margin-top:10px}.items{padding:0;list-style:none}.items li{border-bottom:1px solid #ced9eb;padding:6px 0}table{border-collapse:collapse;width:100%;font-size:9px;table-layout:fixed}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #ced9eb;padding:4px}th{background:#e8f0ff}tr,figure{break-inside:avoid}figure{margin:12px 0}img{display:block;max-width:100%;max-height:140mm}svg{display:block;width:100%}figcaption{color:#39517c;font-size:10px}.notice{background:#fff5df;padding:7px 10px;border-left:3px solid #bd811a}
    </style></head><body><header><div class="eyebrow">TjournalX / Informe de backtesting</div><h1>${escape(plan.title)}</h1><p>Versión ${meta.number} · Cierre ${escape(closedOn)}</p><p>${escape(plan.symbols)} · ${escape(plan.timeframe)} · Mercado ${escape(plan.from)} a ${escape(plan.to)}</p></header>
    <section><h2>Plan y objetivos</h2><div class="data">${field("Jornadas de trabajo", report.workDays.join(", "))}${field("Setup", plan.setup ? `${plan.setup.name} · ${plan.setup.version ? `versión ${plan.setup.version}` : "definición guardada"}` : "Sesión independiente")}${plan.setup?.criterion ? field("Criterio del Playbook", plan.setup.criterion) : ""}</div><div class="notes">${field("Hipótesis", plan.hypothesis)}${plan.setup ? field("Definición del setup", plan.setup.description) : ""}${plan.setup?.checklist.length ? field("Checklist base", plan.setup.checklist.join("\n")) : ""}${field("Reglas de entrada", plan.rules)}${field("Invalidación", plan.invalidation)}${field("Reglas de salida", plan.exitRules)}${field("Supuestos de ejecución", plan.assumptions)}</div>
    <ul class="items">${report.objectives.map(o => `<li><strong>${escape(o.title)}</strong> · ${ASSESSMENT_LABELS[o.state]}<br>${escape(o.criterion)}${o.metric !== "manual" ? `<br>Umbral ${o.threshold} · Observado ${o.observed === null ? "No disponible" : Number(o.observed.toFixed(3))} · Muestra ${o.sample}` : ""}${o.comment ? `<br>${escape(o.comment)}` : ""}</li>`).join("")}</ul></section>
    <section><h2>Resultados</h2>${metrics.closed ? `<div class="kpis">${cards}</div><p>${metrics.wins} ganadoras · ${metrics.losses} perdedoras · ${metrics.neutral} neutras · ${metrics.resultCoverage}/${metrics.closed} con resultado</p><p>${metrics.rCoverage}/${metrics.closed} con R · ${metrics.checklistCoverage}/${metrics.closed} con checklist evaluado</p>${Object.entries(metrics.money).map(([currency, value]) => `<p>${escape(currency)} · P&amp;L neto ${value.toFixed(2)}</p>`).join("")}${curveSvg(metrics.curve)}` : "<p>Sin operaciones ejecutadas.</p>"}${report.warnings.length ? `<ul class="notice">${report.warnings.map(w => `<li>${escape(w)}</li>`).join("")}</ul>` : ""}</section>
    <section><h2>Diario operativo</h2>${trades || "<p>Sin operaciones vinculadas.</p>"}</section>
    <section><h2>Ejercicios y observaciones</h2>${report.practices.map(p => `<article><h3>${escape(p.title)}</h3><p>${escape(p.date)} · ${p.duration} min · ${escape(practiceLabels[p.kind] ?? p.kind)}</p>${field("Objetivo", p.objective)}${field("Ejercicio", p.exercise)}${field("Reflexión", p.reflection)}${field("Autoevaluación", p.assessment && p.assessment in ASSESSMENT_LABELS ? ASSESSMENT_LABELS[p.assessment as keyof typeof ASSESSMENT_LABELS] : p.assessment)}</article>`).join("") || "<p>Sin prácticas vinculadas.</p>"}
    ${report.signals.length ? `<h3>Señales descartadas</h3>${report.signals.map(s => `<article><h4>${escape(s.date)} · ${escape(s.symbol)}</h4>${field("Contexto", s.context)}${field("Motivo", s.reason)}${s.captureId ? report.captures.filter(c => c.id === s.captureId).map(image).join("") : ""}</article>`).join("")}` : ""}
    ${report.observations ? field("Observaciones y cambios de criterio", report.observations) : ""}${report.captures.filter(c => !report.signals.some(s => s.captureId === c.id)).map(image).join("")}</section>
    <section><h2>Conclusión de la sesión</h2>${field("Hallazgos y límites de la muestra", report.conclusion)}${field("Siguiente ejercicio", report.nextStep)}${report.coach ? field("Comentario del Coach IA aprobado por el trader", report.coach) : ""}</section></body></html>`
}
