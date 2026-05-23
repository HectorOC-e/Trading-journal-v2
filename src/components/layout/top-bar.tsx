"use client"

// TopBar molecule — spec: Trades, Aprendizaje, all screens
// Page title + optional subtitle + right-side action buttons

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface TopBarAction {
  label: string
  icon?: ReactNode
  onClick?: () => void
  variant?: "primary" | "ghost"
}

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: TopBarAction[]
  className?: string
}

export function TopBar({ title, subtitle, actions, className }: TopBarProps) {
  const [initial, setInitial] = useState<string>("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const name = data.user.user_metadata?.name as string | undefined
      const email = data.user.email ?? ""
      const letter = name ? name[0] : email[0]
      if (letter) setInitial(letter.toUpperCase())
    })
  }, [])

  return (
    <div className={cn("flex items-start justify-between gap-3 mb-6 flex-wrap", className)}>
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-[var(--ink)] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--ink-2)] mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {initial && (
          <Link
            href="/perfil"
            className="lg:hidden flex items-center justify-center rounded-full text-xs font-semibold"
            style={{
              width: 24,
              height: 24,
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {initial}
          </Link>
        )}

        {actions && actions.length > 0 && actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "ghost"}
            size="sm"
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
