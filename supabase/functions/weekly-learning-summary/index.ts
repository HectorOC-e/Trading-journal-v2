import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Environment variables (set in Supabase Dashboard → Settings → Edge Functions Secrets):
//   RESEND_API_KEY       — Resend API key for sending emails
//   CRON_SECRET          — Secret token for authorizing cron calls (optional but recommended)
// Auto-provided by Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY") ?? ""
const SUPABASE_URL            = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const CRON_SECRET             = Deno.env.get("CRON_SECRET") ?? ""
const FROM_EMAIL              = "Trading Journal <noreply@resend.dev>"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// ─── Auth check ──────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  if (!CRON_SECRET) return true  // no secret configured → allow (dev mode)
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${CRON_SECRET}` || auth === `Bearer ${SUPABASE_SERVICE_ROLE}`
}

// ─── Timezone check ───────────────────────────────────────────────────────────

// Returns true if the user's local time is currently targetHour on Monday.
// Called once per cron tick (hourly on Mondays) to gate per-user sending.
function shouldSendNow(timezone: string, targetHour: number): boolean {
  try {
    const now   = new Date()
    const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
    return local.getDay() === 1 && local.getHours() === targetHour
  } catch {
    // Unknown timezone → fall back to UTC
    const now = new Date()
    return now.getDay() === 1 && now.getHours() === targetHour
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtMin(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h ${min}m`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

// ─── Email sender ─────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[dry-run] Would send "${subject}" to ${to}`)
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    console.error(`Resend error for ${to}:`, await res.text())
  }
}

// ─── Weekly summary ──────────────────────────────────────────────────────────

async function sendWeeklySummary(
  email: string,
  name: string,
  weekStart: Date,
  weekEnd: Date,
  userId: string,
  goalMinutes: number,
): Promise<void> {
  const weekStartISO = weekStart.toISOString()
  const weekEndISO   = new Date(weekEnd.getTime() + 86_400_000).toISOString()

  const [completedRes, pendingRes, minuteRes] = await Promise.all([
    supabase
      .from("learning_resources")
      .select("title, type")
      .eq("user_id", userId)
      .eq("status", "COMPLETED")
      .gte("completed_at", weekStartISO)
      .lt("completed_at", weekEndISO),

    supabase
      .from("learning_resources")
      .select("title, next_review_at")
      .eq("user_id", userId)
      .lte("next_review_at", new Date().toISOString().slice(0, 10))
      .not("status", "in", '("ABANDONED","MASTERED")')
      .order("next_review_at", { ascending: true })
      .limit(5),

    // Use week_delta_minutes (true weekly increment) instead of current_units (total)
    supabase
      .from("learning_resources")
      .select("week_delta_minutes, week_delta_reset_at")
      .eq("user_id", userId)
      .eq("progress_type", "minutes"),
  ])

  const completed     = completedRes.data ?? []
  const pendingReviews = pendingRes.data ?? []

  // Sum only resources whose delta was recorded in the current week window
  const minutesThisWeek = (minuteRes.data ?? []).reduce((s, r) => {
    const resetAt = r.week_delta_reset_at ? new Date(r.week_delta_reset_at) : null
    const stale   = !resetAt || resetAt < weekStart
    return s + (stale ? 0 : (r.week_delta_minutes ?? 0))
  }, 0)

  const goalPct = Math.min(100, Math.round((minutesThisWeek / goalMinutes) * 100))

  const weekRange = `${fmtDate(weekStart.toISOString())} – ${fmtDate(weekEnd.toISOString())}`
  const greeting  = name ? `Hola ${name}` : "Hola"

  const completedHtml = completed.length > 0
    ? `<ul>${completed.map(r => `<li><strong>${r.title}</strong> <span style="color:#6b7280">(${r.type})</span></li>`).join("")}</ul>`
    : `<p style="color:#9ca3af">Sin recursos completados esta semana.</p>`

  const reviewsHtml = pendingReviews.length > 0
    ? `<ul>${pendingReviews.map(r => `<li>${r.title} — vence ${fmtDate(r.next_review_at)}</li>`).join("")}</ul>`
    : `<p style="color:#9ca3af">Sin reviews urgentes. ¡Excelente racha!</p>`

  const progressBarWidth = `${goalPct}%`
  const progressColor    = goalPct >= 100 ? "#22c55e" : goalPct >= 60 ? "#f59e0b" : "#4f6ef7"

  await sendEmail(
    email,
    `📚 Tu semana de aprendizaje — ${weekRange}`,
    `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111">
  <h2 style="color:#4f6ef7;margin-bottom:4px">📚 Tu semana de aprendizaje</h2>
  <p style="color:#6b7280;margin-top:0">${greeting} · ${weekRange}</p>

  <h3 style="border-bottom:2px solid #4f6ef7;padding-bottom:6px;color:#111">✅ Recursos completados</h3>
  ${completedHtml}

  <h3 style="border-bottom:2px solid #f59e0b;padding-bottom:6px;color:#111">⏰ Reviews pendientes</h3>
  ${reviewsHtml}

  <h3 style="border-bottom:2px solid #22c55e;padding-bottom:6px;color:#111">⏱ Tiempo de estudio</h3>
  <p style="margin-bottom:6px">${fmtMin(minutesThisWeek)} de ${fmtMin(goalMinutes)} esta semana</p>
  <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden">
    <div style="height:8px;border-radius:999px;width:${progressBarWidth};background:${progressColor}"></div>
  </div>
  <p style="color:#6b7280;font-size:12px;margin-top:6px">${goalPct}% de tu meta semanal${goalPct >= 100 ? " 🎉" : ""}</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:11px;color:#9ca3af">Para desactivar estos emails ve a <strong>Perfil → Notificaciones</strong>.</p>
</body>
</html>`
  )
}

// ─── Inactivity alert ─────────────────────────────────────────────────────────

async function sendInactivityAlert(
  email: string,
  name: string,
  userId: string,
): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count } = await supabase
    .from("resource_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString())

  if ((count ?? 0) > 0) return false  // has recent review → skip

  const { data: nextPending } = await supabase
    .from("learning_resources")
    .select("title, next_review_at")
    .eq("user_id", userId)
    .not("next_review_at", "is", null)
    .not("status", "in", '("ABANDONED","MASTERED")')
    .order("next_review_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const greeting        = name ? `Hola ${name}` : "Hola"
  const nextReviewLine  = nextPending
    ? `<p>Tu próximo review pendiente es: <strong>${nextPending.title}</strong> (${fmtDate(nextPending.next_review_at)})</p>`
    : ""

  await sendEmail(
    email,
    "🔔 No has revisado ningún recurso en una semana",
    `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111">
  <h2 style="color:#f59e0b">🔔 Alerta de inactividad</h2>
  <p>${greeting},</p>
  <p>No has revisado ningún recurso de aprendizaje en los últimos 7 días.</p>
  ${nextReviewLine}
  <p>Mantener la constancia en el repaso es clave para convertir el conocimiento en resultados. ¡Vuelve hoy!</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:11px;color:#9ca3af">Para desactivar estos emails ve a <strong>Perfil → Notificaciones</strong>.</p>
</body>
</html>`
  )
  return true
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { type?: string; force?: boolean }
  const type  = body.type === "inactivity" ? "inactivity" : "weekly"
  const force = body.force === true  // bypass timezone filter (for manual testing)

  // Target local hour per notification type
  const TARGET_HOUR = type === "inactivity" ? 10 : 9

  // Fetch users with email notifications enabled (include timezone for local-time filtering)
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, email_notifications, weekly_goal_minutes, timezone")
    .eq("email_notifications", true)

  if (error || !users) {
    console.error("Error fetching users:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const now      = new Date()
  let sent       = 0
  let skipped    = 0

  // Calculate last week range (Mon–Sun) in UTC
  const dayOfWeek  = now.getDay()
  const daysToMon  = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysToMon)
  thisMonday.setHours(0, 0, 0, 0)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)

  // TASK-L031: idempotence key — ISO week string "YYYY-WW"
  function isoWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const year = d.getUTCFullYear()
    const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7)
    return `${year}-${String(week).padStart(2, "0")}`
  }
  const weekKey = isoWeekKey(now)

  for (const user of users) {
    try {
      const tz = (user.timezone as string | null) ?? "UTC"

      // Gate by local time unless force=true (manual trigger)
      if (!force && !shouldSendNow(tz, TARGET_HOUR)) {
        skipped++
        continue
      }

      // TASK-L031: deduplicate — skip if already sent this week
      const { error: logError } = await supabase
        .from("email_log")
        .insert({ user_id: user.id, email_type: type, week_key: weekKey })
      if (logError) {
        // 23505 = unique_violation → already sent
        if ((logError as { code?: string }).code === "23505") {
          skipped++
          continue
        }
        // other error → log but still try to send
        console.warn(`email_log insert error for ${user.id}:`, logError.message)
      }

      if (type === "inactivity") {
        const didSend = await sendInactivityAlert(user.email, user.name, user.id)
        didSend ? sent++ : skipped++
      } else {
        await sendWeeklySummary(
          user.email,
          user.name,
          lastMonday,
          lastSunday,
          user.id,
          (user.weekly_goal_minutes as number | null) ?? 300,
        )
        sent++
      }
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err)
      skipped++
    }
  }

  return new Response(
    JSON.stringify({ type, sent, skipped, total: users.length }),
    { headers: { "Content-Type": "application/json" } },
  )
})
