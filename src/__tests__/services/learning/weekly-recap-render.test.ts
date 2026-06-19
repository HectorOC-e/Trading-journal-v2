import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@react-email/render"
import { WeeklyRecap, type WeeklyRecapModel } from "@/emails/templates/weekly-recap"
import { darkTheme } from "@/emails/theme"

const model: WeeklyRecapModel = {
  greetingName: "Héctor",
  weekRangeLabel: "9 – 15 jun",
  completed: ["Trading in the Zone — cap. 7", "ICT — Market Maker Models"],
  reviewsPending: 2,
  streakBest: 21,
  progress: { minutesThisWeek: 240, goalMinutes: 300, pct: 80 },
}

describe("WeeklyRecap render", () => {
  it("renders week range, completed items and CTA", async () => {
    const html = await render(React.createElement(WeeklyRecap, { model, appUrl: "https://x.test" }))
    expect(html).toContain("Tu semana de aprendizaje")
    expect(html).toContain("9 – 15 jun")
    expect(html).toContain("ICT — Market Maker Models")
    expect(html).toContain("https://x.test/aprendizaje")
  })

  it("renders dark variant", async () => {
    const html = await render(React.createElement(WeeklyRecap, { model, theme: darkTheme }))
    expect(html).toContain(darkTheme.band)
  })
})
