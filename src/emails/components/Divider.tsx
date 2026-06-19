import * as React from "react"
import { type EmailTheme } from "../theme"

export function Divider({ theme }: { theme: EmailTheme }) {
  return <div style={{ height: 1, backgroundColor: theme.lineSection, margin: "0 30px" }} />
}
