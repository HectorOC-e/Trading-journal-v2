// Central message catalog — the single source of truth for user-facing copy,
// severity, priority and action labels. Edit messages/codes HERE, nowhere else.
// i18n: `es` is required, `en` optional (falls back to es until translated).

import type { MessageDef } from "./types"

// Action button labels, keyed by labelCode (i18n-ready).
export const LABELS: Record<string, { es: string; en?: string }> = {
  VIEW_ACCOUNT:  { es: "Ver cuenta",   en: "View account" },
  VIEW_RULE:     { es: "Ver regla",    en: "View rule" },
  VIEW_REVIEW:   { es: "Ver review",   en: "View review" },
  VIEW_REPORT:   { es: "Ver reporte",  en: "View report" },
  STUDY_NOW:     { es: "Repasar ahora", en: "Review now" },
  DISMISS:       { es: "Descartar",    en: "Dismiss" },
  RETRY:         { es: "Reintentar",   en: "Retry" },
}

export const MESSAGES = {
  // ── Action feedback (ephemeral toasts) ────────────────────────────────────
  TRADE_SAVED:    { type: "SUCCESS", priority: "P3", persist: false, es: { title: "Trade guardado", body: "{symbol} · {detail}" } },
  TRADE_DELETED:  { type: "SUCCESS", priority: "P3", persist: false, es: { title: "Trade eliminado" } },
  CHANGES_SAVED:  { type: "SUCCESS", priority: "P3", persist: false, es: { title: "Cambios guardados" } },
  COPIED:         { type: "INFO",    priority: "P3", persist: false, es: { title: "Copiado" } },

  // ── Account / risk events (persisted) ─────────────────────────────────────
  ACCOUNT_LOCKED: {
    type: "CRITICAL", priority: "P0", category: "Cuenta", persist: true,
    es: { title: "Cuenta {name} bloqueada", body: "{reason}" },
    en: { title: "{name} account locked", body: "{reason}" },
    actions: [{ labelCode: "VIEW_ACCOUNT", href: "/cuentas", style: "primary" }],
  },
  RISK_LIMIT_EXCEEDED: {
    type: "WARNING", priority: "P1", category: "Cuenta", persist: true,
    es: { title: "Cerca del límite de pérdida", body: "{current} de {limit} permitido en {name}" },
    actions: [{ labelCode: "VIEW_ACCOUNT", href: "/cuentas", style: "ghost" }],
  },

  // ── Rules engine (Epic 3 emits these; defined here now) ───────────────────
  RULE_FIRED: {
    type: "WARNING", priority: "P1", category: "Reglas", persist: true,
    es: { title: "Regla disparada: {rule}", body: "{detail}" },
    actions: [{ labelCode: "VIEW_RULE", href: "/reglas", style: "ghost" }],
  },

  // ── Reviews / learning (persisted) ────────────────────────────────────────
  WEEKLY_REPORT_READY: {
    type: "SUCCESS", priority: "P2", category: "Reviews", persist: true,
    es: { title: "Reporte semanal listo", body: "Tu review IA de la semana está disponible." },
    actions: [{ labelCode: "VIEW_REPORT", href: "/reviews", style: "ghost" }],
  },
  REVIEW_OVERDUE: {
    type: "WARNING", priority: "P2", category: "Aprendizaje", persist: true,
    es: { title: "{count} review{plural} vencida{plural}", body: "Repásalas para no perder retención." },
    actions: [{ labelCode: "STUDY_NOW", href: "/aprendizaje", style: "ghost" }],
  },

  // ── System (persisted) ────────────────────────────────────────────────────
  IMPORT_DONE: {
    type: "INFO", priority: "P2", category: "Sistema", persist: true,
    es: { title: "Importación terminada", body: "{count} trades importados." },
  },

  // ── Errors (toast; not persisted) ─────────────────────────────────────────
  GENERIC_ERROR:   { type: "ERROR", priority: "P1", persist: false, es: { title: "Operación fallida", body: "Intenta de nuevo." }, actions: [{ labelCode: "RETRY", actionCode: "RETRY", style: "ghost" }] },
  NETWORK_ERROR:   { type: "ERROR", priority: "P1", persist: false, es: { title: "Sin conexión", body: "Revisa tu red e intenta de nuevo." } },
  VALIDATION_ERROR:{ type: "WARNING", priority: "P2", persist: false, es: { title: "Datos inválidos", body: "Revisa los campos e intenta de nuevo." } },
  UNAUTHORIZED:    { type: "ERROR", priority: "P1", persist: false, es: { title: "Sesión expirada", body: "Inicia sesión de nuevo." } },
  NOT_FOUND:       { type: "WARNING", priority: "P2", persist: false, es: { title: "El elemento ya no existe" } },
  RATE_LIMITED:    { type: "WARNING", priority: "P2", persist: false, es: { title: "Demasiadas solicitudes", body: "Espera un momento e intenta de nuevo." } },
  WITHDRAWAL_EXCEEDS_BALANCE: {
    type: "WARNING", priority: "P2", category: "Cuenta", persist: false,
    es: { title: "Retiro rechazado", body: "El monto ({amount}) supera el saldo disponible ({available})." },
  },
  AI_NO_KEY:       { type: "INFO", priority: "P2", persist: false, es: { title: "Falta clave de IA", body: "Configura tu clave en Perfil para usar esta función." } },
} satisfies Record<string, MessageDef>

export type MessageCode = keyof typeof MESSAGES
