import { describe, it, expect } from "vitest"
import { emailFailureMessage } from "@/server/services/email/resend-client"

describe("emailFailureMessage", () => {
  it("maps the Resend unverified-domain error to a concise, actionable hint under the 200-char formatter cap", () => {
    const resend =
      "You can only send testing emails to your own email address (osoriohector89@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."
    expect(resend.length).toBeGreaterThan(200) // would be hidden by formatErrorForUser verbatim
    const msg = emailFailureMessage(resend)
    expect(msg.length).toBeLessThan(200)
    expect(msg).toMatch(/dominio/i)
    expect(msg).toMatch(/resend\.com\/domains/)
  })

  it("truncates other long errors and keeps a prefix", () => {
    const msg = emailFailureMessage("x".repeat(400))
    expect(msg.length).toBeLessThan(200)
    expect(msg).toMatch(/^No se pudo enviar el correo:/)
    expect(msg).toMatch(/…$/)
  })

  it("falls back to a generic message when there is no detail", () => {
    expect(emailFailureMessage(undefined)).toBe("No se pudo enviar el correo.")
    expect(emailFailureMessage("")).toBe("No se pudo enviar el correo.")
  })
})
