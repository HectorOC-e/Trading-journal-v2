import * as React from "react"
import { type EmailTheme } from "../theme"

export type ReviewKind = "overdue" | "decay" | "today"

export function reviewChipLabel(kind: ReviewKind, overdueDays: number): string {
  if (kind === "today") return "hoy"
  return overdueDays === 1 ? "−1 día" : `−${overdueDays} días`
}

export function ReviewItem({
  theme,
  title,
  kind,
  overdueDays,
  withDivider,
}: {
  theme: EmailTheme
  title: string
  kind: ReviewKind
  overdueDays: number
  withDivider: boolean
}) {
  const isToday = kind === "today"
  const chipText = isToday ? theme.amberText : theme.lossText
  const chipBg = isToday ? theme.amberBg : theme.lossBg
  return (
    <>
      {withDivider && <div style={{ height: 1, backgroundColor: theme.lineRow }} />}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ padding: "9px 0" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.35, color: theme.ink }}>{title}</span>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, fontSize: 11, color: chipText, backgroundColor: chipBg, padding: "4px 9px", borderRadius: 6 }}>
                {reviewChipLabel(kind, overdueDays)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
