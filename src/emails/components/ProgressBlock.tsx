import * as React from "react"
import { type EmailTheme, fontMono } from "../theme"

export function ProgressBlock({
  theme,
  minutesThisWeek,
  goalMinutes,
  pct,
}: {
  theme: EmailTheme
  minutesThisWeek: number
  goalMinutes: number
  pct: number
}) {
  return (
    <div style={{ padding: "22px 30px" }}>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span style={{ fontWeight: 500, fontSize: 13, color: theme.ink2 }}>Tiempo de estudio · semana</span>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <span style={{ fontFamily: fontMono, fontWeight: 600, fontSize: 13, color: theme.ink }}>
                {minutesThisWeek} / {goalMinutes} min
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ height: 6, backgroundColor: theme.lineSection, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 6, backgroundColor: theme.accent, borderRadius: 99 }} />
      </div>
    </div>
  )
}
