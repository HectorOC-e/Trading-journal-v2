import * as React from "react"
import { Body, Container, Font, Head, Html, Preview } from "@react-email/components"
import { type EmailTheme, fontSans } from "../theme"

export function EmailLayout({
  theme,
  preview,
  children,
}: {
  theme: EmailTheme
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="es">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{ url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2", format: "woff2" }}
          fontWeight={400}
          fontStyle="normal"
        />
        <meta name="color-scheme" content={theme.mode} />
        <meta name="supported-color-schemes" content={theme.mode} />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: theme.pageBg, fontFamily: fontSans }}>
        <Container
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "0 auto",
            padding: "26px 12px",
          }}
        >
          <div
            style={{
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </Container>
      </Body>
    </Html>
  )
}
