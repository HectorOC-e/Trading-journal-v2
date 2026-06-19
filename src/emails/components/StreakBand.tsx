import * as React from "react"
import { type EmailTheme, fontMono } from "../theme"

export function StreakBand({
  theme,
  streak,
  atRisk,
  dateLabel,
}: {
  theme: EmailTheme
  streak: number
  atRisk: boolean
  dateLabel: string
}) {
  return (
    <div style={{ backgroundColor: theme.band, padding: "28px 30px 26px", color: theme.onAccent }}>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 25,
                  height: 25,
                  lineHeight: "25px",
                  textAlign: "center",
                  borderRadius: 7,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  fontWeight: 700,
                  fontSize: 11,
                  verticalAlign: "middle",
                  marginRight: 9,
                }}
              >
                TJ
              </span>
              <span style={{ fontWeight: 600, fontSize: 12, verticalAlign: "middle" }}>Trading Journal</span>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <span style={{ fontWeight: 500, fontSize: 12, color: theme.onBandMuted }}>{dateLabel}</span>
            </td>
          </tr>
        </tbody>
      </table>
      {streak > 0 ? (
        <table cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "bottom", paddingRight: 12 }}>
                <span style={{ fontFamily: fontMono, fontWeight: 700, fontSize: 46, lineHeight: "0.9", letterSpacing: "-0.02em" }}>
                  {streak}
                </span>
              </td>
              <td style={{ verticalAlign: "bottom", paddingBottom: 4 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>días de racha</p>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 12, lineHeight: 1.2, color: theme.onBandMuted }}>
                  {atRisk ? "En riesgo · estudia hoy para no perderla" : "¡Vas en racha! Mantenla hoy"}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p style={{ margin: 0, fontWeight: 700, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
          Tu repaso de hoy
        </p>
      )}
    </div>
  )
}
