import * as React from "react"
import { EmailLayout } from "../components/EmailLayout"
import { StatRow } from "../components/StatRow"
import { Divider } from "../components/Divider"
import { CtaButton } from "../components/CtaButton"
import { EmailFooter } from "../components/EmailFooter"
import { type EmailTheme, lightTheme, fontMono } from "../theme"
import { currencySymbol } from "@/lib/fx"
import type { ReviewEmailModel } from "@/domains/analytics/services/review-email-model"

export interface ReviewSummaryProps {
  model: ReviewEmailModel
  theme?: EmailTheme
  appUrl?: string
}

const eyebrow = (theme: EmailTheme): React.CSSProperties => ({
  margin: "0 0 12px", fontWeight: 600, fontSize: 10, letterSpacing: "0.05em",
  textTransform: "uppercase", color: theme.ink3,
})

function gradeColors(letter: string, theme: EmailTheme): { fg: string; bg: string } {
  if (/^[AB]/.test(letter)) return { fg: theme.win, bg: theme.mode === "dark" ? "#16271d" : "#e9f7ef" }
  if (/^C/.test(letter))    return { fg: theme.amberText, bg: theme.amberBg }
  return { fg: theme.lossText, bg: theme.lossBg }
}

// Callout palette for `> [!TYPE]` blocks (light variant; mirrors web + PDF).
const EMAIL_CALLOUT: Record<string, { bd: string; bg: string; fg: string }> = {
  INSIGHT:        { bd: "#4f6ef7", bg: "#eef1fe", fg: "#3b53c4" },
  RECOMMENDATION: { bd: "#1aa35a", bg: "#e9f7ef", fg: "#157a45" },
  TIP:            { bd: "#1aa35a", bg: "#e9f7ef", fg: "#157a45" },
  WARNING:        { bd: "#d9a441", bg: "#fdf6e7", fg: "#9a6b16" },
  DANGER:         { bd: "#e5484d", bg: "#fdecec", fg: "#b3272c" },
  NOTE:           { bd: "#8b909c", bg: "#f4f5f8", fg: "#4b5160" },
  METRIC:         { bd: "#8b909c", bg: "#f4f5f8", fg: "#4b5160" },
}

/** Lightweight markdown→email render: ### headers, bullets, and `> [!TYPE]` callouts. */
function AnalysisBlock({ theme, text }: { theme: EmailTheme; text: string }) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 24)
  return (
    <div>
      {lines.map((line, i) => {
        const co = /^>\s*\[!(\w+)\]\s*(.*)$/.exec(line)
        if (co) {
          const c = EMAIL_CALLOUT[co[1].toUpperCase()] ?? EMAIL_CALLOUT.NOTE
          return (
            <div key={i} style={{ borderLeft: `3px solid ${c.bd}`, background: c.bg, borderRadius: 6, padding: "6px 10px", margin: "6px 0" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: c.fg }}>{co[1].toUpperCase()}</span>
              <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.45, color: theme.ink2 }}>{co[2]}</p>
            </div>
          )
        }
        if (line.startsWith("### ")) {
          return <p key={i} style={{ margin: "12px 0 6px", fontWeight: 700, fontSize: 12, color: theme.ink }}>{line.replace(/^###\s*/, "")}</p>
        }
        const bullet = line.replace(/^[-•*]\s*/, "")
        const isBullet = /^[-•*]\s/.test(line)
        return (
          <p key={i} style={{ margin: "0 0 5px", fontSize: 13, lineHeight: 1.5, color: theme.ink2, paddingLeft: isBullet ? 12 : 0 }}>
            {isBullet ? `• ${bullet}` : line}
          </p>
        )
      })}
    </div>
  )
}

/** Win/loss split bar — table-based for email-client safety. */
function WinLossBar({ theme, wins, losses }: { theme: EmailTheme; wins: number; losses: number }) {
  const total = Math.max(1, wins + losses)
  const winPct = Math.round((wins / total) * 100)
  const lossPct = 100 - winPct
  return (
    <div style={{ padding: "0 30px 22px" }}>
      <p style={eyebrow(theme)}>Resultado de la semana</p>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderRadius: 6, overflow: "hidden", tableLayout: "fixed" }}>
        <tbody><tr>
          {wins > 0 && <td style={{ width: `${winPct}%`, height: 8, backgroundColor: theme.win }} />}
          {losses > 0 && <td style={{ width: `${lossPct}%`, height: 8, backgroundColor: theme.lossText }} />}
        </tr></tbody>
      </table>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: theme.ink3 }}>
        <span style={{ color: theme.win, fontWeight: 600 }}>{wins} ganador{wins === 1 ? "" : "es"}</span>
        {"  ·  "}
        <span style={{ color: theme.lossText, fontWeight: 600 }}>{losses} perdedor{losses === 1 ? "" : "es"}</span>
      </p>
    </div>
  )
}

/** ✓worked / ✗toImprove chip columns. */
function ChipColumns({ theme, worked, toImprove }: { theme: EmailTheme; worked: string[]; toImprove: string[] }) {
  if (worked.length === 0 && toImprove.length === 0) return null
  const col = (title: string, items: string[], fg: string, bg: string) => (
    <td style={{ width: "50%", verticalAlign: "top", padding: 8 }}>
      <div style={{ background: bg, borderRadius: 8, padding: "8px 10px" }}>
        <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: fg }}>{title}</p>
        {items.length === 0
          ? <p style={{ margin: 0, fontSize: 12, color: theme.ink3 }}>—</p>
          : items.map((it, i) => <p key={i} style={{ margin: i === 0 ? 0 : "4px 0 0", fontSize: 12, lineHeight: 1.35, color: theme.ink2 }}>{it}</p>)}
      </div>
    </td>
  )
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ padding: "0 22px 16px" }}>
      <tbody><tr>
        {col("✓ FUNCIONÓ", worked, theme.win, theme.mode === "dark" ? "#16271d" : "#e9f7ef")}
        {col("✗ A MEJORAR", toImprove, theme.lossText, theme.lossBg)}
      </tr></tbody>
    </table>
  )
}

export function ReviewSummary({ model, theme = lightTheme, appUrl = "https://tjournalx.com" }: ReviewSummaryProps) {
  const cur = currencySymbol(model.baseCurrency || "USD")
  const m = (n: number) => `${n < 0 ? "-" : ""}${cur}${Math.abs(n).toFixed(2)}`
  const kindLabel = model.kind === "weekly" ? "Review semanal" : "Review mensual"
  const preview = `${model.title}: ${m(model.kpis.netPnl)} · WR ${model.kpis.winRate}%`
  const g = gradeColors(model.grade, theme)
  const dPnl = model.deltas.netPnl

  return (
    <EmailLayout theme={theme} preview={preview}>
      {/* Header: grade + title + verdict + delta */}
      <div style={{ padding: "26px 30px 6px" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>{kindLabel}</p>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 8 }}>
          <tbody><tr>
            <td style={{ width: 52, verticalAlign: "top" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: g.bg, textAlign: "center", lineHeight: "44px", fontFamily: fontMono, fontWeight: 800, fontSize: 20, color: g.fg }}>
                {model.grade}
              </div>
            </td>
            <td style={{ verticalAlign: "top", paddingLeft: 4 }}>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: theme.ink, lineHeight: 1.25 }}>{model.title}</p>
              <p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.4, color: theme.ink2 }}>{model.verdict}</p>
              {dPnl !== 0 && (
                <p style={{ margin: "5px 0 0", fontSize: 12, fontWeight: 600, color: dPnl > 0 ? theme.win : theme.lossText }}>
                  {dPnl > 0 ? "▲" : "▼"} {m(Math.abs(dPnl))} vs. periodo anterior
                </p>
              )}
            </td>
          </tr></tbody>
        </table>
      </div>

      <StatRow
        theme={theme}
        stats={[
          { label: "Net P&L", value: m(model.kpis.netPnl), color: model.kpis.netPnl >= 0 ? theme.win : theme.lossText },
          { label: "Win rate", value: String(model.kpis.winRate), unit: "%" },
          { label: "Profit factor", value: String(model.kpis.profitFactor) },
          { label: "Disciplina", value: model.kpis.disciplineScore != null ? String(model.kpis.disciplineScore) : "—" },
        ]}
      />

      <WinLossBar theme={theme} wins={model.winLoss.wins} losses={model.winLoss.losses} />

      <ChipColumns theme={theme} worked={model.worked} toImprove={model.toImprove} />

      {model.aiAnalysis && (
        <>
          <Divider theme={theme} />
          <div style={{ padding: "22px 30px" }}>
            <p style={eyebrow(theme)}>Análisis IA</p>
            <AnalysisBlock theme={theme} text={model.aiAnalysis} />
          </div>
        </>
      )}

      <CtaButton theme={theme} href={`${appUrl}${model.reportPath}`} label="Ver reporte completo" />
      <EmailFooter theme={theme} prefsUrl={`${appUrl}/perfil`} reason="Recibes esto porque tienes activos los correos de Reviews." />
    </EmailLayout>
  )
}

// Preview fixture for the react-email dev server.
const previewModel: ReviewEmailModel = {
  isEmpty: false,
  kind: "weekly",
  title: "Semana del 15 jun",
  baseCurrency: "USD",
  kpis: { netPnl: 1240, winRate: 58, profitFactor: 2.1, trades: 14, disciplineScore: 82 },
  deltas: { netPnl: 320, winRate: 6 },
  winLoss: { wins: 8, losses: 6 },
  verdict: "Semana rentable, pero sobre-operaste el martes.",
  grade: "B+",
  worked: ["Breakout +$980", "Win rate 58%"],
  toImprove: ["1 violación · −$120", "Reversal −$240"],
  topSetup: { name: "Breakout", pnl: 980 },
  worstSetup: { name: "Reversal", pnl: -240 },
  discipline: { violations: 1, costo: -120 },
  aiAnalysis: "### Hallazgos clave\n- Breakout sigue siendo tu setup más rentable.\n### Banderas de riesgo\n- 1 violación por impulsividad costó $120.\n### Foco para el próximo periodo\n- Reduce el tamaño en Reversal hasta validar.",
  reportPath: "/reviews/semanal/2026-06-15",
}

export default function ReviewSummaryPreview() {
  return <ReviewSummary model={previewModel} />
}
