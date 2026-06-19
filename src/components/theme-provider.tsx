"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { MotionConfig } from "framer-motion"
import { usePathname } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { applyColorTheme, LS_COLOR_THEME, type ColorMode, type CustomPalette } from "@/lib/theme"

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
  // Until mounted, resolvedTheme must match what the server rendered, otherwise
  // getSystemTheme() (matchMedia) makes the first client render diverge from SSR
  // and the theme toggle icon/title trigger a hydration mismatch. The actual
  // <html> class is already set pre-hydration by the no-flash script in layout.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // /login is the only route reachable without a session (middleware redirects
  // the rest), so skip the protected preferences query there — it would only
  // 401 and retry. The theme falls back to localStorage when prefs is absent.
  const pathname = usePathname()
  const { data: prefs }  = trpc.preferences.get.useQuery(undefined, {
    enabled: pathname !== "/login",
    retry: false,
  })
  const updatePrefs      = trpc.preferences.update.useMutation()
  const { data: customPalettes } = trpc.customPalettes.list.useQuery(undefined, {
    enabled: pathname !== "/login",
    retry: false,
  })
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

  // Apply the active color-theme selection (predefined id or "custom:<id>").
  // Predefined → static CSS via data-theme; custom → engine-derived inline vars
  // for the current mode (re-injected when the resolved mode changes). Falls back
  // to localStorage so the theme survives before prefs load (no flash).
  useEffect(() => {
    const selection = (prefs?.colorTheme as string | undefined)
      ?? localStorage.getItem(LS_COLOR_THEME)
      ?? "indigo"
    const palettes = (customPalettes ?? []) as CustomPalette[]
    const resolved: ColorMode = (theme === "system" ? getSystemTheme() : theme) === "dark" ? "dark" : "light"
    applyColorTheme(selection, palettes, resolved)

    const root = document.documentElement
    if (prefs?.colorScheme && prefs.colorScheme !== "default") {
      root.setAttribute("data-colorblind", prefs.colorScheme)
    } else {
      root.removeAttribute("data-colorblind")
    }
  }, [prefs?.colorTheme, prefs?.colorScheme, customPalettes, theme])

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

  const resolvedTheme = mounted ? resolveTheme(theme) : "dark"

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {/* reducedMotion="user" ⇒ all framer-motion transforms are stripped when the
          OS requests reduced motion, while opacity transitions stay (Emil: reduced
          ≠ zero). CSS animations are handled separately in globals.css. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
