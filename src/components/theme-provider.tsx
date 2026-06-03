"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { trpc } from "@/lib/trpc/client"

type Theme = "dark" | "light"

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const { data: prefs } = trpc.preferences.get.useQuery()

  useEffect(() => {
    const saved = localStorage.getItem("tj-theme") as Theme | null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("tj-theme", theme)
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

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
