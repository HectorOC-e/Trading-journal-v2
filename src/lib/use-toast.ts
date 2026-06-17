// Toast helpers with consistent Direction-B styling.
// `toast.success/error/info/warning(msg, { description })` now render the custom
// ToastCard (via showToast) — every existing call-site upgrades automatically.
// For catalog-driven toasts and error resolution prefer `notify` / `notify.fromError`
// from "@/lib/notify".
//
//   toast.success("Trade guardado")
//   toast.error("Error al guardar", { description: err.message })

import { toast as sonner } from "sonner"
import { showToast } from "@/lib/notify"
import type { NotifType, Priority } from "@/lib/messages/types"

interface ToastOpts { description?: string; duration?: number }

const PRIORITY_BY_TYPE: Record<NotifType, Priority> = {
  SUCCESS: "P3", INFO: "P3", WARNING: "P2", ERROR: "P1", CRITICAL: "P0", TRADING_ALERT: "P1",
}

function make(type: NotifType) {
  return (title: string, opts?: ToastOpts) =>
    showToast({ type, title, body: opts?.description, priority: PRIORITY_BY_TYPE[type], duration: opts?.duration })
}

export const toast = {
  success: make("SUCCESS"),
  error:   make("ERROR"),
  info:    make("INFO"),
  warning: make("WARNING"),
  message: (title: string, opts?: ToastOpts) => showToast({ type: "INFO", title, body: opts?.description, duration: opts?.duration }),
  // Native passthroughs (loading has Sonner's spinner/update semantics).
  loading: sonner.loading,
  dismiss: sonner.dismiss,
  custom:  sonner.custom,
}
