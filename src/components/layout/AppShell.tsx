"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { AiCoachDrawer } from "@/components/ai-coach/ai-coach-drawer"
import { QuickActions } from "@/components/layout/quick-actions"
import { CommandPalette } from "@/components/ui/command-palette"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/login"

  if (isLogin) return <>{children}</>

  return (
    <div className="shell">
      <Sidebar />
      <main className="main-content">{children}</main>
      <QuickActions />
      <CommandPalette />
      <AiCoachDrawer />
    </div>
  )
}
