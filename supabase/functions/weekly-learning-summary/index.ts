import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Prop-firm health alerts (daily-loss / total-drawdown). The Aprendizaje emails
// (weekly summary, inactivity, decay) were migrated to the Next.js app — see
// app/api/cron/learning-digest and the daily digest. This function now handles
// only `{"type":"prop_firm_health"}`.
//
// Environment variables (Supabase Dashboard → Edge Functions Secrets):
//   RESEND_API_KEY  — Resend API key for sending emails
//   CRON_SECRET     — token authorizing cron calls
// Auto-provided by Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RESEND_API_KEY        = Deno.env.get("RESEND_API_KEY") ?? ""
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const CRON_SECRET           = Deno.env.get("CRON_SECRET") ?? ""
const FROM_EMAIL            = "Trading Journal <noreply@resend.dev>"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// ─── Auth check ──────────────────────────────────────────────────────────────

// "unconfigured" = server precondition not met (no secret) → 412.
// "unauthorized" = caller presented a wrong/missing token → 401.
function checkAuth(req: Request): "ok" | "unconfigured" | "unauthorized" {
  if (!CRON_SECRET) return "unconfigured"
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${CRON_SECRET}` || auth === `Bearer ${SUPABASE_SERVICE_ROLE}`
    ? "ok"
    : "unauthorized"
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

  const auth = checkAuth(req)
  if (auth === "unconfigured") {
    return new Response("CRON_SECRET not configured on server", { status: 412 })
  }
  if (auth === "unauthorized") {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { type?: string }

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

  // Aprendizaje emails (weekly / inactivity / decay) moved to the Next.js app.
  return new Response(
    JSON.stringify({ error: "Unsupported type. This function only handles 'prop_firm_health'." }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  )
})

// ─── pg_cron setup (run once in Supabase SQL editor) ─────────────────────────
//
// Prop firm health check at 22:00 UTC:
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
//
// The retired 'decay-check' / weekly / inactivity crons should be unscheduled:
//   SELECT cron.unschedule('decay-check');
