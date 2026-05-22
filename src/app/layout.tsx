import type { Metadata } from "next"
import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/lib/trpc/provider"

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Track, analyze and improve your trading.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <TRPCProvider>
          <ThemeProvider>
            <div className="shell">
              <Sidebar />
              <main className="main-content">{children}</main>
            </div>
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
