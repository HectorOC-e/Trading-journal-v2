"use client"

import { useEffect } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"

type ModeState = { mode: OperationalMode; setMode: (mode: OperationalMode) => void }

export const useOperationalModeStore = create<ModeState>()(persist((set) => ({
  mode: "REAL",
  setMode: (value) => {
    const mode = operationalModeSchema.parse(value)
    set({mode})
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("mode",mode)
      window.history.replaceState(window.history.state,"",url)
    }
  },
}), {
  name: "tj.operationalMode", version: 1, skipHydration: true,
  partialize: state => ({mode:state.mode}),
  merge: (saved,current) => ({...current,mode:operationalModeSchema.safeParse((saved as {mode?:unknown}|null)?.mode).data ?? "REAL"}),
}))

let activeSubscriptions = 0
function syncLinkedMode() {
  const linked = operationalModeSchema.safeParse(new URLSearchParams(window.location.search).get("mode"))
  const state = useOperationalModeStore.getState()
  if (linked.success) {
    if (state.mode !== linked.data) useOperationalModeStore.setState({mode:linked.data})
  } else state.setMode(state.mode)
}

/** One shared listener; linked URLs win without replacing another cohort's cache. */
export function useOperationalMode<T>(selector: (state: ModeState) => T): T {
  useEffect(() => {
    if (activeSubscriptions++ === 0) {
      void Promise.resolve(useOperationalModeStore.persist.rehydrate()).then(() => {
        if (activeSubscriptions > 0) syncLinkedMode()
      })
      window.addEventListener("popstate",syncLinkedMode)
    }
    return () => {
      if (--activeSubscriptions === 0) window.removeEventListener("popstate",syncLinkedMode)
    }
  },[])
  return useOperationalModeStore(selector)
}
