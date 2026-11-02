// Timezone-aware date helpers. The app stores `Trade.date` as a *trading day*
// ("YYYY-MM-DD"), NOT a UTC instant — so "today / this week / this month" and the
// default trade date must be computed in the USER's timezone, not the server's UTC.
//
// `localDateISO` / `localHour` resolve a real instant into the user's local calendar
// via Intl (IANA tz). The *ISO helpers below do plain calendar arithmetic on a
// "YYYY-MM-DD" string: they pin the date at UTC midnight purely as a vehicle for
// day math, so DST never shifts the result (no local time is ever crossed).

/** The user's local calendar date ("YYYY-MM-DD") for a given instant. */
export function localDateISO(now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

/** The user's local hour (0–23) for a given instant. */
export function localHour(now: Date, tz: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(now)) % 24
  } catch {
    return now.getUTCHours()
  }
}

/** First day of the month containing `todayISO` ("YYYY-MM-01"). */
export function monthStartISO(todayISO: string): string {
  return `${todayISO.slice(0, 7)}-01`
}

/** Monday of the week containing `todayISO`. */
export function weekStartISO(todayISO: string): string {
  const d = new Date(`${todayISO}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

/** `todayISO` shifted by `deltaDays` (negative = past), as "YYYY-MM-DD". */
export function addDaysISO(todayISO: string, deltaDays: number): string {
  const d = new Date(`${todayISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

/** Preserve a supported profile zone; legacy invalid values use UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC"
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz })
    return tz
  } catch {
    return "UTC"
  }
}

/** Render an ISO calendar date, including serialized @db.Date values, without shifting days. */
export function formatCalendarDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-ES", { ...options, timeZone: "UTC" })
    .format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
}
