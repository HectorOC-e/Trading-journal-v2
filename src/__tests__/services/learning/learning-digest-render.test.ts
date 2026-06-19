import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@react-email/render"
import { LearningDigest } from "@/emails/templates/learning-digest"
import { lightTheme, darkTheme } from "@/emails/theme"
import type { DigestModel } from "@/domains/learning/services/digest-builder"

const model: DigestModel = {
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

describe("LearningDigest render", () => {
  it("renders light variant with key content", async () => {
    const html = await render(React.createElement(LearningDigest, { model, theme: lightTheme, appUrl: "https://x.test" }))
    expect(html).toContain("Order Flow — Absorción")
    expect(html).toContain("Necesitan repaso")
    expect(html).toContain("12") // streak
    expect(html).toContain("https://x.test/aprendizaje")
    expect(html).toContain("https://x.test/perfil")
    expect(html).toContain(lightTheme.pageBg)
    expect(html).toMatchSnapshot()
  })

  it("renders dark variant with dark palette", async () => {
    const html = await render(React.createElement(LearningDigest, { model, theme: darkTheme, appUrl: "https://x.test" }))
    expect(html).toContain(darkTheme.cardBg)
    expect(html).toContain(darkTheme.band)
    expect(html).toMatchSnapshot()
  })

  it("hides the reviews block when there are none, keeps the digest valid", async () => {
    const empty: DigestModel = {
      ...model,
      reviews: [],
      reviewCount: 0,
      streak: { current: 12, best: 21, atRisk: true },
    }
    const html = await render(React.createElement(LearningDigest, { model: empty, theme: lightTheme }))
    expect(html).not.toContain("Necesitan repaso")
    expect(html).toContain("Iniciar sesión de estudio")
  })

  it("renders a planned-session block when present", async () => {
    const withSession: DigestModel = { ...model, plannedSession: { title: "Repaso ICT" } }
    const html = await render(React.createElement(LearningDigest, { model: withSession, theme: lightTheme }))
    expect(html).toContain("Sesión de hoy")
    expect(html).toContain("Repaso ICT")
  })
})
