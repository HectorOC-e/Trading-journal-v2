import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/lib/trpc/provider"
import { AppToaster } from "@/components/notifications/app-toaster"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

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
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {/* No-flash: apply dark class + color theme before hydration.
            Inline native <script> (dangerouslySetInnerHTML) is the sanctioned
            React 19 pattern — next/script with inline children warns. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var d = document.documentElement;
                var t = localStorage.getItem('tj-theme') || 'system';
                var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                d.classList.toggle('dark', isDark);
                var ct = localStorage.getItem('tj-color-theme') || 'indigo';
                if (ct.indexOf('custom:') === 0) {
                  d.setAttribute('data-theme', 'custom');
                  var v = localStorage.getItem(isDark ? 'tj-custom-vars-dark' : 'tj-custom-vars-light');
                  if (v) d.style.cssText += ';' + v;
                } else if (ct !== 'indigo') {
                  d.setAttribute('data-theme', ct);
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body>
        <TRPCProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            {/* Custom Direction-B toasts; responsive position (bottom-center on mobile). */}
            <AppToaster />
          </ThemeProvider>
        </TRPCProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
