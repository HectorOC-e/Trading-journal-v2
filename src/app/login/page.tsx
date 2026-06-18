"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { clearSessionStorageKeys } from "@/lib/storage-keys"

// Hero signature: a realistic equity curve (climbs, dips, recovers). The peak is
// the all-time high, the trough is the worst drawdown — the two truths every
// ledger holds. Marked in the reserved domain colors (win/loss).
const CURVE = "M0,250 C40,238 70,256 104,232 C140,206 168,224 204,196 C236,172 262,206 300,182 C338,158 360,120 398,138 C430,153 452,132 486,104 C520,78 548,92 600,52"
const AREA = `${CURVE} L600,300 L0,300 Z`

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  // Landing on /login means the session ended (explicit logout or expiry). Wipe
  // session-scoped localStorage so the next login never inherits the previous
  // user's AI chat history — covers expiry paths where useLogout never ran.
  useEffect(() => { clearSessionStorageKeys() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message.includes("Invalid") || error.message.includes("credentials")
          ? "Email o contraseña incorrectos."
          : error.message
      )
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]" style={{ background: "var(--bg)" }}>
      {/* ── Left: the ledger ── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16"
        style={{
          background: "linear-gradient(160deg, var(--panel) 0%, var(--bg) 100%)",
          borderRight: "1px solid var(--line)",
        }}
      >
        {/* Ambient accent glow behind the curve */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full"
          style={{ background: "var(--accent)", opacity: 0.12, filter: "blur(120px)" }}
        />

        {/* Brand mark */}
        <div className="relative flex items-center gap-2.5 rise" style={{ animationDelay: "0ms" }}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ background: "var(--accent)", boxShadow: "0 4px 14px color-mix(in oklch, var(--accent) 40%, transparent)" }}
          >
            <TrendingUp size={17} className="text-white" />
          </div>
          <span className="font-mono text-[12px] font-medium tracking-tight" style={{ color: "var(--ink-2)" }}>
            trading-journal<span style={{ color: "var(--ink-3)" }}>.v2</span>
          </span>
        </div>

        {/* Thesis + curve */}
        <div className="relative">
          <p
            className="rise mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--accent)", animationDelay: "60ms" }}
          >
            Diario · Vault privado
          </p>
          <h1
            className="rise font-mono font-bold leading-[1.05] tracking-[-0.03em]"
            style={{ color: "var(--ink)", fontSize: "clamp(2rem, 3.4vw, 3.1rem)", animationDelay: "120ms" }}
          >
            El diario que<br />
            no te deja<br />
            <span style={{ color: "var(--accent)" }}>mentir.</span>
          </h1>
          <p
            className="rise mt-6 max-w-[34ch] text-[14px] leading-relaxed"
            style={{ color: "var(--ink-2)", animationDelay: "200ms" }}
          >
            Captura cada operación, revela los patrones que no ves y hace cumplir
            las reglas que te prometiste.
          </p>

          {/* Equity curve */}
          <div className="rise mt-10" style={{ animationDelay: "260ms" }}>
            <svg viewBox="0 0 600 300" className="h-auto w-full max-w-[480px]" role="img" aria-label="Curva de equity con su máximo histórico y su drawdown">
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* baseline grid — encodes the measured ground, not decoration */}
              {[70, 130, 190, 250].map(y => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
              ))}
              <path d={AREA} fill="url(#equityFill)" className="rise" style={{ animationDelay: "900ms" }} />
              <path
                d={CURVE}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="equity-line"
                style={{ ["--len" as string]: "1100" }}
              />
              {/* drawdown — worst trough */}
              <g className="rise" style={{ animationDelay: "1500ms" }}>
                <circle cx="104" cy="232" r="4" fill="var(--loss)" stroke="var(--panel)" strokeWidth="2" />
                <text x="104" y="256" textAnchor="middle" className="font-mono" fontSize="11" fontWeight="600" fill="var(--loss)">DD</text>
              </g>
              {/* all-time high — last point */}
              <g className="rise" style={{ animationDelay: "1700ms" }}>
                <circle cx="600" cy="52" r="4" fill="var(--win)" stroke="var(--panel)" strokeWidth="2" />
                <text x="600" y="38" textAnchor="end" className="font-mono" fontSize="11" fontWeight="600" fill="var(--win)">ATH</text>
              </g>
            </svg>
          </div>
        </div>

        {/* What it measures — true content, no fabricated numbers */}
        <p
          className="rise relative font-mono text-[11px] tracking-tight"
          style={{ color: "var(--ink-3)", animationDelay: "340ms" }}
        >
          NET P&amp;L · WIN RATE · AVG R · SHARPE · PROFIT FACTOR · EXPECTANCY
        </p>
      </aside>

      {/* ── Right: access terminal ── */}
      <main className="flex min-h-dvh items-center justify-center p-6 lg:min-h-0">
        <div className="w-full max-w-[340px] rise" style={{ animationDelay: "120ms" }}>
          {/* Compact brand mark (mobile only) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)]"
              style={{ background: "var(--accent)", boxShadow: "0 4px 12px color-mix(in oklch, var(--accent) 35%, transparent)" }}
            >
              <TrendingUp size={19} className="text-white" />
            </div>
            <span className="font-mono text-[13px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              trading-journal.v2
            </span>
          </div>

          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "var(--ink-3)" }}>
            Acceso
          </p>
          <h2 className="mt-1.5 text-[22px] font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Inicia sesión
          </h2>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className={[
                  "h-10 w-full rounded-[var(--radius-sm)] px-3 text-[13px]",
                  "border transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
                  "placeholder:text-[var(--ink-3)]",
                ].join(" ")}
                style={{ background: "var(--panel-2)", borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="input-label">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={[
                    "h-10 w-full rounded-[var(--radius-sm)] pl-3 pr-9 text-[13px]",
                    "border transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
                    "placeholder:text-[var(--ink-3)]",
                  ].join(" ")}
                  style={{ background: "var(--panel-2)", borderColor: "var(--line)", color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--ink-3)" }}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[12px]"
                role="alert"
                style={{
                  background: "var(--loss-soft)",
                  border: "1px solid color-mix(in oklch, var(--loss) 30%, transparent)",
                  color: "var(--loss)",
                }}
              >
                <AlertCircle size={13} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={[
                "mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white",
                "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "active:scale-[0.98]",
              ].join(" ")}
              style={{ background: "var(--accent)", cursor: loading ? "wait" : "pointer" }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
            Vault privado · un solo trader
          </p>
        </div>
      </main>
    </div>
  )
}
