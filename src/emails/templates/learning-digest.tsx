import * as React from "react"
import { EmailLayout } from "../components/EmailLayout"
import { StreakBand } from "../components/StreakBand"
import { StatRow } from "../components/StatRow"
import { Divider } from "../components/Divider"
import { ReviewItem } from "../components/ReviewItem"
import { ProgressBlock } from "../components/ProgressBlock"
import { CtaButton } from "../components/CtaButton"
import { EmailFooter } from "../components/EmailFooter"
import { type EmailTheme, lightTheme } from "../theme"
import type { DigestModel } from "@/domains/learning/services/digest-builder"

export interface LearningDigestProps {
  model: DigestModel
  theme?: EmailTheme
  appUrl?: string
}

export function LearningDigest({ model, theme = lightTheme, appUrl = "https://tjournalx.com" }: LearningDigestProps) {
  const greeting = model.greetingName ? `Hola ${model.greetingName}` : "Hola"
  const preview = model.streak.atRisk
    ? `${greeting}: tu racha de ${model.streak.current} días está en riesgo`
    : model.reviewCount > 0
      ? `${greeting}: ${model.reviewCount} recurso${model.reviewCount > 1 ? "s" : ""} para repasar hoy`
      : `${greeting}: tu repaso de hoy`

  return (
    <EmailLayout theme={theme} preview={preview}>
      <StreakBand theme={theme} streak={model.streak.current} atRisk={model.streak.atRisk} dateLabel={model.dateLabel} />

      <StatRow
        theme={theme}
        stats={[
          { label: "Repasos", value: String(model.reviewCount), color: model.reviewCount > 0 ? theme.lossText : theme.ink },
          { label: "Semana", value: String(model.progress.pct), unit: "%" },
          { label: "Mejor", value: String(model.streak.best), color: theme.win },
        ]}
      />

      {model.reviewCount > 0 && (
        <>
          <Divider theme={theme} />
          <div style={{ padding: "22px 30px" }}>
            <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>
              Necesitan repaso · {model.reviewCount}
            </p>
            {model.reviews.map((r, i) => (
              <ReviewItem key={r.id} theme={theme} title={r.title} kind={r.kind} overdueDays={r.overdueDays} withDivider={i > 0} />
            ))}
          </div>
        </>
      )}

      {model.plannedSession && (
        <>
          <Divider theme={theme} />
          <div style={{ padding: "22px 30px" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>
              Sesión de hoy
            </p>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: theme.ink }}>{model.plannedSession.title}</p>
          </div>
        </>
      )}

      <Divider theme={theme} />
      <ProgressBlock theme={theme} minutesThisWeek={model.progress.minutesThisWeek} goalMinutes={model.progress.goalMinutes} pct={model.progress.pct} />

      <CtaButton theme={theme} href={`${appUrl}/aprendizaje`} label="Iniciar sesión de estudio" />

      <EmailFooter theme={theme} prefsUrl={`${appUrl}/perfil`} />
    </EmailLayout>
  )
}

// Preview fixture for `pnpm email` (react-email dev server).
const previewModel: DigestModel = {
  isEmpty: false,
  greetingName: "Héctor",
  dateLabel: "jueves, 19 jun",
  streak: { current: 12, best: 21, atRisk: true },
  reviews: [
    { id: "a", title: "Order Flow — Absorción", kind: "overdue", overdueDays: 3 },
    { id: "b", title: "Wyckoff — Fase C", kind: "overdue", overdueDays: 1 },
    { id: "c", title: "ICT — Liquidity sweeps", kind: "today", overdueDays: 0 },
  ],
  reviewCount: 3,
  progress: { minutesThisWeek: 210, goalMinutes: 300, pct: 70 },
  plannedSession: null,
}

export default function LearningDigestPreview() {
  return <LearningDigest model={previewModel} />
}
