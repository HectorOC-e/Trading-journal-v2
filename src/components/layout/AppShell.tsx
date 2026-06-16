"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { AiCoachDrawer } from "@/components/ai-coach/ai-coach-drawer"
import { QuickActions } from "@/components/layout/quick-actions"
import { CommandPalette } from "@/components/ui/command-palette"
import { FocusSession } from "@/app/aprendizaje/components/focus-session"
import { FadeIn } from "@/components/ui/motion"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/login"

  if (isLogin) return <>{children}</>

  return (
    <div className="shell">
      <Sidebar />
      <main className="main-content">
        {/* Subtle fade+rise on each route change — keyed by path so it remounts
            and re-plays. Cheap global page entrance (opacity stripped under
            reduced-motion via MotionConfig). */}
        <FadeIn key={pathname}>{children}</FadeIn>
      </main>
      <QuickActions />
      <CommandPalette />
      <AiCoachDrawer />
      <FocusSession />
    </div>
  )
}
