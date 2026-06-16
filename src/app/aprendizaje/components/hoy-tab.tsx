"use client"

import { useEffect, useState } from "react"
import { Clock, BookOpen, Play, Flame, Sparkles, CheckCircle2, CalendarClock, ArrowRight, HelpCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { cn } from "@/lib/utils"
import { CountUp } from "@/components/ui/count-up"
import { CategoryChip } from "@/components/ui/category-chip"
import { Stagger, StaggerItem } from "@/components/ui/motion"
import { useStudySessionStore } from "@/lib/study-session-store"
import { askCoach } from "@/lib/coach-bus"
import { SpotlightTour, type TourStep } from "@/components/onboarding/spotlight-tour"
import { PlanSessionModal } from "./plan-session-modal"
import type { ResourceType } from "@/types"

const DOW = ["L", "M", "X", "J", "V", "S", "D"]

const TOUR_SEEN_KEY = "tj-aprendizaje-tour-seen"
const TOUR_STEPS: TourStep[] = [
  { anchor: "week-strip", title: "Tu semana de un vistazo", body: "Repasos que vencen, sesiones hechas y lo que planificaste, día a día." },
  { anchor: "start-session", title: "Estudia con foco", body: "Inicia una sesión cronometrada; puedes minimizarla a una píldora y seguir leyendo el recurso." },
  { anchor: "coach-suggestion", title: "Sugerencia del coach", body: "Según tus trades, el coach propone qué estudiar. Pulsa para profundizar en el chat." },
  { anchor: "streak", title: "Tu constancia", body: "Racha de días estudiando y minutos frente a tu meta semanal." },
  { anchor: "agenda", title: "Lo que viene", body: "Repasos próximos y sesiones planificadas, ordenados por fecha." },
]

export function HoyTab({ onGoRepaso }: { onGoRepaso: () => void }) {
  const { openPicker } = useStudySessionStore()
  const [planOpen, setPlanOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const { data, isLoading } = trpc.studySessions.home.useQuery()

  // Auto-open the guided tour on the first visit, once the data has resolved
  // (so the spotlight lands on real content, not the loading skeleton).
  useEffect(() => {
    if (isLoading || !data) return
    let seen = false
    try { seen = localStorage.getItem(TOUR_SEEN_KEY) === "1" } catch { /* noop */ }
    if (!seen) {
      const t = setTimeout(() => setTourOpen(true), 400)
      return () => clearTimeout(t)
    }
  }, [isLoading, data])

  function closeTour() {
    setTourOpen(false)
    try { localStorage.setItem(TOUR_SEEN_KEY, "1") } catch { /* noop */ }
  }
  const utils = trpc.useUtils()
  const completePlanned = trpc.studySessions.completePlanned.useMutation({
    onSuccess: () => { utils.studySessions.invalidate(); utils.learningResources.invalidate(); toast.success("Sesión planificada completada") },
    onError: () => toast.error("No se pudo completar"),
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="shimmer h-20 rounded-[var(--radius)]" />
        <div className="grid sm:grid-cols-[1.4fr_.8fr] gap-3"><div className="shimmer h-36 rounded-[var(--radius)]" /><div className="shimmer h-36 rounded-[var(--radius)]" /></div>
        <div className="shimmer h-28 rounded-[var(--radius)]" />
      </div>
    )
  }

  const { weekDays, due, inProgress, week, agenda, suggestion } = data
  const goalH = (week.goalMin / 60).toFixed(0)
  const doneH = (week.hoursMin / 60)
  const pct = week.goalMin > 0 ? Math.min(100, Math.round((week.hoursMin / week.goalMin) * 100)) : 0
  const fmtDay = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDate()

  return (
    <>
    <PlanSessionModal open={planOpen} onClose={() => setPlanOpen(false)} />
    <SpotlightTour steps={TOUR_STEPS} open={tourOpen} onClose={closeTour} />

    <div className="flex justify-end -mb-1">
      <button onClick={() => setTourOpen(true)} title="Ver tutorial de la página"
        className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors active:scale-95">
        <HelpCircle size={13} /> Cómo funciona
      </button>
    </div>

    <Stagger className="flex flex-col gap-3">
      {/* Week strip */}
      <StaggerItem>
        <div data-tour="week-strip" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d, i) => (
              <div key={d.date} className={cn("rounded-[var(--radius-sm)] py-1.5", d.isToday && "bg-[var(--accent-soft)]")}>
                <p className="text-[10px] font-semibold text-[var(--ink-3)]">{DOW[i]}</p>
                <p className={cn("text-[14px] font-bold leading-tight", d.isToday ? "text-[var(--accent)]" : "text-[var(--ink)]")}>{fmtDay(d.date)}</p>
                <div className="flex items-center justify-center gap-0.5 h-2 mt-0.5">
                  {Array.from({ length: Math.min(3, d.reviews) }).map((_, k) => <span key={"r" + k} className="w-1 h-1 rounded-full bg-[var(--loss)]" />)}
                  {d.sessions > 0 && <span className="w-1 h-1 rounded-full bg-[var(--win)]" />}
                  {d.planned > 0 && <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-[var(--ink-3)] mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--loss)]" /> repaso vence</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--win)]" /> sesión</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> planificada</span>
          </p>
        </div>
      </StaggerItem>

      {/* HOY + Racha */}
      <StaggerItem>
        <div className="grid sm:grid-cols-[1.5fr_.85fr] gap-3">
          {/* HOY */}
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col gap-3">
            <p className="text-eyebrow">HOY</p>

            <button onClick={onGoRepaso} disabled={due.length === 0}
              className={cn("flex items-center gap-2 text-left rounded-[var(--radius-sm)] px-3 py-2 transition-colors",
                due.length > 0 ? "bg-[var(--loss-soft)] hover:brightness-95" : "bg-[var(--panel-2)] cursor-default")}>
              <Clock size={16} style={{ color: due.length > 0 ? "var(--loss)" : "var(--ink-3)" }} />
              <span className="flex-1 text-[13px]">
                {due.length > 0
                  ? <><b style={{ color: "var(--loss)" }}>{due.length} repaso{due.length === 1 ? "" : "s"}</b> {due.length === 1 ? "vence" : "vencen"} hoy</>
                  : <span className="text-[var(--ink-3)]">Nada que repasar hoy 🎉</span>}
              </span>
              {due.length > 0 && <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--loss)]">Repasar <ArrowRight size={13} /></span>}
            </button>

            <div className="flex items-start gap-2">
              <BookOpen size={15} className="text-[var(--ink-3)] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--ink-3)]">En curso</p>
                {inProgress.length > 0 ? (
                  <p className="text-[13px] text-[var(--ink)] font-medium truncate">{inProgress[0].title}{inProgress.length > 1 ? <span className="text-[var(--ink-3)] font-normal"> · +{inProgress.length - 1}</span> : null}</p>
                ) : <p className="text-[12px] text-[var(--ink-3)]">Aún no estás estudiando nada activo</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button data-tour="start-session" onClick={openPicker}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] text-[13px] font-medium hover:bg-[var(--accent-h)] transition-colors active:scale-[0.97]">
                <Play size={14} className="fill-current" /> Iniciar sesión
              </button>
              <button onClick={() => setPlanOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] text-[13px] hover:bg-[var(--chip)] transition-colors active:scale-[0.97]">
                <CalendarClock size={14} /> Planificar
              </button>
            </div>

            {/* Coach suggestion slot (SP2) — server-side heuristic + deep-link to coach */}
            <div data-tour="coach-suggestion" className="rounded-[var(--radius-sm)] border border-[var(--line-2)] bg-[var(--accent-soft)]/40 px-3 py-2.5 flex items-start gap-2">
              <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
              {suggestion ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight">{suggestion.title}</p>
                  <p className="text-[11px] text-[var(--ink-2)] mt-0.5">{suggestion.reason}</p>
                  <button onClick={() => askCoach(suggestion.coachPrompt)}
                    className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-[var(--accent)] hover:underline active:scale-95 transition">
                    Preguntar al coach <ArrowRight size={11} />
                  </button>
                </div>
              ) : (
                <p className="text-[11.5px] text-[var(--ink-3)] mt-0.5">Vas al día. El coach sugerirá estudio aquí cuando detecte algo útil en tus trades.</p>
              )}
            </div>
          </div>

          {/* Racha */}
          <div data-tour="streak" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col gap-2">
            <p className="text-eyebrow">RACHA</p>
            <div className="flex items-center gap-2">
              <Flame size={22} style={{ color: week.streak > 0 ? "var(--win)" : "var(--ink-3)" }} />
              <span className="text-[26px] font-bold leading-none num" style={{ color: week.streak > 0 ? "var(--win)" : "var(--ink-3)" }}>
                <CountUp value={week.streak} /><span className="text-[14px] font-semibold"> {week.streak === 1 ? "día" : "días"}</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-3)]"><CountUp value={doneH.toFixed(1)} />h esta semana · meta {goalH}h</p>
            <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden mt-0.5">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: "var(--win)" }} />
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* Agenda */}
      <StaggerItem>
        <div data-tour="agenda" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-eyebrow mb-2 flex items-center gap-1.5"><CalendarClock size={13} /> ESTA SEMANA</p>
          {agenda.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ink-3)] py-2">Sin repasos ni sesiones planificadas próximas. Planifica una desde un recurso.</p>
          ) : (
            <div className="flex flex-col">
              {agenda.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[var(--line)] last:border-0">
                  <span className="text-[11px] font-semibold text-[var(--ink-3)] w-12 shrink-0">{new Date(a.date + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })}</span>
                  <CategoryChip type={a.type as ResourceType} />
                  <span className="flex-1 min-w-0 text-[12.5px] text-[var(--ink)] truncate">{a.title}</span>
                  {a.kind === "review"
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--loss-soft)] text-[var(--loss)]"><Clock size={9} /> repaso</span>
                    : <button onClick={() => "plannedSessionId" in a && a.plannedSessionId && completePlanned.mutate({ id: a.plannedSessionId })}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95 active:scale-95 transition">
                        <CheckCircle2 size={9} /> {a.plannedMin}m · hecho
                      </button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </StaggerItem>
    </Stagger>
    </>
  )
}
