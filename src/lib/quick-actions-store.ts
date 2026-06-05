import { create } from "zustand"

// Shared Quick-Action state so the desktop speed-dial FAB and the mobile
// navbar center button both open the SAME global "Nuevo Trade" flow (M2).
interface QuickActionsState {
  registerOpen: boolean
  openRegister: () => void
  closeRegister: () => void
}

export const useQuickActions = create<QuickActionsState>((set) => ({
  registerOpen: false,
  openRegister:  () => set({ registerOpen: true }),
  closeRegister: () => set({ registerOpen: false }),
}))
