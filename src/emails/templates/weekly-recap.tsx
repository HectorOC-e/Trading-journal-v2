import * as React from "react"
import { EmailLayout } from "../components/EmailLayout"
import { StatRow } from "../components/StatRow"
import { Divider } from "../components/Divider"
import { ProgressBlock } from "../components/ProgressBlock"
import { CtaButton } from "../components/CtaButton"
import { EmailFooter } from "../components/EmailFooter"
import { type EmailTheme, lightTheme, fontMono } from "../theme"

// Optional weekend recap of the Aprendizaje week. Presentational — built on the
// shared base system. Its scheduling/sending is wired separately (spec §12).

export interface WeeklyRecapModel {
  greetingName: string
  weekRangeLabel: string
  completed: string[]
  reviewsPending: number
  streakBest: number
  progress: { minutesThisWeek: number; goalMinutes: number; pct: number }
}

export interface WeeklyRecapProps {
  model: WeeklyRecapModel
  theme?: EmailTheme
  appUrl?: string
}

export function WeeklyRecap({ model, theme = lightTheme, appUrl = "https://tjournalx.com" }: WeeklyRecapProps) {
  const greeting = model.greetingName ? `Hola ${model.greetingName}` : "Hola"
  return (
    <EmailLayout theme={theme} preview={`${greeting}: tu semana de aprendizaje`}>
      {/* Header band */}
      <div style={{ backgroundColor: theme.band, padding: "28px 30px 26px", color: theme.onAccent }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 18 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle" }}>
                <span style={{ display: "inline-block", width: 25, height: 25, lineHeight: "25px", textAlign: "center", borderRadius: 7, backgroundColor: "rgba(255,255,255,0.16)", fontWeight: 700, fontSize: 11, marginRight: 9, verticalAlign: "middle" }}>TJ</span>
                <span style={{ fontWeight: 600, fontSize: 12, verticalAlign: "middle" }}>Trading Journal</span>
              </td>
              <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                <span style={{ fontWeight: 500, fontSize: 12, color: theme.onBandMuted }}>{model.weekRangeLabel}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.01em" }}>Tu semana de aprendizaje</p>
      </div>

      <StatRow
        theme={theme}
        stats={[
          { label: "Completados", value: String(model.completed.length), color: theme.win },
          { label: "Meta", value: String(model.progress.pct), unit: "%" },
          { label: "Mejor racha", value: String(model.streakBest) },
        ]}
      />

      {model.completed.length > 0 && (
        <>
          <Divider theme={theme} />
          <div style={{ padding: "22px 30px" }}>
            <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>
              Completados esta semana
            </p>
            {model.completed.map((title, i) => (
              <p key={i} style={{ margin: "0 0 6px", fontWeight: 500, fontSize: 14, color: theme.ink }}>
                <span style={{ fontFamily: fontMono, color: theme.win, marginRight: 8 }}>✓</span>{title}
              </p>
            ))}
          </div>
        </>
      )}

      <Divider theme={theme} />
      <ProgressBlock theme={theme} minutesThisWeek={model.progress.minutesThisWeek} goalMinutes={model.progress.goalMinutes} pct={model.progress.pct} />

      <CtaButton theme={theme} href={`${appUrl}/aprendizaje`} label="Ver mi aprendizaje" />
      <EmailFooter theme={theme} prefsUrl={`${appUrl}/perfil`} />
    </EmailLayout>
  )
}

const previewModel: WeeklyRecapModel = {
  greetingName: "Héctor",
  weekRangeLabel: "9 – 15 jun",
  completed: ["Trading in the Zone — cap. 7", "ICT — Market Maker Models"],
  reviewsPending: 2,
  streakBest: 21,
  progress: { minutesThisWeek: 240, goalMinutes: 300, pct: 80 },
}

export default function WeeklyRecapPreview() {
  return <WeeklyRecap model={previewModel} />
}
