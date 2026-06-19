import * as React from "react"
import { type EmailTheme } from "../theme"

export function EmailFooter({
  theme,
  prefsUrl,
  reason = "Recibes esto porque tienes activos los correos de Aprendizaje.",
}: {
  theme: EmailTheme
  prefsUrl: string
  reason?: string
}) {
  return (
    <div style={{ backgroundColor: theme.footerBg, borderTop: `1px solid ${theme.lineSection}`, padding: "18px 30px", textAlign: "center" }}>
      <p style={{ margin: 0, fontWeight: 400, fontSize: 11, lineHeight: 1.6, color: theme.footerInk }}>
        {reason}
        <br />
        <a href={prefsUrl} style={{ color: theme.ink3, textDecoration: "underline" }}>
          Ajustar preferencias
        </a>
      </p>
    </div>
  )
}
