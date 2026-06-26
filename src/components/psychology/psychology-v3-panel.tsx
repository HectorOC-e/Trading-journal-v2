"use client"

// Psychology v3 panel (S8) — pre-session check-in (go/no-go), confidence
// calibration, and the mood trend. Mounted at the top of /psicologia.

import { useState } from "react"
import { Brain, ShieldAlert, TrendingUp, TrendingDown, Minus, Check } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

const VERDICT = {
  go: { label: "Listo para operar", color: "var(--win)" },
  caution: { label: "Opera con cautela", color: "var(--be)" },
  no_go: { label: "Mejor no operes hoy", color: "var(--loss)" },
} as const

const DIMS = [
  { key: "mood", label: "Ánimo" },
  { key: "energy", label: "Energía" },
  { key: "sleep", label: "Descanso" },
] as const

function Scale({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-7 h-7 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-colors"
          style={{
            borderColor: value === n ? "var(--accent)" : "var(--line)",
            background: value === n ? "var(--accent)" : "transparent",
            color: value === n ? "var(--accent-contrast)" : "var(--ink-3)",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function PsychologyV3Panel() {
  const utils = trpc.useUtils()
  const { data: latest } = trpc.psychology.latestCheckin.useQuery(undefined, { staleTime: 30_000 })
  const { data: cal } = trpc.psychology.calibration.useQuery(undefined, { staleTime: 60_000 })
  const { data: mood } = trpc.psychology.moodTrend.useQuery(undefined, { staleTime: 60_000 })

  const [vals, setVals] = useState({ mood: 3, energy: 3, sleep: 3 })
  const submit = trpc.psychology.submitCheckin.useMutation({
    onSuccess: () => { utils.psychology.latestCheckin.invalidate(); utils.psychology.moodTrend.invalidate() },
    onError: (e) => toast.error(formatErrorForUser(e)),
  })

  const todays = latest?.isToday ? latest : null
  const v = todays ? VERDICT[todays.verdict as keyof typeof VERDICT] : null

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-6">
      {/* Pre-session check-in */}
      <section className="rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-[var(--accent)]" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)]">Check-in pre-sesión</p>
        </div>

        {todays ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] p-3" style={{ background: "color-mix(in srgb, var(--panel), " + v!.color + " 12%)", border: `1px solid ${v!.color}` }}>
              {todays.verdict === "no_go" ? <ShieldAlert size={18} style={{ color: v!.color }} /> : <Check size={18} style={{ color: v!.color }} />}
              <div>
                <p className="text-sm font-bold" style={{ color: v!.color }}>{v!.label}</p>
                <p className="text-[11px] text-[var(--ink-3)]">Ánimo {todays.mood} · Energía {todays.energy} · Descanso {todays.sleep} (de 5)</p>
              </div>
            </div>
            {todays.reasons.length > 0 && (
              <p className="text-[11px] text-[var(--ink-3)]">Atención: {todays.reasons.join(", ")}.</p>
            )}
            <button onClick={() => utils.psychology.latestCheckin.setData(undefined, null)} className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] self-start">Volver a registrar</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {DIMS.map((d) => (
              <div key={d.key} className="flex items-center justify-between">
                <span className="text-sm text-[var(--ink-2)]">{d.label}</span>
                <Scale value={vals[d.key]} onChange={(n) => setVals((s) => ({ ...s, [d.key]: n }))} />
              </div>
            ))}
            <button
              type="button"
              onClick={() => submit.mutate(vals)}
              disabled={submit.isPending}
              className="mt-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold py-2 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Evaluar mi estado
            </button>
            {submit.data && (
              <p className="text-[12px]" style={{ color: VERDICT[submit.data.verdict].color }}>{submit.data.recommendation}</p>
            )}
          </div>
        )}
      </section>

      {/* Calibration + mood */}
      <section className="rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4 flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">Calibración de confianza</p>
          {!cal || cal.verdict === "insufficient" ? (
            <p className="text-[12px] text-[var(--ink-3)]">Registra la confianza (1–5) al crear trades para calibrar si predice tus resultados.</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--ink)] capitalize">
                {cal.verdict === "overconfident" ? "Sobreconfiado" : cal.verdict === "underconfident" ? "Te subestimas" : "Bien calibrado"}
              </p>
              <p className="text-[12px] text-[var(--ink-3)] mt-0.5">{cal.detail}</p>
              <div className="flex items-end gap-1.5 mt-3 h-16">
                {cal.buckets.map((b) => (
                  <div key={b.rating} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t" style={{ height: `${(b.winRate ?? 0) * 100}%`, background: b.trades ? "var(--accent)" : "var(--line)", minHeight: 2 }} title={`${b.trades} trades`} />
                    <span className="text-[9px] text-[var(--ink-3)]">{b.rating}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-[var(--ink-3)] text-center mt-1">WR por nivel de confianza · media {(cal.baseline * 100).toFixed(0)}%</p>
            </>
          )}
        </div>

        <div className="pt-3 border-t border-[var(--line)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">Tendencia de ánimo</p>
          {!mood || mood.trend === "insufficient" ? (
            <p className="text-[12px] text-[var(--ink-3)]">Aún no hay suficientes registros de ánimo/energía.</p>
          ) : (
            <div className="flex items-center gap-2">
              {mood.trend === "improving" ? <TrendingUp size={18} className="text-[var(--win)]" /> : mood.trend === "declining" ? <TrendingDown size={18} className="text-[var(--loss)]" /> : <Minus size={18} className="text-[var(--ink-3)]" />}
              <p className="text-sm text-[var(--ink-2)]">
                {mood.trend === "improving" ? "Tu ánimo viene mejorando" : mood.trend === "declining" ? "Tu ánimo viene cayendo" : "Tu ánimo se mantiene estable"}
                <span className="text-[var(--ink-3)] text-[11px]"> · {mood.windows.length} ventanas</span>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
