// Pure builder for the print-optimized review HTML fed to headless Chromium
// (page.setContent → page.pdf). Self-contained: inline light-theme CSS + an inline
// SVG trend chart, so it needs no app layout, theme, auth, or client hydration.

import { currencySymbol } from "@/lib/fx"
import type { WeeklyReport } from "@/domains/analytics/services/weekly-report"
import type { MonthlyReport } from "@/domains/analytics/services/monthly-report"

const C = {
  ink: "#14161d", ink2: "#4b5160", ink3: "#8b909c",
  line: "#e7e9ef", panel: "#ffffff", panel2: "#f4f5f8",
  win: "#1aa35a", loss: "#e5484d", accent: "#4f6ef7",
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

function trendPoints(kind: "weekly" | "monthly", report: WeeklyReport | MonthlyReport): { label: string; pnl: number }[] {
  return kind === "weekly"
    ? (report as WeeklyReport).dayTrend.map(d => ({ label: d.day, pnl: d.pnl }))
    : (report as MonthlyReport).weekTrend.map(w => ({ label: w.week, pnl: w.pnl }))
}

function trendSvg(points: { label: string; pnl: number }[], money: (n: number) => string): string {
  if (points.length === 0) return `<p style="color:${C.ink3};font-size:13px">Sin trades en este periodo.</p>`
  const W = 680, H = 150, pad = 22, barGap = 8
  const max = Math.max(1, ...points.map(p => Math.abs(p.pnl)))
  const usableH = H - pad * 2
  const bw = (W - barGap * (points.length - 1)) / points.length
  const bars = points.map((p, i) => {
    const h = Math.max(2, (Math.abs(p.pnl) / max) * usableH)
    const x = i * (bw + barGap)
    const y = H - pad - h
    const color = p.pnl >= 0 ? C.win : C.loss
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${color}"/>` +
      `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" font-size="9" fill="${C.ink3}" text-anchor="middle">${esc(p.label)}</text>`
  }).join("")
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${bars}</svg>`
}

function kpiCell(label: string, value: string, color: string): string {
  return `<td style="width:25%;padding:0 8px;border-left:1px solid ${C.line};vertical-align:top">
    <div style="font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3};margin-bottom:6px">${esc(label)}</div>
    <div style="font-family:monospace;font-weight:700;font-size:20px;color:${color}">${esc(value)}</div>
  </td>`
}

function rowsTable(title: string, rows: { name: string; pnl: number; trades: number }[], money: (n: number) => string, empty: string): string {
  const body = rows.length === 0
    ? `<p style="color:${C.ink3};font-size:12px;margin:0">${empty}</p>`
    : rows.slice(0, 6).map(r => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid ${C.panel2};font-size:12px">
        <span style="color:${C.ink2}">${esc(r.name)} <span style="color:${C.ink3}">· ${r.trades}</span></span>
        <span style="font-family:monospace;font-weight:600;color:${r.pnl >= 0 ? C.win : C.loss}">${money(r.pnl)}</span>
      </div>`).join("")
  return card(title, body)
}

function card(title: string, inner: string): string {
  return `<div style="background:${C.panel};border:1px solid ${C.line};border-radius:12px;padding:14px;margin-bottom:14px">
    <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3};margin-bottom:10px">${esc(title)}</div>
    ${inner}
  </div>`
}

// Callout palette for GitHub-style `> [!TYPE]` blocks (mirrors the web renderer).
const CALLOUT: Record<string, { bd: string; bg: string; fg: string }> = {
  INSIGHT:        { bd: C.accent, bg: "#eef1fe", fg: C.accent },
  RECOMMENDATION: { bd: C.win,    bg: "#e9f7ef", fg: C.win },
  TIP:            { bd: C.win,    bg: "#e9f7ef", fg: C.win },
  WARNING:        { bd: "#d9a441", bg: "#fdf6e7", fg: "#9a6b16" },
  DANGER:         { bd: C.loss,   bg: "#fdecec", fg: C.loss },
  NOTE:           { bd: C.ink3,   bg: C.panel2,  fg: C.ink2 },
  METRIC:         { bd: C.ink3,   bg: C.panel2,  fg: C.ink2 },
}

function calloutHtml(kind: string, body: string): string {
  const c = CALLOUT[kind] ?? CALLOUT.NOTE
  return `<div style="border-left:3px solid ${c.bd};background:${c.bg};border-radius:6px;padding:6px 10px;margin:6px 0">
    <span style="font-size:9px;font-weight:700;letter-spacing:.05em;color:${c.fg}">${esc(kind)}</span>
    <p style="font-size:12px;line-height:1.45;color:${C.ink2};margin:2px 0 0">${esc(body)}</p>
  </div>`
}

function analysisHtml(text: string): string {
  const lines = text.split("\n").map(l => l.trimEnd())
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // GitHub-style callout: > [!TYPE] body
    const co = /^>\s*\[!(\w+)\]\s*(.*)$/.exec(line)
    if (co) { out.push(calloutHtml(co[1].toUpperCase(), co[2])); continue }
    // continuation of a callout / plain blockquote line
    const q = /^>\s?(.*)$/.exec(line)
    if (q) { out.push(`<p style="font-size:12px;line-height:1.5;color:${C.ink2};margin:0 0 4px">${esc(q[1])}</p>`); continue }
    if (line.startsWith("### ")) { out.push(`<p style="font-weight:700;font-size:12px;color:${C.ink};margin:10px 0 4px">${esc(line.replace(/^###\s*/, ""))}</p>`); continue }
    const isBullet = /^[-•*]\s/.test(line)
    const txt = esc(line.replace(/^[-•*]\s*/, ""))
    out.push(`<p style="font-size:12px;line-height:1.5;color:${C.ink2};margin:0 0 4px;${isBullet ? "padding-left:12px" : ""}">${isBullet ? "• " + txt : txt}</p>`)
  }
  return out.join("")
}

export function renderReviewReportHtml(opts: {
  kind: "weekly" | "monthly"
  title: string
  subtitle: string
  report: WeeklyReport | MonthlyReport
  aiAnalysis: string | null
}): string {
  const { kind, report } = opts
  const cur = currencySymbol(report.baseCurrency || "USD")
  const money = (n: number) => `${n < 0 ? "-" : ""}${cur}${Math.abs(n).toFixed(2)}`
  const k = report.kpis
  const hasTrades = k.trades > 0

  const kpis = `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px"><tr>
    ${kpiCell("Net P&L", money(k.netPnl), k.netPnl >= 0 ? C.win : C.loss).replace(`border-left:1px solid ${C.line};`, "")}
    ${kpiCell("Win rate", hasTrades ? `${k.winRate}%` : "—", C.ink)}
    ${kpiCell("Disciplina", k.disciplineScore != null ? String(k.disciplineScore) : "—", C.ink)}
    ${kpiCell("Profit factor", hasTrades ? `${k.profitFactor}` : "—", C.ink)}
  </tr></table>`

  const setups = rowsTable(kind === "weekly" ? "Setups" : "Setups del mes", report.setups, money, "Sin setups asignados.")
  const sessions = rowsTable("Por sesión", report.sessions.map(s => ({ name: s.session, pnl: s.pnl, trades: s.trades })), money, "Sin sesiones.")
  const accounts = card("P&L por cuenta", report.byAccount.length === 0
    ? `<p style="color:${C.ink3};font-size:12px;margin:0">Sin trades.</p>`
    : report.byAccount.map(a => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid ${C.panel2};font-size:12px"><span style="color:${C.ink2}">${esc(a.name)}</span><span style="font-family:monospace;font-weight:600;color:${a.pnl >= 0 ? C.win : C.loss}">${money(a.pnl)}</span></div>`).join(""))

  const discipline = card("Disciplina", `
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:${C.ink3}">Violaciones</span><span style="font-family:monospace;font-weight:600">${report.discipline.violations}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:${C.ink3}">Costo</span><span style="font-family:monospace;font-weight:600;color:${report.discipline.costo < 0 ? C.loss : C.ink}">${money(report.discipline.costo)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:${C.ink3}">Racha días limpios</span><span style="font-family:monospace;font-weight:600">${report.discipline.rachaDiasLimpios}</span></div>`)

  const ai = opts.aiAnalysis ? card("Análisis IA", analysisHtml(opts.aiAnalysis)) : ""

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: ${C.ink}; background: ${C.panel2}; margin: 0; padding: 24px; }
    h1 { font-size: 22px; margin: 0; }
  </style></head>
  <body>
    <h1>${esc(opts.title)}</h1>
    <p style="font-size:13px;color:${C.ink3};margin:4px 0 18px">${esc(opts.subtitle)}</p>
    ${kpis}
    ${ai}
    ${card(kind === "weekly" ? "Tendencia día a día" : "Tendencia semana a semana", trendSvg(trendPoints(kind, report), money))}
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top;padding-right:7px">${setups}</td>
      <td width="50%" style="vertical-align:top;padding-left:7px">${sessions}</td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top;padding-right:7px">${discipline}</td>
      <td width="50%" style="vertical-align:top;padding-left:7px">${accounts}</td>
    </tr></table>
  </body></html>`
}
