import { create } from "zustand"
import { persist } from "zustand/middleware"

// Feature flag for the v3 "5 cognitive surfaces" navigation shell
// (HOY/OPERAR/MEJORAR/PROTEGER/ANALIZAR, FREEZE §2). OFF by default so the v2 nav
// stays untouched in production; the user opts in (command palette: "Vista 5
// superficies"). Pure client preference, persisted in localStorage — the routes
// are unchanged, only the sidebar grouping/labels differ, so it's fully reversible.
interface V3ShellState {
  enabled: boolean
  setEnabled: (v: boolean) => void
  toggle: () => void
}

export const useV3Shell = create<V3ShellState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (v) => set({ enabled: v }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: "tj.v3Shell" },
  ),
)
