import type { Metadata } from "next"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/lib/trpc/provider"
import { Toaster } from "sonner"

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
            <AppShell>{children}</AppShell>
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
