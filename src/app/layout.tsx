import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/lib/trpc/provider"
import { Toaster } from "sonner"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Diario de trading profesional con analytics, playbook y coach IA.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TJournal",
  },
}

export const viewport: Viewport = {
  themeColor: "#4f6ef7",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  // No maximumScale lock — users must be able to zoom (WCAG 1.4.4 / m4).
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* No-flash: apply dark class + color theme before hydration */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){
            try {
              var d = document.documentElement;
              var t = localStorage.getItem('tj-theme') || 'system';
              var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              d.classList.toggle('dark', isDark);
              var ct = localStorage.getItem('tj-color-theme');
              if (ct && ct !== 'indigo') d.setAttribute('data-theme', ct);
            } catch(e) {}
          })();
        `}</Script>
      </head>
      <body>
        <TRPCProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </TRPCProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
      </body>
    </html>
  )
}
