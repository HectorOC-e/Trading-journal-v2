"use client"

// Toast layer. `notify(code)` is the catalog-driven path; `showToast(...)` is the
// raw path used by the use-toast wrapper. Both render the Direction-B ToastCard
// through Sonner (Emil Kowalski's library — stack, timers, swipe, reduced-motion).

import { toast } from "sonner"
import { resolveMessage } from "@/lib/messages/resolve"
import { toUserMessage } from "@/lib/errors/app-error"
import type { MessageCode } from "@/lib/messages/catalog"
import type { Lang, NotifType, Priority, ResolvedAction } from "@/lib/messages/types"
import { ToastCard } from "@/components/notifications/toast"

const DURATION: Record<Priority, number> = { P0: Infinity, P1: 8000, P2: 5000, P3: 3000 }

function haptic(priority: Priority) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
  if (priority === "P0") navigator.vibrate([20, 40, 20])
  else if (priority === "P1") navigator.vibrate(15)
}

export interface ShowToastInput {
  type: NotifType
  title: string
  body?: string
  actions?: ResolvedAction[]
  priority?: Priority
  duration?: number
}

export function showToast({ type, title, body, actions, priority = "P2", duration }: ShowToastInput) {
  const ms = duration ?? DURATION[priority]
  haptic(priority)
  return toast.custom(
    (id) => (
      <ToastCard
        type={type}
        title={title}
        body={body}
        actions={actions}
        duration={ms}
        onDismiss={() => toast.dismiss(id)}
        onAction={(a) => { if (a.href) window.location.assign(a.href) }}
      />
    ),
    { duration: Number.isFinite(ms) ? ms : Infinity, unstyled: true },
  )
}

/** Catalog-driven toast. */
export function notify(code: MessageCode, params: Record<string, unknown> = {}, opts?: { lang?: Lang }) {
  const m = resolveMessage(code, params, opts?.lang ?? "es")
  return showToast({ type: m.type, title: m.title, body: m.body || undefined, actions: m.actions, priority: m.priority })
}

/** Resolve any thrown value into a catalog error toast. */
notify.fromError = (error: unknown, lang: Lang = "es") => {
  const m = toUserMessage(error, lang)
  return showToast({ type: m.type, title: m.title, body: m.body || undefined, actions: m.actions, priority: m.priority })
}
