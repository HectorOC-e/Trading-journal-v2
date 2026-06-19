import { describe, it, expect } from "vitest"
import { isEmailChannelEnabled, type EmailPrefRow } from "@/server/services/email/eligibility"

const now = new Date("2026-06-19T12:00:00Z")
const pref = (over: Partial<EmailPrefRow> = {}): EmailPrefRow => ({
  muted: false, channels: ["in_app", "email"], quietStart: null, quietEnd: null, timezone: "UTC", ...over,
})

describe("isEmailChannelEnabled (opt-in)", () => {
  it("false when master toggle is off", () => {
    expect(isEmailChannelEnabled(false, pref(), now)).toBe(false)
  })
  it("false when no preference row exists (opt-in default)", () => {
    expect(isEmailChannelEnabled(true, null, now)).toBe(false)
  })
  it("false when channels do not include email", () => {
    expect(isEmailChannelEnabled(true, pref({ channels: ["in_app"] }), now)).toBe(false)
  })
  it("false when muted", () => {
    expect(isEmailChannelEnabled(true, pref({ muted: true }), now)).toBe(false)
  })
  it("false during quiet hours", () => {
    expect(isEmailChannelEnabled(true, pref({ quietStart: "08:00", quietEnd: "20:00" }), now)).toBe(false)
  })
  it("true when master on + email channel + not muted + outside quiet hours", () => {
    expect(isEmailChannelEnabled(true, pref(), now)).toBe(true)
  })
})
