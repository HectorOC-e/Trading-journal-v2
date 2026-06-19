import * as React from "react"
import { type EmailTheme, fontSans } from "../theme"

export function CtaButton({ theme, href, label }: { theme: EmailTheme; href: string; label: string }) {
  return (
    <div style={{ padding: "6px 30px 30px" }}>
      <a
        href={href}
        style={{
          display: "block",
          textAlign: "center",
          backgroundColor: theme.accent,
          color: theme.onAccent,
          fontFamily: fontSans,
          fontWeight: 600,
          fontSize: 14,
          lineHeight: "48px",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        {label}
      </a>
    </div>
  )
}
