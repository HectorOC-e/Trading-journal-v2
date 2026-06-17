"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2, Info, AlertTriangle, XCircle, AlertOctagon, Activity, X,
} from "lucide-react"
import type { NotifType, ResolvedAction } from "@/lib/messages/types"

type TypeStyle = { color: string; Icon: typeof Info }

// Accent color + icon per notification type (Direction B).
export const TYPE_STYLE: Record<NotifType, TypeStyle> = {
  SUCCESS:       { color: "var(--win)",    Icon: CheckCircle2 },
  INFO:          { color: "var(--accent)", Icon: Info },
  WARNING:       { color: "#f59e0b",       Icon: AlertTriangle },
  ERROR:         { color: "var(--loss)",   Icon: XCircle },
  CRITICAL:      { color: "var(--loss)",   Icon: AlertOctagon },
  TRADING_ALERT: { color: "var(--accent)", Icon: Activity },
}

export interface ToastCardProps {
  type:     NotifType
  title:    string
  body?:    string
  actions?: ResolvedAction[]
  /** Auto-dismiss duration in ms; finite values show a progress bar. */
  duration: number
  onDismiss: () => void
  onAction?: (action: ResolvedAction) => void
}

/** Direction-B toast: elevated card, left accent bar, icon, optional progress bar. */
export function ToastCard({ type, title, body, actions, duration, onDismiss, onAction }: ToastCardProps) {
  const { color, Icon } = TYPE_STYLE[type]
  const tint = `color-mix(in srgb, ${color} 16%, transparent)`
  const showProgress = Number.isFinite(duration) && duration > 0

  return (
    <div
      role="status"
      aria-live={type === "CRITICAL" || type === "ERROR" ? "assertive" : "polite"}
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", gap: 12, alignItems: "flex-start",
        width: "min(380px, calc(100vw - 32px))",
        background: "var(--panel-2, #1c1f26)",
        border: "1px solid var(--line, #24262d)",
        borderRadius: 13, padding: "13px 14px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color }} />

      <span style={{
        width: 28, height: 28, borderRadius: 9, flex: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: tint, color,
      }}>
        <Icon size={16} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--ink, #f3f4f7)", fontSize: 13, fontWeight: 650, lineHeight: 1.35 }}>{title}</div>
        {body ? <div style={{ color: "var(--ink-3, #9aa0ad)", fontSize: 12, lineHeight: 1.4, marginTop: 1 }}>{body}</div> : null}

        {actions && actions.length > 0 && (
          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => { onAction?.(a); onDismiss() }}
                style={a.style === "primary"
                  ? { fontSize: 11, fontWeight: 600, color: "#fff", background: color, border: "none", borderRadius: 7, padding: "4px 11px", cursor: "pointer" }
                  : { fontSize: 11, fontWeight: 600, color: "var(--ink-2, #c6c9d2)", background: "transparent", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        style={{ flex: "none", color: "var(--ink-3, #8b8f9a)", background: "transparent", border: "none", cursor: "pointer", padding: 2, marginTop: -2 }}
      >
        <X size={14} />
      </button>

      {showProgress && (
        <motion.span
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: color, transformOrigin: "left", opacity: 0.5 }}
        />
      )}
    </div>
  )
}
