// Central message catalog — shared types.
// One catalog drives toasts, persisted notifications, and user-facing errors.
// See docs/superpowers/specs/2026-06-16-notifications-system-design.md

export type NotifType =
  | "SUCCESS"
  | "INFO"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "TRADING_ALERT"

export type Priority = "P0" | "P1" | "P2" | "P3"

export type NotifCategory =
  | "Cuenta"
  | "Reglas"
  | "Reviews"
  | "Aprendizaje"
  | "Trading"
  | "Sistema"

export type Lang = "es" | "en"

export interface MessageAction {
  /** Key into LABELS for the button text. */
  labelCode: string
  href?: string
  /** Client-side action identifier (e.g. "MARK_READ") when there is no href. */
  actionCode?: string
  style?: "primary" | "ghost"
}

export interface MessageText {
  title: string
  body?: string
}

export interface MessageDef {
  type: NotifType
  priority: Priority
  /** Required when persist is true; ephemeral messages default to "Sistema". */
  category?: NotifCategory
  /** true → may create a persisted Notification row; false → toast-only. */
  persist: boolean
  es: MessageText
  en?: MessageText
  actions?: MessageAction[]
}

export interface ResolvedAction {
  label: string
  href?: string
  actionCode?: string
  style: "primary" | "ghost"
}

export interface ResolvedMessage {
  code: string
  type: NotifType
  priority: Priority
  category: NotifCategory
  persist: boolean
  title: string
  body: string
  actions: ResolvedAction[]
}
