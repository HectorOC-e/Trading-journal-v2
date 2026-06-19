import * as React from "react"
import { type EmailTheme, fontMono } from "../theme"

export interface Stat {
  label: string
  value: string
  unit?: string
  color?: string
}

export function StatRow({ theme, stats }: { theme: EmailTheme; stats: Stat[] }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ padding: "22px 30px" }}>
      <tbody>
        <tr>
          {stats.map((s, i) => (
            <td key={s.label} style={{ width: `${100 / stats.length}%`, paddingLeft: i === 0 ? 0 : 22, borderLeft: i === 0 ? "none" : `1px solid ${theme.lineSection}` }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink3 }}>
                {s.label}
              </p>
              <p style={{ margin: 0, fontFamily: fontMono, fontWeight: 700, fontSize: 22, lineHeight: 1, color: s.color ?? theme.ink }}>
                {s.value}
                {s.unit && <span style={{ fontFamily: fontMono, fontWeight: 500, fontSize: 13, color: theme.ink3 }}>{s.unit}</span>}
              </p>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}
