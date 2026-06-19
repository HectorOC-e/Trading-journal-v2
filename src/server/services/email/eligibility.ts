// Email-channel eligibility for a given category. OPT-IN by design: even with the
// master `emailNotifications` toggle on, the category's NotificationPreference must
// explicitly include the "email" channel. No pref row → email off. See spec §7.

import { inQuietHours } from "@/server/services/notifications/emit"

export interface EmailPrefRow {
  muted: boolean
  channels: string[]
  quietStart: string | null
  quietEnd: string | null
  timezone: string
}

export const EMAIL_CHANNEL = "email"

export function isEmailChannelEnabled(
  masterOn: boolean,
  pref: EmailPrefRow | null,
  now: Date,
): boolean {
  if (!masterOn) return false
  if (!pref) return false // opt-in: no per-category preference → email disabled
  if (!pref.channels.includes(EMAIL_CHANNEL)) return false
  if (pref.muted) return false
  if (inQuietHours(pref, now)) return false
  return true
}
