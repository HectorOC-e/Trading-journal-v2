"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Rocket, Wallet, CandlestickChart, Brain, X, ArrowRight } from "lucide-react"
import { useQuickActions } from "@/lib/quick-actions-store"

const KEY = "tj.onboardingDone"

/** Day-1 onboarding (S12d) — a single welcome that activates the engines from the
 *  first session: connect an account, capture the first trade, do a check-in.
 *  Only shown to a brand-new trader (zero trades) and dismissible once. */
export function OnboardingWelcome({ tradeCount }: { tradeCount: number }) {
  const router = useRouter()
  const openRegister = useQuickActions((s) => s.openRegister)
  // Default hidden (avoids a flash for returning users + SSR/hydration mismatch);
  // the effect reveals it only for a new trader who hasn't dismissed it.
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => { setDismissed(localStorage.getItem(KEY) === "1") }, [])

  if (dismissed || tradeCount > 0) return null
  const close = () => { try { localStorage.setItem(KEY, "1") } catch { /* ignore */ } setDismissed(true) }

  const steps = [
    { icon: Wallet, title: "Conecta tu cuenta", desc: "Define balance y reglas (prop o personal).", run: () => router.push("/cuentas") },
    { icon: CandlestickChart, title: "Registra tu primer trade", desc: "Captura con calidad — alimenta los motores.", run: openRegister },
    { icon: Brain, title: "Check-in de hoy", desc: "Go/no-go antes de operar.", run: () => router.push("/psicologia") },
  ]

  return (
    <div className="relative rounded-[var(--radius-lg)] border p-5 mb-6 overflow-hidden"
      style={{ background: "var(--coach-soft)", borderColor: "var(--coach)" }}>
      <button onClick={close} aria-label="Cerrar bienvenida"
        className="absolute top-3 right-3 p-1 rounded hover:bg-[var(--chip)] transition-colors">
        <X size={14} style={{ color: "var(--ink-3)" }} />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)]" style={{ background: "var(--coach)", color: "var(--accent-contrast)" }}>
          <Rocket size={16} />
        </span>
        <h2 className="text-[16px] font-bold text-[var(--ink)]">Bienvenido. Activa tu cerebro de trading.</h2>
      </div>
      <p className="text-[12.5px] text-[var(--ink-2)] mb-4 max-w-prose">
        Esto no es solo un diario: cambia tu comportamiento. Tres pasos para encender los motores hoy.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {steps.map((s, i) => (
          <button key={s.title} onClick={s.run}
            className="group text-left rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] p-3 hover:border-[var(--coach)] transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={15} style={{ color: "var(--coach)" }} />
              <span className="text-[10px] font-bold text-[var(--ink-3)]">PASO {i + 1}</span>
              <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--coach)" }} />
            </div>
            <p className="text-[12.5px] font-semibold text-[var(--ink)]">{s.title}</p>
            <p className="text-[11px] text-[var(--ink-3)] leading-snug mt-0.5">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
