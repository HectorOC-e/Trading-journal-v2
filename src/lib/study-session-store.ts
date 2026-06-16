import { create } from "zustand"

// Single source of truth for the running study session, so the focus overlay and
// the floating pill (rendered by one <FocusSession> in the AppShell) never diverge
// and the timer survives navigation between pages.
export interface ActiveStudySession {
  id: string
  resourceId: string
  resourceTitle: string
  resourceType: string
  startedAtMs: number
}

interface StudySessionState {
  session: ActiveStudySession | null
  minimized: boolean
  pickerOpen: boolean
  setSession: (s: ActiveStudySession | null) => void
  setMinimized: (m: boolean) => void
  openPicker: () => void
  closePicker: () => void
}

export const useStudySessionStore = create<StudySessionState>((set) => ({
  session: null,
  minimized: false,
  pickerOpen: false,
  setSession: (session) => set({ session, minimized: false, pickerOpen: false }),
  setMinimized: (minimized) => set({ minimized }),
  openPicker: () => set({ pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false }),
}))
