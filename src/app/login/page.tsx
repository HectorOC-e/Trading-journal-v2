"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPwd,   setShowPwd]   = useState(false)
  const [error,     setError]     = useState("")
  const [loading,   setLoading]   = useState(false)

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
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-[360px] fade-in">
        {/* Card */}
        <div
          className="rounded-[var(--radius-lg)] p-8"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-[var(--radius)] flex items-center justify-center mb-4"
              style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(79,110,247,0.35)" }}
            >
              <TrendingUp size={22} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: "var(--ink)" }}>
              Trading Journal
            </h1>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>
              Inicia sesión para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="input-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className={[
                  "w-full h-9 px-3 rounded-[var(--radius-sm)] text-[13px]",
                  "border transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
                  "placeholder:text-[var(--ink-3)]",
                ].join(" ")}
                style={{
                  background: "var(--panel-2)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="input-label">
                Contraseña
              </label>
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
                    "w-full h-9 pl-3 pr-9 rounded-[var(--radius-sm)] text-[13px]",
                    "border transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
                    "placeholder:text-[var(--ink-3)]",
                  ].join(" ")}
                  style={{
                    background: "var(--panel-2)",
                    borderColor: "var(--line)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--ink-3)" }}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-[12px]"
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
                "w-full h-9 rounded-[var(--radius-sm)] text-[13px] font-semibold",
                "text-white transition-all duration-150 mt-1",
                "flex items-center justify-center gap-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "active:scale-[0.98]",
              ].join(" ")}
              style={{
                background: "var(--accent)",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--ink-3)" }}>
          Trading Journal v2 · Plataforma privada
        </p>
      </div>
    </div>
  )
}
