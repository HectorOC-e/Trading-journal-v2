// Thin Resend wrapper. Dry-run (logs, no send) when RESEND_API_KEY is absent, so
// local/dev and tests never hit the network. FROM defaults to the resend.dev test
// sender until a verified domain is configured (spec §2, §13).

import { Resend } from "resend"
import { logger } from "@/lib/logger"

export const DEFAULT_FROM = "Trading Journal <noreply@resend.dev>"

export interface EmailAttachment {
  filename: string
  /** Raw bytes; serialized to base64 for the Resend API. */
  content: Buffer
}

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  ok: boolean
  dryRun?: boolean
  id?: string
  error?: string
}

export type EmailSender = (args: SendEmailArgs) => Promise<SendEmailResult>

/**
 * Turn a raw Resend `send` error into a concise, user-facing Spanish message.
 * Kept under ~200 chars so `formatErrorForUser` surfaces it verbatim instead of
 * collapsing it to the generic "Error interno" text (the real Resend domain
 * error is 229 chars and would otherwise be hidden).
 */
export function emailFailureMessage(error?: string): string {
  const detail = (error ?? "").trim()
  if (/verify a domain|testing emails|not verified|\bdomain\b/i.test(detail)) {
    return "Resend solo permite enviar a tu propio correo hasta verificar un dominio. Verifica uno en resend.com/domains y define EMAIL_FROM con ese dominio."
  }
  const short = detail.length > 140 ? detail.slice(0, 137) + "…" : detail
  return short ? `No se pudo enviar el correo: ${short}` : "No se pudo enviar el correo."
}

export const sendEmail: EmailSender = async ({ to, subject, html, attachments }) => {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM

  if (!apiKey) {
    const att = attachments?.length ? ` +${attachments.length} attachment(s)` : ""
    logger.info(`[email:dry-run] would send "${subject}" to ${to} (${html.length} bytes${att})`)
    return { ok: true, dryRun: true }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from, to, subject, html,
      ...(attachments?.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: a.content })) } : {}),
    })
    if (error) {
      logger.error(`[email] Resend error for ${to}: ${error.message}`)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[email] send failed for ${to}: ${msg}`)
    return { ok: false, error: msg }
  }
}
