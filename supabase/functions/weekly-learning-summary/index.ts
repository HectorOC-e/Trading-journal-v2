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

  const [completedRes, pendingRes, minuteRes, weekTradesRes] = await Promise.all([
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

    // T-IX-002: Fetch trades for the week
    supabase
      .from("trades")
      .select("pnl, r_multiple, setup_id, tags")
      .eq("user_id", userId)
      .eq("status", "CLOSED")
      .gte("date", weekStartISO.slice(0, 10))
      .lt("date", weekEndISO.slice(0, 10)),
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

  // T-IX-002: Compute trading performance section
  const weekTrades = weekTradesRes.data ?? []
  const tradeCount = weekTrades.length
  const netPnl     = weekTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0)
  const wins       = weekTrades.filter(t => Number(t.pnl ?? 0) > 0).length
  const winRate    = tradeCount > 0 ? Math.round(wins / tradeCount * 100) : null

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

  // T-IX-002: Trading section HTML
  const tradingHtml = tradeCount === 0
    ? '<p style="color: #6b7280;">Sin trades registrados esta semana.</p>'
    : `<p>${tradeCount} trades · <strong style="color: ${netPnl >= 0 ? '#16a34a' : '#dc2626'}">${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(0)}</strong> · ${winRate ?? '—'}% WR</p>`

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

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
  <h3 style="font-size: 15px; margin-bottom: 8px;">📈 Tu semana de trading</h3>
  ${tradingHtml}

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

// ─── T-IX-001: Decay notification ────────────────────────────────────────────

async function sendDecayNotification(
  email: string,
  name: string,
  userId: string,
): Promise<void> {
  const now = Date.now()

  // 1. Find MASTERED resources where (now - nextReviewAt) > reviewInterval * 2 * 86400000
  const { data: masteredResources } = await supabase
    .from("learning_resources")
    .select("id, title, next_review_at, review_interval")
    .eq("user_id", userId)
    .eq("status", "MASTERED")
    .not("next_review_at", "is", null)

  const decayedResources = (masteredResources ?? []).filter(r => {
    if (!r.next_review_at) return false
    const nextReview     = new Date(r.next_review_at).getTime()
    const intervalMs     = Number(r.review_interval ?? 0) * 2 * 86_400_000
    return (now - nextReview) > intervalMs
  })

  if (decayedResources.length === 0) return

  // 2. Skip if already sent a decay email in the last 7 days for this user
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString()
  const { data: recentLog } = await supabase
    .from("email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", "decay")
    .gte("created_at", sevenDaysAgo)
    .limit(1)

  if (recentLog && recentLog.length > 0) return

  // 3. Compute days overdue for the most-overdue resource (for email copy)
  const maxOverdueMs  = Math.max(...decayedResources.map(r => now - new Date(r.next_review_at).getTime()))
  const days          = Math.floor(maxOverdueMs / 86_400_000)

  await sendEmail(
    email,
    `📚 Recursos que necesitan revisión — ${decayedResources.length} recurso${decayedResources.length > 1 ? "s" : ""}`,
    `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111">
  <h2>📚 Recursos que necesitan revisión</h2>
  <p>Hola ${name},</p>
  <p>Llevas más de ${days} días sin repasar estos recursos:</p>
  <ul>
    ${decayedResources.slice(0, 5).map(r => `<li><strong>${r.title}</strong> — venció el ${fmtDate(r.next_review_at)}</li>`).join("")}
  </ul>
  <p>El olvido es normal. Vuelve hoy para mantener tu ventaja.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:11px;color:#9ca3af">Para desactivar estos emails ve a <strong>Perfil → Notificaciones</strong>.</p>
</body>
</html>`
  )

  // 4. Log to email_log
  await supabase.from("email_log").insert({
    user_id:    userId,
    email_type: "decay",
    week_key:   new Date().toISOString().slice(0, 10),
  })
}

// ─── T-IX-003: Prop firm health alert ────────────────────────────────────────

async function sendPropFirmHealthAlert(
  email: string,
  name: string,
  userId: string,
  today: string,  // YYYY-MM-DD
): Promise<void> {
  // Get all ACTIVE PROP_FIRM accounts for the user
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, initial_balance, dd_daily_pct, dd_total_pct")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .eq("type", "PROP_FIRM")

  for (const account of accounts ?? []) {
    const initialBal  = Number(account.initial_balance)
    const dailyLimPct = Number(account.dd_daily_pct ?? 0)
    const totalLimPct = Number(account.dd_total_pct ?? 0)

    // ── Daily loss check ──
    if (dailyLimPct > 0) {
      const { data: todayTrades } = await supabase
        .from("trades")
        .select("pnl")
        .eq("account_id", account.id)
        .eq("date", today)
        .eq("status", "CLOSED")

      const todayPnl     = (todayTrades ?? []).reduce((s, t) => s + Number(t.pnl ?? 0), 0)
      const todayLoss    = Math.abs(Math.min(0, todayPnl))
      const todayLossPct = initialBal > 0 ? todayLoss / initialBal * 100 : 0

      // Alert at 80% of daily limit
      if (todayLossPct >= dailyLimPct * 0.8) {
        const alertKey = `prop_firm_daily_${account.id}_${today}`
        const { data: existing } = await supabase
          .from("email_log")
          .select("id")
          .eq("user_id", userId)
          .eq("email_type", alertKey)
          .limit(1)

        if (!existing || existing.length === 0) {
          const usedPct = ((todayLossPct / dailyLimPct) * 100).toFixed(0)
          await sendEmail(
            email,
            `⚠️ Alerta: cerca del límite diario — ${account.name}`,
            `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111">
  <h2>⚠️ Límite diario al ${usedPct}%</h2>
  <p>Hola ${name},</p>
  <p>Tu cuenta <strong>${account.name}</strong> ha utilizado el
    <strong>${usedPct}%</strong> de su límite de pérdida diaria
    ($${todayLoss.toFixed(2)} de $${(initialBal * dailyLimPct / 100).toFixed(2)}).</p>
  <p>Revisa si debes seguir operando hoy.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:11px;color:#9ca3af">Para desactivar estos emails ve a <strong>Perfil → Notificaciones</strong>.</p>
</body>
</html>`
          )
          await supabase.from("email_log").insert({
            user_id:    userId,
            email_type: alertKey,
            week_key:   today,
          })
        }
      }
    }

    // ── Total drawdown check ──
    if (totalLimPct > 0) {
      const { data: allTrades } = await supabase
        .from("trades")
        .select("pnl")
        .eq("account_id", account.id)
        .eq("status", "CLOSED")

      const totalPnl     = (allTrades ?? []).reduce((s, t) => s + Number(t.pnl ?? 0), 0)
      const totalLoss    = Math.abs(Math.min(0, totalPnl))
      const totalLossPct = initialBal > 0 ? totalLoss / initialBal * 100 : 0

      // Alert at 90% of total drawdown limit
      if (totalLossPct >= totalLimPct * 0.9) {
        const alertKey = `prop_firm_total_${account.id}_${today}`
        const { data: existing } = await supabase
          .from("email_log")
          .select("id")
          .eq("user_id", userId)
          .eq("email_type", alertKey)
          .limit(1)

        if (!existing || existing.length === 0) {
          const usedPct = ((totalLossPct / totalLimPct) * 100).toFixed(0)
          await sendEmail(
            email,
            `🚨 Alerta: drawdown total al ${usedPct}% — ${account.name}`,
            `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111">
  <h2>🚨 Límite de drawdown total al ${usedPct}%</h2>
  <p>Hola ${name},</p>
  <p>Tu cuenta <strong>${account.name}</strong> ha utilizado el
    <strong>${usedPct}%</strong> de su límite de drawdown total
    ($${totalLoss.toFixed(2)} de $${(initialBal * totalLimPct / 100).toFixed(2)}).</p>
  <p>Considera detener las operaciones para proteger tu cuenta.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:11px;color:#9ca3af">Para desactivar estos emails ve a <strong>Perfil → Notificaciones</strong>.</p>
</body>
</html>`
          )
          await supabase.from("email_log").insert({
            user_id:    userId,
            email_type: alertKey,
            week_key:   today,
          })
        }
      }
    }
  }
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

  // ── T-IX-001: Decay notification handler ──
  if (body.type === "decay") {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name, email_notifications")
    let sent = 0
    for (const u of users ?? []) {
      if (!u.email_notifications) continue
      await sendDecayNotification(u.email, u.name ?? "Trader", u.id)
      sent++
    }
    return new Response(JSON.stringify({ ok: true, processed: sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  // ── T-IX-003: Prop firm health handler ──
  if (body.type === "prop_firm_health") {
    const today = new Date().toISOString().slice(0, 10)
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name, email_notifications")
      .eq("email_notifications", true)
    let processed = 0
    for (const u of users ?? []) {
      await sendPropFirmHealthAlert(u.email, u.name ?? "Trader", u.id, today)
      processed++
    }
    return new Response(JSON.stringify({ ok: true, processed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

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

// ─── pg_cron setup (run once manually in Supabase SQL editor) ────────────────
//
// Enable pg_cron:
//   CREATE EXTENSION IF NOT EXISTS pg_cron;
//
// T-IX-001: Daily decay check at 08:00 UTC
//   SELECT cron.schedule(
//     'decay-check',
//     '0 8 * * *',
//     $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/weekly-learning-summary',
//       body := '{"type":"decay"}'::jsonb,
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret', true))
//     )
//     $$
//   );
//
// T-IX-003: Prop firm health check at 22:00 UTC
//   SELECT cron.schedule(
//     'prop-firm-health',
//     '0 22 * * *',
//     $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/weekly-learning-summary',
//       body := '{"type":"prop_firm_health"}'::jsonb,
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret', true))
//     )
//     $$
//   );
