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

function Row({ theme, label, value, color }: { theme: EmailTheme; label: string; value: string; color?: string }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "0 0 8px" }}>
      <tbody>
        <tr>
          <td style={{ fontSize: 13, color: theme.ink2 }}>{label}</td>
          <td style={{ textAlign: "right", fontFamily: fontMono, fontWeight: 600, fontSize: 13, color: color ?? theme.ink }}>{value}</td>
        </tr>
      </tbody>
    </table>
  )
}

/** Lightweight markdown→email render: ### headers become eyebrows, bullets become rows. */
function AnalysisBlock({ theme, text }: { theme: EmailTheme; text: string }) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 16)
  return (
    <div>
      {lines.map((line, i) => {
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

export function ReviewSummary({ model, theme = lightTheme, appUrl = "https://app.tradingjournal.app" }: ReviewSummaryProps) {
  const cur = currencySymbol(model.baseCurrency || "USD")
  const m = (n: number) => `${n < 0 ? "-" : ""}${cur}${Math.abs(n).toFixed(2)}`
  const kindLabel = model.kind === "weekly" ? "Review semanal" : "Review mensual"
  const preview = `${model.title}: ${m(model.kpis.netPnl)} · WR ${model.kpis.winRate}%`

  return (
    <EmailLayout theme={theme} preview={preview}>
      <div style={{ padding: "26px 30px 4px" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>{kindLabel}</p>
        <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: theme.ink }}>{model.title}</p>
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

      <Divider theme={theme} />
      <div style={{ padding: "22px 30px" }}>
        <p style={eyebrow(theme)}>Setups y disciplina</p>
        {model.topSetup && <Row theme={theme} label={`▲ ${model.topSetup.name}`} value={m(model.topSetup.pnl)} color={theme.win} />}
        {model.worstSetup && <Row theme={theme} label={`▼ ${model.worstSetup.name}`} value={m(model.worstSetup.pnl)} color={theme.lossText} />}
        <Row theme={theme} label="Violaciones" value={String(model.discipline.violations)} color={model.discipline.violations > 0 ? theme.lossText : theme.ink} />
        <Row theme={theme} label="Costo de violaciones" value={m(model.discipline.costo)} color={model.discipline.costo < 0 ? theme.lossText : theme.ink} />
      </div>

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
  topSetup: { name: "Breakout", pnl: 980 },
  worstSetup: { name: "Reversal", pnl: -240 },
  discipline: { violations: 1, costo: -120 },
  aiAnalysis: "### Hallazgos clave\n- Breakout sigue siendo tu setup más rentable.\n### Banderas de riesgo\n- 1 violación por impulsividad costó $120.\n### Foco para el próximo periodo\n- Reduce el tamaño en Reversal hasta validar.",
  reportPath: "/reviews/semanal/2026-06-15",
}

export default function ReviewSummaryPreview() {
  return <ReviewSummary model={previewModel} />
}
