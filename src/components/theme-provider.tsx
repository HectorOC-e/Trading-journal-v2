"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { trpc } from "@/lib/trpc/client"

export type ThemeMode = "light" | "dark" | "system"

type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme:         ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme:      (t: ThemeMode) => void
  /** Cycles: light → dark → system → light */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:         "system",
  resolvedTheme: "dark",
  setTheme:      () => {},
  toggle:        () => {},
})

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode
}

const CYCLE: ThemeMode[] = ["light", "dark", "system"]

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system")
  const { data: prefs }  = trpc.preferences.get.useQuery()
  const updatePrefs      = trpc.preferences.update.useMutation()
  const mediaListenerRef = useRef<(() => void) | null>(null)

  // Bootstrap from DB prefs (takes precedence over localStorage)
  useEffect(() => {
    if (prefs?.theme) {
      const t = prefs.theme as ThemeMode
      if (CYCLE.includes(t)) setThemeState(t) // TD-029: guard against unknown DB values
    } else {
      const saved = localStorage.getItem("tj-theme") as ThemeMode | null
      if (saved && CYCLE.includes(saved)) setThemeState(saved)
    }
  }, [prefs?.theme])

  // Apply resolved theme class and listen for OS changes when mode is "system"
  useEffect(() => {
    const applyResolved = (resolved: ResolvedTheme) => {
      document.documentElement.classList.toggle("dark", resolved === "dark")
    }

    // Clean up previous OS listener
    if (mediaListenerRef.current) {
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaListenerRef.current)
      mediaListenerRef.current = null
    }

    if (theme === "system") {
      applyResolved(getSystemTheme())
      const handler = () => applyResolved(getSystemTheme())
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler)
      mediaListenerRef.current = handler
    } else {
      applyResolved(theme)
    }

    localStorage.setItem("tj-theme", theme)

    return () => {
      if (mediaListenerRef.current) {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaListenerRef.current)
        mediaListenerRef.current = null
      }
    }
  }, [theme])

  // Apply accent hue and colorblind mode from DB preferences
  useEffect(() => {
    if (!prefs) return
    const root = document.documentElement
    if (prefs.accentHue != null) {
      root.style.setProperty("--accent", `oklch(0.6 0.2 ${prefs.accentHue})`)
      root.style.setProperty("--accent-soft", `oklch(0.95 0.05 ${prefs.accentHue})`)
    } else {
      root.style.removeProperty("--accent")
      root.style.removeProperty("--accent-soft")
    }
    if (prefs.colorScheme && prefs.colorScheme !== "default") {
      root.setAttribute("data-colorblind", prefs.colorScheme)
    } else {
      root.removeAttribute("data-colorblind")
    }
  }, [prefs?.accentHue, prefs?.colorScheme])

  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setTheme = (t: ThemeMode) => {
    setThemeState(t)
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    prefsSaveTimer.current = setTimeout(() => {
      updatePrefs.mutate({ theme: t })
    }, 500)
  }

  const toggle = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(next)
  }

  const resolvedTheme = resolveTheme(theme)

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
