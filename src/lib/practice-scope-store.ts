import { create } from "zustand"
import { persist } from "zustand/middleware"

// Whether demo/backtest ("practice") accounts are folded into the financial /
// performance views (Dashboard, Analytics). Off by default so unreal money never
// inflates the real stats; the user opts in via the "Incluir práctica" toggle.
// Behavioural metrics (psychology / discipline) ignore this — they always count
// practice. Persisted in localStorage; no migration needed.
interface PracticeScopeState {
  includePractice: boolean
  setIncludePractice: (v: boolean) => void
  toggle: () => void
}

export const usePracticeScope = create<PracticeScopeState>()(
  persist(
    (set) => ({
      includePractice: false,
      setIncludePractice: (v) => set({ includePractice: v }),
      toggle: () => set((s) => ({ includePractice: !s.includePractice })),
    }),
    { name: "tj.includePractice" },
  ),
)
