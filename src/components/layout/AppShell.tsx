"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { AiCoachDrawer } from "@/components/ai-coach/ai-coach-drawer"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/login"

  if (isLogin) return <>{children}</>

  return (
    <div className="shell">
      <Sidebar />
      <main className="main-content">{children}</main>
      <AiCoachDrawer />
    </div>
  )
}
