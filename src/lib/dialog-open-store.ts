import { create } from "zustand"

/**
 * Tracks how many Radix dialogs are currently open. DialogContent only mounts
 * its portal while the dialog is open, so incrementing on mount / decrementing
 * on unmount gives an accurate count. Floating UI (AI coach launcher, quick
 * actions FAB) reads this to get out of the way while a modal is up — otherwise
 * a fixed FAB sits on top of the modal and covers its content/actions.
 */
interface DialogOpenState {
  count: number
  inc: () => void
  dec: () => void
}

export const useDialogOpenStore = create<DialogOpenState>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
  dec: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))

/** True while at least one dialog is open. */
export const useAnyDialogOpen = () => useDialogOpenStore((s) => s.count > 0)
